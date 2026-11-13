# Which college town is the best deal?

## What this site is for

The dashboard answers one question: **around which university campus do homes cost the least, sell the fastest and sit closest to campus?** It is for anyone comparing college towns as a place to buy, such as a student, a family with a student, or a faculty or staff member about to move. It covers 35,442 completed home sales around 11 university campuses in 18 cities, which closed between March 2023 and March 2026.

What each part of the page shows:

- **Campus dropdown.** Picks one of the 11 campuses, or "All campuses". Everything below it updates for that choice. The choice is kept in the address (`?campus=...`), so a view can be shared as a link.
- **Four number cards:**
  - **Sales:** how many completed sales there are near the campus.
  - **Median sale price:** the price of a typical home.
  - **Median days on market:** how quickly a typical listed home went under contract.
  - **Median miles to campus:** the straight-line distance of a typical sale from campus.

  The price and days-on-market cards also say how many sales each one used and how many it left out.
- **Bar chart:** median sale price for each city near the campus, from most to least expensive.
- **Scatter chart:** one dot per sale, showing sale price against miles to campus, so you can see whether homes closer to campus cost more. Prices are on a log scale so that $10,000 and $5,000,000 both fit.
- **Line chart:** the number of sales that closed each month, showing the busy and quiet seasons.

Each chart's title states what it shows for the selected campus, and each chart has a "Show the numbers as a table" view. Every count, median and date range on the page is computed in the browser from the data when the page loads.

## Live site

https://deelaw98.github.io/college-town-home-sales/

## Data notes

The site reads `data/dashboard_data.json`. It is made from `data/college_town_home_sales.csv` by `scripts/build_dashboard_data.py`, and it keeps all **35,442** rows, one per `listing_id`. No row is deleted from the file. Instead, each figure on the page leaves out the rows that cannot be used for it, and the page says how many it left out. Every figure is a **median**, never an average. For an even number of sales, the median is the halfway point between the two middle values.

### How each figure is defined

| Figure | Definition | Rows used for "All campuses" |
|---|---|---:|
| Sales | Count of completed sales | 35,442 (all) |
| Median sale price | Median `sale_price` of sales from $10,000 to $5,000,000 | 35,371 |
| Median days on market | Median of `contract_date` minus `list_date`, in days | 28,042 |
| Median miles to campus | Median `miles_to_campus`, the straight-line distance to the nearest campus's landmark (not driving distance) | 35,442 (all) |
| Bar chart | Median sale price per city, same price rule as the card | 35,371 |
| Scatter chart | One dot per sale, same price rule as the card | 35,371 dots |
| Line chart | Count of sales by the month of `sale_date` | 35,436 |

For "All campuses", the cards show 35,442 sales, a median price of $410,000, a median of 11 days on market and a median of 3.4 miles to campus.

### What the site does about the five problems in the data

`docs/data_description_sheet.md` lists five problems with this dataset. This is what the site does about each one.

**1. Days on market and blank dates.**
- **Definition:** Days on market is the contract date minus the list date: the time from listing to an accepted offer. It does not use `sale_date - list_date`, which would add the time it takes to close.
- **Skipped rows:** **7,400** sales are skipped because they are missing a list date, a contract date or both. 6,180 have no list date, 6,528 have no contract date and 5,308 have neither, and 6,180 + 6,528 − 5,308 = 7,400. That leaves **28,042** sales for days on market.
- **Blanks are not zero:** A blank date is never counted as 0 days, because that would make thousands of homes look as if they sold instantly.
- **Real zeros are kept:** The 384 sales that went under contract on the day they were listed really are 0 days, so they are kept.
- **Long waits are kept:** 67 sales took more than 365 days to go under contract. They are also kept, and they are one reason the site uses the median.
- **The blanks are not random.** The share of sales with no list date ranges from 38.0% in Pittsboro, NC (35 of 92) to 5.0% in Lafayette, IN (153 of 3,057). According to the description sheet, most sales with no list date had no listing on record, such as off-market sales and new homes sold by the builder. So a campus's days-on-market figure describes the homes that were listed, and the page says how many sales it skipped for each campus.

