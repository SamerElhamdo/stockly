from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsCompanyOwner(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or getattr(user, 'account_type', None) == 'company_owner'))


class IsCompanyStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or getattr(user, 'account_type', None) in ['company_owner', 'company_staff']))


class ReadOnlyOrOwner(IsCompanyOwner):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return IsCompanyStaff().has_permission(request, view)
        return super().has_permission(request, view)


