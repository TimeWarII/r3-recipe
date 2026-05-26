from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.enums import InputType


class PropertyDefinition(Base):
    __tablename__ = "property_definitions"

    id = Column(Integer, primary_key=True)
    step_type_id = Column(Integer, ForeignKey("step_types.id"), nullable=False)
    key = Column(String(100), nullable=False)
    label = Column(String(100), nullable=False)
    input_type = Column(SAEnum(InputType), nullable=False)
    options = Column(String(500), nullable=True)  # comma-separated
    default_value = Column(String(200), nullable=True)
    order = Column(Integer, nullable=False, default=0)

    step_type = relationship("StepType", back_populates="property_definitions")
    validation_rules = relationship(
        "PropertyValidationRule",
        back_populates="property_definition",
        cascade="all, delete-orphan",
    )
    step_property_values = relationship(
        "StepPropertyValue", back_populates="property_definition"
    )

    # Conditions where this property is the trigger
    trigger_conditions = relationship(
        "PropertyCondition",
        foreign_keys="PropertyCondition.trigger_property_id",
        back_populates="trigger_property",
        cascade="all, delete-orphan",
    )
    # Conditions where this property is revealed
    revealed_by_conditions = relationship(
        "PropertyCondition",
        foreign_keys="PropertyCondition.reveals_property_id",
        back_populates="reveals_property",
    )
