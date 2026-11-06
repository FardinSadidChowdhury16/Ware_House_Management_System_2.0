from app.schemas.product import ProductTypeUpdate


def test_product_type_update_accepts_name_and_attributes():
    update = ProductTypeUpdate(
        name="Battery",
        attributes=[
            {
                "field_key": "capacity",
                "field_label": "Capacity",
                "field_type": "number",
                "unit": "mAh",
                "is_required": True,
            }
        ],
    )

    assert update.name == "Battery"
    assert update.attributes[0].field_label == "Capacity"
    assert update.attributes[0].field_type.value == "number"
