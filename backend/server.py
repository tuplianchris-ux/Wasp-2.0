from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware import Middleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from supabase import create_client, Client as SupabaseClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
import json
import smtplib
import secrets
import asyncio
from contextlib import asynccontextmanager
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import json
import base64
import aiofiles
import httpx
import bleach
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required")
sb: SupabaseClient = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY') or os.environ.get('JWT_SECRET', 'taskflow-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# LLM Configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')

# Email / SMTP Configuration (optional — logs to console when not set)
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@visionaryacademy.com")

# Dev vs prod — cookies must NOT be secure=True on plain HTTP (localhost)
IS_DEV = os.environ.get("ENV", "development").lower() != "production"

# Account lockout settings
LOGIN_MAX_ATTEMPTS = 5          # failed attempts before lockout
LOGIN_LOCKOUT_MINUTES = 30      # how long the account stays locked
UNLOCK_CODE_TTL_MINUTES = 15   # unlock-code validity window

# Top-100 most common / weak passwords — rejected at registration
COMMON_PASSWORDS: set = {
    "password", "password1", "password12", "password123", "password1234",
    "123456", "1234567", "12345678", "123456789", "1234567890",
    "qwerty", "qwerty123", "qwertyuiop", "abc123", "abcd1234",
    "111111", "1111111", "11111111", "000000", "000000000",
    "iloveyou", "sunshine", "princess", "dragon", "monkey",
    "letmein", "welcome", "login", "admin", "admin123",
    "master", "superman", "batman", "shadow", "michael",
    "football", "baseball", "soccer", "hockey", "basketball",
    "charlie", "donald", "thomas", "jordan", "harley",
    "ranger", "joshua", "taylor", "andrew", "buster",
    "trustno1", "starwars", "assassin", "freedom", "whatever",
    "superman1", "batman123", "passw0rd", "p@ssword", "p@ss123",
    "pass1234", "pass@123", "test1234", "hello123", "welcome1",
    "secret", "secret123", "changeme", "letmein1", "qazwsx",
    "zxcvbn", "asdfgh", "1q2w3e4r", "1q2w3e4r5t", "qweasd",
    "696969", "123123", "112233", "121212", "123321",
    "987654321", "654321", "555555", "666666", "777777",
    "mustang", "access", "matrix", "flower", "summer",
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ==================== RATE LIMITING SETUP ====================

def _extract_token_sync(request: Request) -> Optional[str]:
    """Synchronously extract JWT token from cookie or Authorization header."""
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    return token or None


def _is_founder_from_token(request: Request) -> bool:
    """Check founder status from JWT claims without hitting the database."""
    token = _extract_token_sync(request)
    if not token:
        return False
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return bool(payload.get("founder_tier"))
    except Exception:
        return False


def get_user_or_ip_key(request: Request) -> str:
    """Use authenticated user_id as the rate-limit bucket; fall back to IP."""
    token = _extract_token_sync(request)
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
            if user_id:
                return user_id
        except Exception:
            pass
    return get_remote_address(request)


# Dynamic rate-limit callables — founders get effectively-unlimited headroom
def _ai_limit(request: Request) -> str:
    return "10000/minute" if _is_founder_from_token(request) else "10/minute"

def _upload_limit(request: Request) -> str:
    return "10000/minute" if _is_founder_from_token(request) else "5/minute"

def _comment_limit(request: Request) -> str:
    return "10000/hour" if _is_founder_from_token(request) else "20/hour"

def _general_write_limit(request: Request) -> str:
    return "10000/minute" if _is_founder_from_token(request) else "100/minute"

def _publish_limit(request: Request) -> str:
    return "10000/hour" if _is_founder_from_token(request) else "3/hour"


# Use Redis when REDIS_URL is configured; otherwise fall back to in-memory storage
_REDIS_URL = os.environ.get("REDIS_URL")
_storage_uri = _REDIS_URL if _REDIS_URL else "memory://"

limiter = Limiter(key_func=get_user_or_ip_key, storage_uri=_storage_uri)
app.state.limiter = limiter


async def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Return a friendly 429 JSON response with a Retry-After header."""
    retry_after = getattr(exc, "retry_after", 60)
    # SlowAPI may expose retry_after as a timedelta
    if hasattr(retry_after, "seconds"):
        retry_after = int(retry_after.total_seconds())
    retry_after = int(retry_after) if retry_after else 60
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded. Try again in {retry_after} seconds.",
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Helmet-style security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'"
        return response

class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """Middleware to automatically sanitize request bodies"""

    # Paths whose raw body must NEVER be altered (e.g. webhook signature verification)
    RAW_BODY_PATHS = ("/api/webhooks/", "/api/stripe/webhook")

    async def dispatch(self, request, call_next):
        # Skip sanitization for webhook endpoints — Stripe signature verification
        # requires the exact raw bytes that Stripe signed; any mutation breaks HMAC.
        if any(request.url.path.startswith(p) for p in self.RAW_BODY_PATHS):
            return await call_next(request)

        # Only sanitize POST, PUT, PATCH requests
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    # Try to parse as JSON
                    try:
                        import json
                        data = json.loads(body.decode())
                        
                        # Recursively sanitize string values
                        def sanitize_dict(obj):
                            if isinstance(obj, dict):
                                return {k: sanitize_dict(v) for k, v in obj.items()}
                            elif isinstance(obj, list):
                                return [sanitize_dict(item) for item in obj]
                            elif isinstance(obj, str):
                                # Basic HTML sanitization
                                import html
                                return html.escape(obj)
                            else:
                                return obj
                        
                        sanitized_data = sanitize_dict(data)
                        sanitized_body = json.dumps(sanitized_data).encode()
                        
                        # Create new request with sanitized body
                        scope = request.scope
                        receive = lambda: {"type": "http.request", "body": sanitized_body}
                        request = Request(scope, receive)
                        
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        # If not JSON, leave as-is
                        pass
            except Exception:
                # If sanitization fails, continue with original request
                pass
        
        response = await call_next(request)
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "*"])
app.add_middleware(InputSanitizationMiddleware)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}  # channel_id -> {user_id -> websocket}
    
    async def connect(self, websocket: WebSocket, channel_id: str, user_id: str):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = {}
        self.active_connections[channel_id][user_id] = websocket
    
    def disconnect(self, channel_id: str, user_id: str):
        if channel_id in self.active_connections:
            self.active_connections[channel_id].pop(user_id, None)
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
    
    async def broadcast(self, channel_id: str, message: dict):
        if channel_id in self.active_connections:
            for ws in self.active_connections[channel_id].values():
                try:
                    await ws.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# ==================== SUPABASE HELPERS ====================
def _row(resp) -> dict | None:
    """Extract single row from Supabase response, or None."""
    if resp.data and len(resp.data) > 0:
        return resp.data[0]
    return None

def _rows(resp) -> list:
    """Extract rows list from Supabase response."""
    return resp.data or []

def _count(resp) -> int:
    """Extract count from Supabase count response."""
    return resp.count if resp.count is not None else 0

# ==================== SECURITY UTILITIES ====================
def sanitize_input(text: str, max_length: int = 10000) -> str:
    """
    Sanitize user input by removing HTML tags, scripts, and limiting length
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length (default: 10,000)
    
    Returns:
        Sanitized text
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Remove HTML tags
    text = bleach.clean(text, tags=[], strip=True)
    
    # Remove script content and dangerous patterns
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'onload=',
        r'onerror=',
        r'onclick=',
        r'onmouseover=',
        r'onfocus=',
        r'onblur=',
        r'onchange=',
        r'onsubmit='
    ]
    
    for pattern in dangerous_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
    
    # Limit length
    text = text[:max_length]
    
    # Strip whitespace
    text = text.strip()
    
    return text

def check_content_moderation(content: str) -> dict:
    """
    Placeholder for content moderation check
    
    Args:
        content: Content to check
    
    Returns:
        Dict with moderation results
    """
    # TODO: Implement actual content moderation
    # This could integrate with services like:
    # - OpenAI Moderation API
    # - Google Cloud Content Safety API
    # - Custom profanity filters
    
    return {
        "allowed": True,
        "reason": "",
        "categories": [],
        "confidence": 0.0
    }

# ==================== MODELS ====================
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return sanitize_input(v.lower())
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        return sanitize_input(v, max_length=100)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        validate_password_strength(v)
        return v  # Never sanitize passwords — they are hashed verbatim

class UserLogin(BaseModel):
    email: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return sanitize_input(v.lower())

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    avatar: Optional[str] = None
    banner: Optional[str] = None
    bio: Optional[str] = None
    created_at: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = "default"
    is_template: bool = False
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Title is required')
        return sanitize_input(v, max_length=200)
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is None:
            return v
        return sanitize_input(v, max_length=2000)
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        return sanitize_input(v, max_length=50)

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    is_template: Optional[bool] = None
    completed: Optional[bool] = None
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None and len(v.strip()) < 1:
            raise ValueError('Title is required')
        return sanitize_input(v, max_length=200) if v is not None else v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is None:
            return v
        return sanitize_input(v, max_length=2000)
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        return sanitize_input(v, max_length=50) if v is not None else v

