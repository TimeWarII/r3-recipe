from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.enums import RuleType


class PropertyValidationRule(Base):
    __tablename__ = "property_validation_rules"

    id = Column(Integer, primary_key=True)
    property_definition_id = Column(
        Integer, ForeignKey("property_definitions.id"), nullable=False
    )
    rule_type = Column(SAEnum(RuleType), nullable=False)
    rule_value = Column(String(200), nullable=True)
    error_message = Column(String(300), nullable=False)

    property_definition = relationship(
        "PropertyDefinition", back_populates="validation_rules"
    )
