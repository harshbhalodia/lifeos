# LifeOS

**Build your own better life, using your own data, on your own machine.**

LifeOS is a self-hosted, modular Personal Life Operating System: a core shell (auth, layout,
navigation, dashboard) that installs independent life-area modules called **blueprints**. The
first blueprint is **Wealth**.

## Stack

| Layer    | Choice                                                        |
| -------- | ---------------------------------------------------------------- |
| Backend  | FastAPI + SQLAlchemy + Alembic, SQLite database                   |
| Auth     | Custom JWT (bcrypt password hashing), single admin bootstrap      |
| AI       | Optional — points at any local/OpenAI-compatible chat endpoint    |
| Frontend | React 19 + TypeScript + Vite 7                                    |
| Styling  | Hand-written CSS design system, no Tailwind                       |
| Charts   | recharts                                                           |

Everything runs on your machine. No cloud account, no telemetry, no data leaves your disk
unless you explicitly point the optional AI setting at a remote endpoint.

## Requirements

- [Python](https://www.python.org/) 3.11+ (Windows: use the `py` launcher)
- [Node.js](https://nodejs.org/) 20+

## Quick start

```powershell
.\scripts\setup.ps1   # one-time: creates venv, installs deps, migrates DB, npm install
.\scripts\start.ps1   # every time: runs backend (new window) + frontend dev server
```

Open `http://localhost:5173` and sign in with the bootstrap admin from
`config/config.yaml` (defaults to `admin@example.com` / `change-me` — change these before
real use). There is no self-service sign-up; accounts are provisioned via that config file.

To enable AI-assisted insights (fully optional — every calculation is deterministic without
it), edit the `ai:` section of `config/config.yaml` with your local model server's endpoint
and restart the backend.

## The Wealth blueprint

Modeled after a real personal budget spreadsheet (Fixed / Variable / Adhoc / Investments / New
Investments), the Wealth blueprint provides:

- **Accounts** — checking, savings, credit, investment, retirement, loan, with a liquidity flag.
- **Categories** — grouped exactly like a budget spreadsheet (`fixed`, `variable`, `adhoc`,
  `investments`, `new_investments`, `income`), each belonging to income or expense.
- **Entries** — every income/expense is linked to a forecast category and (optionally) an
  account, with recurring-transaction support, so agents/analytics can reason about spend by
  category group over time.
- **Budgets** — monthly limit per category with warning/critical thresholds and projected
  month-end spend based on day-of-month burn rate.
- **Goals** — emergency fund, savings, debt repayment, investment, major purchase, with
  progress bars.
- **CSV import** — upload any bank/export CSV, map columns (Date, Amount, Description,
  Category) with best-effort auto-detection, preview normalized rows, and skip likely duplicates
  before importing.
- **Analytics** — all deterministic, computed in `analytics.ts`:
  - **Net worth projection** — compounds an annual return-rate assumption against investment
    balances and reinvests average net monthly cashflow, for a configurable year horizon.
  - **Liquidity** — liquid balance vs. average monthly fixed+variable spend, expressed as
    months of runway.
  - **Strategy / spending breakdown** — expenses grouped exactly like the Fixed/Variable/
    Adhoc/Investments/New Investments split, visualized as a pie chart.
  - **Cashflow** — monthly incoming vs. outgoing bar/area charts.

## Adding a new blueprint

1. Create `apps/web/src/blueprints/<id>/` with `types.ts`, `api.ts`, `pages/`, and an
   `index.tsx` exporting an object that satisfies `Blueprint` (`core/blueprints/types.ts`).
2. Add its tables/models to the backend (`backend/app/models.py`, an Alembic migration, and a
   router under `backend/app/routers/`).
3. Register it in `apps/web/src/core/blueprints/registry.ts`.

Core routing, the sidebar's "Life" section, and the dashboard widget grid pick it up
automatically — no core file changes required.

## License

See [LICENSE](LICENSE).
