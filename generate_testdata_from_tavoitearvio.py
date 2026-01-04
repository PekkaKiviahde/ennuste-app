# -*- coding: utf-8 -*-
"""
Generate synthetic test CSVs from Tavoitearvio Kaarna Päivitetty 17.12.2025.csv

Outputs (semicolon-separated, UTF-8):
- seed_control.csv
- numbers_formats.csv
- broken_totals.csv
- bad_codes.csv
- duplicates_conflicts.csv
- text_encoding.csv

Usage:
  python generate_testdata_from_tavoitearvio.py --in "Tavoitearvio Kaarna Päivitetty 17.12.2025.csv" --out ./out --rows 260 --seed 42

Notes:
- Intentionally produces invalid / inconsistent rows (by design).
- Keeps the same headers as the input file.
"""

import argparse, csv, math, random, string
from pathlib import Path
import numpy as np
import pandas as pd

def sniff_sep(path: Path) -> str:
    sample = path.read_bytes()[:50000].decode("utf-8", errors="ignore")
    return csv.Sniffer().sniff(sample, delimiters=";,|\t").delimiter

def parse_num(s):
    if s is None:
        return None
    s = str(s).strip()
    if s == "":
        return None
    s2 = s.replace("\u00A0", " ").replace(" ", "")
    if "," in s2 and "." in s2:
        s2 = s2.replace(".", "").replace(",", ".")
    else:
        s2 = s2.replace(",", ".")
    try:
        return float(s2)
    except:
        return None

def format_num_variant(x: float, variant: int):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return ""
    if variant == 0:
        return f"{x:.2f}".replace(".", ",")
    if variant == 1:
        return f"{x:.2f}"
    if variant == 2:
        s = f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", " ")
        return s
    if variant == 3:
        return str(int(round(x, 0)))
    if variant == 4:
        return f"{x:.3e}"
    if variant == 5:
        return f"  {f'{x:.2f}'.replace('.', ',')}  "
    return f"{x:.2f}".replace(".", ",")

def sample_rows(df, n_rows: int, seed: int):
    if len(df) >= n_rows:
        return df.sample(n=n_rows, random_state=seed).reset_index(drop=True)
    return df.sample(n=n_rows, replace=True, random_state=seed).reset_index(drop=True)

def add_noise_numeric(df_in, num_cols, pct=0.03):
    out = df_in.copy()
    for c in num_cols:
        vals = out[c].tolist()
        new_vals = []
        for v in vals:
            x = parse_num(v)
            if x is None or random.random() > 0.35:
                new_vals.append(v)
                continue
            mult = 1 + random.uniform(-pct, pct)
            new_vals.append(format_num_variant(x * mult, 0))
        out[c] = new_vals
    return out

def mutate_numbers_formats(df_in, num_cols):
    out = df_in.copy()
    for c in num_cols:
        vals = out[c].tolist()
        new_vals = []
        for v in vals:
            x = parse_num(v)
            if x is None:
                new_vals.append("1 234,56" if random.random() < 0.15 else v)
                continue
            variant = random.choice([0,1,2,3,5,4])
            new_vals.append(format_num_variant(x, variant))
        out[c] = new_vals
    return out

def break_totals(df_in, cols, total_col):
    out = df_in.copy()
    totals = out[total_col].tolist()
    new_totals = []
    for v in totals:
        x = parse_num(v)
        r = random.random()
        if r < 0.25:
            new_totals.append(format_num_variant((x or 0) * random.uniform(0.2, 3.0), random.choice([0,1,2])))
        elif r < 0.40:
            new_totals.append(format_num_variant(-abs((x or random.uniform(1,1000))), random.choice([0,1,2,3])))
        elif r < 0.50:
            new_totals.append(format_num_variant(random.uniform(1e7, 1e9), 1))
        elif r < 0.60:
            new_totals.append("")
        else:
            new_totals.append(v)
    out[total_col] = new_totals

    for c in [col for col in cols if ("€" in col and col != total_col)]:
        vals = out[c].tolist()
        new_vals = []
        for v in vals:
            x = parse_num(v)
            r = random.random()
            if r < 0.15:
                new_vals.append("")
            elif r < 0.25:
                new_vals.append("NaN")
            elif r < 0.30:
                new_vals.append(format_num_variant(random.uniform(-5000, 5000), random.choice([0,1,2,4])))
            else:
                new_vals.append(v)
        out[c] = new_vals
    return out

