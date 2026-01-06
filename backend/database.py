from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    Float,
    String,
    Boolean,
    DateTime
)
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# =========================
# DATABASE CONFIG
# =========================
DATABASE_URL = "sqlite:///./greenpulse.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# =========================
# HISTORY TABLE
# =========================
class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)

    # Plant info
    plant = Column(String, index=True, nullable=False)

    # Sensor data
    soil_temperature = Column(Float, nullable=False)
    soil_moisture = Column(Float, nullable=False)
    air_humidity = Column(Float, nullable=False)

    # AI output
    need_water = Column(Boolean, nullable=False)
    probability = Column(Float, nullable=False)

    # User action
    watered = Column(Boolean, default=False, nullable=False)

    # Time
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


# =========================
# CREATE TABLES
# =========================
Base.metadata.create_all(bind=engine)