class TaskCheckIn(BaseModel):
    note: Optional[str] = None
    progress_percentage: Optional[int] = None
    mood: Optional[str] = None
    time_spent_minutes: Optional[int] = None
    
    @field_validator('note')
    @classmethod
    def validate_note(cls, v):
        if v is None:
            return v
        return sanitize_input(v, max_length=1000)
    
    @field_validator('progress_percentage')
    @classmethod
    def validate_progress(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Progress must be between 0 and 100')
        return v
    
    @field_validator('mood')
    @classmethod
    def validate_mood(cls, v):
        if v is None:
            return v
        allowed_moods = ['focused', 'productive', 'challenged', 'stuck', 'motivated', 'tired']
        if v not in allowed_moods:
            raise ValueError(f'Invalid mood. Allowed: {", ".join(allowed_moods)}')
        return v
    
    @field_validator('time_spent_minutes')
    @classmethod
    def validate_time_spent(cls, v):
        if v is not None and v < 0:
            raise ValueError('Time spent must be positive')
        return v

class NoteCreate(BaseModel):
    title: str
    content: str
    folder: Optional[str] = "default"
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Title is required')
        return sanitize_input(v, max_length=200)
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Content is required')
        return sanitize_input(v, max_length=50000)
    
    @field_validator('folder')
    @classmethod
    def validate_folder(cls, v):
        return sanitize_input(v, max_length=50)

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    folder: Optional[str] = None

class NotesStudioSave(BaseModel):
    """Payload for saving a Notes Studio note (rich text + canvas)."""
    title: str
    content: str             # HTML from TipTap editor
    canvas_data: Optional[Dict[str, Any]] = None   # Excalidraw scene data
    template_id: Optional[str] = "blank"
    is_draft: bool = False
    note_id: Optional[str] = None   # supplied when updating an existing note

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        return sanitize_input(v.strip() or 'Untitled Note', max_length=200)

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        return sanitize_input(v, max_length=200000)  # generous for HTML+canvas

class QuizGenerateRequest(BaseModel):
    content: str
    num_questions: int = 5
    quiz_type: str = "multiple_choice"
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Content must be at least 10 characters')
        return sanitize_input(v, max_length=5000)
    
    @field_validator('num_questions')
    @classmethod
    def validate_num_questions(cls, v):
        if not 1 <= v <= 20:
            raise ValueError('Number of questions must be between 1 and 20')
        return v

class FlashcardGenerateRequest(BaseModel):
    content: str
    num_cards: int = 10
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Content must be at least 10 characters')
        return sanitize_input(v, max_length=5000)
    
    @field_validator('num_cards')
    @classmethod
    def validate_num_cards(cls, v):
        if not 1 <= v <= 50:
            raise ValueError('Number of cards must be between 1 and 50')
        return v

class SummarizeRequest(BaseModel):
    content: str
    style: str = "concise"
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Content must be at least 10 characters')
        return sanitize_input(v, max_length=10000)
    
    @field_validator('style')
    @classmethod
    def validate_style(cls, v):
        if v not in ["concise", "detailed", "bullet"]:
            raise ValueError('Style must be one of: concise, detailed, bullet')
        return v

class ServerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None

class ChannelCreate(BaseModel):
    name: str
    server_id: str
    channel_type: str = "text"

class MessageCreate(BaseModel):
    content: str
    channel_id: str
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Message content is required')
        return sanitize_input(v, max_length=2000)
    
    @field_validator('channel_id')
    @classmethod
    def validate_channel_id(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Invalid channel ID format')
        return v

class WishlistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True

class WishlistItemCreate(BaseModel):
    wishlist_id: str
    title: str
    url: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None

class ExchangeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    budget: Optional[float] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None

# ==================== NEW GAMIFICATION MODELS ====================
class TaskProgressUpdate(BaseModel):
    progress: int  # 0-100

class SchoolCreate(BaseModel):
    name: str
    description: Optional[str] = None
    school_type: str = "high_school"  # high_school, university, other

class ClassCreate(BaseModel):
    name: str
    school_id: str
    subject: Optional[str] = None
    description: Optional[str] = None

class CompetitionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    competition_type: str = "speed"  # speed, accuracy, essay, study_jam
    difficulty: str = "medium"  # easy, medium, hard
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    max_participants: int = 100

class CompetitionSubmission(BaseModel):
    competition_id: str
    answer: Optional[str] = None
    time_taken: Optional[int] = None  # seconds
    accuracy: Optional[float] = None  # 0-100

class MissionCreate(BaseModel):
    title: str
    description: str
    xp_reward: int
    coin_reward: int
    mission_type: str = "daily"  # daily, weekly
    target_count: int = 1

class TemplateCreate(BaseModel):
    title: str
    template_type: str  # notes, essay, poster, slides, report
    content: str
    is_premium: bool = False

class GroupGoalCreate(BaseModel):
    server_id: str
    title: str
    description: Optional[str] = None
    target: int = 100
    deadline: Optional[str] = None

class SharedResourceCreate(BaseModel):
    server_id: str
    title: str
    resource_type: str  # link, file, note
    url: Optional[str] = None
    content: Optional[str] = None

class CollaborativeNoteCreate(BaseModel):
    server_id: str
    title: str
    content: str = ""

class CollaborativeNoteUpdate(BaseModel):
    content: str

# ==================== LIBRARY MODELS ====================
class LibraryItemCreate(BaseModel):
    item_type: str  # quiz, flashcards, summary, template
    title: str
    content: Any  # JSON content (questions, cards, text, etc.)
    source_text: Optional[str] = None  # Original text used to generate
    tags: list = []  # Tag names

class LibraryItemUpdate(BaseModel):
    title: Optional[str] = None
    tags: Optional[list] = None
    folder: Optional[str] = None

class CompetitionHistoryResponse(BaseModel):
    competition_id: str
    title: str
    score: int
    placement: int
    xp_earned: int
    coins_earned: int
    submitted_at: str

# ==================== PRACTICE MODELS ====================
class PracticeStats(BaseModel):
    correct: int
    incorrect: int
    accuracy: int
    timeSpent: int
    testType: str
    section: str

# ==================== AI JOB MODELS ====================
class AIJobCreate(BaseModel):
    job_type: str  # quiz, summary, flashcards, improve, voice_parse
    input_data: str
    
class AIJobResponse(BaseModel):
    job_id: str
    status: str  # analyzing, structuring, generating, finalizing, completed, failed
    stage: int
    output: Optional[Any] = None
    expires_at: Optional[str] = None

# ==================== STRENGTH PROFILE MODELS ====================
class OnboardingData(BaseModel):
    future_goals: List[str]
    strengths: List[str]
    daily_routine: str
    challenges: List[str]

class StrengthProfile(BaseModel):
    strengths: List[dict]
    career_clusters: List[dict]
    skill_paths: List[dict]
    lock_in_plan: dict

# ==================== VOICE INPUT MODEL ====================
class VoiceParseRequest(BaseModel):
    transcript: str

# ==================== WALLET LEDGER MODEL ====================
class WalletTransaction(BaseModel):
    type: str  # earn, spend, topup
    amount: int
    currency: str  # coins, energy, storage
    reason: str

# ==================== FOUNDERS CONFIG ====================
FOUNDERS_LAUNCH_DATE = datetime(2025, 1, 1, tzinfo=timezone.utc)
FOUNDERS_LIMIT = 5000

# AI Job stages
AI_STAGES = ["analyzing", "structuring", "generating", "finalizing", "completed"]

# Plan limits
PLAN_LIMITS = {
    "free": {
        "energy_cap": 9,
        "energy_regen_hours": 24,  # Full regen in 24h
        "storage_mb": 5,
        "ai_refine_limit": 1,
        "can_save_ai": False,
        "can_heavy_ai": False
    },
    "lite": {
        "energy_cap": 25,
        "energy_regen_hours": 8,  # Full regen in 8h
        "storage_mb": 100,
        "ai_refine_limit": 10,
        "can_save_ai": True,
        "can_heavy_ai": True
    }
}

# Stripe config
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
LITE_PRICE_CENTS = 399  # $3.99/month

# ==================== PERMISSION GATE ====================
async def can_user(user: dict, action: str) -> dict:
    """Central permission gate for all monetized actions"""
    plan = user.get("plan", "free")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    
    result = {"allowed": False, "reason": "", "upgrade_required": False}
    
    if action == "save_ai_output":
        if limits["can_save_ai"]:
            # Check storage limit
            storage_used = user.get("storage_used_mb", 0)
            if storage_used >= limits["storage_mb"]:
                result["reason"] = "storage_full"
                result["upgrade_required"] = True
            else:
                result["allowed"] = True
        else:
            result["reason"] = "plan_restricted"
            result["upgrade_required"] = True
            
    elif action == "refine_ai":
        refine_count = user.get("daily_refines", 0)
        if refine_count < limits["ai_refine_limit"]:
            result["allowed"] = True
        else:
            result["reason"] = "refine_limit_reached"
            result["upgrade_required"] = True
            
    elif action == "heavy_ai_generate":
        if limits["can_heavy_ai"]:
            result["allowed"] = True
        else:
            result["reason"] = "plan_restricted"
            result["upgrade_required"] = True
            
    elif action == "use_energy":
        energy = user.get("energy", 0)
        if energy > 0:
            result["allowed"] = True
        else:
            result["reason"] = "no_energy"
            result["upgrade_required"] = False  # Just wait or upgrade for faster regen
            
    elif action == "create_ai_job":
        energy = user.get("energy", 0)
        if energy > 0:
            result["allowed"] = True
        else:
            result["reason"] = "no_energy"
            
    else:
        result["allowed"] = True  # Default allow for unknown actions
        
    return result

async def check_and_regen_energy(user: dict) -> int:
    """Check and regenerate energy based on time and plan"""
    plan = user.get("plan", "free")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    
    last_regen = user.get("last_energy_regen")
    current_energy = user.get("energy", 0)
    energy_cap = limits["energy_cap"]
    
    if current_energy >= energy_cap:
        return current_energy
    
    if last_regen:
        try:
            last_time = datetime.fromisoformat(last_regen.replace('Z', '+00:00'))
            hours_passed = (datetime.now(timezone.utc) - last_time).total_seconds() / 3600
            regen_rate = energy_cap / limits["energy_regen_hours"]
            regen_amount = int(hours_passed * regen_rate)
            
            if regen_amount > 0:
                new_energy = min(energy_cap, current_energy + regen_amount)
                sb.table("users").update({
                    "energy": new_energy,
                    "last_energy_regen": datetime.now(timezone.utc).isoformat()
                }).eq("user_id", user["user_id"]).execute()
                return new_energy
        except:
            pass
    
    return current_energy

def calculate_storage_size(content: Any) -> float:
    """Calculate storage size in MB"""
    if isinstance(content, str):
        return len(content.encode('utf-8')) / (1024 * 1024)
    elif isinstance(content, dict):
        return len(json.dumps(content).encode('utf-8')) / (1024 * 1024)
    return 0.001  # Minimum 1KB

# ==================== AUTH HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def validate_password_strength(password: str) -> None:
    """
    Raise ValueError with a descriptive message if the password is too weak.
    Rules:  ≥8 chars · ≥1 digit · ≥1 special char · not in common-passwords list
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>/?\\|`~]", password):
        raise ValueError("Password must contain at least one special character (!@#$%^&* etc.)")
    if password.lower() in COMMON_PASSWORDS:
        raise ValueError("This password is too common. Please choose a stronger one")


async def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send an HTML email via SMTP.
    Returns True on success.  Logs a warning (and the message body) when SMTP
    is not configured so development still works without an email server.
    """
    if not SMTP_HOST or not SMTP_USER:
        logger.warning(
            "[EMAIL NOT SENT — SMTP unconfigured]  To: %s | Subject: %s",
            to_email, subject,
        )
        logger.info("[EMAIL BODY] %s", html_body)
        return False

    def _send_sync():
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_sync)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


# ── Token blacklist ──────────────────────────────────────────────────────────

async def blacklist_token(token: str) -> None:
    """Store an invalidated token so get_current_user rejects it."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        exp = payload.get("exp")
        expires_at = (
            datetime.fromtimestamp(exp, tz=timezone.utc)
            if exp
            else datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
        )
    except Exception:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)

    sb.table("token_blacklist").upsert({
        "token": token,
        "expires_at": expires_at.isoformat()
    }).execute()


async def is_token_blacklisted(token: str) -> bool:
    """Return True if the token has been explicitly invalidated."""
    resp = sb.table("token_blacklist").select("*").eq("token", token).execute()
    entry = _row(resp)
    if not entry:
        return False
    expires_at_raw = entry.get("expires_at")
    if expires_at_raw:
        try:
            expires_at = datetime.fromisoformat(str(expires_at_raw))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                sb.table("token_blacklist").delete().eq("token", token).execute()
                return False
        except Exception:
            pass
    return True


# ── Failed login tracking / account lockout ──────────────────────────────────

async def get_login_attempts(email: str) -> dict:
    """Return current attempt info for an email address."""
    resp = sb.table("login_attempts").select("*").eq("email", email).execute()
    doc = _row(resp)
    if not doc:
        return {"locked": False, "count": 0}

    locked_until_raw = doc.get("locked_until")
    if locked_until_raw:
        try:
            locked_until = datetime.fromisoformat(str(locked_until_raw))
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if now < locked_until:
                remaining = max(0, int((locked_until - now).total_seconds()))
                return {"locked": True, "count": doc["count"], "remaining_seconds": remaining}
        except Exception:
            pass
        sb.table("login_attempts").delete().eq("email", email).execute()
        return {"locked": False, "count": 0}

    return {"locked": False, "count": doc.get("count", 0)}


async def record_failed_attempt(email: str) -> dict:
    now = datetime.now(timezone.utc)
    resp = sb.table("login_attempts").select("*").eq("email", email).execute()
    doc = _row(resp)
    new_count = (doc.get("count", 0) if doc else 0) + 1
    locked_until = None

    if new_count >= LOGIN_MAX_ATTEMPTS:
        locked_until = (now + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)).isoformat()

    sb.table("login_attempts").upsert({
        "email": email,
        "count": new_count,
        "last_attempt": now.isoformat(),
        "locked_until": locked_until,
    }).execute()
    return {"count": new_count, "locked": locked_until is not None}


async def clear_login_attempts(email: str) -> None:
    sb.table("login_attempts").delete().eq("email", email).execute()


def create_token(user_id: str, founder_tier: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    if founder_tier:
        payload["founder_tier"] = founder_tier
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==================== GAMIFICATION HELPERS ====================
def compute_rewards(difficulty: str, accuracy: float, time_taken: int, streak: int, placement: int, is_premium: bool) -> dict:
    """AI Rewards Engine - Compute XP and coins based on performance"""
    base_xp = {"easy": 50, "medium": 100, "hard": 200}.get(difficulty, 100)
    base_coins = {"easy": 10, "medium": 25, "hard": 50}.get(difficulty, 25)
    
    # Accuracy multiplier (0.5x to 2x)
    accuracy_mult = 0.5 + (accuracy / 100) * 1.5
    
    # Speed bonus (faster = more XP, cap at 2x for under 30 seconds)
    speed_mult = max(0.5, min(2.0, 120 / max(time_taken, 30)))
    
    # Streak bonus (+10% per day, max 50%)
    streak_mult = 1 + min(streak * 0.1, 0.5)
    
    # Placement bonus
    placement_mult = {1: 2.0, 2: 1.5, 3: 1.25}.get(placement, 1.0)
    
    # Premium bonus (+25%)
    premium_mult = 1.25 if is_premium else 1.0
    
    xp = int(base_xp * accuracy_mult * speed_mult * streak_mult * placement_mult * premium_mult)
    coins = int(base_coins * accuracy_mult * placement_mult * premium_mult)
    
    return {"xp": xp, "coins": coins}

async def award_xp_coins(user_id: str, xp: int, coins: int, reason: str):
    """Award XP and coins to user and update level"""
    resp = sb.table("users").select("*").eq("user_id", user_id).execute()
    user = _row(resp)
    if not user:
        return

    current_xp = user.get("xp", 0) + xp
    current_coins = user.get("coins", 0) + coins

    level = 1
    xp_needed = 100
    total_xp_for_level = 0
    while total_xp_for_level + xp_needed <= current_xp:
        total_xp_for_level += xp_needed
        level += 1
        xp_needed = 100 + (level - 1) * 50

    sb.table("users").update({"xp": current_xp, "coins": current_coins, "level": level}).eq("user_id", user_id).execute()

    sb.table("xp_transactions").insert({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "xp": xp,
        "coins": coins,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=401,
            detail="Session has been invalidated. Please log in again.",
        )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        resp = sb.table("users").select("*").eq("user_id", user_id).execute()
        user = _row(resp)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register")
@limiter.limit("5/minute")
async def register(user: UserCreate, request: Request, response: Response):
    existing = _row(sb.table("users").select("*").eq("email", user.email).execute())
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "avatar": None,
        "banner": None,
        "bio": None,
        "xp": 0,
        "coins": 100,
        "energy": 9,
        "level": 1,
        "streak": 0,
        "plan": "free",
        "is_lite_founder": False,
        "is_premium": False,
        "premium_until": None,
        "onboarding_complete": False,
        "storage_used": 0,
        "last_energy_reset": today,
        "avatar_frame": None,
        "badges": [],
        "school_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("users").insert(user_doc).execute()
    
    token = create_token(user_id)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=not IS_DEV,
        samesite="lax",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/",
    )

    return {
        "user": {
            "user_id": user_id,
            "email": user.email,
            "name": user.name,
            "avatar": None,
            "banner": None,
            "bio": None,
            "xp": 0,
            "coins": 100,
            "level": 1,
            "is_premium": False,
            "created_at": user_doc["created_at"],
        },
        "token": token,
    }

@api_router.post("/auth/login")
@limiter.limit("10/minute")
async def login(user: UserLogin, request: Request, response: Response):
    # ── 1. Check for active account lockout ──────────────────────────────────
    attempt_info = await get_login_attempts(user.email)
    if attempt_info["locked"]:
        remaining = attempt_info.get("remaining_seconds", LOGIN_LOCKOUT_MINUTES * 60)
        raise HTTPException(
            status_code=423,
            detail={
                "error": "account_locked",
                "message": (
                    f"Account temporarily locked after {LOGIN_MAX_ATTEMPTS} failed attempts. "
                    f"Try again in {remaining} seconds, or request an unlock code."
                ),
                "remaining_seconds": remaining,
            },
        )

    # ── 2. Validate credentials ──────────────────────────────────────────────
    db_user = _row(sb.table("users").select("*").eq("email", user.email).execute())
    if not db_user or not verify_password(user.password, db_user.get("password") or ""):
        result = await record_failed_attempt(user.email)
        if result["locked"]:
            # Just hit the threshold — inform the user right away
            raise HTTPException(
                status_code=423,
                detail={
                    "error": "account_locked",
                    "message": (
                        "Too many failed attempts. Your account is now locked for "
                        f"{LOGIN_LOCKOUT_MINUTES} minutes. "
                        "Use 'Forgot password / unlock account' to regain access."
                    ),
                    "remaining_seconds": LOGIN_LOCKOUT_MINUTES * 60,
                },
            )
        remaining_attempts = LOGIN_MAX_ATTEMPTS - result["count"]
        raise HTTPException(
            status_code=401,
            detail=(
                f"Invalid email or password. "
                f"{remaining_attempts} attempt{'s' if remaining_attempts != 1 else ''} "
                "remaining before lockout."
            ),
        )

    # ── 3. Successful login — clear any old failure records ──────────────────
    await clear_login_attempts(user.email)

    token = create_token(db_user["user_id"], db_user.get("founder_tier"))
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=not IS_DEV,
        samesite="lax",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/",
    )

    return {
        "user": {
            "user_id": db_user["user_id"],
            "email": db_user["email"],
            "name": db_user["name"],
            "avatar": db_user.get("avatar"),
            "banner": db_user.get("banner"),
            "bio": db_user.get("bio"),
            "xp": db_user.get("xp", 0),
            "coins": db_user.get("coins", 0),
            "level": db_user.get("level", 1),
            "is_premium": db_user.get("is_premium", False),
            "created_at": db_user["created_at"],
        },
        "token": token,
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "avatar": user.get("avatar"),
        "banner": user.get("banner"),
        "bio": user.get("bio"),
        "xp": user.get("xp", 0),
        "coins": user.get("coins", 0),
        "level": user.get("level", 1),
        "is_premium": user.get("is_premium", False),
        "avatar_frame": user.get("avatar_frame"),
        "badges": user.get("badges", []),
        "school_id": user.get("school_id"),
        "created_at": user["created_at"]
    }

@api_router.post("/auth/google/callback")
async def google_oauth_callback(request: Request, response: Response):
    """Process Google OAuth2 callback"""
    body = await request.json()
    code = body.get("code")

    if not code:
        raise HTTPException(status_code=400, detail="Authorization code required")

    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    google_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")

    if not google_client_id or not google_client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": google_client_id,
                "client_secret": google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to exchange authorization code")

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="No access token received")

        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to fetch user info from Google")

        userinfo = userinfo_resp.json()

    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    existing = _row(sb.table("users").select("*").eq("email", email).execute())

    if existing:
        user_id = existing["user_id"]
        sb.table("users").update({
            "name": userinfo.get("name", existing["name"]),
            "avatar": userinfo.get("picture", existing.get("avatar")),
        }).eq("user_id", user_id).execute()
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "password": None,
            "name": userinfo.get("name", "User"),
            "avatar": userinfo.get("picture"),
            "banner": None,
            "bio": None,
            "xp": 0,
            "coins": 100,
            "energy": 9,
            "level": 1,
            "streak": 0,
            "plan": "free",
            "is_lite_founder": False,
            "is_premium": False,
            "premium_until": None,
            "onboarding_complete": False,
            "storage_used": 0,
            "last_energy_reset": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "avatar_frame": None,
            "badges": [],
            "school_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        sb.table("users").insert(user_doc).execute()

    db_user_for_token = _row(sb.table("users").select("user_id, founder_tier").eq("user_id", user_id).execute())
    token = create_token(user_id, db_user_for_token.get("founder_tier") if db_user_for_token else None)

    sb.table("user_sessions").insert({
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=not IS_DEV,
        samesite="lax",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/",
    )

    user = _row(sb.table("users").select("*").eq("user_id", user_id).execute())
    if user:
        user.pop("password", None)
    return {"user": user, "token": token}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    # Extract token from cookie or Authorization header
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if token:
        # Blacklist the token so it cannot be reused even before natural expiry
        await blacklist_token(token)
        sb.table("user_sessions").delete().eq("session_token", token).execute()

    response.delete_cookie("session_token", path="/", samesite="lax")
    return {"message": "Logged out"}


@api_router.post("/auth/refresh")
@limiter.limit("20/minute")
async def refresh_token_endpoint(request: Request, response: Response):
    """
    Issue a fresh JWT without re-entering credentials.
    The current valid token is blacklisted and replaced.
    """
    user = await get_current_user(request)  # validates + blacklist-checks current token

    # Blacklist the old token
    old_token = request.cookies.get("session_token")
    if not old_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            old_token = auth_header[7:]
    if old_token:
        await blacklist_token(old_token)

    new_token = create_token(user["user_id"], user.get("founder_tier"))
    response.set_cookie(
        key="session_token",
        value=new_token,
        httponly=True,
        secure=not IS_DEV,
        samesite="lax",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/",
    )
    return {"token": new_token}


@api_router.post("/auth/unlock/request")
@limiter.limit("3/minute")
async def request_account_unlock(request: Request):
    """
    Generate a one-time unlock code and (attempt to) email it.
    Works for accounts locked after too many failed login attempts.
    Always returns a generic message to avoid user enumeration.
    """
    body = await request.json()
    email = body.get("email", "").lower().strip()

    if not email or not re.match(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="A valid email address is required")

    # Only proceed if the account is actually locked
    attempt_info = await get_login_attempts(email)
    if not attempt_info["locked"]:
        # Generic response — don't reveal lock/registration status
        return {"message": "If this email is registered and locked, an unlock code has been sent."}

    # Generate a secure 6-digit code
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=UNLOCK_CODE_TTL_MINUTES)).isoformat()

    sb.table("unlock_codes").upsert({
        "email": email,
        "code": code,
        "expires_at": expires_at,
        "used": False,
    }).execute()

    html_body = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#4F46E5;">Visionary Academy — Account Unlock</h2>
      <p>Your account was temporarily locked after too many failed login attempts.</p>
      <p style="font-size:14px; color:#555;">Enter this code on the unlock screen:</p>
      <div style="background:#F3F4F6; border-radius:8px; padding:20px; text-align:center;">
        <span style="font-size:32px; letter-spacing:8px; font-weight:700; color:#111;">{code}</span>
      </div>
      <p style="font-size:12px; color:#999; margin-top:16px;">
        This code expires in {UNLOCK_CODE_TTL_MINUTES} minutes.
        If you did not request this, please ignore this email.
      </p>
    </div>
    """
    email_sent = await send_email(email, "Visionary Academy — Unlock Your Account", html_body)
    if not email_sent:
        # In dev/no-SMTP environments, expose the code in the response so testing works
        logger.info("[DEV] Unlock code for %s: %s", email, code)
        return {
            "message": "If this email is registered and locked, an unlock code has been sent.",
            "_dev_code": code,  # removed in production once SMTP is configured
        }

    return {"message": "If this email is registered and locked, an unlock code has been sent."}


@api_router.post("/auth/unlock/verify")
@limiter.limit("10/minute")
async def verify_account_unlock(request: Request):
    """
    Verify the 6-digit unlock code and reset login attempt counter.
    """
    body = await request.json()
    email = body.get("email", "").lower().strip()
    code = body.get("code", "").strip()

    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and unlock code are required")

    entry = _row(sb.table("unlock_codes").select("*").eq("email", email).execute())
    if not entry:
        raise HTTPException(status_code=400, detail="Invalid or expired unlock code")

    if entry.get("used"):
        raise HTTPException(status_code=400, detail="This code has already been used")

    try:
        expires_at = datetime.fromisoformat(str(entry["expires_at"]))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            sb.table("unlock_codes").delete().eq("email", email).execute()
            raise HTTPException(status_code=400, detail="Code has expired. Please request a new one")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid unlock code")

    # Use constant-time comparison to prevent timing attacks
    import hmac as _hmac
    if not _hmac.compare_digest(entry["code"], code):
        raise HTTPException(status_code=400, detail="Incorrect unlock code")

    # Mark code used and clear lockout
    sb.table("unlock_codes").update({"used": True}).eq("email", email).execute()
    await clear_login_attempts(email)

    return {"message": "Account unlocked. You can now log in."}


# ==================== TASKS ROUTES ====================
@api_router.get("/tasks")
async def get_tasks(request: Request):
    user = await get_current_user(request)
    tasks = _rows(sb.table("tasks").select("*").eq("user_id", user["user_id"]).eq("is_template", False).limit(1000).execute())
    return tasks

@api_router.post("/tasks")
@limiter.limit(_general_write_limit)
async def create_task(task: TaskCreate, request: Request):
    user = await get_current_user(request)
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task_doc = {
        "task_id": task_id,
        "user_id": user["user_id"],
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date,
        "category": task.category,
        "completed": False,
        "progress": 0,  # NEW: 0-100 progress slider
        "is_template": task.is_template,
        "check_ins": [],  # List of dates when checked in
        "streak": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("tasks").insert(task_doc).execute()
    
    # Award XP for creating a task
    await award_xp_coins(user["user_id"], 5, 1, "task_created")
    
    return task_doc

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in task.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    
    result = sb.table("tasks").update(update_data).eq("task_id", task_id).eq("user_id", user["user_id"]).execute()
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated = _row(sb.table("tasks").select("*").eq("task_id", task_id).execute())
    return updated

@api_router.put("/tasks/{task_id}/progress")
async def update_task_progress(task_id: str, progress_update: TaskProgressUpdate, request: Request):
    """Update task progress (0-100) and award XP based on progress"""
    user = await get_current_user(request)
    
    task = _row(sb.table("tasks").select("*").eq("task_id", task_id).eq("user_id", user["user_id"]).execute())
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    old_progress = task.get("progress", 0)
    new_progress = min(100, max(0, progress_update.progress))
    
    # Calculate XP based on progress increase
    progress_diff = new_progress - old_progress
    if progress_diff > 0:
        xp_earned = int(progress_diff * 0.5)  # 0.5 XP per progress point
        coins_earned = int(progress_diff * 0.1) if new_progress == 100 else 0
        
        # Bonus for completing (100%)
        if new_progress == 100 and old_progress < 100:
            xp_earned += 25
            coins_earned += 5
            streak = task.get("streak", 0) + 1
            sb.table("tasks").update({"streak": streak}).eq("task_id", task_id).execute()
        
        await award_xp_coins(user["user_id"], xp_earned, coins_earned, f"task_progress_{task_id}")
    
    sb.table("tasks").update({"progress": new_progress, "completed": new_progress == 100}).eq("task_id", task_id).execute()
    
    updated = _row(sb.table("tasks").select("*").eq("task_id", task_id).execute())
    return updated

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request):
    user = await get_current_user(request)
    result = sb.table("tasks").delete().eq("task_id", task_id).eq("user_id", user["user_id"]).execute()
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@api_router.post("/tasks/{task_id}/checkin")
async def check_in_task(task_id: str, checkin: TaskCheckIn, request: Request):
    user = await get_current_user(request)
    task = _row(sb.table("tasks").select("*").eq("task_id", task_id).eq("user_id", user["user_id"]).execute())
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    check_ins = task.get("check_ins", [])
    if checkin.date not in check_ins:
        check_ins.append(checkin.date)
        check_ins.sort()
        
        streak = calculate_streak(check_ins)
        
        sb.table("tasks").update({"check_ins": check_ins, "streak": streak}).eq("task_id", task_id).execute()
    
    updated = _row(sb.table("tasks").select("*").eq("task_id", task_id).execute())
    return updated

@api_router.post("/tasks/{task_id}/checkout")
async def check_out_task(task_id: str, checkin: TaskCheckIn, request: Request):
    user = await get_current_user(request)
    task = _row(sb.table("tasks").select("*").eq("task_id", task_id).eq("user_id", user["user_id"]).execute())
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    check_ins = task.get("check_ins", [])
    if checkin.date in check_ins:
        check_ins.remove(checkin.date)
        streak = calculate_streak(check_ins)
        
        sb.table("tasks").update({"check_ins": check_ins, "streak": streak}).eq("task_id", task_id).execute()
    
    updated = _row(sb.table("tasks").select("*").eq("task_id", task_id).execute())
    return updated

def calculate_streak(check_ins: List[str]) -> int:
    if not check_ins:
        return 0
    
    today = datetime.now(timezone.utc).date()
    streak = 0
    
    for i in range(len(check_ins) - 1, -1, -1):
        date = datetime.fromisoformat(check_ins[i]).date()
        expected_date = today - timedelta(days=streak)
        if date == expected_date:
            streak += 1
        elif date == expected_date - timedelta(days=1):
            streak += 1
        else:
            break
    
    return streak

@api_router.get("/tasks/templates")
async def get_task_templates(request: Request):
    """Get public task templates"""
    templates = _rows(sb.table("tasks").select("*").eq("is_template", True).limit(100).execute())
    return templates

@api_router.post("/tasks/templates/{task_id}/use")
async def use_template(task_id: str, request: Request):
    user = await get_current_user(request)
    template = _row(sb.table("tasks").select("*").eq("task_id", task_id).eq("is_template", True).execute())
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    new_task_id = f"task_{uuid.uuid4().hex[:12]}"
    new_task = {
        "task_id": new_task_id,
        "user_id": user["user_id"],
        "title": template["title"],
        "description": template["description"],
        "due_date": None,
        "category": template.get("category", "default"),
        "completed": False,
        "is_template": False,
        "check_ins": [],
        "streak": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("tasks").insert(new_task).execute()
    return new_task

@api_router.get("/tasks/stats")
async def get_task_stats(request: Request):
    user = await get_current_user(request)
    tasks = _rows(sb.table("tasks").select("*").eq("user_id", user["user_id"]).eq("is_template", False).limit(1000).execute())
    
    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("completed"))
    
    # Calculate completion rate for today
    today = datetime.now(timezone.utc).date().isoformat()
    today_checkins = sum(1 for t in tasks if today in t.get("check_ins", []))
    
    # Get max streak
    max_streak = max((t.get("streak", 0) for t in tasks), default=0)
    
    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "completion_rate": (completed / total * 100) if total > 0 else 0,
        "today_checkins": today_checkins,
        "max_streak": max_streak
    }

