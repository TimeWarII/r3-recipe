import enum


class InputType(str, enum.Enum):
    boolean = "boolean"
    select = "select"
    number = "number"


class RuleType(str, enum.Enum):
    non_negative = "non_negative"
    min_value = "min_value"
    max_value = "max_value"
    required = "required"
    one_of = "one_of"
    integer_only = "integer_only"
