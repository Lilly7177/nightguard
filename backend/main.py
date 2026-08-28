from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from contacts import router as contact_router
from alerts import router as alerts_router
from admin import router as admin_router
from monitoring import router as monitoring_router
from routing import router as routing_router


app = FastAPI(
    title="NightGuard API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.18:5173",
        "https://agreed-playlist-albums-rubber.trycloudflare.com",
        "https://nightguard-tau.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(contact_router)
app.include_router(alerts_router)
app.include_router(admin_router)
app.include_router(monitoring_router)
app.include_router(routing_router)


@app.get("/")
def home():
    return {
        "message": "NightGuard Backend Running"
    }