# ==================== NOTES ROUTES ====================
@api_router.get("/notes")
async def get_notes(request: Request):
    user = await get_current_user(request)
    notes = _rows(sb.table("notes").select("*").eq("user_id", user["user_id"]).limit(1000).execute())
    return notes

@api_router.post("/notes")
@limiter.limit(_general_write_limit)
async def create_note(note: NoteCreate, request: Request):
    user = await get_current_user(request)
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    note_doc = {
        "note_id": note_id,
        "user_id": user["user_id"],
        "title": note.title,
        "content": note.content,
        "folder": note.folder,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("notes").insert(note_doc).execute()
    return note_doc

@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, note: NoteUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in note.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = sb.table("notes").update(update_data).eq("note_id", note_id).eq("user_id", user["user_id"]).execute()
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    updated = _row(sb.table("notes").select("*").eq("note_id", note_id).execute())
    return updated

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, request: Request):
    user = await get_current_user(request)
    result = sb.table("notes").delete().eq("note_id", note_id).eq("user_id", user["user_id"]).execute()
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ==================== NOTES STUDIO SAVE ====================
@api_router.post("/notes/save")
@limiter.limit(_general_write_limit)
async def save_notes_studio(note: NotesStudioSave, request: Request):
    """Upsert a Notes Studio note (rich text + Excalidraw canvas) into Supabase."""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()

    if note.note_id:
        update_fields = {
            "title": note.title,
            "content": note.content,
            "canvas_data": note.canvas_data,
            "template_id": note.template_id,
            "is_draft": note.is_draft,
            "updated_at": now,
        }
        result = sb.table("notes_studio").update(update_fields).eq("note_id", note.note_id).eq("user_id", user["user_id"]).execute()
        if len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Note not found")
        updated = _row(sb.table("notes_studio").select("*").eq("note_id", note.note_id).execute())
        return updated
    else:
        note_id = f"studio_{uuid.uuid4().hex[:12]}"
        note_doc = {
            "note_id": note_id,
            "user_id": user["user_id"],
            "title": note.title,
            "content": note.content,
            "canvas_data": note.canvas_data,
            "template_id": note.template_id,
            "is_draft": note.is_draft,
            "created_at": now,
            "updated_at": now,
        }
        sb.table("notes_studio").insert(note_doc).execute()
        return note_doc

@api_router.get("/notes/studio")
async def get_studio_notes(request: Request):
    """Return all saved Notes Studio notes for the current user."""
    user = await get_current_user(request)
    notes = _rows(sb.table("notes_studio").select("*").eq("user_id", user["user_id"]).order("updated_at", desc=True).limit(500).execute())
    return notes

# ==================== AI ROUTES ====================
@api_router.post("/ai/summarize")
@limiter.limit(_ai_limit)
async def summarize_text(req: SummarizeRequest, request: Request):
    await get_current_user(request)
    
    from utils.openrouter import call_openrouter
    
    style_prompts = {
        "concise": "Provide a brief, concise summary in 2-3 sentences.",
        "detailed": "Provide a comprehensive summary covering all key points.",
        "bullet": "Summarize in bullet points, highlighting main ideas."
    }
    
    system_message = f"You are a helpful assistant that summarizes text. {style_prompts.get(req.style, style_prompts['concise'])}"
    
    response = await call_openrouter(
        prompt=f"Please summarize the following text:\n\n{req.content}",
        system=system_message,
        model="anthropic/claude-3-haiku",
        use_case="fast"
    )
    
    return {"summary": response}

@api_router.post("/ai/quiz")
@limiter.limit(_ai_limit)
async def generate_quiz(req: QuizGenerateRequest, request: Request):
    await get_current_user(request)
    
    from utils.openrouter import call_openrouter
    
    quiz_format = """Generate a quiz with the specified number of questions. 
    Return ONLY valid JSON in this exact format:
    {
        "questions": [
            {
                "question": "Your question text here",
                "options": ["A", "B", "C", "D"],
                "correct": 0,
                "explanation": "Brief explanation"
            }
        ]
    }"""
    
    system_message = f"You are a quiz generator. {quiz_format}"
    
    response = await call_openrouter(
        prompt=f"Generate {req.num_questions} {req.quiz_type} questions based on this content:\n\n{req.content}",
        system=system_message,
        model="anthropic/claude-3-haiku",
        use_case="fast"
    )
    
    try:
        # Try to parse JSON response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            quiz_data = json.loads(response[json_start:json_end])
            return quiz_data
    except:
        pass
    
    return {"questions": [], "raw_response": response}

@api_router.post("/ai/flashcards")
@limiter.limit(_ai_limit)
async def generate_flashcards(req: FlashcardGenerateRequest, request: Request):
    await get_current_user(request)
    
    from utils.openrouter import call_openrouter
    
    flashcard_format = """Generate flashcards from content.
    Return ONLY valid JSON in this exact format:
    {
        "flashcards": [
            {
                "front": "Question or term",
                "back": "Answer or definition"
            }
        ]
    }"""
    
    system_message = f"You are a flashcard generator. {flashcard_format}"
    
    response = await call_openrouter(
        prompt=f"Generate {req.num_cards} flashcards based on this content:\n\n{req.content}",
        system=system_message,
        model="anthropic/claude-3-haiku",
        use_case="fast"
    )
    
    try:
        # Try to parse JSON response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            cards_data = json.loads(response[json_start:json_end])
            return cards_data
    except:
        pass
    
    return {"flashcards": [], "raw_response": response}

@api_router.post("/ai/analyze-image")
@limiter.limit(_upload_limit)
async def analyze_image(request: Request):
    user = await get_current_user(request)
    
    from utils.openrouter import call_openrouter_with_image
    
    form = await request.form()
    file = form.get("file")
    query = form.get("query", "Extract all text from this image")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Read file content
    content = await file.read()
    image_base64 = base64.b64encode(content).decode()
    
    system_message = "You are a helpful assistant that analyzes images and extracts information."
    
    response = await call_openrouter_with_image(
        prompt=query,
        image_base64=image_base64,
        system=system_message,
        model="anthropic/claude-3.5-sonnet",
        timeout=120
    )
    
    return {"analysis": response}

# ==================== COMMUNITY/SERVERS ROUTES ====================
@api_router.get("/servers")
async def get_servers(request: Request):
    user = await get_current_user(request)
    # Get servers user is a member of
    memberships = _rows(sb.table("server_members").select("*").eq("user_id", user["user_id"]).limit(100).execute())
    server_ids = [m["server_id"] for m in memberships]
    if not server_ids:
        return []
    servers = _rows(sb.table("servers").select("*").in_("server_id", server_ids).limit(100).execute())
    return servers

