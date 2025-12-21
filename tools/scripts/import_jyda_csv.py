#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
import_jyda_csv.py (CSV-only)
- Reads JYDA CSV export (delimiter=';')
- Inserts snapshot-style actuals into actual_cost_lines
- cost_type is set to OTHER (because CSV has totals, not cost breakdown)
- occurred_on is provided via --occurred-on (YYYY-MM-DD)

Usage (dry-run):
  python tools/scripts/import_jyda_csv.py --file "excel/Jyda-ajo Kaarnatien Kaarna.csv" --project-id <UUID> --occurred-on 2025-12-01 --dry-run

Usage (write):
  python tools/scripts/import_jyda_csv.py --file "excel/Jyda-ajo Kaarnatien Kaarna.csv" --project-id <UUID> --occurred-on 2025-12-01 --imported-by Pekka

DB connection:
  Uses env DATABASE_URL if set, else defaults:
  postgresql://codex:codex@localhost:5432/codex
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import sys
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Dict, Optional, Tuple, List

import psycopg


DEFAULT_DATABASE_URL = "postgresql://codex:codex@localhost:5432/codex"
DEFAULT_SOURCE_SYSTEM = "JYDA_CSV"

COL_CODE = "Koodi"
COL_NAME = "Nimi"
COL_ACTUAL = "Toteutunut kustannus"
COL_ACTUAL_WITH_UNAPPROVED = "Toteutunut kustannus (sis. hyväksymätt.)"


