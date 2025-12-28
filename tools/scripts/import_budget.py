#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
import_budget.py (CSV-only)
- Reads Finnish CSV exported from Excel:
  delimiter=';'
  decimals: ',' and thousand separator: space
- Aggregates to Litterakoodi level and inserts into:
  - import_batches
  - budget_lines
- No openpyxl dependency.

Usage (dry-run):
  python tools/scripts/import_budget.py --project-id <UUID> --file data/budget.csv --imported-by Pekka --dry-run

Usage (write):
  python tools/scripts/import_budget.py --project-id <UUID> --file data/budget.csv --imported-by Pekka

DB connection:
  Uses env DATABASE_URL if set, else defaults to local dev:
  postgresql://codex:codex@127.0.0.1:5433/codex
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import sys
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Dict, Tuple, List, Optional

import psycopg

from db_url_redact import redact_database_url


DEFAULT_DATABASE_URL = "postgresql://codex:codex@127.0.0.1:5433/codex"
DEFAULT_SOURCE_SYSTEM = "TARGET_ESTIMATE"

# Expected headers (your file has these)
COL_LITTERA_CODE = "Litterakoodi"
COL_LITTERA_TITLE = "Litteraselite"

COL_LABOR_EUR = "Työ €"
COL_MATERIAL_EUR = "Aine €"
COL_SUBCONTRACT_EUR = "Alih €"
COL_RENTAL_EUR = "Vmiehet €"
COL_OTHER_EUR = "Muu €"
COL_SUM_EUR = "Summa"  # used for sanity check only


COST_TYPES = [
    ("LABOR", COL_LABOR_EUR),
    ("MATERIAL", COL_MATERIAL_EUR),
    ("SUBCONTRACT", COL_SUBCONTRACT_EUR),
    ("RENTAL", COL_RENTAL_EUR),
    ("OTHER", COL_OTHER_EUR),
]


@dataclass(frozen=True)
class CostAgg:
    labor: Decimal = Decimal("0")
    material: Decimal = Decimal("0")
    subcontract: Decimal = Decimal("0")
    rental: Decimal = Decimal("0")
    other: Decimal = Decimal("0")

    def add(self, labor: Decimal, material: Decimal, subcontract: Decimal, rental: Decimal, other: Decimal) -> "CostAgg":
        return CostAgg(
            labor=self.labor + labor,
            material=self.material + material,
            subcontract=self.subcontract + subcontract,
            rental=self.rental + rental,
            other=self.other + other,
        )

    def total(self) -> Decimal:
        return self.labor + self.material + self.subcontract + self.rental + self.other


def die(msg: str, exit_code: int = 1) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(exit_code)


def parse_fi_number(value: Optional[str], *, field_name: str = "") -> Decimal:
    """
    Convert Finnish formatted number string to Decimal:
      - thousand separator: space
      - decimal separator: comma
    Examples:
      "19 555,00" -> Decimal("19555.00")
      "0,00" -> Decimal("0.00")
      ""/None -> 0
    """
    if value is None:
        return Decimal("0")

    s = value.strip()
    if s == "":
        return Decimal("0")

    # Some CSV exports may have non-breaking spaces
    s = s.replace("\u00A0", " ")
    s = s.replace(" ", "")
    s = s.replace(",", ".")

    try:
        return Decimal(s)
    except InvalidOperation:
        raise ValueError(f"Cannot parse number '{value}' in field '{field_name}'")


