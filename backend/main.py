from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client[os.getenv("DB_NAME", "urlpreviewapp")]

# Auth config
SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# --- Models ---
class UserRegister(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class URLInput(BaseModel):
    url: str

class SavedURL(BaseModel):
    url: str
    preview_url: str
    title: str
    saved_at: str


# --- Auth helpers ---
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- Helpers ---
async def get_screenshot_url(url: str) -> str:
    """
    Calls Microlink JSON API to get the real direct screenshot image URL.
    Falls back to empty string if it fails.
    """
    try:
        api = f"https://api.microlink.io/?url={url}&screenshot=true&meta=false"
        async with httpx.AsyncClient(timeout=15) as c:
            resp = await c.get(api)
            data = resp.json()
            # Microlink returns: { "data": { "screenshot": { "url": "https://..." } } }
            screenshot_url = data.get("data", {}).get("screenshot", {}).get("url", "")
            return screenshot_url
    except Exception:
        return ""

async def get_page_title(url: str) -> str:
    """Fetches the page and extracts <title> tag."""
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as c:
            resp = await c.get(url, headers={"User-Agent": "Mozilla/5.0"})
            text = resp.text
            start = text.find("<title>")
            end = text.find("</title>")
            if start != -1 and end != -1:
                return text[start+7:end].strip()[:120]
    except Exception:
        pass
    return url


# --- Routes ---
@app.post("/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    hashed = hash_password(user.password)
    await db.users.insert_one({"username": user.username, "password": hashed})
    return {"message": "User registered successfully"}

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": form_data.username})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/preview")
async def get_preview(data: URLInput, username: str = Depends(get_current_user)):
    url = data.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    # Run both in sequence (title first, screenshot second)
    title = await get_page_title(url)
    preview_url = await get_screenshot_url(url)

    saved_at = datetime.utcnow().isoformat()

    await db.urls.insert_one({
        "username": username,
        "url": url,
        "preview_url": preview_url,
        "title": title,
        "saved_at": saved_at
    })

    return {
        "url": url,
        "preview_url": preview_url,
        "title": title,
        "saved_at": saved_at
    }

@app.get("/urls", response_model=List[SavedURL])
async def get_saved_urls(username: str = Depends(get_current_user)):
    cursor = db.urls.find({"username": username}).sort("saved_at", -1)
    results = []
    async for doc in cursor:
        results.append({
            "url": doc["url"],
            "preview_url": doc["preview_url"],
            "title": doc["title"],
            "saved_at": doc["saved_at"]
        })
    return results