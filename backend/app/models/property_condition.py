from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base


class PropertyCondition(Base):
    __tablename__ = "property_conditions"

    id = Column(Integer, primary_key=True)
    trigger_property_id = Column(
        Integer, ForeignKey("property_definitions.id"), nullable=False
    )
    trigger_value = Column(String(100), nullable=False)
    reveals_property_id = Column(
        Integer, ForeignKey("property_definitions.id"), nullable=False
    )

    trigger_property = relationship(
        "PropertyDefinition",
        foreign_keys=[trigger_property_id],
        back_populates="trigger_conditions",
    )
    reveals_property = relationship(
        "PropertyDefinition",
        foreign_keys=[reveals_property_id],
        back_populates="revealed_by_conditions",
    )