def mutate_codes(df_in, item_code_col, littera_col):
    out = df_in.copy()
    def bad_code(code: str):
        s = str(code)
        choices = [s[: max(1, len(s)//2)], s + str(random.randint(0,9999)), "0" + s, f"  {s}  "]
        if len(s) >= 3:
            i = random.randint(1, len(s)-2)
            choices.append(s[:i] + random.choice(string.ascii_uppercase) + s[i+1:])
        return random.choice(choices)
    for col in [item_code_col, littera_col]:
        vals = out[col].tolist()
        new_vals = []
        for v in vals:
            if v == "" or random.random() > 0.35:
                new_vals.append(v)
            else:
                new_vals.append(bad_code(v))
        out[col] = new_vals
    return out

def duplicates_conflicts(df_in, cols, total_col):
    base = df_in.copy()
    n = len(base)
    dup_count = max(20, n//8)
    dup_idx = np.random.choice(np.arange(n), size=dup_count, replace=True)
    dups = base.iloc[dup_idx].copy()
    conf = base.sample(n=max(20, n//10), replace=False, random_state=42).copy()
    for c in [total_col, "Työ €", "Aine €", "Alih €", "Vmiehet €", "Muu €"]:
        if c in conf.columns:
            conf[c] = [format_num_variant(random.uniform(0, 50000), random.choice([0,1,2,3])) for _ in range(len(conf))]
    out = pd.concat([base, dups, conf], ignore_index=True)
    return out.sample(frac=1, random_state=42).reset_index(drop=True)

def text_encoding(df_in, desc_col, unit_col):
    out = df_in.copy()
    descs = out[desc_col].tolist()
    new_descs = []
    for d in descs:
        r = random.random()
        if r < 0.15:
            new_descs.append(d + " 😊")
        elif r < 0.25:
            new_descs.append(d + "\nLisärivi: tarkenne")
        elif r < 0.33:
            filler = " ".join(["pitkäteksti"]*400)
            new_descs.append((d + " " + filler)[:5000])
        elif r < 0.40:
            new_descs.append("Ääkköset: åäö ÅÄÖ — " + d)
        elif r < 0.45:
            new_descs.append('"' + d.replace('"', '""') + '"')
        else:
            new_descs.append(d)
    out[desc_col] = new_descs

    units = out[unit_col].tolist()
    new_units = []
    for u in units:
        r = random.random()
        if r < 0.20:
            new_units.append("m²")
        elif r < 0.30:
            new_units.append("kpl")
        elif r < 0.38:
            new_units.append("kg")
        elif r < 0.45:
            new_units.append("??")
        elif r < 0.50:
            new_units.append("  " + u + "  ")
        else:
            new_units.append(u)
    out[unit_col] = new_units
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="Input CSV")
    ap.add_argument("--out", dest="out", required=True, help="Output directory")
    ap.add_argument("--rows", dest="rows", type=int, default=260)
    ap.add_argument("--seed", dest="seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    inp = Path(args.inp)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    sep = sniff_sep(inp)
    df = pd.read_csv(inp, dtype=str, keep_default_na=False, sep=sep, engine="python", encoding_errors="ignore")

    cols = list(df.columns)
    item_code_col = "Koodi"
    littera_col = "Litterakoodi"
    desc_col = "Selite"
    unit_col = "Yksikkö"
    qty_col = "Määrä"
    total_col = "Summa"
    num_cols = [c for c in cols if ("€" in c) or (c == qty_col) or (c == total_col)]

    def save(df_out, name):
        df_out.to_csv(out_dir / name, index=False, sep=";", encoding="utf-8")

    seed_control = add_noise_numeric(sample_rows(df, args.rows, args.seed), num_cols, pct=0.02)
    numbers_formats_ds = mutate_numbers_formats(sample_rows(df, args.rows, args.seed + 1), num_cols)
    broken_totals_ds = break_totals(sample_rows(df, args.rows, args.seed + 2), cols, total_col)
    bad_codes_ds = mutate_codes(sample_rows(df, args.rows, args.seed + 3), item_code_col, littera_col)
    duplicates_conflicts_ds = duplicates_conflicts(sample_rows(df, args.rows, args.seed + 4), cols, total_col)
    text_encoding_ds = text_encoding(sample_rows(df, args.rows, args.seed + 5), desc_col, unit_col)

    save(seed_control, "seed_control.csv")
    save(numbers_formats_ds, "numbers_formats.csv")
    save(broken_totals_ds, "broken_totals.csv")
    save(bad_codes_ds, "bad_codes.csv")
    save(duplicates_conflicts_ds, "duplicates_conflicts.csv")
    save(text_encoding_ds, "text_encoding.csv")

    print("Wrote CSVs to:", out_dir)

if __name__ == "__main__":
    main()