def quantize_eur(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize_littera_code(raw: str) -> Tuple[str, str]:
    """
    Returns (code_primary, code_alt)
    primary = raw as-is (trimmed)
    alt = stripped leading zeros (or "0" if all zeros)
    """
    code = raw.strip()
    alt = code.lstrip("0")
    if alt == "":
        alt = "0"
    return code, alt


def read_and_aggregate_csv(csv_path: Path) -> Tuple[Dict[str, CostAgg], Dict[str, str], int, int]:
    """
    Returns:
      - agg_by_littera_code: { '0100': CostAgg(...) }
      - title_by_littera_code: { '0100': 'Tontti...' } (first non-empty)
      - rows_read
      - rows_skipped
    """
    agg: Dict[str, CostAgg] = {}
    titles: Dict[str, str] = {}
    rows_read = 0
    rows_skipped = 0

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        if reader.fieldnames is None:
            die("CSV has no header row.")

        # Basic header check (only the ones we need)
        required = [COL_LITTERA_CODE, COL_LABOR_EUR, COL_MATERIAL_EUR, COL_SUBCONTRACT_EUR, COL_RENTAL_EUR, COL_OTHER_EUR]
        missing_headers = [h for h in required if h not in reader.fieldnames]
        if missing_headers:
            die(f"CSV missing required columns: {missing_headers}\nFound columns: {reader.fieldnames}")

        for row in reader:
            rows_read += 1
            raw_code = (row.get(COL_LITTERA_CODE) or "").strip()

            # Skip summary/footer rows (e.g. ';;;;;;;;519 505,52...')
            if raw_code == "":
                rows_skipped += 1
                continue

            # Keep code exactly as in file (e.g. '0100')
            code = raw_code

            # Parse cost euros
            labor = parse_fi_number(row.get(COL_LABOR_EUR), field_name=COL_LABOR_EUR)
            material = parse_fi_number(row.get(COL_MATERIAL_EUR), field_name=COL_MATERIAL_EUR)
            subcontract = parse_fi_number(row.get(COL_SUBCONTRACT_EUR), field_name=COL_SUBCONTRACT_EUR)
            rental = parse_fi_number(row.get(COL_RENTAL_EUR), field_name=COL_RENTAL_EUR)
            other = parse_fi_number(row.get(COL_OTHER_EUR), field_name=COL_OTHER_EUR)

            # If everything is zero, skip row (no effect)
            if (labor + material + subcontract + rental + other) == 0:
                rows_skipped += 1
                continue

            prev = agg.get(code, CostAgg())
            agg[code] = prev.add(labor, material, subcontract, rental, other)

            # Capture title if available
            t = (row.get(COL_LITTERA_TITLE) or "").strip()
            if t and code not in titles:
                titles[code] = t

    return agg, titles, rows_read, rows_skipped


def fetch_littera_id(conn: psycopg.Connection, project_id: str, code: str) -> Optional[str]:
    """
    Try exact match on code; if not found try without leading zeros.
    Returns littera_id as string UUID or None.
    """
    code_primary, code_alt = normalize_littera_code(code)

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT littera_id
            FROM litteras
            WHERE project_id = %s::uuid
              AND code = %s
            LIMIT 1
            """,
            (project_id, code_primary),
        )
        row = cur.fetchone()
        if row:
            return str(row[0])

        if code_alt != code_primary:
            cur.execute(
                """
                SELECT littera_id
                FROM litteras
                WHERE project_id = %s::uuid
                  AND code = %s
                LIMIT 1
                """,
                (project_id, code_alt),
            )
            row = cur.fetchone()
            if row:
                return str(row[0])

    return None


def import_batches_has_signature(conn: psycopg.Connection, project_id: str, source_system: str, signature: str) -> bool:
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


def insert_budget_line(
    conn: psycopg.Connection,
    project_id: str,
    target_littera_id: str,
    cost_type: str,
    amount: Decimal,
    import_batch_id: str,
    created_by: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO budget_lines (project_id, target_littera_id, cost_type, amount, source, import_batch_id, created_by)
            VALUES (%s::uuid, %s::uuid, %s::cost_type, %s, 'IMPORT'::budget_source, %s::uuid, %s)
            """,
            (project_id, target_littera_id, cost_type, str(quantize_eur(amount)), import_batch_id, created_by),
        )


