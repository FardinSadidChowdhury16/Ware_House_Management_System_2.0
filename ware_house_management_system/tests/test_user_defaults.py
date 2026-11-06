from app.schemas.user import UserCreate, UserUpdate


def test_user_create_defaults_to_inactive_with_no_role_or_warehouse():
    user = UserCreate(
        name="Sara Khan",
        email="sara@example.com",
        password="secret123",
    )

    assert user.status is False
    assert user.role_id is None
    assert user.warehouse_ids == []
    assert user.user_name is None or user.user_name


def test_user_update_supports_status_assignment():
    update = UserUpdate(status=True)
    assert update.status is True
