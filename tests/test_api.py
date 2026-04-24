import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from core.models import Club, Pc


pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


# -------------------
# AUTH
# -------------------

@pytest.mark.django_db
def test_register_user(client):
    response = client.post("/api/auth/register/", {
        "email": "test@test.com",
        "username": "testuser",
        "password": "12345678"
    }, format="json")

    assert response.status_code in [200, 201]


@pytest.mark.django_db
def test_login_user(client):
    # сначала регистрация
    client.post("/api/auth/register/", {
        "email": "test@test.com",
        "username": "test",
        "password": "123456"
    })

    # потом логин
    response = client.post("/api/auth/login/", {
        "login": "test",
        "password": "123456"
    })

    assert response.status_code == 200


@pytest.mark.django_db
def test_login_fail(client):
    response = client.post("/api/auth/login/", {
        "login": "wrong",
        "password": "wrong"
    }, format="json")

    assert response.status_code in [400, 401]


# -------------------
# CLUBS
# -------------------

@pytest.mark.django_db
def test_get_clubs(client):
    Club.objects.create(name="Test Club", price=100)

    response = client.get("/api/clubs/")

    assert response.status_code == 200
    assert len(response.data) > 0


# -------------------
# PCS
# -------------------

@pytest.mark.django_db
def test_get_pcs(client):
    club = Club.objects.create(name="Test Club", price=100)

    Pc.objects.create(
        club=club,
        number=1,
        processor="Intel i5",
        gpu="RTX 4060",
        ram="16 GB",
        monitor_model="Test Monitor",
        status="free"
    )

    response = client.get("/api/pcs/")

    assert response.status_code == 200
    assert len(response.data) > 0


@pytest.mark.django_db
def test_filter_pcs_by_club(client):
    club = Club.objects.create(name="Club 1", price=100)

    Pc.objects.create(
        club=club,
        number=1,
        processor="Intel i5",
        gpu="RTX 4060",
        ram="16 GB",
        monitor_model="Test Monitor",
        status="free"
    )

    response = client.get(f"/api/pcs/?club_id={club.id}")

    assert response.status_code == 200
    assert len(response.data) > 0


# -------------------
# FILTERS
# -------------------

@pytest.mark.django_db
def test_get_pc_filters(client):
    club = Club.objects.create(name="Club 1", price=100)

    Pc.objects.create(
        club=club,
        number=1,
        processor="Intel i5",
        gpu="RTX 4060",
        ram="16 GB",
        monitor_model="Test Monitor",
        status="free"
    )

    response = client.get(f"/api/pcs/filters/?club_id={club.id}")

    assert response.status_code == 200