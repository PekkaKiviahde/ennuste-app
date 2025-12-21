#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
apply_jyda_unapproved_delta.py
- Reads JYDA CSV and computes per-code delta:
    delta = (Toteutunut kustannus (sis. hyväksymätt.)) - (already imported actuals for that code/month)
- Inserts only the delta rows to actual_cost_lines (append-only safe)

Assumptions:
- Previous JYDA CSV import inserted rows with external_ref like 'JYDA_CSV:<code>'
- Delta rows will be inserted with external_ref 'JYDA_CSV_DELTA_UNAPPROVED:<code>'

Usage (dry-run):
  python tools/scripts/apply_jyda_unapproved_delta.py --project-id <UUID> --file "excel/Jyda-ajo ... .csv" --occurred-on 2025-12-01 --dry-run

Usage (write):
  python tools/scripts/apply_jyda_unapproved_delta.py --project-id <UUID> --file "excel/Jyda-ajo ... .csv" --occurred-on 2025-12-01 --imported-by Pekka

DB:
  uses env DATABASE_URL if set, else defaults to local docker
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import sys
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Dict, Optional, Tuple, List

import psycopg

DEFAULT_DATABASE_URL = "postgresql://codex:codex@localhost:5432/codex"
SOURCE_SYSTEM_DELTA = "JYDA_CSV_DELTA_UNAPPROVED"

COL_CODE = "Koodi"
COL_NAME = "Nimi"
COL_UNAPPROVED = "Toteutunut kustannus (sis. hyväksymätt.)"


def die(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def parse_fi_number(value: Optional[str], *, field_name: str = "") -> Decimal:
    if value is None:
        return Decimal("0")
    s = str(value).strip()
    if s == "" or s.lower() == "nan":
        return Decimal("0")
    s = s.replace("\u00A0", " ")
    s = s.replace(" ", "")
    s = s.replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        raise ValueError(f"Cannot parse number '{value}' in field '{field_name}'")


def q2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_unapproved(csv_path: Path) -> Dict[str, Tuple[str, Decimal]]:
    """code -> (name, unapproved_amount)"""
    encodings = ["utf-8", "cp1252", "ISO-8859-1"]
    last_err = None
    for enc in encodings:
        try:
            with csv_path.open("r", encoding=enc, newline="") as f:
                reader = csv.DictReader(f, delimiter=";")
                if reader.fieldnames is None:
                    die("CSV has no header row.")
                if COL_CODE not in reader.fieldnames or COL_UNAPPROVED not in reader.fieldnames:
                    die(f"CSV missing required columns. Need '{COL_CODE}' and '{COL_UNAPPROVED}'. Found: {reader.fieldnames}")

                out: Dict[str, Tuple[str, Decimal]] = {}
                for row in reader:
                    code = (row.get(COL_CODE) or "").strip()
                    if not code:
                        continue
                    name = (row.get(COL_NAME) or "").strip()
                    amt = parse_fi_number(row.get(COL_UNAPPROVED), field_name=COL_UNAPPROVED)

                    if code in out:
                        old_name, old_amt = out[code]
                        out[code] = (old_name or name, old_amt + amt)
                    else:
                        out[code] = (name, amt)
                return out
        except Exception as e:
            last_err = e
    die(f"Failed to read CSV with encodings {encodings}. Last error: {last_err}")
    return {}


def import_batches_has_signature(conn: psycopg.Connection, project_id: str, signature: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM import_batches
            WHERE project_id = %s::uuid
              AND source_system = %s
              AND signature = %s
            LIMIT 1
            """,
            (project_id, SOURCE_SYSTEM_DELTA, signature),
        )
        return cur.fetchone() is not None


def insert_import_batch(conn: psycopg.Connection, project_id: str, imported_by: str, signature: str, notes: str) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO import_batches (project_id, source_system, imported_by, signature, notes)
            VALUES (%s::uuid, %s, %s, %s, %s)
            RETURNING import_batch_id
            """,
            (project_id, SOURCE_SYSTEM_DELTA, imported_by, signature, notes),
        )
        return str(cur.fetchone()[0])


def fetch_littera_id(conn: psycopg.Connection, project_id: str, code: str) -> Optional[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT littera_id FROM litteras WHERE project_id=%s::uuid AND code=%s LIMIT 1",
            (project_id, code),
        )
        row = cur.fetchone()
        return str(row[0]) if row else None


def current_actuals_by_code(conn: psycopg.Connection, project_id: str, occurred_on: date) -> Dict[str, Decimal]:
    """
    Reads already imported JYDA CSV rows for this occurred_on date.
    We include both original and previous delta rows by matching external_ref prefix 'JYDA_CSV'.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT l.code, SUM(a.amount)::numeric
            FROM actual_cost_lines a
            JOIN litteras l
              ON l.project_id = a.project_id
             AND l.littera_id = a.work_littera_id
            WHERE a.project_id = %s::uuid
              AND a.occurred_on = %s::date
              AND a.external_ref LIKE 'JYDA_CSV%%'
            GROUP BY l.code
            """,
            (project_id, occurred_on),
        )
        out: Dict[str, Decimal] = {}
        for code, total in cur.fetchall():
            out[str(code)] = Decimal(str(total))
        return out


