from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User, WealthEntry
from app.schemas import EntryIn, EntryOut

router = APIRouter(prefix="/wealth/entries", tags=["wealth:entries"])


@router.get("", response_model=list[EntryOut])
def list_entries(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(WealthEntry)
        .filter(WealthEntry.user_id == user.id)
        .order_by(WealthEntry.entry_date.desc())
        .all()
    )


@router.put("", response_model=EntryOut)
def upsert_entry(payload: EntryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.get(WealthEntry, payload.id) if payload.id else None
    if entry and entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    if not entry:
        entry = WealthEntry(user_id=user.id)
        db.add(entry)

    for field in (
        "type",
        "amount",
        "entry_date",
        "payee",
        "category_id",
        "account_id",
        "is_recurring",
        "recurrence_interval",
        "notes",
        "import_batch_id",
    ):
        setattr(entry, field, getattr(payload, field))

    db.commit()
    db.refresh(entry)
    return entry


@router.post("/bulk", response_model=list[EntryOut])
def bulk_insert_entries(payload: list[EntryIn], user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    created: list[WealthEntry] = []
    for item in payload:
        entry = WealthEntry(user_id=user.id)
        for field in (
            "type",
            "amount",
            "entry_date",
            "payee",
            "category_id",
            "account_id",
            "is_recurring",
            "recurrence_interval",
            "notes",
            "import_batch_id",
        ):
            setattr(entry, field, getattr(item, field))
        db.add(entry)
        created.append(entry)

    db.commit()
    for entry in created:
        db.refresh(entry)
    return created


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.get(WealthEntry, entry_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
