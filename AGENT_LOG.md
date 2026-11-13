# Agent log

Add a dated entry each time you work with your AI coding agent, with the newest entry at the bottom. Each entry records what you asked the agent, what it produced, and what you checked or changed. Paste your key prompts in exactly as you typed them. Include at least one time the agent got something wrong, and how you caught it.

Copy this outline for each entry:

```markdown
## YYYY-MM-DD: What you worked on

- **Asked:** "Paste your prompt here."
- **Agent produced:** What it made or changed.
- **Checked or changed:** How you checked it, and what you fixed.
```

## 2026-11-13: Planning and building the dashboard data file

- **Asked (prompt 1):**

```
Read AGENTS.md and docs/data_description_sheet.md first.

I am building a dashboard for the page index.html, called
"Which college town is the best deal?". It should have a campus
dropdown (with an "All" option), number cards (sales count, median price,
median days on market, median miles to campus), a bar chart of median
price by city, a scatter chart of price vs. miles to campus, and a line
chart of sales per month.

Rules:
- Do NOT edit anything in the data/ folder.
- Do not put any passwords or API keys in the repo. It is public.
- Use the median, not the average.
- Exclude sale prices under $10,000 and over $5,000,000 from price charts
  and say this rule on the page.
- Days on market = contract_date minus list_date. Skip rows missing either
  date and show how many rows were skipped.
- Never remove duplicate addresses. Use listing_id as the key.
- Do not use home_type.
- Filter out living_area_sqft = 0 and very large lots before using them.

Do not change any files yet. First write a short plan: what files you
will create, how the page will load the data (the dataset has 35,442 rows,
so suggest a way to keep the page fast), which chart library you will use,
and how you will test it. Then wait for my approval.
```

- **Asked (prompt 2):**

```
I approve the plan with answer (a): leave out living_area_sqft and
lot_size_sqft, and say on the page that they are not used.

Before you start, recheck one number. You said 6,400 rows are skipped
for days on market. The data description sheet says days on market can be
computed on 28,042 rows, so I expect 35,442 - 28,042 = 7,400 skipped.
Count it from the CSV and tell me the real number and why it differs.

Let's work in small steps, one pull request each. Do step 1 only:
- scripts/build_dashboard_data.py
- data/dashboard_data.json
- scripts/check_dashboard.py (checks the numbers from the SQLite file)
- a short section in README.md on how to rerun the script

Do not touch index.html yet. In the pull request, list the counts you
checked: total rows, rows kept for price charts, rows with days on market,
and rows without a sale date. Then stop and wait for me.
```

