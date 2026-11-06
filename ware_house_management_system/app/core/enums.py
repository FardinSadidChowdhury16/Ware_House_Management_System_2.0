from enum import Enum


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"


class ProductTrackingType(str, Enum):
    SERIALIZED = "serialized"
    QUANTITY = "quantity"


class ProductItemStatus(str, Enum):
    IN_STOCK = "in_stock"
    SOLD = "sold"
    DAMAGED = "damaged"
    TRANSFERRED = "transferred"


class CustomerType(str, Enum):
    RETAIL = "retail"
    WHOLESALE = "wholesale"
    CORPORATE = "corporate"