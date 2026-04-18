from rest_framework import viewsets

from .models import Booking, Club, Pc
from .serializers import BookingSerializer, ClubSerializer, PcSerializer


class ClubViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Club.objects.all().order_by("id")
    serializer_class = ClubSerializer


class PcViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PcSerializer

    def get_queryset(self):
        qs = Pc.objects.select_related("club").all().order_by("id")

        club_id = self.request.query_params.get("club_id")
        if club_id:
            qs = qs.filter(club_id=club_id)

        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)

        gpu = self.request.query_params.get("gpu")
        if gpu:
            qs = qs.filter(gpu__icontains=gpu)

        processor = self.request.query_params.get("processor")
        if processor:
            qs = qs.filter(processor__icontains=processor)

        ram = self.request.query_params.get("ram")
        if ram:
            qs = qs.filter(ram__icontains=ram)

        return qs


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by("-created_at")
    serializer_class = BookingSerializer

from django.shortcuts import render

# Create your views here.