- **Agent produced:** A plan, then a pull request (#1) with a build script, a smaller data file, a check script, and a README section.
- **Checked or changed:** The agent said 6,400 rows were skipped for days on market. The data description sheet says days on market can be computed on 28,042 rows, and 35,442 minus 28,042 is 7,400, not 6,400. I asked the agent to recount. It confirmed 7,400, said its 6,400 was an arithmetic mistake, and corrected the pull request. I then reviewed the pull request: only four files changed, and `index.html` and the five dataset files were not touched. I merged it, and the Pages publish run passed.

## 2026-11-13: Dashboard page with the campus dropdown and number cards

- **Asked:**

```
Step 1 is merged. Do step 2 only: replace the placeholder index.html with
the dashboard page, but no charts yet.

- Put the code in assets/dashboard.js and assets/dashboard.css.
- Title "Which college town is the best deal?" with a short intro.
- A campus dropdown with an "All" option.
- Four number cards: sales count, median price, median days on market,
  median miles to campus. All values are computed in the browser from
  data/dashboard_data.json for the selected campus.
- State the price rule ($10,000 to $5,000,000) and the number of rows
  it removes, the skipped-days-on-market count, and that square feet
  and lot size are not used.
- Keep the data credit and citation in the footer.
- It must work on a phone and show no console errors.
- Do not edit anything in data/.

Open one pull request. In it, list the card values for All, for
Champaign/Urbana's campus (University of Illinois Urbana-Champaign), and
for Ann Arbor's campus (University of Michigan), and say how you checked
them against scripts/check_dashboard.py. Then stop and wait for me.
```

- **Agent produced:** A pull request (#2) that replaced the placeholder `index.html` with the dashboard page, and added `assets/dashboard.js` and `assets/dashboard.css`. It listed the card values for All campuses, the University of Illinois Urbana-Champaign, and the University of Michigan. Its own browser test matched every card to the SQLite figures from `scripts/check_dashboard.py` for all 12 dropdown options. While testing, the agent noticed that Davis showed "2 mi" while the other campuses showed one decimal (for example "2.1 mi"), and it changed the page to always show one decimal.
- **Checked or changed:** I checked that the pull request changed only three files (`index.html`, `assets/dashboard.css`, `assets/dashboard.js`) and nothing inside `data/`, then merged it. The publish run after the merge failed (run #4). I re-ran it and it passed. I then opened the live site in an incognito window and saw that the "All campuses" cards matched the agent's table: 35,442 sales, $410,000 median price (35,371 sales used, 71 left out), 11 days on market (28,042 sales used, 7,400 skipped), and 3.4 miles to campus.

## 2026-11-13: The three charts

- **Asked:**

```
Step 2 is merged. Do step 3 only: add the three charts, with Chart.js
loaded from cdnjs at a pinned version.

- Bar chart: median sale price by city for the selected campus.
- Scatter chart: sale price vs. miles to campus for the selected campus.
  Draw every point (no sampling). Use small dots and no animation.
- Line chart: number of sales per month for the selected campus. Label
  the first and last months as partial months.
- All three charts update when the campus dropdown changes, and they
  use the same price rule ($10,000 to $5,000,000) as the cards. Say so
  under the charts.
- Give each chart a title that states the finding, axis labels with
  units, and a table view for screen readers.
- Use colors that are readable for colorblind users, and make sure it
  works on a phone with no sideways scrolling and no console errors.
- Do not edit anything in data/.

Open one pull request. In it, list for "All" and for the University of
Michigan: the number of points in the scatter chart, the highest median
price among the cities, and the total number of sales in the line chart.
Say how you checked them against scripts/check_dashboard.py. Then stop and
wait for me.
```

- **Agent produced:** A pull request (#3) that added a bar chart (median price by city), a scatter chart (price against miles to campus, with every point drawn), and a line chart (sales per month, with the first and last months marked as partial). Each chart has a title that states a finding, axis labels, and a "Show the numbers as a table" view. It reported that every chart number matched `scripts/check_dashboard.py` for "All" and all 11 campuses. The line chart counts all sales except the 6 with no sale date and does not use the price rule, because it counts sales, not prices. The agent kept this and said so on the page.
- **Checked or changed:** The agent made two mistakes of its own and fixed them before opening the pull request. Its phone screenshots showed overlapping price labels under the bar chart and a missing "(partial)" label on the last month. The agent also said it could not load Chart.js from cdnjs in its test environment, so it tested with the same version from npm and asked me to confirm the charts on the live site. I checked that the pull request changed only `index.html`, `assets/dashboard.js` and `assets/dashboard.css`, and nothing inside `data/`. I also checked that the numbers made sense: the scatter point count for All (35,371) equals the number of sales kept by the price rule, and for Michigan 3,007 = 3,021 minus 14 sales left out. The line chart total for All (35,436) equals 35,442 minus the 6 sales with no sale date. I confirmed the pinned Chart.js 4.4.1 file exists on cdnjs. I merged the pull request, and on the live site all of the checks passed: the charts appear, and the numbers match the agent's report for All and for the University of Michigan.

## 2026-11-13: README

- **Asked:**

```
Step 3 is merged. Do step 4 only: finish README.md. Change nothing else:
do not edit index.html, assets/, scripts/, data/ or AGENT_LOG.md.

Rewrite README.md for the finished site:

1. Replace the title with "Which college town is the best deal?".
2. Delete the whole "Start here (delete this section before you
   submit)" section, including its file table.
3. "What this site is for": the question the dashboard answers, who it
   is for (for example a student or family comparing college towns),
   and what each part of the page shows (campus dropdown, four number
   cards, bar chart, scatter chart, line chart).
4. "Live site": https://deelaw98.github.io/college-town-home-sales/
5. "Data notes": say which rows are left out or skipped and why, and
   how every figure is defined. Cover each of the five problems from
   docs/data_description_sheet.md: days on market and blank dates,
   duplicate street addresses, impossible prices, the unreliable
   home_type column, and impossible square feet and lot sizes. For each,
   say what this site does about it. Use the real counts from the
   repo (for example 71 sales left out by the price rule, 7,400 skipped
   for days on market, 6 sales with no sale date) and check each number
   against data/dashboard_data.json or scripts/check_dashboard.py before
   you write it. Explain why the line chart does not use the price
   rule.
6. Keep the section on how to rerun the scripts that you wrote in
   step 1.
7. "Tools we used": Claude Code on the web (the coding agent that wrote
   the code), the Claude chat assistant (I used it to plan the work and
   to check the agent's numbers), Chart.js 4.4.1 from cdnjs, Python 3
   standard library for the scripts, SQLite for the check script, and
   GitHub Pages with GitHub Actions for publishing.
8. Keep the "Citation" section as it is.
9. Delete the "Who did what" section. I worked alone.

Do not claim anything you have not checked. Open one pull request and
list in it each number you verified and how. Then stop and wait for me.
```

- **Agent produced:** A pull request (#4) that rewrote `README.md` with the site's purpose, the live link, a table that defines every figure, a section on each of the five data problems, the tools used, and the citation. It removed the "Start here" and "Who did what" sections.
- **Checked or changed:** While writing, the agent reworded a few sentences that claimed more than it had checked, and it added the exact split of the duplicate addresses (60 rows at 13 State College addresses plus 3 pairs). I read the finished README and compared its numbers with the data description sheet, including 71 sales left out by the price rule, 7,400 skipped for days on market, the 66 duplicate-address rows, 127 homes with 0 square feet, and 274 lots over 10 acres. They all matched.
