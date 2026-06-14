from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import SiteSetting
from auth import get_current_admin

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """Return all site settings as a key-value dict (public)."""
    rows = db.query(SiteSetting).all()
    return {r.key: r.value for r in rows}


class SettingUpdate(BaseModel):
    value: str


@router.put("/{key}")
def update_setting(
    key: str,
    body: SettingUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Update a site setting (admin only). Creates it if it doesn't exist."""
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if setting:
        setting.value = body.value
    else:
        setting = SiteSetting(key=key, value=body.value)
        db.add(setting)
    db.commit()
    return {"key": key, "value": body.value}
