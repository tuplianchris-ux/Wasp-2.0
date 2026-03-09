#!/usr/bin/env python3
"""Quick script to verify Supabase connection using backend .env."""
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))
from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')


def check_supabase():
    url = os.environ.get('SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_SERVICE_KEY', '')
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        return False
    if 'YOUR_PROJECT' in url:
        print("ERROR: SUPABASE_URL still contains placeholder. Replace with your real project URL.")
        return False
    print(f"Connecting to Supabase ({url})...")
    try:
        from supabase import create_client
        sb = create_client(url, key)
        resp = sb.table("users").select("user_id", count="exact").limit(1).execute()
        count = resp.count if resp.count is not None else len(resp.data)
        print(f"Users table: {count} row(s)")
        print("Supabase connection: SUCCESS")
        return True
    except Exception as e:
        print(f"Supabase connection: FAILED — {e}")
        return False


if __name__ == '__main__':
    ok = check_supabase()
    sys.exit(0 if ok else 1)
