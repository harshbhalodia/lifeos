"""Deterministic financial calculations for the Wealth blueprint.

No LLM involvement here — agents only explain numbers computed by this module.
Ported 1:1 from the frontend's former analytics.ts so the backend is the single
source of truth for all financial math.
"""
from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta

from app.models import WealthAccount, WealthAsset, WealthBudget, WealthCategory, WealthCategoryGroup, WealthEntry, WealthForecastAssumption


def _round2(value: float) -> float:
    return round(value, 2)


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _month_label(d: date) -> str:
    return d.strftime("%b")


def fiscal_year_window(fiscal_year_start_month: int, reference_date: date) -> tuple[date, date]:
    """Returns (start, end) inclusive dates of the financial year containing reference_date,
    given the month (1-12) the user's financial year starts on."""
    start_year = reference_date.year if reference_date.month >= fiscal_year_start_month else reference_date.year - 1
    start = date(start_year, fiscal_year_start_month, 1)
    end = date(start_year + 1, fiscal_year_start_month, 1) - timedelta(days=1)
    return start, end


def compute_net_worth(accounts: list[WealthAccount], assets: list[WealthAsset] | None = None) -> dict:
    liquid = 0.0
    illiquid = 0.0
    investments = 0.0

    for acc in accounts:
        balance = -abs(acc.current_balance) if acc.type in ("credit", "loan") else acc.current_balance
        if acc.type in ("investment", "retirement"):
            investments += balance
        if acc.is_liquid:
            liquid += balance
        else:
            illiquid += balance

    # Held physical assets (home, car, ...) count as illiquid net worth; sold ones are excluded.
    personal_assets = 0.0
    for asset in assets or []:
        if asset.status == "holding":
            personal_assets += asset.current_value
            illiquid += asset.current_value

    return {
        "total": _round2(liquid + illiquid),
        "liquid": _round2(liquid),
        "illiquid": _round2(illiquid),
        "investments": _round2(investments),
        "personal_assets": _round2(personal_assets),
    }


def compute_cashflow_series(entries: list[WealthEntry], months_back: int = 12, today: date | None = None) -> list[dict]:
    today = today or date.today()
    buckets: dict[str, dict[str, float]] = {}
    order: list[tuple[str, date]] = []

    for i in range(months_back - 1, -1, -1):
        month_index = today.month - 1 - i
        year = today.year + month_index // 12
        month = month_index % 12 + 1
        bucket_date = date(year, month, 1)
        key = _month_key(bucket_date)
        buckets[key] = {"incoming": 0.0, "outgoing": 0.0}
        order.append((key, bucket_date))

    for entry in entries:
        key = _month_key(entry.entry_date)
        if key not in buckets:
            continue
        if entry.type == "income":
            buckets[key]["incoming"] += entry.amount
        else:
            buckets[key]["outgoing"] += entry.amount

    return [
        {
            "month": key,
            "label": _month_label(d),
            "incoming": _round2(buckets[key]["incoming"]),
            "outgoing": _round2(buckets[key]["outgoing"]),
            "net": _round2(buckets[key]["incoming"] - buckets[key]["outgoing"]),
        }
        for key, d in order
    ]


def compute_category_group_breakdown(
    entries: list[WealthEntry], categories: list[WealthCategory], groups: list[WealthCategoryGroup], month: str | None = None
) -> list[dict]:
    category_by_id = {c.id: c for c in categories}
    group_by_id = {g.id: g for g in groups}
    totals: dict[str | None, float] = defaultdict(float)

    for entry in entries:
        if entry.type != "expense":
            continue
        if month and _month_key(entry.entry_date) != month:
            continue
        category = category_by_id.get(entry.category_id) if entry.category_id else None
        group_id = category.group_id if category else None
        totals[group_id] += entry.amount

    results = []
    for group_id, total in totals.items():
        group = group_by_id.get(group_id) if group_id else None
        results.append(
            {
                "group_id": group_id,
                "group_name": group.name if group else "Uncategorized",
                "color": group.color if group else None,
                "total": _round2(total),
            }
        )
    return sorted(results, key=lambda x: x["total"], reverse=True)


