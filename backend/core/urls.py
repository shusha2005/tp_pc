from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminClubViewSet,
    AdminPcViewSet,
    AdminTariffViewSet,
    AuthViewSet,
    BookingViewSet,
    ClubViewSet,
    PcViewSet,
)

router = DefaultRouter()
router.register(r"clubs", ClubViewSet, basename="clubs")
router.register(r"pcs", PcViewSet, basename="pcs")
router.register(r"bookings", BookingViewSet, basename="bookings")
router.register(r"auth", AuthViewSet, basename="auth")
router.register(r"admin/clubs", AdminClubViewSet, basename="admin-clubs")
router.register(r"admin/pcs", AdminPcViewSet, basename="admin-pcs")
router.register(r"admin/tariffs", AdminTariffViewSet, basename="admin-tariffs")

urlpatterns = [
    path("", include(router.urls)),
]

