import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Get database URL from environment or use default sqlite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fluento.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
