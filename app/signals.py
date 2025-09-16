from django.db.models.signals import pre_save
from django.dispatch import receiver
import uuid

from .models import Category, Customer, Product, Invoice, InvoiceItem, Return, ReturnItem, Payment, CustomerBalance


def _ensure_external_id(instance):
    if getattr(instance, 'external_id', None) is None:
        instance.external_id = uuid.uuid4()


@receiver(pre_save, sender=Category)
def category_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=Customer)
def customer_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=Product)
def product_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=Invoice)
def invoice_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=InvoiceItem)
def invoiceitem_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=Return)
def return_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=ReturnItem)
def returnitem_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=Payment)
def payment_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


@receiver(pre_save, sender=CustomerBalance)
def customerbalance_pre_save(sender, instance, **kwargs):
    _ensure_external_id(instance)


