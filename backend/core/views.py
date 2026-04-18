from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .auth import issue_tokens
from .models import Booking, Club, Pc
from .serializers import (
    BookingSerializer,
    ClubSerializer,
    LoginSerializer,
    MeSerializer,
    PcSerializer,
    RegisterSerializer,
    TokenPairSerializer,
)


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

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        if user and getattr(user, "id", None) and not serializer.validated_data.get("user_id"):
            serializer.save(user_id=user.id)
            return
        serializer.save()


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["post"], url_path="register")
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = issue_tokens(user)
        out = TokenPairSerializer({"access": tokens.access, "refresh": tokens.refresh})
        return Response(out.data, status=201)

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = issue_tokens(user)
        out = TokenPairSerializer({"access": tokens.access, "refresh": tokens.refresh})
        return Response(out.data)

    @action(detail=False, methods=["get"], url_path="me", permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(MeSerializer(request.user).data)
