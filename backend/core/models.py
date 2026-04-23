from django.db import models


class User(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.TextField(unique=True)
    password_hash = models.TextField()
    username = models.TextField(unique=True)
    phone = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "users"
        managed = False

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False


class Club(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.TextField()
    address = models.TextField()
    phone = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    photo_url = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "clubs"
        managed = False


class ClubPhoto(models.Model):
    id = models.BigAutoField(primary_key=True)
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="photos")
    url = models.TextField()

    class Meta:
        db_table = "club_photos"
        managed = False


class Admin(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.TextField(unique=True)
    password_hash = models.TextField()
    username = models.TextField(unique=True)
    club = models.ForeignKey(Club, on_delete=models.SET_NULL, blank=True, null=True)

    class Meta:
        db_table = "admins"
        managed = False

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False


class Pc(models.Model):
    id = models.BigAutoField(primary_key=True)
    number = models.IntegerField()
    processor = models.TextField(blank=True, null=True)
    gpu = models.TextField(blank=True, null=True)
    ram = models.TextField(blank=True, null=True)
    storage_type = models.TextField(blank=True, null=True)
    monitor_model = models.TextField(blank=True, null=True)
    status = models.TextField()
    club = models.ForeignKey(Club, on_delete=models.CASCADE)

    class Meta:
        db_table = "pcs"
        managed = False
        unique_together = (("club", "number"),)


class Peripheral(models.Model):
    id = models.BigAutoField(primary_key=True)
    type = models.TextField()
    model = models.TextField(blank=True, null=True)
    brand = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "peripherals"
        managed = False


class PcPeripheral(models.Model):
    id = models.BigAutoField(primary_key=True)
    quantity = models.IntegerField()
    pc = models.ForeignKey(Pc, on_delete=models.CASCADE)
    peripheral = models.ForeignKey(Peripheral, on_delete=models.CASCADE)

    class Meta:
        db_table = "pc_peripherals"
        managed = False
        unique_together = (("pc", "peripheral"),)


class Tariff(models.Model):
    id = models.BigAutoField(primary_key=True)
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    day_of_week = models.SmallIntegerField(blank=True, null=True)
    time_from = models.TimeField(blank=True, null=True)
    time_to = models.TimeField(blank=True, null=True)
    price_per_hour = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "tariffs"
        managed = False


class Booking(models.Model):
    id = models.BigAutoField(primary_key=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.TextField(default="created")
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pc = models.ForeignKey(Pc, on_delete=models.CASCADE)

    class Meta:
        db_table = "bookings"
        managed = False
