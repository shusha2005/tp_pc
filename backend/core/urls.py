from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BookingViewSet, ClubViewSet, PcViewSet

router = DefaultRouter()
router.register(r"clubs", ClubViewSet, basename="clubs")
router.register(r"pcs", PcViewSet, basename="pcs")
router.register(r"bookings", BookingViewSet, basename="bookings")

urlpatterns = [
    path("", include(router.urls)),
]

