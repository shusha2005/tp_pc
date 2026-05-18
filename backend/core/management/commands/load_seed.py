import os
import shutil
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Загрузить демо-данные из db/02_seed.sql (перезаписывает клубы, ПК, брони и т.д.)"

    def handle(self, *args, **options):
        seed_path = Path(__file__).resolve().parents[4] / "db" / "02_seed.sql"
        if not seed_path.exists():
            self.stderr.write(self.style.ERROR(f"Файл не найден: {seed_path}"))
            return

        psql = shutil.which("psql")
        if not psql:
            self.stderr.write(
                self.style.ERROR(
                    "psql не найден в PATH. Запустите из корня проекта: .\\db\\apply_seed.ps1"
                )
            )
            return

        db = settings.DATABASES["default"]
        env = os.environ.copy()
        env["PGPASSWORD"] = str(db.get("PASSWORD", ""))

        subprocess.run(
            [
                psql,
                "-h",
                str(db.get("HOST", "localhost")),
                "-p",
                str(db.get("PORT", "5432")),
                "-U",
                str(db.get("USER", "postgres")),
                "-d",
                str(db.get("NAME", "pc_club")),
                "-v",
                "ON_ERROR_STOP=1",
                "-f",
                str(seed_path),
            ],
            env=env,
            check=True,
        )
        self.stdout.write(self.style.SUCCESS(f"Seed применён: {seed_path}"))
