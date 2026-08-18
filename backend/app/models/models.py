from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Student")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Mistake(Base):
    __tablename__ = "mistakes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    error_text = Column(String, index=True) # the incorrect phrase
    correction = Column(String)             # the corrected phrase
    category = Column(String)               # Grammar, Vocabulary, Pronunciation, etc.
    count = Column(Integer, default=1)      # to track recurring mistakes
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
