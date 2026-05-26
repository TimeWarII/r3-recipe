from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class StepType(Base):
    __tablename__ = "step_types"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    label = Column(String(100), nullable=False)

    property_definitions = relationship(
        "PropertyDefinition",
        back_populates="step_type",
        order_by="PropertyDefinition.order",
    )
    recipe_steps = relationship("RecipeStep", back_populates="step_type")
