from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import jwt
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from rest_framework import authentication, exceptions

from .models import User


@dataclass(frozen=True)
class TokenPair:
    access: str
    refresh: str


def _now() -> int:
    return int(time.time())


def _jwt_secret() -> str:
    # Reuse Django SECRET_KEY by default
    return settings.SECRET_KEY


def _encode(payload: dict) -> str:
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def _decode(token: str) -> dict:
    return jwt.decode(
        token,
        _jwt_secret(),
        algorithms=["HS256"],
        options={"require": ["exp", "iat"]},
        issuer=settings.JWT_AUTH.get("ISSUER"),
    )


def issue_tokens(user: User) -> TokenPair:
    iat = _now()
    access_ttl = int(settings.JWT_AUTH["ACCESS_TOKEN_TTL_SECONDS"])
    refresh_ttl = int(settings.JWT_AUTH["REFRESH_TOKEN_TTL_SECONDS"])
    iss = settings.JWT_AUTH.get("ISSUER")

    access_payload = {
        "iss": iss,
        "type": "access",
        "iat": iat,
        "exp": iat + access_ttl,
        "sub": str(user.id),
        "username": user.username,
    }
    refresh_payload = {
        "iss": iss,
        "type": "refresh",
        "iat": iat,
        "exp": iat + refresh_ttl,
        "sub": str(user.id),
    }
    return TokenPair(access=_encode(access_payload), refresh=_encode(refresh_payload))


def hash_password(raw_password: str) -> str:
    # Uses Django PBKDF2 by default; stored into users.password_hash
    return make_password(raw_password)


def verify_password(raw_password: str, stored_hash: str) -> bool:
    return check_password(raw_password, stored_hash)


class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get("Authorization") or ""
        if not header:
            return None

        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise exceptions.AuthenticationFailed("Invalid Authorization header.")

        token = parts[1]
        try:
            payload = _decode(token)
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token expired.")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("Invalid token.")

        if payload.get("type") != "access":
            raise exceptions.AuthenticationFailed("Invalid token type.")

        user_id = payload.get("sub")
        if not user_id:
            raise exceptions.AuthenticationFailed("Invalid token payload.")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not found.")

        return (user, None)


def get_user_by_login(login: str) -> Optional[User]:
    # login can be email or username
    try:
        return User.objects.get(email=login)
    except User.DoesNotExist:
        pass
    try:
        return User.objects.get(username=login)
    except User.DoesNotExist:
        return None

