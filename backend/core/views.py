from decimal import Decimal
from datetime import datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .auth import issue_tokens
from .models import Booking, Club, Pc, PcPeripheral, Tariff
from .permissions import IsAdminPrincipal
from .serializers import (
    AdminLoginSerializer,
    AdminMeSerializer,
    BookingSerializer,
    ClubSerializer,
    ClubManageSerializer,
    LoginSerializer,
    MeSerializer,
    PcSerializer,
    PcManageSerializer,
    RegisterSerializer,
    TariffSerializer,
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

        order = (self.request.query_params.get("order") or "").strip()
        allowed = {"price": "price", "name": "name", "id": "id"}
        if order:
            desc = order.startswith("-")
            key = order[1:] if desc else order
            field = allowed.get(key)
            if field:
                qs = qs.order_by(f"-{field}" if desc else field, "id")

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

        storage_type = self.request.query_params.get("storage_type")
        if storage_type:
            qs = qs.filter(storage_type__iexact=storage_type)

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
                | Q(storage_type__icontains=q)
                | Q(monitor_model__icontains=q)
                | Q(pcperipheral__peripheral__model__icontains=q)
                | Q(pcperipheral__peripheral__brand__icontains=q)
            )

        qs = qs.distinct()

        order = (self.request.query_params.get("order") or "").strip()
        allowed = {"number": "number", "id": "id", "club": "club_id"}
        if order:
            desc = order.startswith("-")
            key = order[1:] if desc else order
            field = allowed.get(key)
            if field:
                qs = qs.order_by(f"-{field}" if desc else field, "id")

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
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_price_per_hour(self, pc: Pc, moment):
        local_dt = timezone.localtime(moment) if timezone.is_aware(moment) else moment
        current_time = local_dt.time()
        current_day = local_dt.weekday()

        tariffs = Tariff.objects.filter(club_id=pc.club_id).filter(
            Q(day_of_week=current_day) | Q(day_of_week__isnull=True)
        )
        tariffs = tariffs.filter(
            Q(time_from__isnull=True, time_to__isnull=True)
            | Q(time_from__lte=current_time, time_to__gt=current_time)
        )
        tariffs = tariffs.order_by("-day_of_week", "-time_from", "id")
        tariff = tariffs.first()
        return tariff.price_per_hour if tariff else pc.club.price

    def _calculate_price_by_tariff(self, pc: Pc, start, end) -> Decimal:
        if end <= start:
            return Decimal("0.00")

        total = Decimal("0")
        cursor = start
        step = timedelta(minutes=1)

        while cursor < end:
            next_cursor = min(cursor + step, end)
            minutes = Decimal(str((next_cursor - cursor).total_seconds())) / Decimal("60")
            hour_rate = Decimal(str(self._resolve_price_per_hour(pc, cursor)))
            total += hour_rate * (minutes / Decimal("60"))
            cursor = next_cursor

        return total.quantize(Decimal("0.01"))

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        save_kwargs = {}
        if user and getattr(user, "id", None) and not serializer.validated_data.get("user_id"):
            save_kwargs["user_id"] = user.id

        # Расчет цены по тарифам клуба с fallback на базовую цену клуба.
        if serializer.validated_data.get("total_price") in (None, "", 0, Decimal("0")):
            pc = Pc.objects.select_related("club").get(id=serializer.validated_data["pc_id"])
            start = serializer.validated_data["start_time"]
            end = serializer.validated_data["end_time"]
            save_kwargs["total_price"] = self._calculate_price_by_tariff(pc, start, end)

        serializer.save(**save_kwargs)

    @action(detail=False, methods=["get"], url_path="available-slots")
    def available_slots(self, request):
        pc_id_raw = request.query_params.get("pc_id")
        date_raw = request.query_params.get("date")
        if not pc_id_raw:
            raise ValidationError({"pc_id": ["Параметр pc_id обязателен."]})
        if not date_raw:
            raise ValidationError({"date": ["Параметр date обязателен (YYYY-MM-DD)."]})

        try:
            pc_id = int(pc_id_raw)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"pc_id": ["pc_id должен быть целым числом."]}) from exc

        try:
            duration_minutes = int(request.query_params.get("duration_minutes", "60"))
            step_minutes = int(request.query_params.get("step_minutes", "30"))
        except (TypeError, ValueError) as exc:
            raise ValidationError({"non_field_errors": ["duration_minutes и step_minutes должны быть целыми числами."]}) from exc
        if duration_minutes <= 0 or step_minutes <= 0:
            raise ValidationError({"non_field_errors": ["duration_minutes и step_minutes должны быть > 0."]})

        try:
            date_obj = datetime.strptime(date_raw, "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValidationError({"date": ["Некорректный формат даты. Используйте YYYY-MM-DD."]}) from exc

        pc = Pc.objects.select_related("club").filter(id=pc_id).first()
        if not pc:
            raise ValidationError({"pc_id": ["ПК не найден."]})

        tz = timezone.get_current_timezone()
        day_start = timezone.make_aware(datetime.combine(date_obj, time.min), tz)
        day_end = day_start + timedelta(days=1)
        duration = timedelta(minutes=duration_minutes)
        step = timedelta(minutes=step_minutes)

        bookings = (
            Booking.objects.filter(pc_id=pc_id, status__in=["created", "confirmed"])
            .filter(start_time__lt=day_end, end_time__gt=day_start)
            .values("start_time", "end_time")
            .order_by("start_time")
        )
        occupied = [(b["start_time"], b["end_time"]) for b in bookings]

        def is_free(start_slot, end_slot):
            for busy_start, busy_end in occupied:
                if busy_start < end_slot and busy_end > start_slot:
                    return False
            return True

        slots = []
        current = day_start
        while current + duration <= day_end:
            slot_end = current + duration
            if is_free(current, slot_end):
                slots.append(
                    {
                        "start_time": current.isoformat(),
                        "end_time": slot_end.isoformat(),
                        "estimated_price": str(self._calculate_price_by_tariff(pc, current, slot_end)),
                    }
                )
            current += step

        return Response(
            {
                "pc_id": int(pc_id),
                "date": date_obj.isoformat(),
                "duration_minutes": duration_minutes,
                "step_minutes": step_minutes,
                "slots": slots,
            }
        )


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

    @action(detail=False, methods=["post"], url_path="admin-login")
    def admin_login(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin = serializer.validated_data["admin"]
        tokens = issue_tokens(admin, subject_type="admin")
        out = TokenPairSerializer({"access": tokens.access, "refresh": tokens.refresh})
        return Response(out.data)

    @action(detail=False, methods=["get"], url_path="me", permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(MeSerializer(request.user).data)

    @action(detail=False, methods=["get"], url_path="admin-me", permission_classes=[IsAdminPrincipal])
    def admin_me(self, request):
        return Response(AdminMeSerializer(request.user).data)


class AdminClubViewSet(viewsets.ModelViewSet):
    serializer_class = ClubManageSerializer
    permission_classes = [IsAdminPrincipal]
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_queryset(self):
        return Club.objects.filter(id=self.request.user.club_id).order_by("id")


class AdminPcViewSet(viewsets.ModelViewSet):
    serializer_class = PcManageSerializer
    permission_classes = [IsAdminPrincipal]

    def get_queryset(self):
        return Pc.objects.filter(club_id=self.request.user.club_id).order_by("id")

    def perform_create(self, serializer):
        serializer.save(club_id=self.request.user.club_id)

    def perform_update(self, serializer):
        serializer.save(club_id=self.request.user.club_id)


class AdminTariffViewSet(viewsets.ModelViewSet):
    serializer_class = TariffSerializer
    permission_classes = [IsAdminPrincipal]

    def get_queryset(self):
        return Tariff.objects.filter(club_id=self.request.user.club_id).order_by("id")

    def perform_create(self, serializer):
        serializer.save(club_id=self.request.user.club_id)

    def perform_update(self, serializer):
        serializer.save(club_id=self.request.user.club_id)
