from django.core.management.base import BaseCommand
from django.db import transaction
import uuid

from app.models import (
    Category,
    Customer,
    Product,
    Invoice,
    InvoiceItem,
    Return,
    ReturnItem,
    Payment,
    CustomerBalance,
)


MODELS = [
    Category,
    Customer,
    Product,
    Invoice,
    InvoiceItem,
    Return,
    ReturnItem,
    Payment,
    CustomerBalance,
]


class Command(BaseCommand):
    help = "Populate external_id for records where it is NULL."

    def add_arguments(self, parser):
        parser.add_argument(
            "--models",
            nargs="*",
            type=str,
            help="Specific models to process (e.g., Customer Product)",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Number of rows to update per batch",
        )

    def handle(self, *args, **options):
        selected = set(m.lower() for m in (options.get("models") or []))
        batch_size = options["batch_size"]

        total_updated = 0
        for Model in MODELS:
            if selected and Model.__name__.lower() not in selected:
                continue

            qs = Model.objects.filter(external_id__isnull=True)
            count = qs.count()
            if count == 0:
                self.stdout.write(self.style.SUCCESS(f"{Model.__name__}: up-to-date (0 to update)"))
                continue

            updated_model = 0
            self.stdout.write(f"{Model.__name__}: populating {count} rows...")

            start = 0
            while start < count:
                with transaction.atomic():
                    batch = list(
                        qs.order_by("pk")[start : start + batch_size]
                    )
                    for obj in batch:
                        obj.external_id = uuid.uuid4()
                    Model.objects.bulk_update(batch, ["external_id"])
                updated = len(batch)
                updated_model += updated
                total_updated += updated
                start += batch_size
                self.stdout.write(f"  - {Model.__name__}: {updated_model}/{count}")

            self.stdout.write(self.style.SUCCESS(f"{Model.__name__}: done ({updated_model} updated)"))

        self.stdout.write(self.style.SUCCESS(f"All done. Total updated: {total_updated}"))


