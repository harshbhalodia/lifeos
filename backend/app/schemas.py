from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

CategoryGroup = Literal["fixed", "variable", "adhoc", "investments", "new_investments", "income"]
EntryType = Literal["income", "expense"]
RecurrenceInterval = Literal["weekly", "monthly", "yearly"] | None
AccountType = Literal["checking", "savings", "credit", "investment", "retirement", "loan", "other"]
GoalType = Literal["emergency_fund", "savings", "debt_repayment", "investment", "major_purchase", "other"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------- auth ----------------


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(ORMModel):
    id: str
    email: str
    created_at: datetime


# ---------------- accounts ----------------


class AccountIn(BaseModel):
    id: str | None = None
    name: str
    type: AccountType
    institution: str | None = None
    currency: str = "USD"
    opening_balance: float = 0
    current_balance: float = 0
    is_liquid: bool = True


class AccountOut(ORMModel):
    id: str
    name: str
    type: str
    institution: str | None
    currency: str
    opening_balance: float
    current_balance: float
    is_liquid: bool
    created_at: datetime


# ---------------- categories ----------------


class CategoryIn(BaseModel):
    id: str | None = None
    name: str
    group: CategoryGroup
    kind: EntryType
    color: str | None = None
    is_archived: bool = False


class CategoryOut(ORMModel):
    id: str
    name: str
    group: str
    kind: str
    color: str | None
    is_archived: bool
    created_at: datetime


# ---------------- entries ----------------


class EntryIn(BaseModel):
    id: str | None = None
    type: EntryType
    amount: float = Field(ge=0)
    entry_date: date
    payee: str | None = None
    category_id: str | None = None
    account_id: str | None = None
    is_recurring: bool = False
    recurrence_interval: RecurrenceInterval = None
    notes: str | None = None
    import_batch_id: str | None = None


class EntryOut(ORMModel):
    id: str
    type: str
    amount: float
    entry_date: date
    payee: str | None
    category_id: str | None
    account_id: str | None
    is_recurring: bool
    recurrence_interval: str | None
    notes: str | None
    created_at: datetime


# ---------------- budgets ----------------


class BudgetIn(BaseModel):
    id: str | None = None
    category_id: str
    monthly_amount: float
    warning_threshold: float = 80
    critical_threshold: float = 100


class BudgetOut(ORMModel):
    id: str
    category_id: str
    monthly_amount: float
    warning_threshold: float
    critical_threshold: float
    created_at: datetime


# ---------------- goals ----------------


class GoalIn(BaseModel):
    id: str | None = None
    name: str
    goal_type: GoalType
    target_amount: float
    current_amount: float = 0
    target_date: date | None = None


class GoalOut(ORMModel):
    id: str
    name: str
    goal_type: str
    target_amount: float
    current_amount: float
    target_date: date | None
    created_at: datetime


# ---------------- forecast assumptions ----------------


class AssumptionIn(BaseModel):
    id: str | None = None
    name: str
    annual_return_rate: float = 0.07
    inflation_rate: float = 0.03
    years_horizon: int = 10
    is_active: bool = True


class AssumptionOut(ORMModel):
    id: str
    name: str
    annual_return_rate: float
    inflation_rate: float
    years_horizon: int
    is_active: bool
    created_at: datetime


# ---------------- analytics ----------------


class NetWorthSummary(BaseModel):
    total: float
    liquid: float
    illiquid: float
    investments: float


class CashflowPoint(BaseModel):
    month: str
    label: str
    incoming: float
    outgoing: float
    net: float


class CategoryGroupTotal(BaseModel):
    group: CategoryGroup
    total: float


class BudgetStatus(BaseModel):
    budget_id: str
    category_id: str
    category_name: str
    monthly_amount: float
    spent: float
    percent: float
    status: Literal["ok", "warning", "critical"]
    projected_month_end: float


class LiquidityInfo(BaseModel):
    liquid_balance: float
    avg_monthly_essential_spend: float
    months_of_runway: float | None


class NetWorthProjectionPoint(BaseModel):
    year: int
    liquid: float
    investments: float
    illiquid: float
    net_worth: float


class AnalyticsSummary(BaseModel):
    net_worth: NetWorthSummary
    liquidity: LiquidityInfo
    cashflow: list[CashflowPoint]
    category_breakdown: list[CategoryGroupTotal]
    budget_statuses: list[BudgetStatus]


# ---------------- agents ----------------


class AgentInfo(BaseModel):
    id: str
    name: str
    version: str
    description: str
    reads: list[str]
    writes: list[str]


class AgentRunResult(BaseModel):
    agent_id: str
    status: Literal["ok", "error"]
    summary: str | None = None
    facts: dict | None = None
    error: str | None = None


class InsightOut(ORMModel):
    id: str
    agent_id: str
    severity: str
    summary: str
    facts_json: str
    created_at: datetime


class AgentExecutionOut(ORMModel):
    id: str
    agent_id: str
    agent_version: str
    status: str
    input_ref: str
    output: str | None
    error: str | None
    created_at: datetime
