"""Check data/dashboard_data.json against the SQLite copy of the dataset.

The JSON is built from the CSV by scripts/build_dashboard_data.py. This script
recomputes every dashboard figure a second way, from
data/college_town_home_sales.sqlite with SQL (dates handled by SQLite's
julianday, not Python), and compares the two for "All" and for each campus.
It exits with an error if anything differs.

Rules checked (the same ones the page will use):
  - price figures keep sale_price from 10,000 to 5,000,000 inclusive
  - days on market = contract_date - list_date, rows missing either are skipped
  - sales per month uses sale_date; rows without one are skipped
  - every listing_id is kept; nothing is deduplicated by address
  - medians only, never averages

Run from the repository root, with Python 3 and no extra packages:
    python3 scripts/check_dashboard.py
"""

import json
import sqlite3
import sys
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
SQLITE = ROOT / "data" / "college_town_home_sales.sqlite"
JSON_FILE = ROOT / "data" / "dashboard_data.json"

PRICE_MIN = 10_000
PRICE_MAX = 5_000_000

failures = []


def check(label, expected, actual):
    if expected != actual:
        failures.append(f"{label}: SQLite {expected!r} != JSON {actual!r}")


def med(values):
    return median(values) if values else None


def figures_from_sqlite(con, university=None):
    where = "WHERE university = ?" if university else ""
    args = (university,) if university else ()

    def col(sql):
        return [r[0] for r in con.execute(sql, args)]

    f = {}
    f["sales"] = con.execute(f"SELECT COUNT(*) FROM home_sales {where}", args).fetchone()[0]
    and_ = "AND" if university else "WHERE"
    price_cond = f"sale_price BETWEEN {PRICE_MIN} AND {PRICE_MAX}"
    prices = col(f"SELECT sale_price FROM home_sales {where} {and_} {price_cond}")
    f["price_rows"] = len(prices)
    f["price_excluded"] = f["sales"] - len(prices)
    f["median_price"] = med(prices)

    dom = col(
        f"SELECT CAST(julianday(contract_date) - julianday(list_date) AS INTEGER) "
        f"FROM home_sales {where} {and_} list_date IS NOT NULL AND contract_date IS NOT NULL"
    )
    f["dom_rows"] = len(dom)
    f["dom_skipped"] = f["sales"] - len(dom)
    f["median_dom"] = med(dom)

    f["median_miles"] = med(col(f"SELECT miles_to_campus FROM home_sales {where}"))

    f["no_sale_date"] = con.execute(
        f"SELECT COUNT(*) FROM home_sales {where} {and_} sale_date IS NULL", args
    ).fetchone()[0]

    by_city = {}
    for city, state, price in con.execute(
        f"SELECT city, state, sale_price FROM home_sales {where} {and_} {price_cond}", args
    ):
        by_city.setdefault(f"{city}, {state}", []).append(price)
    f["median_price_by_city"] = {c: med(v) for c, v in sorted(by_city.items())}

    f["sales_by_month"] = dict(con.execute(
        f"SELECT substr(sale_date, 1, 7) AS m, COUNT(*) FROM home_sales "
        f"{where} {and_} sale_date IS NOT NULL GROUP BY m ORDER BY m", args
    ).fetchall())
    return f


def figures_from_json(data, university=None):
    c = data["columns"]
    n = data["row_count"]
    uni_i = data["universities"].index(university) if university else None
    idx = [i for i in range(n) if uni_i is None or c["university"][i] == uni_i]

    f = {}
    f["sales"] = len(idx)
    priced = [i for i in idx if PRICE_MIN <= c["sale_price"][i] <= PRICE_MAX]
    f["price_rows"] = len(priced)
    f["price_excluded"] = len(idx) - len(priced)
    f["median_price"] = med([c["sale_price"][i] for i in priced])

    dom = [c["days_on_market"][i] for i in idx if c["days_on_market"][i] is not None]
    f["dom_rows"] = len(dom)
    f["dom_skipped"] = len(idx) - len(dom)
    f["median_dom"] = med(dom)

    f["median_miles"] = med([c["miles_to_campus"][i] for i in idx])
    f["no_sale_date"] = sum(1 for i in idx if c["sale_month"][i] is None)

    by_city = {}
    for i in priced:
        by_city.setdefault(data["cities"][c["city"][i]], []).append(c["sale_price"][i])
    f["median_price_by_city"] = {k: med(v) for k, v in sorted(by_city.items())}

    by_month = {}
    for i in idx:
        m = c["sale_month"][i]
        if m is not None:
            by_month[m] = by_month.get(m, 0) + 1
    f["sales_by_month"] = dict(sorted(by_month.items()))
    return f


def main():
    con = sqlite3.connect(f"file:{SQLITE}?mode=ro", uri=True)
    data = json.loads(JSON_FILE.read_text(encoding="utf-8"))

    # Every listing_id from SQLite is in the JSON exactly once, and nothing else.
    sql_ids = sorted(r[0] for r in con.execute("SELECT listing_id FROM home_sales"))
    json_ids = sorted(data["columns"]["listing_id"])
    check("listing_id set", sql_ids, json_ids)
    check("listing_id unique", len(json_ids), len(set(json_ids)))
    check("row_count", len(sql_ids), data["row_count"])
    for name, values in data["columns"].items():
        check(f"length of column {name}", data["row_count"], len(values))

    unis = [r[0] for r in con.execute("SELECT DISTINCT university FROM home_sales ORDER BY 1")]
    check("universities", unis, data["universities"])

    print(f"{'Selection':50} {'sales':>6} {'price':>6} {'excl':>4} {'med $':>9} "
          f"{'DOM':>6} {'skip':>5} {'medDOM':>6} {'miles':>5} {'noSD':>4}")
    for uni in [None] + unis:
        label = uni or "All"
        exp = figures_from_sqlite(con, uni)
        got = figures_from_json(data, uni)
        for key in exp:
            check(f"{label} / {key}", exp[key], got[key])
        print(f"{label:50} {exp['sales']:>6} {exp['price_rows']:>6} {exp['price_excluded']:>4} "
              f"{exp['median_price']:>9} {exp['dom_rows']:>6} {exp['dom_skipped']:>5} "
              f"{exp['median_dom']:>6} {exp['median_miles']:>5} {exp['no_sale_date']:>4}")

    if failures:
        print(f"\nFAILED: {len(failures)} difference(s)")
        for line in failures[:50]:
            print("  " + line)
        sys.exit(1)
    print("\nOK: every figure matches between SQLite and data/dashboard_data.json")


if __name__ == "__main__":
    main()
