from rest_framework import permissions

from .models import Admin


class IsAdminPrincipal(permissions.BasePermission):
    """
    Custom permission to only allow access to admin users.
    """

    def has_permission(self, request, view):
        return isinstance(request.user, Admin)