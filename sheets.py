import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import os

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SERVICE_ACCOUNT_FILE = "service_account.json"

creds = Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=SCOPES
)

client = gspread.authorize(creds)

def get_worksheet(sheet_name: str):
    spreadsheet_name = os.getenv("SPREADSHEET_NAME")
    return client.open(spreadsheet_name).worksheet(sheet_name)
