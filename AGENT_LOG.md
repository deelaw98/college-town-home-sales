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
