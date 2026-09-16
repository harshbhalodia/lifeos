from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User, WealthBudget
from app.schemas import BudgetIn, BudgetOut

router = APIRouter(prefix="/wealth/budgets", tags=["wealth:budgets"])


@router.get("", response_model=list[BudgetOut])
def list_budgets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(WealthBudget).filter(WealthBudget.user_id == user.id).order_by(WealthBudget.created_at).all()


@router.put("", response_model=BudgetOut)
def upsert_budget(payload: BudgetIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.get(WealthBudget, payload.id) if payload.id else None
    if budget and budget.user_id != user.id:
        raise HTTPException(status_code=404, detail="Budget not found")

    if not budget:
        budget = WealthBudget(user_id=user.id)
        db.add(budget)

    for field in ("category_id", "period", "amount", "warning_threshold", "critical_threshold"):
        setattr(budget, field, getattr(payload, field))

    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.get(WealthBudget, budget_id)
    if not budget or budget.user_id != user.id:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
