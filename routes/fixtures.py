from fastapi import APIRouter
from sheets import get_worksheet

router = APIRouter(prefix="/fixtures", tags=["Fixtures"])

@router.get("/")
def get_fixtures():
    sheet = get_worksheet("Fixtures")
    data = sheet.get_all_records()
    return data