@api_router.post("/servers")
@limiter.limit(_general_write_limit)
async def create_server(server: ServerCreate, request: Request):
    user = await get_current_user(request)
    server_id = f"server_{uuid.uuid4().hex[:12]}"
    server_doc = {
        "server_id": server_id,
        "name": server.name,
        "description": server.description,
        "icon": server.icon,
        "owner_id": user["user_id"],
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("servers").insert(server_doc).execute()
    
    # Add owner as member
    sb.table("server_members").insert({
        "server_id": server_id,
        "user_id": user["user_id"],
        "role": "owner",
        "joined_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    # Create default general channel
    channel_id = f"channel_{uuid.uuid4().hex[:12]}"
    sb.table("channels").insert({
        "channel_id": channel_id,
        "server_id": server_id,
        "name": "general",
        "channel_type": "text",
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return server_doc

@api_router.get("/servers/{server_id}")
async def get_server(server_id: str, request: Request):
    user = await get_current_user(request)
    server = _row(sb.table("servers").select("*").eq("server_id", server_id).execute())
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    # Get channels
    channels = _rows(sb.table("channels").select("*").eq("server_id", server_id).limit(100).execute())
    
    # Get members
    members = _rows(sb.table("server_members").select("*").eq("server_id", server_id).limit(100).execute())
    member_ids = [m["user_id"] for m in members]
    users = [
        {k: v for k, v in u.items() if k != "password"}
        for u in _rows(sb.table("users").select("*").in_("user_id", member_ids).limit(100).execute())
    ] if member_ids else []
    
    return {
        **server,
        "channels": channels,
        "members": users
    }

@api_router.post("/servers/{server_id}/join")
async def join_server(server_id: str, request: Request):
    user = await get_current_user(request)
    
    existing = _row(sb.table("server_members").select("*").eq("server_id", server_id).eq("user_id", user["user_id"]).execute())
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    
    sb.table("server_members").insert({
        "server_id": server_id,
        "user_id": user["user_id"],
        "role": "member",
        "joined_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"message": "Joined server"}

@api_router.post("/servers/{server_id}/leave")
async def leave_server(server_id: str, request: Request):
    user = await get_current_user(request)
    
    server = _row(sb.table("servers").select("*").eq("server_id", server_id).execute())
    if server and server.get("owner_id") == user["user_id"]:
        raise HTTPException(status_code=400, detail="Owner cannot leave server")
    
    sb.table("server_members").delete().eq("server_id", server_id).eq("user_id", user["user_id"]).execute()
    
    return {"message": "Left server"}

@api_router.get("/servers/discover/all")
async def discover_servers(request: Request):
    await get_current_user(request)
    servers = _rows(sb.table("servers").select("*").limit(50).execute())
    return servers

@api_router.post("/channels")
async def create_channel(channel: ChannelCreate, request: Request):
    user = await get_current_user(request)
    
    # Check if user is owner/admin
    server = _row(sb.table("servers").select("*").eq("server_id", channel.server_id).execute())
    if not server or server.get("owner_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    channel_id = f"channel_{uuid.uuid4().hex[:12]}"
    channel_doc = {
        "channel_id": channel_id,
        "server_id": channel.server_id,
        "name": channel.name,
        "channel_type": channel.channel_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("channels").insert(channel_doc).execute()
    return channel_doc

@api_router.get("/channels/{channel_id}/messages")
async def get_messages(channel_id: str, request: Request):
    await get_current_user(request)
    messages = _rows(sb.table("messages").select("*").eq("channel_id", channel_id).order("created_at", desc=True).limit(50).execute())
    return list(reversed(messages))

@api_router.post("/channels/{channel_id}/messages")
@limiter.limit(_comment_limit)
async def create_message(channel_id: str, message: MessageCreate, request: Request):
    user = await get_current_user(request)
    
    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    msg_doc = {
        "message_id": msg_id,
        "channel_id": channel_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_avatar": user.get("avatar"),
        "content": message.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("messages").insert(msg_doc).execute()
    
    # Broadcast to WebSocket clients
    await manager.broadcast(channel_id, {
        "type": "new_message",
        "message": msg_doc
    })
    
    return msg_doc

# ==================== WISHLIST/EXCHANGE ROUTES ====================
@api_router.get("/wishlists")
async def get_wishlists(request: Request):
    user = await get_current_user(request)
    wishlists = _rows(sb.table("wishlists").select("*").eq("user_id", user["user_id"]).limit(100).execute())
    return wishlists

@api_router.post("/wishlists")
async def create_wishlist(wishlist: WishlistCreate, request: Request):
    user = await get_current_user(request)
    wishlist_id = f"wishlist_{uuid.uuid4().hex[:12]}"
    wishlist_doc = {
        "wishlist_id": wishlist_id,
        "user_id": user["user_id"],
        "name": wishlist.name,
        "description": wishlist.description,
        "is_public": wishlist.is_public,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("wishlists").insert(wishlist_doc).execute()
    return wishlist_doc

@api_router.get("/wishlists/{wishlist_id}")
async def get_wishlist(wishlist_id: str, request: Request):
    await get_current_user(request)
    wishlist = _row(sb.table("wishlists").select("*").eq("wishlist_id", wishlist_id).execute())
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    items = _rows(sb.table("wishlist_items").select("*").eq("wishlist_id", wishlist_id).limit(100).execute())
    return {**wishlist, "items": items}

@api_router.post("/wishlists/items")
async def add_wishlist_item(item: WishlistItemCreate, request: Request):
    user = await get_current_user(request)
    
    # Verify ownership
    wishlist = _row(sb.table("wishlists").select("*").eq("wishlist_id", item.wishlist_id).eq("user_id", user["user_id"]).execute())
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    item_doc = {
        "item_id": item_id,
        "wishlist_id": item.wishlist_id,
        "title": item.title,
        "url": item.url,
        "price": item.price,
        "notes": item.notes,
        "purchased": False,
        "purchased_by": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("wishlist_items").insert(item_doc).execute()
    return item_doc

@api_router.post("/wishlists/items/{item_id}/purchase")
async def mark_item_purchased(item_id: str, request: Request):
    user = await get_current_user(request)
    
    result = sb.table("wishlist_items").update({"purchased": True, "purchased_by": user["user_id"]}).eq("item_id", item_id).execute()
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item marked as purchased"}

@api_router.get("/exchanges")
async def get_exchanges(request: Request):
    user = await get_current_user(request)
    # Get exchanges user is part of
    participants = _rows(sb.table("exchange_participants").select("*").eq("user_id", user["user_id"]).limit(100).execute())
    exchange_ids = [p["exchange_id"] for p in participants]
    if not exchange_ids:
        return []
    exchanges = _rows(sb.table("exchanges").select("*").in_("exchange_id", exchange_ids).limit(100).execute())
    return exchanges

@api_router.post("/exchanges")
async def create_exchange(exchange: ExchangeCreate, request: Request):
    user = await get_current_user(request)
    exchange_id = f"exchange_{uuid.uuid4().hex[:12]}"
    exchange_doc = {
        "exchange_id": exchange_id,
        "name": exchange.name,
        "description": exchange.description,
        "competition_type": exchange.competition_type,
        "difficulty": exchange.difficulty,
        "start_time": exchange.start_time or datetime.now(timezone.utc).isoformat(),
        "end_time": exchange.end_time,
        "max_participants": exchange.max_participants,
        "participant_count": 0,
        "owner_id": user["user_id"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("exchanges").insert(exchange_doc).execute()
    return exchange_doc

@api_router.post("/exchanges/{exchange_id}/join")
async def join_exchange(exchange_id: str, request: Request):
    user = await get_current_user(request)
    
    existing = _row(sb.table("exchange_participants").select("*").eq("exchange_id", exchange_id).eq("user_id", user["user_id"]).execute())
    if existing:
        raise HTTPException(status_code=400, detail="Already participating")
    
    sb.table("exchange_participants").insert({
        "exchange_id": exchange_id,
        "user_id": user["user_id"],
        "wishlist_id": None,
        "assigned_to": None
    }).execute()
    
    return {"message": "Joined exchange"}

@api_router.get("/exchanges/{exchange_id}")
async def get_exchange(exchange_id: str, request: Request):
    user = await get_current_user(request)
    exchange = _row(sb.table("exchanges").select("*").eq("exchange_id", exchange_id).execute())
    if not exchange:
        raise HTTPException(status_code=404, detail="Exchange not found")
    
    participants = _rows(sb.table("exchange_participants").select("*").eq("exchange_id", exchange_id).limit(100).execute())
    user_ids = [p["user_id"] for p in participants]
    users = [
        {k: v for k, v in u.items() if k != "password"}
        for u in _rows(sb.table("users").select("*").in_("user_id", user_ids).limit(100).execute())
    ] if user_ids else []
    
    return {**exchange, "participants": participants, "users": users}

# ==================== PROFILE ROUTES ====================
@api_router.put("/profile")
async def update_profile(profile: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    
    if update_data:
        sb.table("users").update(update_data).eq("user_id", user["user_id"]).execute()
    
    updated = _row(sb.table("users").select("*").eq("user_id", user["user_id"]).execute())
    if updated:
        updated = {k: v for k, v in updated.items() if k != "password"}
    return updated

@api_router.post("/profile/avatar")
@limiter.limit(_upload_limit)
async def upload_avatar(request: Request):
    user = await get_current_user(request)
    form = await request.form()
    file = form.get("file")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await file.read()
    avatar_base64 = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
    
    sb.table("users").update({"avatar": avatar_base64}).eq("user_id", user["user_id"]).execute()
    
    return {"avatar": avatar_base64}

@api_router.post("/profile/banner")
@limiter.limit(_upload_limit)
async def upload_banner(request: Request):
    user = await get_current_user(request)
    form = await request.form()
    file = form.get("file")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await file.read()
    banner_base64 = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
    
    sb.table("users").update({"banner": banner_base64}).eq("user_id", user["user_id"]).execute()
    
    return {"banner": banner_base64}

@api_router.get("/profile/{user_id}")
async def get_user_profile(user_id: str, request: Request):
    await get_current_user(request)
    user = _row(sb.table("users").select("*").eq("user_id", user_id).execute())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = {k: v for k, v in user.items() if k != "password"}
    
    # Get user's public templates
    templates = _rows(sb.table("tasks").select("*").eq("user_id", user_id).eq("is_template", True).limit(50).execute())
    
    return {**user, "templates": templates}

# ==================== SCHOOLS & CLASSES ROUTES ====================
@api_router.get("/schools")
async def get_schools(request: Request):
    await get_current_user(request)
    schools = _rows(sb.table("schools").select("*").limit(100).execute())
    return schools

@api_router.post("/schools")
async def create_school(school: SchoolCreate, request: Request):
    user = await get_current_user(request)
    school_id = f"school_{uuid.uuid4().hex[:12]}"
    school_doc = {
        "school_id": school_id,
        "name": school.name,
        "description": school.description,
        "school_type": school.school_type,
        "owner_id": user["user_id"],
        "member_count": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("schools").insert(school_doc).execute()
    
    # Add creator as member
    sb.table("school_members").insert({
        "school_id": school_id,
        "user_id": user["user_id"],
        "role": "admin",
        "joined_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    # Update user's school
    sb.table("users").update({"school_id": school_id}).eq("user_id", user["user_id"]).execute()
    
    return school_doc

@api_router.get("/schools/{school_id}")
async def get_school(school_id: str, request: Request):
    await get_current_user(request)
    school = _row(sb.table("schools").select("*").eq("school_id", school_id).execute())
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    classes = _rows(sb.table("classes").select("*").eq("school_id", school_id).limit(100).execute())
    members = _rows(sb.table("school_members").select("*").eq("school_id", school_id).limit(100).execute())
    
    return {**school, "classes": classes, "member_count": len(members)}

@api_router.post("/schools/{school_id}/join")
async def join_school(school_id: str, request: Request):
    user = await get_current_user(request)
    
    existing = _row(sb.table("school_members").select("*").eq("school_id", school_id).eq("user_id", user["user_id"]).execute())
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    
    sb.table("school_members").insert({
        "school_id": school_id,
        "user_id": user["user_id"],
        "role": "member",
        "joined_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    sb.table("users").update({"school_id": school_id}).eq("user_id", user["user_id"]).execute()
    # Increment member_count: read, compute, update
    school = _row(sb.table("schools").select("member_count").eq("school_id", school_id).execute())
    if school:
        sb.table("schools").update({"member_count": (school.get("member_count", 0) + 1)}).eq("school_id", school_id).execute()
    
    return {"message": "Joined school"}

@api_router.get("/schools/{school_id}/leaderboard")
async def get_school_leaderboard(school_id: str, request: Request):
    await get_current_user(request)
    
    members = _rows(sb.table("school_members").select("*").eq("school_id", school_id).limit(100).execute())
    user_ids = [m["user_id"] for m in members]
    
    if not user_ids:
        return []
    users = [
        {k: v for k, v in u.items() if k != "password"}
        for u in _rows(sb.table("users").select("*").in_("user_id", user_ids).order("xp", desc=True).limit(50).execute())
    ]
    
    return users

@api_router.post("/classes")
async def create_class(class_data: ClassCreate, request: Request):
    user = await get_current_user(request)
    class_id = f"class_{uuid.uuid4().hex[:12]}"
    class_doc = {
        "class_id": class_id,
        "school_id": class_data.school_id,
        "name": class_data.name,
        "subject": class_data.subject,
        "description": class_data.description,
        "teacher_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("classes").insert(class_doc).execute()
    return class_doc

# ==================== COMPETITIONS ROUTES ====================
@api_router.get("/competitions")
async def get_competitions(request: Request):
    await get_current_user(request)
    competitions = _rows(sb.table("competitions").select("*").order("created_at", desc=True).limit(50).execute())
    return competitions

@api_router.post("/competitions")
async def create_competition(comp: CompetitionCreate, request: Request):
    user = await get_current_user(request)
    comp_id = f"comp_{uuid.uuid4().hex[:12]}"
    comp_doc = {
        "competition_id": comp_id,
        "title": comp.title,
        "description": comp.description,
        "competition_type": comp.competition_type,
        "difficulty": comp.difficulty,
        "start_time": comp.start_time or datetime.now(timezone.utc).isoformat(),
        "end_time": comp.end_time,
        "max_participants": comp.max_participants,
        "participant_count": 0,
        "owner_id": user["user_id"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("competitions").insert(comp_doc).execute()
    return comp_doc

@api_router.get("/competitions/{comp_id}")
async def get_competition(comp_id: str, request: Request):
    await get_current_user(request)
    comp = _row(sb.table("competitions").select("*").eq("competition_id", comp_id).execute())
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Get leaderboard
    submissions = _rows(sb.table("competition_submissions").select("*").eq("competition_id", comp_id).order("score", desc=True).limit(100).execute())
    
    return {**comp, "leaderboard": submissions}

@api_router.post("/competitions/{comp_id}/join")
async def join_competition(comp_id: str, request: Request):
    user = await get_current_user(request)
    
    existing = _row(sb.table("competition_participants").select("*").eq("competition_id", comp_id).eq("user_id", user["user_id"]).execute())
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")
    
    sb.table("competition_participants").insert({
        "competition_id": comp_id,
        "user_id": user["user_id"],
        "joined_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    # Increment participant_count
    comp_row = _row(sb.table("competitions").select("participant_count").eq("competition_id", comp_id).execute())
    if comp_row:
        sb.table("competitions").update({"participant_count": (comp_row.get("participant_count", 0) + 1)}).eq("competition_id", comp_id).execute()
    
    return {"message": "Joined competition"}

@api_router.post("/competitions/{comp_id}/submit")
@limiter.limit(_publish_limit)
async def submit_competition(comp_id: str, submission: CompetitionSubmission, request: Request):
    user = await get_current_user(request)
    
    comp = _row(sb.table("competitions").select("*").eq("competition_id", comp_id).execute())
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    # Calculate score based on competition type
    score = 0
    if comp["competition_type"] == "speed":
        score = max(0, 1000 - (submission.time_taken or 0))
    elif comp["competition_type"] == "accuracy":
        score = int((submission.accuracy or 0) * 10)
    else:
        score = int((submission.accuracy or 50) * 5 + max(0, 500 - (submission.time_taken or 0)))
    
    submission_id = f"sub_{uuid.uuid4().hex[:12]}"
    sub_doc = {
        "submission_id": submission_id,
        "competition_id": comp_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "answer": submission.answer,
        "time_taken": submission.time_taken,
        "accuracy": submission.accuracy,
        "score": score,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("competition_submissions").insert(sub_doc).execute()
    
    # Get placement
    all_submissions = _rows(sb.table("competition_submissions").select("*").eq("competition_id", comp_id).order("score", desc=True).limit(100).execute())
    
    placement = next((i + 1 for i, s in enumerate(all_submissions) if s["user_id"] == user["user_id"]), len(all_submissions))
    
    # Compute rewards
    rewards = compute_rewards(
        difficulty=comp["difficulty"],
        accuracy=submission.accuracy or 50,
        time_taken=submission.time_taken or 60,
        streak=user.get("streak", 0),
        placement=placement,
        is_premium=user.get("is_premium", False)
    )
    
    await award_xp_coins(user["user_id"], rewards["xp"], rewards["coins"], f"competition_{comp_id}")
    
    return {
        "submission": sub_doc,
        "placement": placement,
        "rewards": rewards
    }

# ==================== MISSIONS & QUESTS ROUTES ====================
@api_router.get("/missions")
async def get_missions(request: Request):
    user = await get_current_user(request)
    
    # Get or create daily/weekly missions
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Check if missions exist for today
    existing = _rows(sb.table("user_missions").select("*").eq("user_id", user["user_id"]).eq("date", today).limit(20).execute())
    
    if not existing:
        # Create default missions
        default_missions = [
            {"title": "Complete 3 tasks", "xp_reward": 50, "coin_reward": 10, "mission_type": "daily", "target_count": 3, "action": "task_complete"},
            {"title": "Study for 30 minutes", "xp_reward": 75, "coin_reward": 15, "mission_type": "daily", "target_count": 30, "action": "study_time"},
            {"title": "Check in to all tasks", "xp_reward": 100, "coin_reward": 20, "mission_type": "daily", "target_count": 1, "action": "all_checkins"},
            {"title": "Send 5 messages", "xp_reward": 25, "coin_reward": 5, "mission_type": "daily", "target_count": 5, "action": "messages"},
            {"title": "Complete 20 tasks this week", "xp_reward": 200, "coin_reward": 50, "mission_type": "weekly", "target_count": 20, "action": "task_complete"},
        ]
        
        for mission in default_missions:
            mission_id = f"mission_{uuid.uuid4().hex[:12]}"
            sb.table("user_missions").insert({
                "mission_id": mission_id,
                "user_id": user["user_id"],
                "date": today,
                "progress": 0,
                "completed": False,
                **mission
            }).execute()
        
        existing = _rows(sb.table("user_missions").select("*").eq("user_id", user["user_id"]).eq("date", today).limit(20).execute())
    
    return existing

@api_router.post("/missions/{mission_id}/claim")
async def claim_mission(mission_id: str, request: Request):
    user = await get_current_user(request)
    
    mission = _row(sb.table("user_missions").select("*").eq("mission_id", mission_id).eq("user_id", user["user_id"]).eq("completed", True).execute())
    
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found or not completed")
    
    if mission.get("claimed"):
        raise HTTPException(status_code=400, detail="Already claimed")
    
    sb.table("user_missions").update({"claimed": True}).eq("mission_id", mission_id).execute()
    
    await award_xp_coins(user["user_id"], mission["xp_reward"], mission["coin_reward"], f"mission_{mission_id}")
    
    return {"message": "Rewards claimed", "xp": mission["xp_reward"], "coins": mission["coin_reward"]}

# ==================== STORE ROUTES ====================
@api_router.get("/store/items")
async def get_store_items(request: Request):
    await get_current_user(request)
    
    # Return placeholder store items (Coming Soon)
    store_items = [
        {"item_id": "frame_gold", "name": "Gold Frame", "category": "avatar_cosmetics", "price": 500, "description": "A shiny gold frame for your avatar", "coming_soon": True},
        {"item_id": "frame_diamond", "name": "Diamond Frame", "category": "avatar_cosmetics", "price": 1000, "description": "A sparkling diamond frame", "coming_soon": True},
        {"item_id": "frame_fire", "name": "Fire Frame", "category": "avatar_cosmetics", "price": 750, "description": "An animated fire frame", "coming_soon": True},
        {"item_id": "booster_2x", "name": "2x XP Booster (24h)", "category": "xp_boosters", "price": 200, "description": "Double your XP for 24 hours", "coming_soon": True},
        {"item_id": "booster_3x", "name": "3x XP Booster (12h)", "category": "xp_boosters", "price": 300, "description": "Triple your XP for 12 hours", "coming_soon": True},
        {"item_id": "study_pomodoro", "name": "Pomodoro Timer Pro", "category": "study_aids", "price": 150, "description": "Advanced study timer with stats", "coming_soon": True},
        {"item_id": "study_focus", "name": "Focus Mode", "category": "study_aids", "price": 250, "description": "Block distractions while studying", "coming_soon": True},
        {"item_id": "template_essay", "name": "Essay Template Pack", "category": "template_packs", "price": 100, "description": "5 professional essay templates", "coming_soon": True},
        {"item_id": "template_notes", "name": "Cornell Notes Pack", "category": "template_packs", "price": 100, "description": "Advanced note-taking templates", "coming_soon": True},
        {"item_id": "template_slides", "name": "Presentation Pack", "category": "template_packs", "price": 150, "description": "10 stunning slide templates", "coming_soon": True},
    ]
    
    return store_items

# ==================== PREMIUM ROUTES ====================
@api_router.get("/premium/status")
async def get_premium_status(request: Request):
    user = await get_current_user(request)
    
    return {
        "is_premium": user.get("is_premium", False),
        "premium_until": user.get("premium_until"),
        "benefits": [
            "Monthly 500 coin drop",
            "Exclusive monthly cosmetic",
            "Premium templates access",
            "1.5x XP gain",
            "Bonus daily rewards",
            "Premium AI modes"
        ]
    }

@api_router.post("/premium/subscribe")
async def subscribe_premium(request: Request):
    user = await get_current_user(request)
    
    # Placeholder - in production this would integrate with payment
    premium_until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    sb.table("users").update({
        "is_premium": True,
        "premium_until": premium_until
    }).eq("user_id", user["user_id"]).execute()
    
    # Give premium signup bonus
    await award_xp_coins(user["user_id"], 500, 500, "premium_signup")
    
    return {"message": "Premium activated (placeholder)", "premium_until": premium_until}

# ==================== AI TEMPLATES ROUTES ====================
@api_router.get("/templates")
async def get_templates(request: Request):
    user = await get_current_user(request)
    
    templates = _rows(sb.table("ai_templates").select("*").or_(f'user_id.eq.{user["user_id"]},is_public.eq.true').limit(100).execute())
    
    return templates

@api_router.post("/templates/generate")
@limiter.limit(_ai_limit)
async def generate_template(template: TemplateCreate, request: Request):
    user = await get_current_user(request)
    
    from utils.openrouter import call_openrouter
    
    # Check premium for premium templates
    if template.is_premium and not user.get("is_premium"):
        raise HTTPException(status_code=403, detail="Premium required")
    
    template_prompts = {
        "notes": "Create a well-structured notes template with sections, bullet points, and key takeaways based on this content:",
        "essay": "Create an essay outline template with introduction, body paragraphs, and conclusion based on this topic:",
        "poster": "Create a poster layout template with title, main points, visuals suggestions, and call-to-action based on:",
        "slides": "Create a presentation slides outline with title slide, content slides, and summary based on:",
        "report": "Create a professional report template with executive summary, sections, and recommendations based on:"
    }
    
    prompt = template_prompts.get(template.template_type, template_prompts["notes"])
    
    system_message = "You are a professional template creator. Create clean, well-formatted templates."
    
    response = await call_openrouter(
        prompt=f"{prompt} {template.content}",
        system=system_message,
        model="anthropic/claude-3-haiku",
        use_case="fast"
    )
    
    template_id = f"tmpl_{uuid.uuid4().hex[:12]}"
    template_doc = {
        "template_id": template_id,
        "user_id": user["user_id"],
        "title": template.title,
        "template_type": template.template_type,
        "content": response,
        "original_content": template.content,
        "is_premium": template.is_premium,
        "is_public": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("ai_templates").insert(template_doc).execute()
    
    # Award XP for creating template
    await award_xp_coins(user["user_id"], 20, 5, "template_created")
    
    return template_doc

@api_router.put("/templates/{template_id}")
async def update_template(template_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    
    result = sb.table("ai_templates").update({"content": body.get("content"), "title": body.get("title", "")}).eq("template_id", template_id).eq("user_id", user["user_id"]).execute()
    
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    updated = _row(sb.table("ai_templates").select("*").eq("template_id", template_id).execute())
    return updated

# ==================== STUDY GROUPS ENHANCED ROUTES ====================
@api_router.get("/servers/{server_id}/resources")
async def get_server_resources(server_id: str, request: Request):
    await get_current_user(request)
    resources = _rows(sb.table("shared_resources").select("*").eq("server_id", server_id).limit(100).execute())
    return resources

@api_router.post("/servers/{server_id}/resources")
@limiter.limit(_general_write_limit)
async def add_server_resource(server_id: str, resource: SharedResourceCreate, request: Request):
    user = await get_current_user(request)
    
    resource_id = f"resource_{uuid.uuid4().hex[:12]}"
    resource_doc = {
        "resource_id": resource_id,
        "server_id": server_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "title": resource.title,
        "resource_type": resource.resource_type,
        "url": resource.url,
        "content": resource.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("shared_resources").insert(resource_doc).execute()
    return resource_doc

@api_router.get("/servers/{server_id}/goals")
async def get_server_goals(server_id: str, request: Request):
    await get_current_user(request)
    goals = _rows(sb.table("group_goals").select("*").eq("server_id", server_id).limit(50).execute())
    return goals

@api_router.post("/servers/{server_id}/goals")
@limiter.limit(_general_write_limit)
async def create_server_goal(server_id: str, goal: GroupGoalCreate, request: Request):
    user = await get_current_user(request)
    
    goal_id = f"goal_{uuid.uuid4().hex[:12]}"
    goal_doc = {
        "goal_id": goal_id,
        "server_id": server_id,
        "title": goal.title,
        "description": goal.description,
        "target": goal.target,
        "progress": 0,
        "deadline": goal.deadline,
        "contributors": [],
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("group_goals").insert(goal_doc).execute()
    return goal_doc

@api_router.post("/servers/{server_id}/goals/{goal_id}/contribute")
async def contribute_to_goal(server_id: str, goal_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    amount = body.get("amount", 1)
    
    sb.rpc("increment_and_add_contributor", {"p_goal_id": goal_id, "p_amount": amount, "p_contributor": user["user_id"]}).execute()
    
    goal = _row(sb.table("group_goals").select("*").eq("goal_id", goal_id).execute())
    return goal

@api_router.get("/servers/{server_id}/notes")
async def get_collaborative_notes(server_id: str, request: Request):
    await get_current_user(request)
    notes = _rows(sb.table("collaborative_notes").select("*").eq("server_id", server_id).limit(50).execute())
    return notes

@api_router.post("/servers/{server_id}/notes")
@limiter.limit(_general_write_limit)
async def create_collaborative_note(server_id: str, note: CollaborativeNoteCreate, request: Request):
    user = await get_current_user(request)
    
    note_id = f"collab_{uuid.uuid4().hex[:12]}"
    note_doc = {
        "note_id": note_id,
        "server_id": server_id,
        "title": note.title,
        "content": note.content,
        "last_edited_by": user["user_id"],
        "editors": [user["user_id"]],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("collaborative_notes").insert(note_doc).execute()
    return note_doc

@api_router.put("/servers/{server_id}/notes/{note_id}")
async def update_collaborative_note(server_id: str, note_id: str, note_update: CollaborativeNoteUpdate, request: Request):
    user = await get_current_user(request)
    
    # Read current doc to handle addToSet for editors
    current = _row(sb.table("collaborative_notes").select("*").eq("note_id", note_id).eq("server_id", server_id).execute())
    if current:
        editors = current.get("editors", [])
        if user["user_id"] not in editors:
            editors.append(user["user_id"])
        sb.table("collaborative_notes").update({
            "content": note_update.content,
            "last_edited_by": user["user_id"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "editors": editors
        }).eq("note_id", note_id).eq("server_id", server_id).execute()
    
    updated = _row(sb.table("collaborative_notes").select("*").eq("note_id", note_id).execute())
    return updated

@api_router.post("/servers/{server_id}/ai-goals")
@limiter.limit(_ai_limit)
async def suggest_group_goals(server_id: str, request: Request):
    """AI suggests goals based on group topic and member history (mock)"""
    user = await get_current_user(request)
    
    # Mock AI-generated suggestions
    suggestions = [
        {"title": "Complete 100 study sessions together", "description": "Reach 100 collective study hours", "target": 100},
        {"title": "Share 50 resources", "description": "Build a knowledge base with 50 shared resources", "target": 50},
        {"title": "Achieve 90% quiz accuracy", "description": "Team average quiz score above 90%", "target": 90},
        {"title": "7-day streak challenge", "description": "Every member maintains a 7-day activity streak", "target": 7},
    ]
    
    return suggestions

# ==================== GAMIFICATION STATS ROUTES ====================
@api_router.get("/gamification/stats")
async def get_gamification_stats(request: Request):
    user = await get_current_user(request)
    
    # Calculate level progress
    xp = user.get("xp", 0)
    level = user.get("level", 1)
    xp_for_current = sum(100 + i * 50 for i in range(level - 1))
    xp_for_next = 100 + (level - 1) * 50
    xp_in_level = xp - xp_for_current
    
    return {
        "xp": xp,
        "coins": user.get("coins", 0),
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_for_next_level": xp_for_next,
        "level_progress": min(100, (xp_in_level / xp_for_next) * 100),
        "is_premium": user.get("is_premium", False)
    }

@api_router.get("/gamification/leaderboard")
async def get_global_leaderboard(request: Request):
    await get_current_user(request)
    
    users = [
        {k: v for k, v in u.items() if k != "password"}
        for u in _rows(sb.table("users").select("*").order("xp", desc=True).limit(50).execute())
    ]
    
    return users

@api_router.get("/gamification/transactions")
async def get_xp_transactions(request: Request):
    user = await get_current_user(request)
    
    transactions = _rows(sb.table("xp_transactions").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).limit(50).execute())
    
    return transactions

# ==================== LIBRARY ROUTES ====================
@api_router.get("/library")
async def get_library_items(request: Request):
    user = await get_current_user(request)
    items = _rows(sb.table("library").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).limit(200).execute())
    return items

@api_router.post("/library")
async def save_to_library(item: LibraryItemCreate, request: Request):
    user = await get_current_user(request)
    
    item_id = f"lib_{uuid.uuid4().hex[:12]}"
    item_doc = {
        "item_id": item_id,
        "user_id": user["user_id"],
        "item_type": item.item_type,
        "title": item.title,
        "content": item.content,
        "source_text": item.source_text,
        "tags": item.tags or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("library").insert(item_doc).execute()
    
    # Award XP for saving to library
    await award_xp_coins(user["user_id"], 5, 1, "library_save")
    
    return item_doc

@api_router.get("/library/search")
async def search_library_items(
    request: Request,
    q: str = "",
    types: str = "",
    tags: str = "",
    date_from: str = "",
    date_to: str = "",
):
    """Full-text search across title, content, tags and type with optional filters."""
    user = await get_current_user(request)

    # Build Supabase query
    qb = sb.table("library").select("*").eq("user_id", user["user_id"])

    # Type filter
    if types:
        type_list = [t.strip() for t in types.split(",") if t.strip()]
        if type_list:
            qb = qb.in_("item_type", type_list)

    # Date range filter (ISO strings compare lexicographically for UTC dates)
    if date_from:
        qb = qb.gte("created_at", date_from)
    if date_to:
        qb = qb.lte("created_at", date_to + "T23:59:59.999Z")

    all_items = _rows(qb.order("created_at", desc=True).limit(500).execute())

    # Tag filter (AND logic – item must have ALL requested tags)
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            all_items = [i for i in all_items if all(t in i.get("tags", []) for t in tag_list)]

    # Full-text search across title, content, tags and type label
    if q and q.strip():
        q_lower = q.strip().lower()
        filtered = []
        for item in all_items:
            raw_content = item.get("content", "")
            content_str = raw_content if isinstance(raw_content, str) else json.dumps(raw_content)
            if (
                q_lower in item.get("title", "").lower()
                or q_lower in content_str.lower()
                or any(q_lower in t.lower() for t in item.get("tags", []))
                or q_lower in item.get("item_type", "").lower()
            ):
                filtered.append(item)
        return filtered

    return all_items


@api_router.patch("/library/{item_id}")
async def update_library_item(item_id: str, update: LibraryItemUpdate, request: Request):
    """Update mutable fields: title, tags, folder."""
    user = await get_current_user(request)
    update_data: dict = {}
    if update.title  is not None: update_data["title"]  = update.title
    if update.tags   is not None: update_data["tags"]   = update.tags
    if update.folder is not None: update_data["folder"] = update.folder
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = sb.table("library").update(update_data).eq("item_id", item_id).eq("user_id", user["user_id"]).execute()
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Updated"}


@api_router.get("/library/{item_id}")
async def get_library_item(item_id: str, request: Request):
    user = await get_current_user(request)
    item = _row(sb.table("library").select("*").eq("item_id", item_id).eq("user_id", user["user_id"]).execute())
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@api_router.delete("/library/{item_id}")
async def delete_library_item(item_id: str, request: Request):
    user = await get_current_user(request)
    result = sb.table("library").delete().eq("item_id", item_id).eq("user_id", user["user_id"]).execute()
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Deleted"}

# ==================== COMPETITION HISTORY ====================
@api_router.get("/competitions/history")
async def get_competition_history(request: Request):
    user = await get_current_user(request)
    
    # Get user's submissions with competition details
    submissions = _rows(sb.table("competition_submissions").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).limit(100).execute())
    
    # Enrich with competition info
    history = []
    for sub in submissions:
        comp = _row(sb.table("competitions").select("title, difficulty").eq("competition_id", sub["competition_id"]).execute())
        if comp:
            # Get placement
            all_subs = _rows(sb.table("competition_submissions").select("*").eq("competition_id", sub["competition_id"]).order("score", desc=True).limit(100).execute())
            placement = next((i + 1 for i, s in enumerate(all_subs) if s["user_id"] == user["user_id"]), 0)
            
            # Get rewards from transactions
            txn = _row(sb.table("xp_transactions").select("*").eq("user_id", user["user_id"]).eq("reason", f"competition_{sub['competition_id']}").execute())
            
            history.append({
                "competition_id": sub["competition_id"],
                "title": comp.get("title", "Unknown"),
                "difficulty": comp.get("difficulty", "medium"),
                "score": sub.get("score", 0),
                "placement": placement,
                "total_participants": len(all_subs),
                "xp_earned": txn.get("xp", 0) if txn else 0,
                "coins_earned": txn.get("coins", 0) if txn else 0,
                "submitted_at": sub.get("created_at")
            })
    
    return history

# ==================== VISIONARY ACADEMY (School Servers) ====================
@api_router.get("/servers/academy")
async def get_academy_servers(request: Request):
    """Get all Visionary Academy school servers"""
    await get_current_user(request)
    servers = _rows(sb.table("servers").select("*").eq("is_academy", True).limit(100).execute())
    return servers

@api_router.post("/servers/academy")
async def create_academy_server(school: SchoolCreate, request: Request):
    """Create a Visionary Academy school server"""
    user = await get_current_user(request)
    
    server_id = f"server_{uuid.uuid4().hex[:12]}"
    server_doc = {
        "server_id": server_id,
        "name": school.name,
        "description": school.description,
        "icon": "🎓",
        "is_academy": True,
        "academy_type": school.school_type,
        "owner_id": user["user_id"],
        "member_count": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("servers").insert(server_doc).execute()
    
    # Create default channels
    for channel_name in ["general", "announcements", "study-room"]:
        sb.table("channels").insert({
            "channel_id": f"channel_{uuid.uuid4().hex[:12]}",
            "server_id": server_id,
            "name": channel_name,
            "channel_type": "text",
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    
    # Add owner as member
    sb.table("server_members").insert({
        "server_id": server_id,
        "user_id": user["user_id"],
        "role": "admin",
        "joined_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return server_doc

# ==================== SAT/ACT PRACTICE ====================
@api_router.post("/practice/stats")
async def save_practice_stats(stats: PracticeStats, request: Request):
    user = await get_current_user(request)
    
    # Only save if Lite user
    if user.get("plan") != "lite":
        return {"saved": False, "message": "Upgrade to Lite to save history"}
    
    stat_doc = {
        "stat_id": f"stat_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "test_type": stats.testType,
        "section": stats.section,
        "correct": stats.correct,
        "incorrect": stats.incorrect,
        "accuracy": stats.accuracy,
        "time_spent": stats.timeSpent,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("practice_stats").insert(stat_doc).execute()
    return {"saved": True}

@api_router.get("/practice/history")
async def get_practice_history(request: Request):
    user = await get_current_user(request)
    
    if user.get("plan") != "lite":
        return []
    
    stats = _rows(sb.table("practice_stats").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).limit(50).execute())
    return stats

# ==================== USER PLAN / LITE UPGRADE ====================
@api_router.post("/user/upgrade-lite")
async def upgrade_to_lite(request: Request):
    """Manual upgrade (for testing or direct payment confirmation)"""
    user = await get_current_user(request)
    
    # Check Founders Rush eligibility
    is_founder = False
    now = datetime.now(timezone.utc)
    founders_end = FOUNDERS_LAUNCH_DATE + timedelta(days=30)
    
    # Get current founders count
    founders_count = _count(sb.table("users").select("*", count="exact").eq("is_lite_founder", True).execute())
    
    if now <= founders_end and founders_count < FOUNDERS_LIMIT:
        is_founder = True
    
    # Update user with Lite benefits
    plan_limits = PLAN_LIMITS["lite"]
    update_data = {
        "plan": "lite",
        "energy": plan_limits["energy_cap"],
        "storage_limit_mb": plan_limits["storage_mb"],
        "upgraded_at": now.isoformat()
    }
    if is_founder:
        update_data["is_lite_founder"] = True
        update_data["founder_badge"] = "Early Supporter"
    
    sb.table("users").update(update_data).eq("user_id", user["user_id"]).execute()
    
    # Log transaction
    sb.table("wallet_ledger").insert({
        "user_id": user["user_id"],
        "type": "upgrade",
        "amount": LITE_PRICE_CENTS,
        "currency": "cents",
        "reason": "lite_subscription",
        "is_founder": is_founder,
        "created_at": now.isoformat()
    }).execute()
    
    # Fetch updated user
    updated = _row(sb.table("users").select("*").eq("user_id", user["user_id"]).execute())
    if updated:
        updated = {k: v for k, v in updated.items() if k != "password"}
    return updated

# ==================== STRIPE PAYMENT ====================
@api_router.post("/stripe/create-checkout")
async def create_stripe_checkout(request: Request):
    """Create Stripe checkout session for Lite subscription"""
    user = await get_current_user(request)
    
    if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY.startswith('sk_test_xxx'):
        # Mock mode for development
        return {
            "mock": True,
            "message": "Stripe not configured. Use /api/user/upgrade-lite for testing.",
            "checkout_url": None
        }
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        # Get frontend URL for redirects
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': STRIPE_PRICE_ID,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{frontend_url}/dashboard?upgrade=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/dashboard?upgrade=cancelled",
            client_reference_id=user["user_id"],
            metadata={
                "user_id": user["user_id"],
                "plan": "lite"
            }
        )
        
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Payment service unavailable")

@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    if not STRIPE_SECRET_KEY or not STRIPE_WEBHOOK_SECRET:
        return {"status": "skipped", "reason": "Stripe not configured"}
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user_id = session.get('client_reference_id') or session.get('metadata', {}).get('user_id')
            
            if user_id:
                # Upgrade user to Lite
                now = datetime.now(timezone.utc)
                founders_end = FOUNDERS_LAUNCH_DATE + timedelta(days=30)
                founders_count = _count(sb.table("users").select("*", count="exact").eq("is_lite_founder", True).execute())
                is_founder = now <= founders_end and founders_count < FOUNDERS_LIMIT
                
                plan_limits = PLAN_LIMITS["lite"]
                update_data = {
                    "plan": "lite",
                    "energy": plan_limits["energy_cap"],
                    "storage_limit_mb": plan_limits["storage_mb"],
                    "stripe_customer_id": session.get('customer'),
                    "stripe_subscription_id": session.get('subscription'),
                    "upgraded_at": now.isoformat()
                }
                if is_founder:
                    update_data["is_lite_founder"] = True
                    update_data["founder_badge"] = "Early Supporter"
                
                sb.table("users").update(update_data).eq("user_id", user_id).execute()
                
                logger.info(f"User {user_id} upgraded to Lite via Stripe")
        
        elif event['type'] == 'customer.subscription.deleted':
            # Handle subscription cancellation
            subscription = event['data']['object']
            customer_id = subscription.get('customer')
            
            user = _row(sb.table("users").select("*").eq("stripe_customer_id", customer_id).execute())
            if user:
                sb.table("users").update({
                    "plan": "free",
                    "storage_limit_mb": PLAN_LIMITS["free"]["storage_mb"],
                    "subscription_ended_at": datetime.now(timezone.utc).isoformat()
                }).eq("user_id", user["user_id"]).execute()
                logger.info(f"User {user['user_id']} downgraded to Free")
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/stripe/status")
async def get_stripe_status(request: Request):
    """Get user's subscription status"""
    user = await get_current_user(request)
    
    return {
        "plan": user.get("plan", "free"),
        "is_lite_founder": user.get("is_lite_founder", False),
        "founder_badge": user.get("founder_badge"),
        "subscription_id": user.get("stripe_subscription_id"),
        "upgraded_at": user.get("upgraded_at")
    }

@api_router.get("/founders/status")
async def get_founders_status():
    """Get Founders Rush status"""
    founders_count = _count(sb.table("users").select("*", count="exact").eq("is_lite_founder", True).execute())
    now = datetime.now(timezone.utc)
    founders_end = FOUNDERS_LAUNCH_DATE + timedelta(days=30)
    days_remaining = max(0, (founders_end - now).days)
    spots_remaining = max(0, FOUNDERS_LIMIT - founders_count)
    
    return {
        "founders_count": founders_count,
        "spots_remaining": spots_remaining,
        "days_remaining": days_remaining,
        "is_active": now <= founders_end and spots_remaining > 0
    }

# ==================== FOUNDER PASS CHECKOUT ====================

# Founder Pass tier definitions
FOUNDER_PASS_TIERS = {
    "seed": {
        "name": "Seed Founder Pass",
        "price_cents": 499,  # $4.99
        "description": "Early supporter – Seed tier access to Visionary Academy",
    },
    "bronze": {
        "name": "Bronze Founder Pass",
        "price_cents": 999,  # $9.99
        "description": "Bronze tier founding member of Visionary Academy",
    },
    "silver": {
        "name": "Silver Founder Pass",
        "price_cents": 2499,  # $24.99
        "description": "Silver tier founding member of Visionary Academy",
    },
    "gold": {
        "name": "Gold Founder Pass",
        "price_cents": 4999,  # $49.99
        "description": "Gold tier founding member – top-tier lifetime perks",
    },
}

class FounderPassRequest(BaseModel):
    tier: str  # seed / bronze / silver / gold

class PaymentVerifyRequest(BaseModel):
    session_id: str

# Benefits awarded per tier (shown on Success page & stored)
FOUNDER_TIER_BENEFITS = {
    "seed": {
        "coins": 100,
        "label": "Seed Founder",
        "badge": "🌱 Seed Founder",
        "frame": "seed_frame",
        "perks": [
            "Exclusive Seed founder badge on your profile",
            "10 games per week — forever",
            "100 coins credited on launch",
            "Private founders community access",
            "Early access to every new feature",
        ],
    },
    "bronze": {
        "coins": 500,
        "label": "Bronze Founder",
        "badge": "🛡️ Bronze Founder",
        "frame": "bronze_frame",
        "perks": [
            "Unlimited games forever",
            "5 exclusive launch skins",
            "500 coins credited on launch",
            "Bronze animated profile frame",
            "Priority support queue",
        ],
    },
    "silver": {
        "coins": 2000,
        "label": "Silver Founder",
        "badge": "⭐ Silver Founder",
        "frame": "silver_frame",
        "perks": [
            "20 exclusive launch skins",
            "2,000 coins credited on launch",
            "All current & future battle passes",
            "Silver animated profile frame",
            "2× XP boost for 30 days post-launch",
            "Lifetime upgrade discount",
        ],
    },
    "gold": {
        "coins": 10000,
        "label": "Gold Founder",
        "badge": "👑 Gold Founder",
        "frame": "gold_frame",
        "perks": [
            "30 exclusive launch skins",
            "10,000 coins credited on launch",
            "Name in the credits forever",
            "2% revenue share on referrals",
            "Gold animated profile frame",
            "Direct line to the founding team",
        ],
    },
}

@api_router.post("/checkout/founder-pass")
async def create_founder_pass_checkout(body: FounderPassRequest, request: Request):
    """Create a Stripe Checkout Session for a Founder Pass tier (requires auth)"""
    user = await get_current_user(request)

    tier = body.tier.lower()
    if tier not in FOUNDER_PASS_TIERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tier '{tier}'. Must be one of: {', '.join(FOUNDER_PASS_TIERS)}"
        )

    # Prevent double-purchase of the same or lower tier
    existing_tier = user.get("founder_tier")
    tier_order = ["seed", "bronze", "silver", "gold"]
    if existing_tier and tier_order.index(tier) <= tier_order.index(existing_tier):
        raise HTTPException(
            status_code=400,
            detail=f"You already have the {existing_tier.title()} Founder Pass or higher."
        )

    tier_info = FOUNDER_PASS_TIERS[tier]

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured on the server.")

    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY

        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": tier_info["price_cents"],
                    "product_data": {
                        "name": tier_info["name"],
                        "description": tier_info["description"],
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{frontend_url}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/pricing",
            client_reference_id=user["user_id"],
            customer_email=user.get("email"),
            metadata={
                "tier": tier,
                "user_id": user["user_id"],
            },
        )

        return {"checkout_url": session.url, "session_id": session.id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stripe founder-pass checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session.")


@api_router.post("/payments/verify")
async def verify_founder_pass_payment(body: PaymentVerifyRequest, request: Request):
    """
    Verify a completed Stripe Checkout Session and activate founder benefits.
    Idempotent: safe to call multiple times for the same session.
    """
    user = await get_current_user(request)

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured on the server.")

    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY

        session = stripe.checkout.Session.retrieve(body.session_id)
    except Exception as e:
        logger.error(f"Stripe session retrieval error: {e}")
        raise HTTPException(status_code=400, detail="Could not retrieve payment session.")

    # Validate ownership
    session_user_id = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
    if session_user_id and session_user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="This payment session does not belong to your account.")

    # Validate payment status
    if session.get("payment_status") != "paid":
        status = session.get("payment_status", "unknown")
        raise HTTPException(
            status_code=402,
            detail=f"Payment not completed. Current status: {status}"
        )

    tier = (session.get("metadata") or {}).get("tier", "").lower()
    if tier not in FOUNDER_PASS_TIERS:
        raise HTTPException(status_code=400, detail="Could not determine tier from payment session.")

    benefits = FOUNDER_TIER_BENEFITS[tier]
    now = datetime.now(timezone.utc)

    # Idempotency: don't re-apply if this session was already verified
    already_verified = _row(sb.table("founder_payments").select("*").eq("session_id", body.session_id).execute())
    if not already_verified:
        # Activate benefits on user document
        sb.table("users").update({
            "founder_tier": tier,
            "founder_badge": benefits["badge"],
            "founder_frame": benefits["frame"],
            "founder_label": benefits["label"],
            "founder_paid_at": now.isoformat(),
            "stripe_session_id": body.session_id,
            "stripe_customer_id": session.get("customer") or user.get("stripe_customer_id"),
        }).eq("user_id", user["user_id"]).execute()

        # Record the verified payment (idempotency guard)
        sb.table("founder_payments").insert({
            "session_id": body.session_id,
            "user_id": user["user_id"],
            "tier": tier,
            "amount_cents": session.get("amount_total", FOUNDER_PASS_TIERS[tier]["price_cents"]),
            "paid_at": now.isoformat(),
            "stripe_customer": session.get("customer"),
        }).execute()

        logger.info(f"Founder pass activated: user={user['user_id']} tier={tier} session={body.session_id}")

    # Refresh user to return updated state
    updated_user = _row(sb.table("users").select("*").eq("user_id", user["user_id"]).execute())

    return {
        "success": True,
        "tier": tier,
        "label": benefits["label"],
        "badge": benefits["badge"],
        "perks": benefits["perks"],
        "coins_granted": benefits["coins"],
        "paid_at": now.isoformat(),
        "user": {
            "name": updated_user.get("name"),
            "email": updated_user.get("email"),
            "founder_tier": updated_user.get("founder_tier"),
            "founder_badge": updated_user.get("founder_badge"),
        },
    }


# ==================== STRIPE WEBHOOK (FOUNDER PASS) ====================
#
# Register this URL in your Stripe Dashboard:
#   Developers → Webhooks → Add endpoint
#   URL:    https://<your-domain>/api/webhooks/stripe
#   Events: checkout.session.completed
#            payment_intent.payment_failed
#            payment_intent.succeeded        (optional, belt-and-suspenders)
#
# Then copy the "Signing secret" (whsec_…) into your .env:
#   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
#
# Local testing with Stripe CLI:
#   stripe listen --forward-to localhost:8000/api/webhooks/stripe
#   stripe trigger checkout.session.completed
#
# NOTE: The InputSanitizationMiddleware explicitly skips this path so that
# the raw request bytes are never mutated before HMAC verification.

async def _activate_founder_pass(session: dict) -> dict:
    """
    Core activation logic shared by both the webhook and /payments/verify.
    Returns a summary dict; raises nothing (logs errors instead) so the
    webhook always responds 200 to Stripe.
    """
    session_id  = session.get("id")
    user_id     = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
    tier        = ((session.get("metadata") or {}).get("tier") or "").lower()
    amount      = session.get("amount_total", 0)
    customer_id = session.get("customer")

    if not user_id:
        logger.warning(f"Webhook: checkout.session.completed has no user_id | session={session_id}")
        return {"skipped": True, "reason": "no user_id"}

    if tier not in FOUNDER_PASS_TIERS:
        logger.warning(f"Webhook: unknown tier '{tier}' | session={session_id}")
        return {"skipped": True, "reason": f"unknown tier: {tier}"}

    benefits = FOUNDER_TIER_BENEFITS[tier]
    now      = datetime.now(timezone.utc)

    # ── Idempotency guard ──────────────────────────────────────────────────────
    already = _row(sb.table("founder_payments").select("*").eq("session_id", session_id).execute())
    if already:
        logger.info(f"Webhook: session {session_id} already processed — skipping")
        return {"skipped": True, "reason": "already processed"}

    # ── Activate benefits ──────────────────────────────────────────────────────
    sb.table("users").update({
        "founder_tier":    tier,
        "founder_badge":   benefits["badge"],
        "founder_frame":   benefits["frame"],
        "founder_label":   benefits["label"],
        "founder_paid_at": now.isoformat(),
        "stripe_session_id":  session_id,
        "stripe_customer_id": customer_id,
        "stripe_payment_intent": session.get("payment_intent"),
    }).eq("user_id", user_id).execute()

    # ── Record payment (idempotency + audit log) ───────────────────────────────
    sb.table("founder_payments").insert({
        "session_id":      session_id,
        "user_id":         user_id,
        "tier":            tier,
        "amount_cents":    amount,
        "paid_at":         now.isoformat(),
        "stripe_customer": customer_id,
        "source":          "webhook",
    }).execute()

    logger.info(
        f"Webhook: Founder pass activated | user={user_id} tier={tier} "
        f"amount={amount} session={session_id}"
    )
    return {"activated": True, "user_id": user_id, "tier": tier}


@api_router.post("/webhooks/stripe")
async def stripe_founder_webhook(request: Request):
    """
    Stripe webhook handler for Founder Pass purchases.
    • No auth required — Stripe calls this directly.
    • Signature is verified with STRIPE_WEBHOOK_SECRET (whsec_…).
    • Always returns HTTP 200 for recognised events so Stripe doesn't retry.
    • Fully idempotent — safe if Stripe delivers the same event twice.
    """
    import stripe

    # ── Read raw bytes (middleware is bypassed for this path) ──────────────────
    payload   = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # ── Reject immediately if Stripe is not configured ────────────────────────
    if not STRIPE_SECRET_KEY:
        logger.error("Webhook received but STRIPE_SECRET_KEY is not set")
        raise HTTPException(status_code=500, detail="Stripe not configured")

    if not STRIPE_WEBHOOK_SECRET:
        # Accept the event body without signature verification only in dev mode.
        # In production this should never happen.
        logger.warning(
            "STRIPE_WEBHOOK_SECRET not set — skipping signature verification. "
            "Set whsec_… in .env for production."
        )
        try:
            import json
            event = json.loads(payload)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    else:
        # ── Verify Stripe signature ────────────────────────────────────────────
        stripe.api_key = STRIPE_SECRET_KEY
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError as e:
            logger.warning(f"Webhook signature verification failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid Stripe signature")
        except Exception as e:
            logger.error(f"Webhook payload error: {e}")
            raise HTTPException(status_code=400, detail="Malformed webhook payload")

    event_type = event.get("type", "")
    event_id   = event.get("id", "unknown")
    logger.info(f"Webhook received: type={event_type} id={event_id}")

    # ─────────────────────────────────────────────────────────────────────────
    # checkout.session.completed
    # Fired when the customer completes the Stripe-hosted checkout page.
    # This is the primary activation trigger for Founder Passes.
    # ─────────────────────────────────────────────────────────────────────────
    if event_type == "checkout.session.completed":
        session = event["data"]["object"]

        # Only handle founder-pass sessions (identified by metadata.tier)
        tier = ((session.get("metadata") or {}).get("tier") or "").lower()
        if tier in FOUNDER_PASS_TIERS:
            try:
                result = await _activate_founder_pass(session)
                logger.info(f"Webhook checkout.session.completed result: {result}")
            except Exception as e:
                # Log but still return 200 — Stripe should NOT retry activation errors
                logger.error(f"Webhook activation error: {e}", exc_info=True)
        else:
            # Could be a different checkout flow (e.g. Lite subscription)
            logger.info(
                f"Webhook checkout.session.completed: no founder tier in metadata, "
                f"delegating to legacy handler | session={session.get('id')}"
            )
            # ── Legacy Lite subscription activation (kept for backwards compat) ──
            user_id = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
            if user_id:
                now = datetime.now(timezone.utc)
                founders_end   = FOUNDERS_LAUNCH_DATE + timedelta(days=30)
                founders_count = _count(sb.table("users").select("*", count="exact").eq("is_lite_founder", True).execute())
                is_founder     = now <= founders_end and founders_count < FOUNDERS_LIMIT
                plan_limits    = PLAN_LIMITS["lite"]

                update_data = {
                    "plan":                  "lite",
                    "energy":                plan_limits["energy_cap"],
                    "storage_limit_mb":      plan_limits["storage_mb"],
                    "stripe_customer_id":    session.get("customer"),
                    "stripe_subscription_id": session.get("subscription"),
                    "upgraded_at":           now.isoformat(),
                }
                if is_founder:
                    update_data["is_lite_founder"] = True
                    update_data["founder_badge"]   = "Early Supporter"

                sb.table("users").update(update_data).eq("user_id", user_id).execute()
                logger.info(f"Webhook: user {user_id} upgraded to Lite plan")

    # ─────────────────────────────────────────────────────────────────────────
    # payment_intent.payment_failed
    # Fired when a charge attempt fails (declined card, insufficient funds…)
    # ─────────────────────────────────────────────────────────────────────────
    elif event_type == "payment_intent.payment_failed":
        pi        = event["data"]["object"]
        pi_id     = pi.get("id")
        customer  = pi.get("customer")
        last_err  = (pi.get("last_payment_error") or {})
        err_code  = last_err.get("code", "unknown")
        err_msg   = last_err.get("message", "")
        err_card  = (last_err.get("payment_method") or {}).get("card", {})
        card_last4 = err_card.get("last4", "????")

        logger.warning(
            f"Webhook payment_intent.payment_failed | "
            f"pi={pi_id} customer={customer} "
            f"code={err_code} card=****{card_last4} msg={err_msg!r}"
        )

        # Log failure to DB for analytics / support lookup
        sb.table("payment_failures").insert({
            "payment_intent_id": pi_id,
            "stripe_customer":   customer,
            "error_code":        err_code,
            "error_message":     err_msg,
            "card_last4":        card_last4,
            "amount":            pi.get("amount"),
            "currency":          pi.get("currency"),
            "failed_at":         datetime.now(timezone.utc).isoformat(),
            "event_id":          event_id,
        }).execute()

        # Optional: look up the user and surface the failure for support
        if customer:
            user_doc = _row(sb.table("users").select("*").eq("stripe_customer_id", customer).execute())
            if user_doc:
                logger.warning(
                    f"Failed payment linked to user: {user_doc.get('user_id')} "
                    f"({user_doc.get('email')})"
                )

    # ─────────────────────────────────────────────────────────────────────────
    # payment_intent.succeeded
    # Belt-and-suspenders: also fires when a PaymentIntent succeeds.
    # We don't need to re-activate here because checkout.session.completed
    # already handles it — just log for visibility.
    # ─────────────────────────────────────────────────────────────────────────
    elif event_type == "payment_intent.succeeded":
        pi = event["data"]["object"]
        logger.info(
            f"Webhook payment_intent.succeeded | pi={pi.get('id')} "
            f"amount={pi.get('amount')} currency={pi.get('currency')}"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # customer.subscription.deleted
    # Existing handler: downgrade user from Lite plan if subscription cancelled.
    # ─────────────────────────────────────────────────────────────────────────
    elif event_type == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id  = subscription.get("customer")

        user_doc = _row(sb.table("users").select("*").eq("stripe_customer_id", customer_id).execute())
        if user_doc:
            sb.table("users").update({
                "plan":                  "free",
                "storage_limit_mb":      PLAN_LIMITS["free"]["storage_mb"],
                "subscription_ended_at": datetime.now(timezone.utc).isoformat(),
            }).eq("user_id", user_doc["user_id"]).execute()
            logger.info(f"Webhook: user {user_doc['user_id']} downgraded to Free plan")

    else:
        # Acknowledge all other event types without processing
        logger.debug(f"Webhook: unhandled event type '{event_type}' — acknowledged")

    # Always return 200 so Stripe doesn't retry
    return {"received": True, "event": event_type, "id": event_id}


# ==================== PERMISSION CHECK ENDPOINT ====================
@api_router.post("/permissions/check")
async def check_permission(action: str, request: Request):
    """Check if user can perform an action"""
    user = await get_current_user(request)
    
    # Regenerate energy first
    await check_and_regen_energy(user)
    user_row = _row(sb.table("users").select("*").eq("user_id", user["user_id"]).execute())
    if user_row:
        user = {k: v for k, v in user_row.items() if k != "password"}
    
    result = await can_user(user, action)
    result["current_plan"] = user.get("plan", "free")
    result["energy"] = user.get("energy", 0)
    result["storage_used_mb"] = user.get("storage_used_mb", 0)
    result["storage_limit_mb"] = PLAN_LIMITS[user.get("plan", "free")]["storage_mb"]
    
    return result

# ==================== AI JOB SYSTEM ====================
@api_router.post("/ai/job")
@limiter.limit(_ai_limit)
async def create_ai_job(job: AIJobCreate, request: Request):
    """Create an AI job with staged processing - ENERGY ENFORCED"""
    user = await get_current_user(request)
    
    # Regenerate energy first
    current_energy = await check_and_regen_energy(user)
    
    # HARD LIMIT: Check energy
    permission = await can_user(user, "create_ai_job")
    if not permission["allowed"]:
        raise HTTPException(
            status_code=402, 
            detail={
                "error": "no_energy",
                "message": "No energy remaining. Wait for regeneration or upgrade to Lite for faster regen.",
                "upgrade_required": True,
                "current_energy": current_energy
            }
        )
    
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    job_doc = {
        "job_id": job_id,
        "user_id": user["user_id"],
        "job_type": job.job_type,
        "input_data": job.input_data,
        "status": "analyzing",
        "stage": 0,
        "output": None,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("ai_jobs").insert(job_doc).execute()
    
    # Deduct energy: read current, subtract 1, update
    current_user = _row(sb.table("users").select("energy").eq("user_id", user["user_id"]).execute())
    new_energy = max(0, (current_user.get("energy", 0) - 1)) if current_user else 0
    sb.table("users").update({"energy": new_energy}).eq("user_id", user["user_id"]).execute()
    
    # Log wallet transaction
    sb.table("wallet_ledger").insert({
        "user_id": user["user_id"],
        "type": "spend",
        "amount": 1,
        "currency": "energy",
        "reason": f"ai_job_{job.job_type}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"job_id": job_id, "status": "analyzing", "stage": 0, "expires_at": expires_at}

@api_router.get("/ai/job/{job_id}")
async def get_ai_job(job_id: str, request: Request):
    """Get AI job status and output"""
    user = await get_current_user(request)
    job = _row(sb.table("ai_jobs").select("*").eq("job_id", job_id).eq("user_id", user["user_id"]).execute())
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@api_router.post("/ai/job/{job_id}/process")
async def process_ai_job(job_id: str, request: Request):
    """Process next stage of AI job"""
    user = await get_current_user(request)
    job = _row(sb.table("ai_jobs").select("*").eq("job_id", job_id).eq("user_id", user["user_id"]).execute())
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    current_stage = job.get("stage", 0)
    
    if current_stage >= len(AI_STAGES) - 1:
        return {"status": "completed", "stage": current_stage, "output": job.get("output")}
    
    # Process AI job with OpenRouter
    new_stage = current_stage + 1
    new_status = AI_STAGES[new_stage]
    
    output = None
    if new_status == "completed":
        from utils.openrouter import call_openrouter
        
        job_type = job.get("job_type", "")
        input_data = job.get("input_data", "")
        
        try:
            if job_type == "quiz":
                quiz_format = """Generate a quiz with questions.
                Return ONLY valid JSON in this exact format:
                {
                    "questions": [
                        {
                            "question": "Your question text here",
                            "options": ["A", "B", "C", "D"],
                            "correct": 0,
                            "explanation": "Brief explanation"
                        }
                    ]
                }"""
                
                response = await call_openrouter(
                    prompt=f"Generate 5 quiz questions from this content:\n\n{input_data}",
                    system="You are a quiz generator. " + quiz_format,
                    model="anthropic/claude-3-haiku",
                    use_case="fast"
                )
                
                # Parse JSON response
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    output = json.loads(response[json_start:json_end])
                else:
                    output = {"questions": [], "raw_response": response}
            
            elif job_type == "summary":
                response = await call_openrouter(
                    prompt=f"Please summarize the following text:\n\n{input_data}",
                    system="You are a helpful assistant that summarizes text concisely.",
                    model="anthropic/claude-3-haiku",
                    use_case="fast"
                )
                output = {"text": response}
            
            elif job_type == "flashcards":
                flashcard_format = """Generate flashcards from content.
                Return ONLY valid JSON in this exact format:
                {
                    "cards": [
                        {
                            "front": "Question or term",
                            "back": "Answer or definition"
                        }
                    ]
                }"""
                
                response = await call_openrouter(
                    prompt=f"Generate 10 flashcards from this content:\n\n{input_data}",
                    system="You are a flashcard generator. " + flashcard_format,
                    model="anthropic/claude-3-haiku",
                    use_case="fast"
                )
                
                # Parse JSON response
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    output = json.loads(response[json_start:json_end])
                else:
                    output = {"cards": [], "raw_response": response}
            
            elif job_type == "improve":
                response = await call_openrouter(
                    prompt=f"Please improve and enhance this text:\n\n{input_data}",
                    system="You are a writing assistant that improves text clarity, grammar, and style.",
                    model="anthropic/claude-3.5-sonnet",
                    use_case="complex"
                )
                output = {"improved": response}
            
            elif job_type == "voice_parse":
                response = await call_openrouter(
                    prompt=f"Parse and structure this voice transcript:\n\n{input_data}",
                    system="You are a voice transcription parser that structures spoken content into organized text.",
                    model="anthropic/claude-3-haiku",
                    use_case="fast"
                )
                output = {"structured": response}
            
            else:
                output = {"result": "Unknown job type processed"}
                
        except Exception as e:
            logger.error(f"AI job processing failed: {e}")
            output = {"error": str(e), "result": "Processing failed"}
    
    sb.table("ai_jobs").update({"stage": new_stage, "status": new_status, "output": output}).eq("job_id", job_id).execute()
    
    return {"status": new_status, "stage": new_stage, "output": output}

@api_router.post("/ai/job/{job_id}/save")
async def save_ai_job(job_id: str, request: Request):
    """Save AI job output to library - STORAGE ENFORCED"""
    user = await get_current_user(request)
    
    # PERMISSION CHECK: Can save AI outputs?
    permission = await can_user(user, "save_ai_output")
    if not permission["allowed"]:
        raise HTTPException(
            status_code=402, 
            detail={
                "error": permission["reason"],
                "message": "Free users cannot save AI outputs. Upgrade to Lite to unlock saving.",
                "upgrade_required": permission["upgrade_required"]
            }
        )
    
    job = _row(sb.table("ai_jobs").select("*").eq("job_id", job_id).eq("user_id", user["user_id"]).execute())
    if not job or job.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    
    # STORAGE HARD LIMIT: Calculate size and check
    content_size_mb = calculate_storage_size(job.get("output"))
    storage_used = user.get("storage_used_mb", 0)
    storage_limit = PLAN_LIMITS[user.get("plan", "free")]["storage_mb"]
    
    if storage_used + content_size_mb > storage_limit:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "storage_full",
                "message": f"Storage limit reached ({storage_limit}MB). Delete items or upgrade to Lite for more storage.",
                "storage_used_mb": round(storage_used, 2),
                "storage_limit_mb": storage_limit,
                "content_size_mb": round(content_size_mb, 4),
                "upgrade_required": True
            }
        )
    
    # Check coins (5 coins to save)
    save_cost = 5
    if user.get("coins", 0) < save_cost:
        raise HTTPException(
            status_code=402, 
            detail={
                "error": "insufficient_coins",
                "message": f"Need {save_cost} coins to save. Current balance: {user.get('coins', 0)}",
                "coins_required": save_cost,
                "coins_available": user.get("coins", 0)
            }
        )
    
    # Save to library
    library_id = f"lib_{uuid.uuid4().hex[:12]}"
    sb.table("library").insert({
        "item_id": library_id,
        "user_id": user["user_id"],
        "item_type": job.get("job_type"),
        "title": f"{job.get('job_type').title()} - {datetime.now().strftime('%m/%d')}",
        "content": job.get("output"),
        "size_mb": content_size_mb,
        "source_job_id": job_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    # Deduct coins and update storage: read current values, compute new, update
    cur_user = _row(sb.table("users").select("coins, storage_used_mb").eq("user_id", user["user_id"]).execute())
    new_coins = (cur_user.get("coins", 0) - save_cost) if cur_user else 0
    new_storage = (cur_user.get("storage_used_mb", 0) + content_size_mb) if cur_user else content_size_mb
    sb.table("users").update({"coins": new_coins, "storage_used_mb": new_storage}).eq("user_id", user["user_id"]).execute()
    
    # Log transaction
    sb.table("wallet_ledger").insert({
        "user_id": user["user_id"],
        "type": "spend",
        "amount": save_cost,
        "currency": "coins",
        "reason": f"save_ai_{job.get('job_type')}",
        "storage_delta_mb": content_size_mb,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    # Remove expiration (permanent save)
    sb.table("ai_jobs").update({"expires_at": None, "saved": True}).eq("job_id", job_id).execute()
    
    return {
        "saved": True, 
        "library_id": library_id, 
        "coins_spent": save_cost,
        "storage_used_mb": round(storage_used + content_size_mb, 2)
    }

# ==================== VOICE INPUT SYSTEM ====================
@api_router.post("/voice/parse")
async def parse_voice_input(voice_req: VoiceParseRequest, request: Request):
    """Parse voice transcript into structured task"""
    user = await get_current_user(request)
    
    transcript = voice_req.transcript.lower()
    
    # Simple intent parsing
    parsed = {
        "intent": "task",
        "title": voice_req.transcript,
        "due_date": None,
        "priority": "medium"
    }
    
    # Detect time references
    if "tomorrow" in transcript:
        parsed["due_date"] = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    elif "today" in transcript:
        parsed["due_date"] = datetime.now().strftime("%Y-%m-%d")
    elif "next week" in transcript:
        parsed["due_date"] = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    # Detect priority
    if "urgent" in transcript or "important" in transcript:
        parsed["priority"] = "high"
    elif "later" in transcript or "eventually" in transcript:
        parsed["priority"] = "low"
    
    # Clean title
    for word in ["remind me to", "i need to", "don't forget to", "tomorrow", "today", "urgent", "important"]:
        parsed["title"] = parsed["title"].replace(word, "").strip()
    
    return {"parsed": parsed, "original": voice_req.transcript}

@api_router.post("/voice/confirm-task")
async def confirm_voice_task(task_data: dict, request: Request):
    """Confirm and save voice-parsed task"""
    user = await get_current_user(request)
    
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    task_doc = {
        "task_id": task_id,
        "user_id": user["user_id"],
        "title": task_data.get("title", "Untitled"),
        "description": task_data.get("description", ""),
        "due_date": task_data.get("due_date"),
        "priority": task_data.get("priority", "medium"),
        "completed": False,
        "source": "voice",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sb.table("tasks").insert(task_doc).execute()
    
    return task_doc

# ==================== STRENGTH PROFILE SYSTEM ====================
@api_router.post("/onboarding")
async def save_onboarding(data: OnboardingData, request: Request):
    """Save onboarding data and generate strength profile"""
    user = await get_current_user(request)
    
    # Generate strength profile (simplified algorithm)
    strengths = []
    if "creative" in " ".join(data.strengths).lower():
        strengths.append({"name": "Creativity", "score": 85, "description": "Strong creative thinking"})
    if "analytical" in " ".join(data.strengths).lower() or "logical" in " ".join(data.strengths).lower():
        strengths.append({"name": "Logic", "score": 80, "description": "Analytical problem solving"})
    if "leader" in " ".join(data.strengths).lower() or "team" in " ".join(data.strengths).lower():
        strengths.append({"name": "Leadership", "score": 75, "description": "Natural leadership ability"})
    
    # Default strengths if none detected
    if not strengths:
        strengths = [
            {"name": "Focus", "score": 70, "description": "Ability to concentrate"},
            {"name": "Discipline", "score": 65, "description": "Consistent effort"}
        ]
    
    # Generate career clusters based on goals
    career_clusters = []
    goals_text = " ".join(data.future_goals).lower()
    if "tech" in goals_text or "code" in goals_text or "software" in goals_text:
        career_clusters.append({"name": "Technology", "match": 90, "roles": ["Software Engineer", "Product Manager"]})
    if "design" in goals_text or "creative" in goals_text:
        career_clusters.append({"name": "Design", "match": 85, "roles": ["UX Designer", "Creative Director"]})
    if "business" in goals_text or "entrepreneur" in goals_text:
        career_clusters.append({"name": "Business", "match": 80, "roles": ["Entrepreneur", "Consultant"]})
    
    # Generate skill paths
    skill_paths = [
        {"name": "Deep Work", "days": 21, "why": "Build focus muscle"},
        {"name": "Morning Routine", "days": 14, "why": "Optimize energy"}
    ]
    
    # Generate lock-in plan
    lock_in_plan = {
        "non_negotiable": "Complete most important task before noon",
        "growth": "Learn one new thing daily",
        "bonus": "Review and reflect in evening"
    }
    
    profile = {
        "user_id": user["user_id"],
        "strengths": strengths,
        "career_clusters": career_clusters,
        "skill_paths": skill_paths,
        "lock_in_plan": lock_in_plan,
        "onboarding_data": data.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    sb.table("strength_profiles").upsert(profile).execute()
    
    # Mark onboarding complete
    sb.table("users").update({"onboarding_complete": True}).eq("user_id", user["user_id"]).execute()
    
    return profile

@api_router.get("/profile/strength")
async def get_strength_profile(request: Request):
    """Get user's strength profile"""
    user = await get_current_user(request)
    profile = _row(sb.table("strength_profiles").select("*").eq("user_id", user["user_id"]).execute())
    return profile or {}

@api_router.get("/profile/lock-in")
async def get_lock_in_plan(request: Request):
    """Get today's lock-in plan"""
    user = await get_current_user(request)
    profile = _row(sb.table("strength_profiles").select("*").eq("user_id", user["user_id"]).execute())
    return profile.get("lock_in_plan", {}) if profile else {}

# ==================== WALLET & ENERGY SYSTEM ====================
@api_router.get("/wallet")
async def get_wallet(request: Request):
    """Get wallet balance"""
    user = await get_current_user(request)
    return {
        "coins": user.get("coins", 100),
        "energy": user.get("energy", 9),
        "storage_used": user.get("storage_used", 0),
        "storage_limit": 50 if user.get("plan") == "lite" else 5,
        "plan": user.get("plan", "free")
    }

@api_router.get("/wallet/history")
async def get_wallet_history(request: Request):
    """Get wallet transaction history"""
    user = await get_current_user(request)
    history = _rows(sb.table("wallet_ledger").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).limit(50).execute())
    return history

@api_router.post("/wallet/topup")
async def topup_wallet(amount: int, request: Request):
    """Top up coins (Stripe-ready hook)"""
    user = await get_current_user(request)
    
    # In production, this would verify Stripe payment
    cur_user = _row(sb.table("users").select("coins").eq("user_id", user["user_id"]).execute())
    new_coins = (cur_user.get("coins", 0) + amount) if cur_user else amount
    sb.table("users").update({"coins": new_coins}).eq("user_id", user["user_id"]).execute()
    
    sb.table("wallet_ledger").insert({
        "user_id": user["user_id"],
        "type": "topup",
        "amount": amount,
        "currency": "coins",
        "reason": "purchase",
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"success": True, "new_balance": new_coins}

@api_router.post("/energy/reset")
async def reset_daily_energy(request: Request):
    """Reset energy at midnight UTC (called by cron or on login)"""
    user = await get_current_user(request)
    
    last_reset = user.get("last_energy_reset")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    if last_reset != today:
        sb.table("users").update({"energy": 9, "last_energy_reset": today}).eq("user_id", user["user_id"]).execute()
        return {"reset": True, "energy": 9}
    
    return {"reset": False, "energy": user.get("energy", 9)}

# ==================== CLEANUP EXPIRED AI JOBS ====================
@api_router.delete("/ai/cleanup")
async def cleanup_expired_jobs():
    """Clean up expired AI jobs (run periodically)"""
    now = datetime.now(timezone.utc).isoformat()
    result = sb.table("ai_jobs").delete().lt("expires_at", now).neq("saved", True).execute()
    return {"deleted": len(result.data)}

# ==================== VISIONARY AI CHAT ====================
class VisionaryChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class VisionaryChatResponse(BaseModel):
    session_id: str
    message: str
    response: str

@api_router.post("/ai/visionary/chat")
@limiter.limit(_ai_limit)
async def visionary_chat(chat_msg: VisionaryChatMessage, request: Request):
    """Send a message to Visionary AI and get a response"""
    user = await get_current_user(request)
    
    from utils.openrouter import call_openrouter
    
    # Create or get session
    session_id = chat_msg.session_id
    is_new_session = False
    
    if not session_id:
        # Create new session
        session_id = f"visionary_{uuid.uuid4().hex[:12]}"
        is_new_session = True
        
        # Create session document
        session_doc = {
            "session_id": session_id,
            "user_id": user["user_id"],
            "title": chat_msg.message[:50] + ("..." if len(chat_msg.message) > 50 else ""),
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        sb.table("visionary_sessions").insert(session_doc).execute()
    
    # Get session for context
    session = _row(sb.table("visionary_sessions").select("*").eq("session_id", session_id).eq("user_id", user["user_id"]).execute())
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Build conversation history for context
    history_context = ""
    if session.get("messages"):
        for msg in session["messages"][-10:]:  # Last 10 messages for context
            role = "User" if msg["role"] == "user" else "Visionary"
            history_context += f"{role}: {msg['content']}\n"
    
    # System message for Visionary AI
    system_message = """You are Visionary AI, an intelligent assistant specialized in:
- Research assistance: Help users explore topics in depth, find connections, and synthesize information
- General Q&A: Answer questions clearly and comprehensively  
- Study help: Explain concepts, create study strategies, and help with academic topics

You are friendly, knowledgeable, and always aim to provide thorough yet accessible explanations.
When helping with research, think critically and offer multiple perspectives.
Keep responses focused and well-organized. Use markdown formatting for better readability when appropriate."""

    # Add history context if exists
    if history_context:
        system_message += f"\n\nPrevious conversation:\n{history_context}"
    
    response = await call_openrouter(
        prompt=chat_msg.message,
        system=system_message,
        model="anthropic/claude-3.5-sonnet",
        use_case="complex"
    )
    
    # Store messages in database
    now = datetime.now(timezone.utc).isoformat()
    
    # Read session, extend messages list, then update
    current_session = _row(sb.table("visionary_sessions").select("messages").eq("session_id", session_id).execute())
    messages = (current_session.get("messages") or []) if current_session else []
    messages.extend([
        {"role": "user", "content": chat_msg.message, "timestamp": now},
        {"role": "assistant", "content": response, "timestamp": now}
    ])
    sb.table("visionary_sessions").update({"messages": messages, "updated_at": now}).eq("session_id", session_id).execute()
    
    return {
        "session_id": session_id,
        "message": chat_msg.message,
        "response": response,
        "is_new_session": is_new_session
    }

@api_router.get("/ai/visionary/sessions")
async def get_visionary_sessions(request: Request):
    """Get all chat sessions for the current user"""
    user = await get_current_user(request)
    
    sessions = _rows(sb.table("visionary_sessions").select("session_id, title, created_at, updated_at").eq("user_id", user["user_id"]).order("updated_at", desc=True).limit(50).execute())
    
    return sessions

@api_router.get("/ai/visionary/sessions/{session_id}")
async def get_visionary_session(session_id: str, request: Request):
    """Get a specific chat session with all messages"""
    user = await get_current_user(request)
    
    session = _row(sb.table("visionary_sessions").select("*").eq("session_id", session_id).eq("user_id", user["user_id"]).execute())
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

@api_router.delete("/ai/visionary/sessions/{session_id}")
async def delete_visionary_session(session_id: str, request: Request):
    """Delete a chat session"""
    user = await get_current_user(request)
    
    result = sb.table("visionary_sessions").delete().eq("session_id", session_id).eq("user_id", user["user_id"]).execute()
    
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Session deleted"}

@api_router.put("/ai/visionary/sessions/{session_id}/title")
async def update_session_title(session_id: str, request: Request):
    """Update session title"""
    user = await get_current_user(request)
    body = await request.json()
    new_title = body.get("title", "")
    
    if not new_title:
        raise HTTPException(status_code=400, detail="Title is required")
    
    result = sb.table("visionary_sessions").update({"title": new_title}).eq("session_id", session_id).eq("user_id", user["user_id"]).execute()
    
    if len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Title updated"}

# ==================== NOTES STUDIO ====================
class DiagramRequest(BaseModel):
    text: str
    title: str = "Untitled Note"

@api_router.post("/notes/suggest-diagram")
@limiter.limit(_ai_limit)
async def suggest_diagram(request: DiagramRequest, http_request: Request):
    """Analyze text and suggest a visual diagram structure"""
    try:
        from utils.openrouter import call_openrouter
        
        # AI prompt for diagram analysis
        prompt = f"""
Analyze this text and suggest a visual diagram structure. Identify:
1. Main topic (center node)
2. Key concepts (branches)
3. Relationships (connections)
4. Best diagram type (mind map, flowchart, timeline, hierarchy)

Text to analyze: "{request.text}"
Title: "{request.title}"

Return ONLY valid JSON with this exact structure:
{{
  "type": "mindmap|flowchart|timeline|hierarchy",
  "nodes": [
    {{"id": "1", "text": "Main Topic", "position": {{"x": 200, "y": 150}}, "shape": "ellipse", "color": "#7C3AED"}},
    {{"id": "2", "text": "Concept 1", "position": {{"x": 100, "y": 50}}, "shape": "rectangle", "color": "#10B981"}},
    {{"id": "3", "text": "Concept 2", "position": {{"x": 300, "y": 50}}, "shape": "rectangle", "color": "#3B82F6"}}
  ],
  "edges": [
    {{"from": "1", "to": "2"}},
    {{"from": "1", "to": "3"}}
  ]
}}

Choose the most appropriate diagram type based on content:
- Mind map: for brainstorming, concepts, ideas (use "ellipse" for center, "rectangle" for branches)
- Flowchart: for processes, steps (use "rectangle" for steps, "diamond" for decisions, "ellipse" for start/end)
- Timeline: for events, history (use "rectangle" or "ellipse" for events)
- Hierarchy: for structures, organizations (use "rectangle" for levels)

For each node you may optionally set:
- "shape": "rectangle" | "ellipse" | "diamond" (default rectangle)
- "color": hex string e.g. "#4F46E5" (use a variety of colors for visual interest)

Keep nodes concise (max 3-4 words each). Position nodes logically for the diagram type. Use varied colors and shapes to make the diagram clear and interesting.
"""

        # Call OpenRouter AI
        ai_response = await call_openrouter(
            prompt=prompt,
            system="You are a diagram analysis expert. Always respond with valid JSON only.",
            use_case="fast",
            temperature=0.3,
            max_tokens=2000
        )
        
        # Parse AI response
        try:
            # Clean response to ensure valid JSON
            ai_response = ai_response.strip()
            if ai_response.startswith('```json'):
                ai_response = ai_response[7:]
            if ai_response.endswith('```'):
                ai_response = ai_response[:-3]
            ai_response = ai_response.strip()
            
            diagram_data = json.loads(ai_response)
            
            # Validate required fields
            if not all(key in diagram_data for key in ['type', 'nodes', 'edges']):
                raise ValueError("Missing required fields in AI response")
            
            # Ensure nodes have required structure
            for node in diagram_data['nodes']:
                if not all(key in node for key in ['id', 'text', 'position']):
                    raise ValueError("Invalid node structure in AI response")
                if not all(key in node['position'] for key in ['x', 'y']):
                    raise ValueError("Invalid node position in AI response")
            
            # Ensure edges have required structure
            for edge in diagram_data['edges']:
                if not all(key in edge for key in ['from', 'to']):
                    raise ValueError("Invalid edge structure in AI response")
            
            return {
                "type": diagram_data["type"],
                "nodes": diagram_data["nodes"],
                "edges": diagram_data["edges"],
                "suggestion": f"Generated {diagram_data['type']} diagram based on your text content"
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"AI response: {ai_response}")
            # Fall back to mock logic
            return generate_mock_diagram(request.text, request.title)
        
    except Exception as e:
        logger.error(f"Error in suggest_diagram: {e}")
        # Fall back to mock logic if AI fails
        return generate_mock_diagram(request.text, request.title)

def generate_mock_diagram(text: str, title: str):
    """Fallback mock diagram generation"""
    text_lower = text.lower()
    
    # Simple keyword-based mock logic
    if "process" in text_lower or "step" in text_lower or "flow" in text_lower:
        diagram_type = "flowchart"
        nodes = [
            {"id": "1", "text": "Start", "position": {"x": 100, "y": 50}},
            {"id": "2", "text": "Process Step 1", "position": {"x": 100, "y": 150}},
            {"id": "3", "text": "Process Step 2", "position": {"x": 100, "y": 250}},
            {"id": "4", "text": "End", "position": {"x": 100, "y": 350}}
        ]
        edges = [
            {"from": "1", "to": "2"},
            {"from": "2", "to": "3"},
            {"from": "3", "to": "4"}
        ]
    elif "time" in text_lower or "history" in text_lower or "timeline" in text_lower or "chronological" in text_lower:
        diagram_type = "timeline"
        nodes = [
            {"id": "1", "text": "Event 1", "position": {"x": 50, "y": 200}},
            {"id": "2", "text": "Event 2", "position": {"x": 200, "y": 200}},
            {"id": "3", "text": "Event 3", "position": {"x": 350, "y": 200}}
        ]
        edges = [
            {"from": "1", "to": "2"},
            {"from": "2", "to": "3"}
        ]
    elif "hierarchy" in text_lower or "structure" in text_lower or "organization" in text_lower:
        diagram_type = "hierarchy"
        nodes = [
            {"id": "1", "text": "Main Topic", "position": {"x": 200, "y": 50}},
            {"id": "2", "text": "Subtopic 1", "position": {"x": 100, "y": 150}},
            {"id": "3", "text": "Subtopic 2", "position": {"x": 300, "y": 150}},
            {"id": "4", "text": "Detail 1", "position": {"x": 50, "y": 250}},
            {"id": "5", "text": "Detail 2", "position": {"x": 150, "y": 250}}
        ]
        edges = [
            {"from": "1", "to": "2"},
            {"from": "1", "to": "3"},
            {"from": "2", "to": "4"},
            {"from": "2", "to": "5"}
        ]
    else:
        # Default to mind map
        diagram_type = "mindmap"
        # Extract key words from text for mock nodes
        words = text_lower.split()[:6]  # Take first 6 words
        nodes = [
            {"id": "1", "text": title or "Main Topic", "position": {"x": 200, "y": 150}}
        ]
        
        # Create nodes around center
        edges = []
        for i, word in enumerate(words[:5]):
            angle = (i * 72) * (3.14159 / 180)  # 72 degrees apart in radians
            x = 200 + 150 * (angle if i % 2 == 0 else -angle)
            y = 150 + 150 * (1 if i % 2 == 0 else -1)
            nodes.append({
                "id": str(i + 2), 
                "text": word.capitalize(), 
                "position": {"x": x, "y": y}
            })
            edges.append({"from": "1", "to": str(i + 2)})
    
    return {
        "type": diagram_type,
        "nodes": nodes,
        "edges": edges,
        "suggestion": f"Generated {diagram_type} based on your text content"
    }

# ==================== WEBSOCKET ====================
@app.websocket("/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: str):
    # Get user from query params or cookie
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
    except:
        await websocket.close(code=4001)
        return
    
    await manager.connect(websocket, channel_id, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong for connection keep-alive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(channel_id, user_id)

# ==================== STATUS ====================
@api_router.get("/")
async def root():
    return {"message": "TaskFlow API is running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,https://visionary-academy.com').split(','),
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

