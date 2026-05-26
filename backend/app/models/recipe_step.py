from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class RecipeStep(Base):
    __tablename__ = "recipe_steps"

    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    step_type_id = Column(Integer, ForeignKey("step_types.id"), nullable=False)
    order = Column(Integer, nullable=False, default=0)

    recipe = relationship("Recipe", back_populates="steps")
    step_type = relationship("StepType", back_populates="recipe_steps")
    property_values = relationship(
        "StepPropertyValue",
        back_populates="recipe_step",
        cascade="all, delete-orphan",
    )