def die(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def parse_fi_number(value: Optional[str], *, field_name: str = "") -> Decimal:
    """
    Finnish number format:
      - thousand separator: space or NBSP
      - decimal separator: comma
    """
    if value is None:
        return Decimal("0")
    s = str(value).strip()
    if s == "" or s.lower() == "nan":
        return Decimal("0")

    s = s.replace("\u00A0", " ")   # NBSP -> space
    s = s.replace(" ", "")        # remove thousand separators
    s = s.replace(",", ".")       # decimal comma -> dot
    try:
        return Decimal(s)
    except InvalidOperation:
        raise ValueError(f"Cannot parse number '{value}' in field '{field_name}'")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def group_code_from_code(code: str) -> int:
    c = code.strip()
    if not c:
        return 0
    # use first digit (after trimming leading zeros if you want)
    first = c[0]
    return int(first) if first.isdigit() else 0


def fetch_littera_id(conn: psycopg.Connection, project_id: str, code: str) -> Optional[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT littera_id
            FROM litteras
            WHERE project_id = %s::uuid AND code = %s
            LIMIT 1
            """,
            (project_id, code),
        )
        row = cur.fetchone()
        return str(row[0]) if row else None


def upsert_littera(conn: psycopg.Connection, project_id: str, code: str, title: Optional[str]) -> None:
    grp = group_code_from_code(code)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO litteras (project_id, code, title, group_code)
            VALUES (%s::uuid, %s, %s, %s)
            ON CONFLICT (project_id, code) DO NOTHING
            """,
            (project_id, code, title, grp),
        )


def import_batches_has_signature(conn: psycopg.Connection, project_id: str, source_system: str, signature: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM import_batches
            WHERE project_id = %s::uuid AND source_system = %s AND signature = %s
            LIMIT 1
            """,
            (project_id, source_system, signature),
        )
        return cur.fetchone() is not None


def insert_import_batch(conn: psycopg.Connection, project_id: str, source_system: str, imported_by: str, signature: str, notes: str) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO import_batches (project_id, source_system, imported_by, signature, notes)
            VALUES (%s::uuid, %s, %s, %s, %s)
            RETURNING import_batch_id
            """,
            (project_id, source_system, imported_by, signature, notes),
        )
        return str(cur.fetchone()[0])


def insert_actual_line(
    conn: psycopg.Connection,
    project_id: str,
    work_littera_id: str,
    amount: Decimal,
    occurred_on: date,
    import_batch_id: str,
    external_ref: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO actual_cost_lines
              (project_id, work_littera_id, cost_type, amount, occurred_on, source, import_batch_id, external_ref)
            VALUES
              (%s::uuid, %s::uuid, 'OTHER'::cost_type, %s, %s, 'JYDA'::actual_source, %s::uuid, %s)
            """,
            (project_id, work_littera_id, str(amount), occurred_on, import_batch_id, external_ref),
        )


def read_csv_rows(csv_path: Path, *, use_unapproved: bool) -> Dict[str, Tuple[str, Decimal]]:
    """
    Returns dict: code -> (name, actual_amount)
    If duplicates, sums amounts.
    """
    encoding_candidates = ["utf-8", "cp1252", "ISO-8859-1"]
    last_err = None

    for enc in encoding_candidates:
        try:
            with csv_path.open("r", encoding=enc, newline="") as f:
                reader = csv.DictReader(f, delimiter=";")
                if reader.fieldnames is None:
                    die("CSV has no header row.")
                if COL_CODE not in reader.fieldnames:
                    die(f"CSV missing column '{COL_CODE}'. Found: {reader.fieldnames}")

                actual_col = COL_ACTUAL_WITH_UNAPPROVED if use_unapproved else COL_ACTUAL
                if actual_col not in reader.fieldnames:
                    die(f"CSV missing column '{actual_col}'. Found: {reader.fieldnames}")

                out: Dict[str, Tuple[str, Decimal]] = {}
                for row in reader:
                    code = (row.get(COL_CODE) or "").strip()
                    if not code:
                        continue

                    name = (row.get(COL_NAME) or "").strip()
                    amt = parse_fi_number(row.get(actual_col), field_name=actual_col)

                    if code in out:
                        old_name, old_amt = out[code]
                        out[code] = (old_name or name, old_amt + amt)
                    else:
                        out[code] = (name, amt)

                return out
        except Exception as e:
            last_err = e

    die(f"Failed to read CSV with encodings {encoding_candidates}. Last error: {last_err}")
    return {}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project-id", required=True)
    ap.add_argument("--file", required=True, help="JYDA CSV file")
    ap.add_argument("--occurred-on", required=True, help="YYYY-MM-DD (date to store actuals under)")
    ap.add_argument("--imported-by", default="IMPORT", help="Name shown in import_batches")
    ap.add_argument("--source-system", default=DEFAULT_SOURCE_SYSTEM)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--allow-duplicate", action="store_true")
    ap.add_argument("--auto-seed-litteras", action="store_true", help="Create missing litteras automatically from CSV")
    ap.add_argument("--use-unapproved", action="store_true", help="Use 'Toteutunut kustannus (sis. hyväksymätt.)' column")
    ap.add_argument("--database-url", default=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    args = ap.parse_args()

    csv_path = Path(args.file)
    if not csv_path.exists():
        die(f"File not found: {csv_path}")

    try:
        occurred_on = date.fromisoformat(args.occurred_on)
    except ValueError:
        die("Invalid --occurred-on. Use YYYY-MM-DD, e.g. 2025-12-01")

    rows = read_csv_rows(csv_path, use_unapproved=args.use_unapproved)
    if not rows:
        die("No rows found from CSV.")

    # Keep only non-zero amounts
    rows = {k: v for k, v in rows.items() if v[1] != 0}

    print(f"Read {len(rows)} code rows with non-zero actual amounts.")
    print(f"Using occurred_on={occurred_on} and cost_type=OTHER")

    dsn = args.database_url
    signature = sha256_file(csv_path)
    print(f"DB: {dsn}")
    print(f"Signature (sha256): {signature}")

    with psycopg.connect(dsn) as conn:
        conn.autocommit = False

        # Optional: prevent double import
        if not args.dry_run and not args.allow_duplicate:
            if import_batches_has_signature(conn, args.project_id, args.source_system, signature):
                die("This file signature has already been imported. Use --allow-duplicate to force (not recommended).")

        # Ensure litteras exist (or seed)
        missing: List[str] = []
        littera_map: Dict[str, str] = {}

        for code, (name, _amt) in rows.items():
            lid = fetch_littera_id(conn, args.project_id, code)
            if lid is None:
                if args.auto_seed_litteras:
                    upsert_littera(conn, args.project_id, code, name or None)
                    lid = fetch_littera_id(conn, args.project_id, code)
                if lid is None:
                    missing.append(code)
                else:
                    littera_map[code] = lid
            else:
                littera_map[code] = lid

        if missing:
            die(
                "Missing litteras for these Koodi values:\n"
                + "\n".join(f"- {c}" for c in sorted(missing))
                + "\n\nRun with --auto-seed-litteras or insert them into litteras first."
            )

        if args.dry_run:
            total = sum((amt for _name, amt in rows.values()), Decimal("0"))
            print(f"DRY RUN: would insert {len(rows)} actual_cost_lines rows, total amount={total}")
            conn.rollback()
            return

        # Create import batch
        notes = f"JYDA CSV import: {csv_path.name}"
        import_batch_id = insert_import_batch(conn, args.project_id, args.source_system, args.imported_by, signature, notes)
        print(f"Created import_batch_id: {import_batch_id}")

        inserted = 0
        for code, (_name, amt) in sorted(rows.items(), key=lambda x: x[0]):
            lid = littera_map[code]
            external_ref = f"JYDA_CSV:{code}"
            insert_actual_line(conn, args.project_id, lid, amt, occurred_on, import_batch_id, external_ref)
            inserted += 1

        conn.commit()
        print(f"OK: inserted {inserted} actual_cost_lines rows (import_batch_id={import_batch_id}).")


if __name__ == "__main__":
    main()
