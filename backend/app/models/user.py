from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    login = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relational for record-keeping; in a larger-scale app, we would want to
    # keep track of edits and step creation: authorship, versions, etc
    recipes = relationship(
        "Recipe", back_populates="user", cascade="all, delete-orphan"
    )
