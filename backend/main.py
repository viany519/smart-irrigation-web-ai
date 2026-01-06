from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
from datetime import datetime

# (opsional) database
from backend.database import SessionLocal, History

app = FastAPI()

@app.get("/")
def root():
    return {"status": "Greenpulse API running"}


# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# LOAD MODEL
# =========================
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "greenpulse_model.joblib")

model = joblib.load(model_path)


# =========================
# INPUT SCHEMA (TETAP AMAN)
# =========================
class SensorInput(BaseModel):
    soil_temperature: float
    soil_moisture: float
    air_humidity: float
    plant: str | None = "unknown"   # 🔥 TIDAK WAJIB

# =========================
# PREDICT + SAVE HISTORY
# =========================
@app.post("/predict")
def predict(data: SensorInput):
    X = np.array([[
        data.soil_temperature,
        data.soil_moisture,
        data.air_humidity
    ]])

    prob = model.predict_proba(X)[0][1]

    # === RULE + AI (HYBRID, PUNYA KAMU) ===
    if data.soil_moisture < 35:
        need_water = 1
        final_prob = max(prob, 0.8)
    else:
        need_water = 0
        final_prob = max(prob, 0.7)

    timestamp = datetime.utcnow()

    # =========================
    # SAVE HISTORY (TIDAK MERUSAK API)
    # =========================
    try:
        db = SessionLocal()
        row = History(
            plant=data.plant or "unknown",
            soil_temperature=data.soil_temperature,
            soil_moisture=data.soil_moisture,
            air_humidity=data.air_humidity,
            need_water=need_water,
            probability=final_prob,
            watered=False,
            timestamp=timestamp
        )
        db.add(row)
        db.commit()
        db.close()
    except Exception as e:
        # kalau DB error, AI tetap jalan
        print("History save failed:", e)

    return {
        "need_water": need_water,
        "probability": round(final_prob, 3),
        "timestamp": timestamp.isoformat()
    }

# =========================
# GET HISTORY (UNTUK history.html)
# =========================
@app.get("/api/history")
def get_history(plant: str | None = None):
    db = SessionLocal()

    q = db.query(History)
    if plant:
        q = q.filter(History.plant == plant)

    rows = q.order_by(History.timestamp.desc()).all()
    db.close()
    return rows

# =========================
# UPDATE: SUDAH DISIRAM
# =========================
@app.patch("/history/{history_id}/watered")
def mark_watered(history_id: int):
    db = SessionLocal()
    row = db.query(History).filter(History.id == history_id).first()

    if not row:
        db.close()
        return {"error": "History not found"}

    row.watered = True
    db.commit()
    db.close()

    return {"status": "ok"}