def print_summary(agg: Dict[str, CostAgg], titles: Dict[str, str]) -> None:
    print("\n=== Aggregated budget (by Litterakoodi) ===")
    codes = sorted(agg.keys())
    grand = CostAgg()
    for code in codes:
        a = agg[code]
        grand = grand.add(a.labor, a.material, a.subcontract, a.rental, a.other)
        title = titles.get(code, "")
        title_part = f" – {title}" if title else ""
        print(f"{code}{title_part}")
        print(f"  LABOR:       {quantize_eur(a.labor)}")
        print(f"  MATERIAL:    {quantize_eur(a.material)}")
        print(f"  SUBCONTRACT: {quantize_eur(a.subcontract)}")
        print(f"  RENTAL:      {quantize_eur(a.rental)}")
        print(f"  OTHER:       {quantize_eur(a.other)}")
        print(f"  TOTAL:       {quantize_eur(a.total())}")
    print("\n=== Grand totals ===")
    print(f"LABOR:       {quantize_eur(grand.labor)}")
    print(f"MATERIAL:    {quantize_eur(grand.material)}")
    print(f"SUBCONTRACT: {quantize_eur(grand.subcontract)}")
    print(f"RENTAL:      {quantize_eur(grand.rental)}")
    print(f"OTHER:       {quantize_eur(grand.other)}")
    print(f"TOTAL:       {quantize_eur(grand.total())}")
    print("")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import budget (CSV-only) into Postgres.")
    parser.add_argument("--project-id", required=True, help="Project UUID.")
    parser.add_argument("--file", required=True, help="Path to CSV (UTF-8, ';' delimited).")
    parser.add_argument("--imported-by", required=True, help="Actor name for audit.")
    parser.add_argument("--source-system", default=DEFAULT_SOURCE_SYSTEM, help=f"Source system label (default: {DEFAULT_SOURCE_SYSTEM}).")
    parser.add_argument("--dry-run", action="store_true", help="Read and aggregate, but do not write to DB.")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL), help="Postgres connection string.")
    parser.add_argument("--allow-duplicate", action="store_true", help="Allow importing same signature again (NOT recommended).")
    args = parser.parse_args()

    csv_path = Path(args.file)
    if not csv_path.exists():
        die(f"File not found: {csv_path}")

    # Read & aggregate
    try:
        agg, titles, rows_read, rows_skipped = read_and_aggregate_csv(csv_path)
    except Exception as e:
        die(f"Failed reading CSV: {e}")

    if not agg:
        die("No non-zero budget rows found after aggregation (nothing to import).")

    print(f"CSV read ok: {rows_read} rows, {rows_skipped} skipped (empty/zero/footer).")
    print_summary(agg, titles)

    # Connect DB
    dsn = args.database_url
    print(f"DB: {redact_database_url(dsn)}")
    signature = sha256_file(csv_path)
    print(f"Signature (sha256): {signature}")

    with psycopg.connect(dsn) as conn:
        conn.autocommit = False

        # Validate litteras exist + map codes
        missing: List[str] = []
        littera_map: Dict[str, str] = {}  # code_in_file -> littera_id
        for code in sorted(agg.keys()):
            lid = fetch_littera_id(conn, args.project_id, code)
            if lid is None:
                missing.append(code)
            else:
                littera_map[code] = lid

        if missing:
            die(
                "Missing litteras for these Litterakoodi values:\n"
                + "\n".join(f"- {c}" for c in missing)
                + "\n\nAdd them to litteras table for this project, then rerun."
            )

        # Dry-run ends here (after validation)
        if args.dry_run:
            print("DRY RUN: validation ok, no data written.")
            conn.rollback()
            return

        # Duplicate check
        if not args.allow_duplicate and import_batches_has_signature(conn, args.project_id, args.source_system, signature):
            die(
                "This file signature has already been imported for this project/source_system.\n"
                "If you really want to import again, rerun with --allow-duplicate (NOT recommended)."
            )

        # Insert import batch
        notes = f"Budget import from CSV: {csv_path.name}"
        import_batch_id = insert_import_batch(conn, args.project_id, args.source_system, args.imported_by, signature, notes)
        print(f"Created import_batch_id: {import_batch_id}")

        # Insert budget lines per littera per cost_type
        inserted = 0
        for code in sorted(agg.keys()):
            a = agg[code]
            target_littera_id = littera_map[code]

            cost_values = {
                "LABOR": a.labor,
                "MATERIAL": a.material,
                "SUBCONTRACT": a.subcontract,
                "RENTAL": a.rental,
                "OTHER": a.other,
            }

            for cost_type, amount in cost_values.items():
                if amount <= 0:
                    continue
                insert_budget_line(
                    conn,
                    project_id=args.project_id,
                    target_littera_id=target_littera_id,
                    cost_type=cost_type,
                    amount=amount,
                    import_batch_id=import_batch_id,
                    created_by=args.imported_by,
                )
                inserted += 1

        conn.commit()
        print(f"OK: inserted {inserted} budget_lines rows (import_batch_id={import_batch_id}).")


if __name__ == "__main__":
    main()
