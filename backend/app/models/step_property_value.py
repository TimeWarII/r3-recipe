from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class StepPropertyValue(Base):
    __tablename__ = "step_property_values"

    id = Column(Integer, primary_key=True)
    recipe_step_id = Column(Integer, ForeignKey("recipe_steps.id"),
                            nullable=False)
    property_definition_id = Column(
        Integer, ForeignKey("property_definitions.id"), nullable=False
    )
    value = Column(String(500), nullable=False)

    recipe_step = relationship("RecipeStep", back_populates="property_values")
    property_definition = relationship(
        "PropertyDefinition", back_populates="step_property_values"
    )
