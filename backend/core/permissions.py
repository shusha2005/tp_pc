from rest_framework import permissions

from .models import Admin


class IsAdminPrincipal(permissions.BasePermission):
    message = "Требуются права администратора клуба."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return isinstance(user, Admin) and bool(getattr(user, "is_authenticated", False))
