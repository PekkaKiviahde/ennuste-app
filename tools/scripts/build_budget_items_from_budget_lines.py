#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_budget_items_from_budget_lines.py

Builds synthetic budget_items rows from budget_lines (TARGET_ESTIMATE) for smoke/dev.
- Finds latest TARGET_ESTIMATE import_batch_id
- Aggregates budget_lines by littera_id and cost_type
- Inserts one budget_item per littera (append-only)
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys
from decimal import Decimal
from typing import Dict, List, Tuple

import psycopg

from db_url_redact import redact_database_url


DEFAULT_DATABASE_URL = "postgresql://codex:codex@127.0.0.1:5433/codex"
DEFAULT_IMPORTED_BY = os.environ.get("IMPORTED_BY", getpass.getuser())


def die(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def fetch_latest_target_estimate_batch(cur, project_id: str) -> str:
    cur.execute(
        """
        SELECT import_batch_id
        FROM import_batches
        WHERE project_id=%s::uuid AND source_system='TARGET_ESTIMATE'
        ORDER BY imported_at DESC
        LIMIT 1
        """,
        (project_id,),
    )
    row = cur.fetchone()
    if not row:
        raise RuntimeError("TARGET_ESTIMATE import_batch_id puuttuu. Aja budjetti-importti ensin.")
    return str(row[0])


def fetch_existing_budget_items(cur, project_id: str, import_batch_id: str) -> Tuple[int, int]:
    cur.execute(
        """
        SELECT COUNT(*), COALESCE(MAX(row_no), 0)
        FROM budget_items
        WHERE project_id=%s::uuid AND import_batch_id=%s::uuid
        """,
        (project_id, import_batch_id),
    )
    row = cur.fetchone()
    return int(row[0]), int(row[1])


def fetch_budget_line_sums(cur, project_id: str, import_batch_id: str) -> List[Dict[str, object]]:
    cur.execute(
        """
        SELECT bl.target_littera_id,
               l.code,
               l.title,
               SUM(CASE WHEN bl.cost_type='LABOR' THEN bl.amount ELSE 0 END)::numeric AS labor_eur,
               SUM(CASE WHEN bl.cost_type='MATERIAL' THEN bl.amount ELSE 0 END)::numeric AS material_eur,
               SUM(CASE WHEN bl.cost_type='SUBCONTRACT' THEN bl.amount ELSE 0 END)::numeric AS subcontract_eur,
               SUM(CASE WHEN bl.cost_type='RENTAL' THEN bl.amount ELSE 0 END)::numeric AS rental_eur,
               SUM(CASE WHEN bl.cost_type='OTHER' THEN bl.amount ELSE 0 END)::numeric AS other_eur,
               SUM(bl.amount)::numeric AS total_eur
        FROM budget_lines bl
        JOIN litteras l
          ON l.project_id = bl.project_id
         AND l.littera_id = bl.target_littera_id
        WHERE bl.project_id=%s::uuid
          AND bl.import_batch_id=%s::uuid
        GROUP BY bl.target_littera_id, l.code, l.title
        ORDER BY l.code
        """,
        (project_id, import_batch_id),
    )
    out: List[Dict[str, object]] = []
    for row in cur.fetchall():
        (
            littera_id,
            code,
            title,
            labor_eur,
            material_eur,
            subcontract_eur,
            rental_eur,
            other_eur,
            total_eur,
        ) = row
        out.append(
            {
                "littera_id": str(littera_id),
                "code": str(code),
                "title": str(title) if title is not None else "",
                "labor_eur": Decimal(str(labor_eur or 0)),
                "material_eur": Decimal(str(material_eur or 0)),
                "subcontract_eur": Decimal(str(subcontract_eur or 0)),
                "rental_eur": Decimal(str(rental_eur or 0)),
                "other_eur": Decimal(str(other_eur or 0)),
                "total_eur": Decimal(str(total_eur or 0)),
            }
        )
    return out


def insert_budget_item(
    cur,
    project_id: str,
    import_batch_id: str,
    row_no: int,
    littera_id: str,
    item_code: str,
    item_desc: str,
    labor_eur: Decimal,
    material_eur: Decimal,
    subcontract_eur: Decimal,
    rental_eur: Decimal,
    other_eur: Decimal,
    total_eur: Decimal,
    created_by: str,
) -> None:
    cur.execute(
        """
        INSERT INTO budget_items (
          project_id, import_batch_id, littera_id, item_code, item_desc, row_no,
          labor_eur, material_eur, subcontract_eur, rental_eur, other_eur, total_eur,
          created_by
        ) VALUES (
          %s::uuid, %s::uuid, %s::uuid, %s, %s, %s,
          %s, %s, %s, %s, %s, %s,
          %s
        )
        """,
        (
            project_id,
            import_batch_id,
            littera_id,
            item_code,
            item_desc,
            row_no,
            str(labor_eur),
            str(material_eur),
            str(subcontract_eur),
            str(rental_eur),
            str(other_eur),
            str(total_eur),
            created_by,
        ),
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="Build budget_items from budget_lines (TARGET_ESTIMATE).")
    ap.add_argument("--project-id", required=True)
    ap.add_argument("--imported-by", default=DEFAULT_IMPORTED_BY)
    ap.add_argument("--database-url", default=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="Append even if batch already has items.")
    args = ap.parse_args()

    if not args.database_url:
        die("DATABASE_URL puuttuu.")

    print(f"DB: {redact_database_url(args.database_url)}")

    with psycopg.connect(args.database_url) as conn:
        conn.autocommit = False
        with conn.cursor() as cur:
            batch_id = fetch_latest_target_estimate_batch(cur, args.project_id)
            existing_count, max_row_no = fetch_existing_budget_items(cur, args.project_id, batch_id)

            if existing_count > 0 and not args.force:
                print(
                    "budget_items on jo täytetty tälle TARGET_ESTIMATE batchille. "
                    "Aja --force jos haluat lisätä append-only-rivejä."
                )
                conn.rollback()
                return

            rows = fetch_budget_line_sums(cur, args.project_id, batch_id)
            if not rows:
                die("budget_lines puuttuu TARGET_ESTIMATE batchilta.")

            start_row_no = max_row_no + 1
            print(f"TARGET_ESTIMATE batch_id: {batch_id}")
            print(f"Rivejä (littera): {len(rows)}")
            print(f"Row_no alkaa: {start_row_no}")

            if args.dry_run:
                conn.rollback()
                print("DRY RUN: ei kirjoiteta budget_items rivejä.")
                return

            inserted = 0
            row_no = start_row_no
            for row in rows:
                code = row["code"]
                title = row["title"]
                item_desc = f"Synteettinen budget_lines summa: {code}"
                if title:
                    item_desc = f"{item_desc} – {title}"

                insert_budget_item(
                    cur,
                    args.project_id,
                    batch_id,
                    row_no,
                    row["littera_id"],
                    item_code=code,
                    item_desc=item_desc,
                    labor_eur=row["labor_eur"],
                    material_eur=row["material_eur"],
                    subcontract_eur=row["subcontract_eur"],
                    rental_eur=row["rental_eur"],
                    other_eur=row["other_eur"],
                    total_eur=row["total_eur"],
                    created_by=args.imported_by,
                )
                inserted += 1
                row_no += 1

            conn.commit()
            print(f"OK: inserted {inserted} budget_items rows (batch={batch_id}).")


if __name__ == "__main__":
    main()
