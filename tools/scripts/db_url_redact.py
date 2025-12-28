#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DB URL redaction helper.
- Removes password from userinfo and common query parameters.
"""

from __future__ import annotations

from typing import Iterable, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import re


_REDACT_KEYS = {"password", "pass", "pwd"}


def _redact_query(query: str) -> str:
    if not query:
        return ""
    items: Iterable[Tuple[str, str]] = parse_qsl(query, keep_blank_values=True)
    redacted = []
    for key, value in items:
        if key.lower() in _REDACT_KEYS:
            redacted.append((key, "***"))
        else:
            redacted.append((key, value))
    return urlencode(redacted)


def redact_database_url(url: str) -> str:
    if not url:
        return ""

    try:
        split = urlsplit(url)
        if split.scheme and split.netloc:
            username = split.username
            password = split.password
            hostname = split.hostname or ""
            port = split.port

            userinfo = ""
            if username:
                userinfo = username
                if password is not None:
                    userinfo += ":***"
                userinfo += "@"

            host = hostname
            if port:
                host = f"{host}:{port}"

            netloc = f"{userinfo}{host}"
            query = _redact_query(split.query)
            return urlunsplit((split.scheme, netloc, split.path, query, split.fragment))
    except Exception:
        pass

    # Regex fallback
    redacted = re.sub(r"://([^:/?#]+):[^@]+@", r"://\1:***@", url)
    redacted = re.sub(r"(password=)[^&]+", r"\1***", redacted, flags=re.IGNORECASE)
    return redacted