**2. Duplicate street addresses.**
- **The problem:** 66 rows share a street address with another row, at 16 addresses. For example, there are 10 rows at 456 E Beaver Ave in State College. 60 of those rows are at 13 State College addresses, which the description sheet explains are different condo units in the same buildings. The other 6 rows are three pairs, in Chapel Hill, Charlottesville and Gainesville, each with two sales about a year or more apart. Each row is a separate sale.
- **What the site does:** It never removes rows by address. It uses `listing_id` as the key. `listing_id` is unique: there are 35,442 rows and 35,442 distinct IDs, in both the JSON file and the SQLite file.

**3. Impossible prices.**
- **The problem:** The lowest sale price in the data is $0 and the highest is $81,510,000.
- **The price rule:** Price figures use only sales from **$10,000 to $5,000,000**. That leaves out **71** sales: 40 under $10,000 (4 of them under $1,000, including 1 at $0) and 31 over $5,000,000.
- **Where the rule applies:** It is used by the median price card, the bar chart and the scatter chart, which keep **35,371** sales. The page states the rule and how many sales it leaves out for the selected campus.

**4. The unreliable `home_type` column.**
- **The problem:** 35,263 rows say `SINGLE_FAMILY`, including the State College condo units. 177 say `HOME_TYPE_UNKNOWN` and 2 say `CONDO`.
- **What the site does:** It does not use `home_type` at all. The column is not in `data/dashboard_data.json`, and no figure depends on it.

**5. Impossible square feet and lot sizes.**
- **The problem:** `living_area_sqft` is 0 on 127 rows. 274 lots are over 10 acres and 20 are over 100 acres, against a median lot of 10,018 sq ft. The largest lot is 1,435,737,600 sq ft.
- **What the site does:** No figure on the site uses living area or lot size. Neither column is in `data/dashboard_data.json`, and the page says they are not used. Because they are not used, they need no filter.

### Sales with no sale date, and the line chart

6 sales have no `sale_date`. They are counted in the Sales card, but they cannot be placed in a month, so the line chart leaves them out. That is why the line chart counts **35,436** sales (35,442 − 6).

The first sale in the data closed on 27 March 2023 and the last on 25 March 2026. The line chart covers those **37 months**, and labels the first and last as **partial months**, because the data covers only part of each.

**Why the line chart does not use the price rule:** The price rule exists to keep impossible prices out of figures that are computed from prices. The line chart does not use prices. It counts how many sales closed each month, just as the Sales card counts all sales. A sale with an implausible recorded price is still a sale with a closing date, so it is counted in its month. Applying the rule would also make the line chart's total disagree with the Sales card for no reason.

### Where the data comes from

The values are as reported by the collection source in March 2026, and they have not been checked against county records.

## Rebuilding the dashboard data

The dashboard reads `data/dashboard_data.json`, a smaller file made from `data/college_town_home_sales.csv`. It keeps only the fields the dashboard uses (`listing_id`, city, campus, miles to campus, sale price, sale month and days on market) for all 35,442 rows. No rows are removed. The page applies the price rule and the days-on-market rule itself. The five dataset files are never changed.

To rebuild the file and check it, run these from the repository root. They need Python 3 and no extra packages:

```bash
python3 scripts/build_dashboard_data.py
python3 scripts/check_dashboard.py
```

`check_dashboard.py` recomputes every dashboard figure from `data/college_town_home_sales.sqlite`, for "All" and for each campus. It compares them with the JSON and prints "OK" or lists the differences.

## Tools we used

- **Claude Code on the web:** the AI coding agent that wrote the code, the scripts and the data file.
- **The Claude chat assistant:** used to plan the work and to check the agent's numbers.
- **[Chart.js](https://www.chartjs.org/) 4.4.1** (MIT License), loaded from cdnjs: draws the three charts.
- **Python 3 standard library:** runs `scripts/build_dashboard_data.py` and `scripts/check_dashboard.py`, with no extra packages.
- **SQLite:** `scripts/check_dashboard.py` uses it to recompute every figure from `data/college_town_home_sales.sqlite`, as a second check.
- **GitHub Pages with GitHub Actions:** `.github/workflows/pages.yml` publishes the site each time `main` is pushed.

## Citation

College-town home sales dataset, version 1.0 (2026). University of Illinois-Deloitte Foundation Center for Business Emerging Technologies. Data collected March 2026.
