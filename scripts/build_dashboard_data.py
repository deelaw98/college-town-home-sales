"""Build data/dashboard_data.json, the small data file the dashboard page loads.

Reads data/college_town_home_sales.csv (never modifies it) and keeps only the
fields the dashboard needs, one entry per listing_id. No rows are removed here:
the page applies the price rule and the days-on-market rule itself, so it can
show how many rows each rule leaves out.

Fields written, as parallel arrays (entry i of every array is the same sale):
  listing_id       text, the key (duplicate addresses are kept)
  city             index into "cities"
  university       index into "universities"
  miles_to_campus  number, as in the CSV
  sale_price       integer US dollars, as in the CSV (no filtering here)
  sale_month       "YYYY-MM" from sale_date, or null when sale_date is blank
  days_on_market   contract_date minus list_date in days, or null when either
                   date is blank

Not used on purpose: home_type (unreliable), living_area_sqft and lot_size_sqft
(no dashboard figure uses them).

Run from the repository root, with Python 3 and no extra packages:
    python3 scripts/build_dashboard_data.py
"""

import csv
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "college_town_home_sales.csv"
OUTPUT = ROOT / "data" / "dashboard_data.json"


def parse_date(text):
    return date.fromisoformat(text) if text else None


def main():
    with SOURCE.open(newline="", encoding="utf-8") as f:
        # csv.DictReader reads every value as text, so zipcode, county_fips
        # and parcel_number keep their leading zeros (they are not used here).
        rows = list(csv.DictReader(f))

    ids = [r["listing_id"] for r in rows]
    if len(set(ids)) != len(ids):
        raise SystemExit("listing_id is not unique; refusing to build")

    city_names = sorted({f'{r["city"]}, {r["state"]}' for r in rows})
    universities = sorted({r["university"] for r in rows})
    city_index = {name: i for i, name in enumerate(city_names)}
    uni_index = {name: i for i, name in enumerate(universities)}

    # The campus each city's rows belong to, for the city bar chart's filter.
    # A city can in principle span campuses, so store a list per city.
    city_unis = {name: set() for name in city_names}

    out = {
        "listing_id": [],
        "city": [],
        "university": [],
        "miles_to_campus": [],
        "sale_price": [],
        "sale_month": [],
        "days_on_market": [],
    }

    for r in rows:
        city = f'{r["city"]}, {r["state"]}'
        city_unis[city].add(r["university"])

        listed = parse_date(r["list_date"])
        contract = parse_date(r["contract_date"])
        dom = (contract - listed).days if listed and contract else None

        out["listing_id"].append(r["listing_id"])
        out["city"].append(city_index[city])
        out["university"].append(uni_index[r["university"]])
        out["miles_to_campus"].append(float(r["miles_to_campus"]))
        out["sale_price"].append(int(r["sale_price"]))
        out["sale_month"].append(r["sale_date"][:7] if r["sale_date"] else None)
        out["days_on_market"].append(dom)

    data = {
        "source": "data/college_town_home_sales.csv, built by scripts/build_dashboard_data.py",
        "citation": (
            "College-town home sales dataset, version 1.0 (2026). University of "
            "Illinois-Deloitte Foundation Center for Business Emerging Technologies. "
            "Data collected March 2026."
        ),
        "row_count": len(rows),
        "cities": city_names,
        "universities": universities,
        "city_universities": {c: sorted(u) for c, u in city_unis.items()},
        "columns": out,
    }

    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
        f.write("\n")

    print(f"Wrote {OUTPUT.relative_to(ROOT)}: {len(rows)} rows, "
          f"{OUTPUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
