"""Keeps WealthAccount.current_balance in sync with its linked entries — opt-in only.

An account's balance is only derived from entries when `balance_source == "computed"`, which
the user must explicitly turn on (default is "manual"). This matters because entries linked to
an account rarely capture 100% of its real cash movements (e.g. transfers, interest, cash
withdrawals) — deriving a balance purely from `opening_balance + income - expense` for an
account that wasn't backfilled with a matching opening_balance and every transaction will
produce a wildly wrong number. Accounts default to "manual" so linking entries to an account
never silently overwrites a balance the user maintains by hand.
"""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import WealthAccount, WealthEntry


def sync_account_balance(db: Session, account_id: str | None) -> None:
    if not account_id:
        return
    account = db.get(WealthAccount, account_id)
    if not account or account.balance_source != "computed":
        return

    totals = (
        db.query(WealthEntry.type, func.sum(WealthEntry.amount))
        .filter(WealthEntry.account_id == account_id)
        .group_by(WealthEntry.type)
        .all()
    )
    total_by_type = dict(totals)
    income = total_by_type.get("income") or 0.0
    expense = total_by_type.get("expense") or 0.0
    account.current_balance = round(account.opening_balance + income - expense, 2)
    db.add(account)
    db.commit()
