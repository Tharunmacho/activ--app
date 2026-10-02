#!/usr/bin/env python
"""
NIC_Codes_Updated.pdf  ->  NIC_Codes.csv  +  website/src/data/nicCodes.json

Run:  python scripts/nic-pdf-to-csv.py
Needs: pymupdf  (pip install pymupdf)

--------------------------------------------------------------------------
WHY THIS IS NOT A STRAIGHT DUMP: the PDF's codes have lost their leading zeros
--------------------------------------------------------------------------

The PDF was exported from a numeric column, so every NIC code was written as a
NUMBER and its leading zeros went with it. "014 Animal production" is printed as
"14", and so is "14 Manufacture of wearing apparel" — two different industries
sharing one printed code. Across the file that collapses 34 distinct codes into
17, and there are 3 more collisions one level down.

A dropdown keyed on a code that is not unique is a dropdown where picking
"Manufacture of wearing apparel" can store "Animal production", so the zeros
have to come back before the data is usable.

They are recoverable because NIC is strictly hierarchical and the rows are in
hierarchical order. A code's LEVEL — 2 division, 3 group, 4 class, 5 sub-class —
is whatever makes it a descendant of the row above it:

    printed   stack when reached        padded    level
    1         (empty)                   01        2   new division
    14        01                        014       3   child of 01
    141       01 / 014                  0141      4   child of 014
    1411      01 / 014 / 0141           01411     5   child of 0141
    ...
    14        13 / 139 / 1399 / ...     14        2   nothing to nest under

The last line is the collision resolved: the same printed "14", reached with a
different ancestry, is a division in its own right.

Two passes per row, because the PDF is missing a few intermediate rows (0161 and
2031 are absent, so their children have no parent to attach to):

  1. the exact parent is on the stack           -> that level
  2. failing that, SOME ancestor is             -> the level that nests under it
  3. failing that, it is a new division         -> pad to 2

The result is checked below and must stay: 0 duplicate codes, and the division
list must equal NIC-2008's 84 divisions (note the gaps — there is no 04, 34, 40,
44, 48, 54, 57, 67, 76, 83, 89 or 92, and their absence is what says the
reconstruction is right rather than merely self-consistent).

`NIC_DataID` is dropped, as asked. It is a row id from whatever system exported
the file and means nothing here.
"""

import csv
import json
import os
import re
import sys
from collections import Counter

try:
    import fitz  # pymupdf
except ImportError:
    sys.exit("pymupdf is required:  pip install pymupdf")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "NIC_Codes_Updated.pdf")
CSV_OUT = os.path.join(ROOT, "NIC_Codes.csv")
JSON_OUT = os.path.join(ROOT, "website", "src", "data", "nicCodes.json")

# NIC-2008's divisions. The reconstruction is only believable if it lands on
# exactly these, so it is asserted rather than printed.
NIC_2008_DIVISIONS = {
    "01", "02", "03", "05", "06", "07", "08", "09", "10", "11", "12", "13",
    "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25",
    "26", "27", "28", "29", "30", "31", "32", "33", "35", "36", "37", "38",
    "39", "41", "42", "43", "45", "46", "47", "49", "50", "51", "52", "53",
    "55", "56", "58", "59", "60", "61", "62", "63", "64", "65", "66", "68",
    "69", "70", "71", "72", "73", "74", "75", "77", "78", "79", "80", "81",
    "82", "84", "85", "86", "87", "88", "90", "91", "93", "94", "95", "96",
}


def read_rows(path):
    """Every data row of the table, in page order, as printed."""
    doc = fitz.open(path)
    rows = []
    for page in doc:
        for table in page.find_tables().tables:
            for raw in table.extract():
                cells = [re.sub(r"\s+", " ", (c or "")).strip() for c in raw]
                if not any(cells):
                    continue
                # The header repeats on all 44 pages.
                if "NicCode" in cells or "NicDesc" in cells:
                    continue
                if len(cells) != 4:
                    raise ValueError("unexpected column count: %r" % (cells,))
                rows.append({
                    "printed": cells[1],
                    "desc": cells[2],
                    "industry": cells[3],
                })
    return rows


def restore_levels(rows):
    """Put the leading zeros back. See the module docstring."""
    stack = []
    out = []
    for row in rows:
        printed = row["printed"]
        if not printed.isdigit():
            raise ValueError("non-numeric code: %r" % (row,))

        chosen = None
        # 1 — the exact parent is on the stack
        for level in (3, 4, 5):
            if level < len(printed):
                continue
            padded = printed.zfill(level)
            if padded[:level - 1] in stack:
                chosen = (padded, level)
                break
        # 2 — some ancestor is; the intermediate row is missing from the PDF
        if chosen is None:
            for level in (3, 4, 5):
                if level < len(printed):
                    continue
                padded = printed.zfill(level)
                if any(len(s) < level and padded.startswith(s) for s in stack):
                    chosen = (padded, level)
                    break
        # 3 — nothing to nest under: a new division
        if chosen is None:
            level = max(2, len(printed))
            chosen = (printed.zfill(level), level)

        padded, level = chosen
        # Keep only this code's own ancestors, then push it.
        stack = [s for s in stack if len(s) < level and padded.startswith(s)]
        stack.append(padded)

        row["code"] = padded
        row["level"] = level
        out.append(row)
    return out


def main():
    rows = restore_levels(read_rows(PDF))

    duplicates = [c for c, n in Counter(r["code"] for r in rows).items() if n > 1]
    if duplicates:
        sys.exit("reconstruction failed — duplicate codes: %s" % duplicates[:20])

    divisions = {r["code"] for r in rows if r["level"] == 2}
    if divisions != NIC_2008_DIVISIONS:
        sys.exit(
            "reconstruction failed — divisions do not match NIC-2008.\n"
            "  unexpected: %s\n  missing: %s"
            % (sorted(divisions - NIC_2008_DIVISIONS),
               sorted(NIC_2008_DIVISIONS - divisions))
        )

    industries = Counter(r["industry"] for r in rows)
    if set(industries) - {"Manufacturing", "Service"}:
        sys.exit("unexpected industry type: %s" % sorted(industries))

    LEVEL_NAMES = {2: "Division", 3: "Group", 4: "Class", 5: "Sub-class"}

    with open(CSV_OUT, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.writer(fh)
        writer.writerow(["NicCode", "NicDesc", "IndustryType", "Level", "NicCodeAsPrinted"])
        for r in rows:
            writer.writerow([
                r["code"], r["desc"], r["industry"],
                LEVEL_NAMES[r["level"]], r["printed"],
            ])

    # The app's copy: short keys, because this ships to a browser.
    #   c code · d description · t type (M/S)
    # Level is derivable from len(c), so it is not stored.
    os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
    compact = [
        {"c": r["code"], "d": r["desc"], "t": r["industry"][0]}
        for r in rows
    ]
    with open(JSON_OUT, "w", encoding="utf-8") as fh:
        json.dump(compact, fh, ensure_ascii=False, separators=(",", ":"))

    print("rows            : %d" % len(rows))
    print("levels          : %s" % dict(sorted(Counter(r["level"] for r in rows).items())))
    print("industry types  : %s" % dict(industries))
    print("divisions       : %d (matches NIC-2008)" % len(divisions))
    print("duplicate codes : 0")
    print("csv             : %s" % CSV_OUT)
    print("json            : %s (%.0f KB)" % (JSON_OUT, os.path.getsize(JSON_OUT) / 1024))


if __name__ == "__main__":
    main()
