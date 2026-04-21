from django.db import IntegrityError, transaction
from rest_framework import serializers

from .auth import get_admin_by_login, get_user_by_login, hash_password, verify_password
from .models import Booking, Club, Pc, PcPeripheral, Peripheral, Tariff, User


class ClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = ["id", "name", "address", "phone", "description", "price"]


class PeripheralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Peripheral
        fields = ["id", "type", "model", "brand", "description"]


class PcPeripheralSerializer(serializers.ModelSerializer):
    peripheral = PeripheralSerializer(read_only=True)

    class Meta:
        model = PcPeripheral
        fields = ["id", "quantity", "peripheral"]


class PcSerializer(serializers.ModelSerializer):
    club_id = serializers.IntegerField(source="club.id", read_only=True)
    peripherals = serializers.SerializerMethodField()

    class Meta:
        model = Pc
        fields = [
            "id",
            "club_id",
            "number",
            "processor",
            "gpu",
            "ram",
            "monitor_model",
            "status",
            "peripherals",
        ]

    def get_peripherals(self, obj: Pc):
        qs = PcPeripheral.objects.filter(pc=obj).select_related("peripheral").order_by("id")
        return PcPeripheralSerializer(qs, many=True).data


class BookingSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(required=False)
    pc_id = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    status = serializers.CharField(required=False)

    class Meta:
        model = Booking
        fields = ["id", "start_time", "end_time", "total_price", "status", "created_at", "user_id", "pc_id"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        user_id = validated_data.pop("user_id", None)
        pc_id = validated_data.pop("pc_id")
        if user_id is not None:
            validated_data["user_id"] = user_id
        validated_data["pc_id"] = pc_id
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            msg = str(e).lower()
            if "bookings_no_overlap_per_pc" in msg or "exclude" in msg:
                raise serializers.ValidationError({"non_field_errors": ["Этот ПК уже забронирован на выбранное время."]})
            raise


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField()
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=6, write_only=True)

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create(
                email=validated_data["email"],
                username=validated_data["username"],
                phone=validated_data.get("phone") or None,
                password_hash=hash_password(validated_data["password"]),
            )
        return user


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = get_user_by_login(attrs["login"])
        if not user or not verify_password(attrs["password"], user.password_hash):
            raise serializers.ValidationError({"non_field_errors": ["Неверный логин или пароль."]})
        attrs["user"] = user
        return attrs


class AdminLoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        admin = get_admin_by_login(attrs["login"])
        if not admin or not verify_password(attrs["password"], admin.password_hash):
            raise serializers.ValidationError({"non_field_errors": ["Неверный логин или пароль."]})
        attrs["admin"] = admin
        return attrs


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "phone"]


class AdminMeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    username = serializers.CharField(read_only=True)
    club_id = serializers.IntegerField(read_only=True)

    def to_representation(self, instance):
        return {
            "id": instance.id,
            "email": instance.email,
            "username": instance.username,
            "club_id": instance.club_id,
        }


class ClubManageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = ["id", "name", "address", "phone", "description", "price"]
        read_only_fields = ["id"]


class PcManageSerializer(serializers.ModelSerializer):
    club_id = serializers.IntegerField(required=False)

    class Meta:
        model = Pc
        fields = ["id", "club_id", "number", "processor", "gpu", "ram", "monitor_model", "status"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        club_id = validated_data.pop("club_id", None)
        if club_id is not None:
            validated_data["club_id"] = club_id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        club_id = validated_data.pop("club_id", None)
        if club_id is not None:
            validated_data["club_id"] = club_id
        return super().update(instance, validated_data)


class TariffSerializer(serializers.ModelSerializer):
    club_id = serializers.IntegerField(required=False)

    class Meta:
        model = Tariff
        fields = ["id", "club_id", "day_of_week", "time_from", "time_to", "price_per_hour"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        club_id = validated_data.pop("club_id", None)
        if club_id is not None:
            validated_data["club_id"] = club_id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        club_id = validated_data.pop("club_id", None)
        if club_id is not None:
            validated_data["club_id"] = club_id
        return super().update(instance, validated_data)

