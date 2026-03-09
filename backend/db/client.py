import os
from supabase import create_client, Client

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required. "
        "Set them in backend/.env"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase_admin = supabase  # alias — service key has full access
