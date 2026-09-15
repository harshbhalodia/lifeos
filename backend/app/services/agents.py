"""Wealth agents: read-only over computed facts, write only to wealth_insights.

Agents never receive raw database access or arbitrary SQL — they are handed a
JSON snapshot of numbers already computed by app.services.analytics and asked
only to explain/interpret them. This keeps every dollar amount deterministic;
the LLM's job is limited to language, not arithmetic.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.models import User, WealthAccount, WealthBudget, WealthCategory, WealthEntry, WealthForecastAssumption
from app.services import ai_provider
from app.services.analytics import (
    compute_budget_statuses,
    compute_cashflow_series,
    compute_liquidity,
    compute_net_worth,
)


@dataclass
class AgentSpec:
    id: str
    name: str
    version: str
    description: str
    reads: list[str]
    writes: list[str]


AGENTS: dict[str, AgentSpec] = {
    "wealth.budget_analyzer": AgentSpec(
        id="wealth.budget_analyzer",
        name="Budget Analyzer",
        version="0.1.0",
        description="Flags categories that are over, or trending over, their monthly budget.",
        reads=["wealth_entries", "wealth_budgets", "wealth_categories"],
        writes=["wealth_insights"],
    ),
    "wealth.financial_insight_agent": AgentSpec(
        id="wealth.financial_insight_agent",
        name="Financial Insight Agent",
        version="0.1.0",
        description="Combines net worth, liquidity and cashflow into a plain-language summary.",
        reads=["wealth_accounts", "wealth_entries", "wealth_categories"],
        writes=["wealth_insights"],
    ),
}

SYSTEM_PROMPT = """You are a personal finance assistant inside LifeOS.
You are given ONLY pre-computed, trusted numeric facts as JSON — never invent, estimate, \
or recompute a number that is not present in the facts. Distinguish clearly between facts \
(given), and your interpretation/recommendation (your own words). Be concise: 3-5 sentences, \
plain language, no markdown headers. If nothing needs attention, say so briefly."""


def _gather_budget_facts(db: Session, user: User) -> dict:
    entries = db.query(WealthEntry).filter(WealthEntry.user_id == user.id).all()
    budgets = db.query(WealthBudget).filter(WealthBudget.user_id == user.id).all()
    categories = db.query(WealthCategory).filter(WealthCategory.user_id == user.id).all()
    statuses = compute_budget_statuses(budgets, entries, categories)
    return {"month": date.today().isoformat()[:7], "budgets": statuses}


def _gather_financial_insight_facts(db: Session, user: User) -> dict:
    accounts = db.query(WealthAccount).filter(WealthAccount.user_id == user.id).all()
    entries = db.query(WealthEntry).filter(WealthEntry.user_id == user.id).all()
    categories = db.query(WealthCategory).filter(WealthCategory.user_id == user.id).all()

    return {
        "net_worth": compute_net_worth(accounts),
        "liquidity": compute_liquidity(accounts, entries, categories),
        "cashflow_last_3_months": compute_cashflow_series(entries, months_back=3),
    }


def gather_facts(agent_id: str, db: Session, user: User) -> dict:
    if agent_id == "wealth.budget_analyzer":
        return _gather_budget_facts(db, user)
    if agent_id == "wealth.financial_insight_agent":
        return _gather_financial_insight_facts(db, user)
    raise ValueError(f"Unknown agent: {agent_id}")


def run_agent(agent_id: str, db: Session, user: User) -> tuple[str, dict]:
    """Returns (summary_text, facts). Raises ai_provider.AIProviderError on failure."""
    if agent_id not in AGENTS:
        raise ValueError(f"Unknown agent: {agent_id}")

    facts = gather_facts(agent_id, db, user)
    summary = ai_provider.generate(SYSTEM_PROMPT, json.dumps(facts, default=str))
    return summary, facts
