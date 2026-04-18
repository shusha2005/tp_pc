from decimal import Decimal

from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .auth import issue_tokens
from .models import Booking, Club, Pc, PcPeripheral
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
    serializer_class = ClubSerializer

    def get_queryset(self):
        qs = Club.objects.all().order_by("id")

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(address__icontains=q)
                | Q(description__icontains=q)
            )

        price_lte = self.request.query_params.get("price_lte")
        if price_lte:
            qs = qs.filter(price__lte=price_lte)

        return qs


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

        monitor = self.request.query_params.get("monitor")
        if monitor:
            qs = qs.filter(monitor_model__icontains=monitor)

        # Peripheral filters (via pc_peripherals -> peripherals)
        peripheral_type = self.request.query_params.get("peripheral_type")
        if peripheral_type:
            qs = qs.filter(pcperipheral__peripheral__type__iexact=peripheral_type)

        peripheral_model = self.request.query_params.get("peripheral_model")
        if peripheral_model:
            qs = qs.filter(pcperipheral__peripheral__model__icontains=peripheral_model)

        peripheral_brand = self.request.query_params.get("peripheral_brand")
        if peripheral_brand:
            qs = qs.filter(pcperipheral__peripheral__brand__icontains=peripheral_brand)

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(gpu__icontains=q)
                | Q(processor__icontains=q)
                | Q(ram__icontains=q)
                | Q(monitor_model__icontains=q)
                | Q(pcperipheral__peripheral__model__icontains=q)
                | Q(pcperipheral__peripheral__brand__icontains=q)
            )

        qs = qs.distinct()
        return qs

    @action(detail=False, methods=["get"], url_path="filters")
    def filters(self, request):
        """
        Minimal helper endpoint for frontend filter dropdowns.
        """
        base = self.get_queryset()
        pc_ids = list(base.values_list("id", flat=True))
        per_qs = (
            PcPeripheral.objects.filter(pc_id__in=pc_ids)
            .select_related("peripheral")
            .values("peripheral__type", "peripheral__brand", "peripheral__model")
            .distinct()
        )
        types = sorted({row["peripheral__type"] for row in per_qs if row["peripheral__type"]})
        brands = sorted({row["peripheral__brand"] for row in per_qs if row["peripheral__brand"]})
        models = sorted({row["peripheral__model"] for row in per_qs if row["peripheral__model"]})
        return Response(
            {
                "peripheral_types": types,
                "peripheral_brands": brands,
                "peripheral_models": models,
            }
        )


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by("-created_at")
    serializer_class = BookingSerializer

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        save_kwargs = {}
        if user and getattr(user, "id", None) and not serializer.validated_data.get("user_id"):
            save_kwargs["user_id"] = user.id

        # максимально простой расчет цены, если клиент не прислал total_price:
        # club.price * часы
        if serializer.validated_data.get("total_price") in (None, "", 0, Decimal("0")):
            pc = Pc.objects.select_related("club").get(id=serializer.validated_data["pc_id"])
            start = serializer.validated_data["start_time"]
            end = serializer.validated_data["end_time"]
            hours = Decimal(str((end - start).total_seconds())) / Decimal("3600")
            if hours < 0:
                hours = Decimal("0")
            save_kwargs["total_price"] = (pc.club.price * hours).quantize(Decimal("0.01"))

        serializer.save(**save_kwargs)


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
