from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RAMPRS AI Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "service": "RAMPRS AI Gateway", "frontend": "https://ramprsai.vercel.app"}

@app.get("/api/health")
def health():
    return {
        "ok": True,
        "status": "online",
        "cloud_tunnel": "https://degree-teaches-brussels-lamb.trycloudflare.com"
    }

