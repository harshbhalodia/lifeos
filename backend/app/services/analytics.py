"""Deterministic financial calculations for the Wealth blueprint.

No LLM involvement here — agents only explain numbers computed by this module.
Ported 1:1 from the frontend's former analytics.ts so the backend is the single
source of truth for all financial math.
"""
from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta

from app.models import WealthAccount, WealthBudget, WealthCategory, WealthEntry, WealthForecastAssumption


def _round2(value: float) -> float:
    return round(value, 2)


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _month_label(d: date) -> str:
    return d.strftime("%b")


def compute_net_worth(accounts: list[WealthAccount]) -> dict:
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

    return {
        "total": _round2(liquid + illiquid),
        "liquid": _round2(liquid),
        "illiquid": _round2(illiquid),
        "investments": _round2(investments),
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
    entries: list[WealthEntry], categories: list[WealthCategory], month: str | None = None
) -> list[dict]:
    category_by_id = {c.id: c for c in categories}
    totals: dict[str, float] = defaultdict(float)

    for entry in entries:
        if entry.type != "expense":
            continue
        if month and _month_key(entry.entry_date) != month:
            continue
        category = category_by_id.get(entry.category_id) if entry.category_id else None
        group = category.group if category else "variable"
        totals[group] += entry.amount

    return sorted(
        ({"group": g, "total": _round2(t)} for g, t in totals.items()),
        key=lambda x: x["total"],
        reverse=True,
    )


def compute_budget_statuses(
    budgets: list[WealthBudget],
    entries: list[WealthEntry],
    categories: list[WealthCategory],
    reference_date: date | None = None,
) -> list[dict]:
    reference_date = reference_date or date.today()
    category_by_id = {c.id: c for c in categories}
    month = _month_key(reference_date)
    day_of_month = reference_date.day
    days_in_month = monthrange(reference_date.year, reference_date.month)[1]

    results = []
    for budget in budgets:
        spent = sum(
            e.amount
            for e in entries
            if e.type == "expense" and e.category_id == budget.category_id and _month_key(e.entry_date) == month
        )
        percent = (spent / budget.monthly_amount * 100) if budget.monthly_amount > 0 else 0.0
        projected = (spent / day_of_month * days_in_month) if day_of_month > 0 else spent

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
                "monthly_amount": budget.monthly_amount,
                "spent": _round2(spent),
                "percent": _round2(percent),
                "status": status,
                "projected_month_end": _round2(projected),
            }
        )
    return results


def compute_liquidity(
    accounts: list[WealthAccount],
    entries: list[WealthEntry],
    categories: list[WealthCategory],
    months_back: int = 3,
    today: date | None = None,
) -> dict:
    today = today or date.today()
    net_worth = compute_net_worth(accounts)
    category_by_id = {c.id: c for c in categories}

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
        group = category.group if category else None
        if group in ("fixed", "variable"):
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
    today: date | None = None,
) -> list[dict]:
    today = today or date.today()
    net_worth = compute_net_worth(accounts)
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