def compute_budget_statuses(
    budgets: list[WealthBudget],
    entries: list[WealthEntry],
    categories: list[WealthCategory],
    fiscal_year_start_month: int = 1,
    reference_date: date | None = None,
) -> list[dict]:
    reference_date = reference_date or date.today()
    category_by_id = {c.id: c for c in categories}
    month = _month_key(reference_date)
    day_of_month = reference_date.day
    days_in_month = monthrange(reference_date.year, reference_date.month)[1]
    fy_start, fy_end = fiscal_year_window(fiscal_year_start_month, reference_date)

    results = []
    for budget in budgets:
        if budget.period == "yearly":
            spent = sum(
                e.amount
                for e in entries
                if e.type == "expense" and e.category_id == budget.category_id and fy_start <= e.entry_date <= fy_end
            )
            days_elapsed = (reference_date - fy_start).days + 1
            days_total = (fy_end - fy_start).days + 1
            projected = (spent / days_elapsed * days_total) if days_elapsed > 0 else spent
        else:
            spent = sum(
                e.amount
                for e in entries
                if e.type == "expense" and e.category_id == budget.category_id and _month_key(e.entry_date) == month
            )
            projected = (spent / day_of_month * days_in_month) if day_of_month > 0 else spent

        percent = (spent / budget.amount * 100) if budget.amount > 0 else 0.0

        status = "ok"
        if percent >= budget.critical_threshold:
            status = "critical"
        elif percent >= budget.warning_threshold:
            status = "warning"

        category = category_by_id.get(budget.category_id)
        results.append(
            {
                "budget_id": budget.id,
                "category_id": budget.category_id,
                "category_name": category.name if category else "Uncategorized",
                "period": budget.period,
                "amount": budget.amount,
                "spent": _round2(spent),
                "percent": _round2(percent),
                "status": status,
                "projected_period_end": _round2(projected),
            }
        )
    return results


def compute_liquidity(
    accounts: list[WealthAccount],
    entries: list[WealthEntry],
    categories: list[WealthCategory],
    groups: list[WealthCategoryGroup],
    months_back: int = 3,
    today: date | None = None,
) -> dict:
    today = today or date.today()
    net_worth = compute_net_worth(accounts)
    category_by_id = {c.id: c for c in categories}
    group_by_id = {g.id: g for g in groups}

    month_index = today.month - 1 - months_back
    year = today.year + month_index // 12
    month = month_index % 12 + 1
    cutoff = date(year, month, 1)

    essential_total = 0.0
    months_seen: set[str] = set()

    for entry in entries:
        if entry.type != "expense":
            continue
        if entry.entry_date < cutoff:
            continue
        category = category_by_id.get(entry.category_id) if entry.category_id else None
        group = group_by_id.get(category.group_id) if category and category.group_id else None
        if group and group.is_essential:
            essential_total += entry.amount
            months_seen.add(_month_key(entry.entry_date))

    divisor = max(len(months_seen), 1)
    avg_monthly = _round2(essential_total / divisor)

    return {
        "liquid_balance": net_worth["liquid"],
        "avg_monthly_essential_spend": avg_monthly,
        "months_of_runway": _round2(net_worth["liquid"] / avg_monthly) if avg_monthly > 0 else None,
    }


def project_net_worth(
    accounts: list[WealthAccount],
    assumption: WealthForecastAssumption,
    monthly_net_contribution: float,
    assets: list[WealthAsset] | None = None,
    today: date | None = None,
) -> list[dict]:
    today = today or date.today()
    net_worth = compute_net_worth(accounts, assets)
    annual_contribution = monthly_net_contribution * 12
    rate = assumption.annual_return_rate

    investments = net_worth["investments"]
    liquid = net_worth["liquid"] - net_worth["investments"]
    illiquid = net_worth["illiquid"]

    points = [
        {
            "year": today.year,
            "liquid": _round2(liquid),
            "investments": _round2(investments),
            "illiquid": _round2(illiquid),
            "net_worth": _round2(liquid + investments + illiquid),
        }
    ]

    for i in range(1, assumption.years_horizon + 1):
        investments = investments * (1 + rate) + max(annual_contribution, 0)
        points.append(
            {
                "year": today.year + i,
                "liquid": _round2(liquid),
                "investments": _round2(investments),
                "illiquid": _round2(illiquid),
                "net_worth": _round2(liquid + investments + illiquid),
            }
        )

    return points


def compute_asset_performance(assets: list[WealthAsset], today: date | None = None) -> list[dict]:
    """Deterministic gain/loss facts per asset, handed to the asset advisor agent to interpret
    (the agent only explains these numbers — it never decides or invents a hold/sell verdict itself)."""
    today = today or date.today()
    results = []
    for asset in assets:
        reference_value = asset.sold_value if asset.status == "sold" and asset.sold_value is not None else asset.current_value
        gain_loss = reference_value - asset.purchase_value
        gain_loss_percent = _round2(gain_loss / asset.purchase_value * 100) if asset.purchase_value > 0 else None
        end_date = asset.sold_date if asset.status == "sold" and asset.sold_date else today
        holding_period_days = (end_date - asset.purchase_date).days if asset.purchase_date else None
        results.append(
            {
                "asset_id": asset.id,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "status": asset.status,
                "purchase_value": asset.purchase_value,
                "current_value": _round2(reference_value),
                "gain_loss": _round2(gain_loss),
                "gain_loss_percent": gain_loss_percent,
                "holding_period_days": holding_period_days,
            }
        )
    return results
