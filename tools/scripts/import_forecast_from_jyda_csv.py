#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
import_forecast_from_jyda_csv.py
- Reads JYDA CSV export (delimiter=';')
- Inserts forecast totals into forecast_cost_lines
- Uses column: 'Ennustettu kustannus'
- cost_type defaults to OTHER (CSV has totals, not split by cost type)
- occurred_on is provided via --occurred-on (YYYY-MM-DD)

Dry-run prints how many rows and total amount.
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
SOURCE_SYSTEM = "JYDA_CSV_FORECAST"

COL_CODE = "Koodi"
COL_NAME = "Nimi"
COL_FORECAST = "Ennustettu kustannus"


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


def read_forecast(csv_path: Path) -> Dict[str, Tuple[str, Decimal]]:
    """code -> (name, forecast_amount) aggregated"""
    encodings = ["utf-8", "cp1252", "ISO-8859-1"]
    last_err = None

    for enc in encodings:
        try:
            with csv_path.open("r", encoding=enc, newline="") as f:
                reader = csv.DictReader(f, delimiter=";")
                if reader.fieldnames is None:
                    die("CSV has no header row.")
                if COL_CODE not in reader.fieldnames or COL_FORECAST not in reader.fieldnames:
                    die(f"CSV missing required columns. Need '{COL_CODE}' and '{COL_FORECAST}'. Found: {reader.fieldnames}")

                out: Dict[str, Tuple[str, Decimal]] = {}
                for row in reader:
                    code = (row.get(COL_CODE) or "").strip()
                    if not code:
                        continue
                    name = (row.get(COL_NAME) or "").strip()
                    amt = parse_fi_number(row.get(COL_FORECAST), field_name=COL_FORECAST)

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


def fetch_littera_id(conn: psycopg.Connection, project_id: str, code: str) -> Optional[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT littera_id FROM litteras WHERE project_id=%s::uuid AND code=%s LIMIT 1",
            (project_id, code),
        )
        row = cur.fetchone()
        return str(row[0]) if row else None


def upsert_littera(conn: psycopg.Connection, project_id: str, code: str, title: Optional[str]) -> None:
    grp = int(code[0]) if code and code[0].isdigit() else 0
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO litteras (project_id, code, title, group_code)
            VALUES (%s::uuid, %s, %s, %s)
            ON CONFLICT (project_id, code) DO NOTHING
            """,
            (project_id, code, title, grp),
        )


def import_batches_has_signature(conn: psycopg.Connection, project_id: str, signature: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM import_batches
            WHERE project_id=%s::uuid AND source_system=%s AND signature=%s
            LIMIT 1
            """,
            (project_id, SOURCE_SYSTEM, signature),
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
            (project_id, SOURCE_SYSTEM, imported_by, signature, notes),
        )
        return str(cur.fetchone()[0])


def insert_forecast_line(
    conn: psycopg.Connection,
    project_id: str,
    work_littera_id: str,
    amount: Decimal,
    occurred_on: date,
    import_batch_id: str,
    code: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO forecast_cost_lines
              (project_id, work_littera_id, cost_type, amount, occurred_on, source, import_batch_id, external_ref)
            VALUES
              (%s::uuid, %s::uuid, 'OTHER'::cost_type, %s, %s, 'JYDA'::actual_source, %s::uuid, %s)
            """,
            (project_id, work_littera_id, str(q2(amount)), occurred_on, import_batch_id, f"JYDA_CSV_FORECAST:{code}"),
        )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project-id", required=True)
    ap.add_argument("--file", required=True)
    ap.add_argument("--occurred-on", required=True, help="YYYY-MM-DD (forecast month key)")
    ap.add_argument("--imported-by", default="IMPORT")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--allow-duplicate", action="store_true")
    ap.add_argument("--auto-seed-litteras", action="store_true")
    ap.add_argument("--database-url", default=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    args = ap.parse_args()

    csv_path = Path(args.file)
    if not csv_path.exists():
        die(f"File not found: {csv_path}")

    try:
        occurred_on = date.fromisoformat(args.occurred_on)
    except ValueError:
        die("Invalid --occurred-on. Use YYYY-MM-DD.")

    rows = read_forecast(csv_path)
    # Keep only non-zero
    rows = {k: v for k, v in rows.items() if v[1] != 0}
    print(f"Read {len(rows)} code rows with non-zero forecast amounts.")
    print(f"Using occurred_on={occurred_on} and cost_type=OTHER")
    signature = sha256_file(csv_path)
    print(f"DB: {args.database_url}")
    print(f"Signature (sha256): {signature}")

    with psycopg.connect(args.database_url) as conn:
        conn.autocommit = False

        if not args.dry_run and not args.allow_duplicate:
            if import_batches_has_signature(conn, args.project_id, signature):
                die("This forecast signature has already been imported. Use --allow-duplicate to force.")

        missing: List[str] = []
        littera_map: Dict[str, str] = {}

        for code, (name, _amt) in rows.items():
            lid = fetch_littera_id(conn, args.project_id, code)
            if lid is None and args.auto_seed_litteras:
                upsert_littera(conn, args.project_id, code, name or None)
                lid = fetch_littera_id(conn, args.project_id, code)
            if lid is None:
                missing.append(code)
            else:
                littera_map[code] = lid

        if missing:
            die("Missing litteras for these codes:\n" + "\n".join(sorted(missing)))

        total = q2(sum((amt for _name, amt in rows.values()), Decimal("0")))
        if args.dry_run:
            print(f"DRY RUN: would insert {len(rows)} forecast_cost_lines rows, total amount={total}")
            conn.rollback()
            return

        import_batch_id = insert_import_batch(conn, args.project_id, args.imported_by, signature, f"Forecast import from {csv_path.name}")
        inserted = 0
        for code, (_name, amt) in sorted(rows.items(), key=lambda x: x[0]):
            insert_forecast_line(conn, args.project_id, littera_map[code], amt, occurred_on, import_batch_id, code)
            inserted += 1

        conn.commit()
        print(f"OK: inserted {inserted} forecast_cost_lines rows (import_batch_id={import_batch_id}).")


if __name__ == "__main__":
    main()
