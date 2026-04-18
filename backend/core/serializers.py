from django.db import IntegrityError
from rest_framework import serializers

from .models import Booking, Club, Pc, PcPeripheral, Peripheral


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
    class Meta:
        model = Booking
        fields = ["id", "start_time", "end_time", "total_price", "status", "created_at", "user_id", "pc_id"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            msg = str(e).lower()
            if "bookings_no_overlap_per_pc" in msg or "exclude" in msg:
                raise serializers.ValidationError({"non_field_errors": ["Этот ПК уже забронирован на выбранное время."]})
            raise

