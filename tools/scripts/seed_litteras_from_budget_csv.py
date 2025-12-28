#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import csv
import os
from pathlib import Path
from typing import Dict, Tuple

import psycopg

from db_url_redact import redact_database_url

DEFAULT_DATABASE_URL = "postgresql://codex:codex@127.0.0.1:5433/codex"

COL_CODE = "Litterakoodi"
COL_TITLE = "Litteraselite"


def group_code_from_littera(code: str) -> int:
    # "0100" -> 0, "5600" -> 5
    s = code.strip()
    if not s or not s[0].isdigit():
        return 0
    return int(s[0])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project-id", required=True)
    ap.add_argument("--file", required=True, help="budget.csv (CSV UTF-8, delimiter=';')")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--database-url", default=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    args = ap.parse_args()

    csv_path = Path(args.file)
    if not csv_path.exists():
        raise SystemExit(f"File not found: {csv_path}")

    # Kerää uniikit (code -> title)
    found: Dict[str, str] = {}
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        if reader.fieldnames is None:
            raise SystemExit("CSV has no header row.")
        if COL_CODE not in reader.fieldnames:
            raise SystemExit(f"CSV missing column: {COL_CODE}")

        for row in reader:
            code = (row.get(COL_CODE) or "").strip()
            if code == "":
                continue
            title = (row.get(COL_TITLE) or "").strip()
            if code not in found:
                found[code] = title

    if not found:
        raise SystemExit("No Litterakoodi values found in CSV.")

    print(f"Found {len(found)} unique littera codes in CSV.")

    # DB insert
    dsn = args.database_url
    print(f"DB: {redact_database_url(dsn)}")

    codes_sorted = sorted(found.keys())

    if args.dry_run:
        print("DRY RUN: would insert these codes (first 20 shown):")
        for c in codes_sorted[:20]:
            print(f" - {c}  ({found[c]})")
        print("DRY RUN: no data written.")
        return

    inserted = 0
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            for code in codes_sorted:
                title = found.get(code, "") or None
                grp = group_code_from_littera(code)

                cur.execute(
                    """
                    INSERT INTO litteras (project_id, code, title, group_code)
                    VALUES (%s::uuid, %s, %s, %s)
                    ON CONFLICT (project_id, code) DO NOTHING
                    """,
                    (args.project_id, code, title, grp),
                )
                inserted += cur.rowcount

        conn.commit()

    print(f"OK: inserted {inserted} new litteras rows (others already existed).")


if __name__ == "__main__":
    main()