def insert_delta_line(
    conn: psycopg.Connection,
    project_id: str,
    work_littera_id: str,
    delta: Decimal,
    occurred_on: date,
    import_batch_id: str,
    code: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO actual_cost_lines
              (project_id, work_littera_id, cost_type, amount, occurred_on, source, import_batch_id, external_ref)
            VALUES
              (%s::uuid, %s::uuid, 'OTHER'::cost_type, %s, %s, 'JYDA'::actual_source, %s::uuid, %s)
            """,
            (
                project_id,
                work_littera_id,
                str(q2(delta)),
                occurred_on,
                import_batch_id,
                f"JYDA_CSV_DELTA_UNAPPROVED:{code}",
            ),
        )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project-id", required=True)
    ap.add_argument("--file", required=True)
    ap.add_argument("--occurred-on", required=True, help="YYYY-MM-DD")
    ap.add_argument("--imported-by", default="IMPORT")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--database-url", default=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    args = ap.parse_args()

    csv_path = Path(args.file)
    if not csv_path.exists():
        die(f"File not found: {csv_path}")

    try:
        occurred_on = date.fromisoformat(args.occurred_on)
    except ValueError:
        die("Invalid --occurred-on. Use YYYY-MM-DD.")

    desired = read_unapproved(csv_path)
    desired = {c: (n, a) for c, (n, a) in desired.items() if a != 0}
    if not desired:
        die("No non-zero rows found in CSV.")

    signature = sha256_file(csv_path)
    print(f"Read {len(desired)} code rows with non-zero unapproved amounts.")
    print(f"DB: {args.database_url}")
    print(f"Signature (sha256): {signature}")
    print(f"occurred_on={occurred_on}")

    with psycopg.connect(args.database_url) as conn:
        conn.autocommit = False

        # prevent double-apply
        if not args.dry_run and import_batches_has_signature(conn, args.project_id, signature):
            die("Delta for this signature has already been applied (source_system=JYDA_CSV_DELTA_UNAPPROVED).")

        current = current_actuals_by_code(conn, args.project_id, occurred_on)

        deltas: Dict[str, Decimal] = {}
        missing_litteras: List[str] = []

        for code, (_name, want) in desired.items():
            have = current.get(code, Decimal("0"))
            delta = want - have
            if delta != 0:
                deltas[code] = delta

        # ensure litteras exist for delta codes
        for code in sorted(deltas.keys()):
            lid = fetch_littera_id(conn, args.project_id, code)
            if lid is None:
                missing_litteras.append(code)

        if missing_litteras:
            die(
                "Missing litteras for these codes (need them before delta insert):\n"
                + "\n".join(f"- {c}" for c in missing_litteras)
            )

        total_delta = q2(sum(deltas.values(), Decimal("0")))
        print(f"Delta rows needed: {len(deltas)}; total delta amount={total_delta}")

        if args.dry_run:
            # show the changed codes
            for code in sorted(deltas.keys()):
                print(f" - {code}: delta={q2(deltas[code])}")
            conn.rollback()
            return

        notes = f"Apply unapproved delta for JYDA CSV: {csv_path.name} (occurred_on={occurred_on})"
        import_batch_id = insert_import_batch(conn, args.project_id, args.imported_by, signature, notes)
        inserted = 0

        for code in sorted(deltas.keys()):
            lid = fetch_littera_id(conn, args.project_id, code)
            assert lid is not None
            insert_delta_line(conn, args.project_id, lid, deltas[code], occurred_on, import_batch_id, code)
            inserted += 1

        conn.commit()
        print(f"OK: inserted {inserted} delta actual_cost_lines rows (import_batch_id={import_batch_id}).")


if __name__ == "__main__":
    main()
