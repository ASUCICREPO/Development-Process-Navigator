"""DynamoDB client wrapper and a base repository.

Kept thin and dependency-light. In unit tests, an in-memory repository implementing the same
interface is used so business logic can be tested without AWS.
"""
from __future__ import annotations

import os
from typing import Any, Optional


def table_name(logical: str) -> str:
    """Resolve a physical table name from environment (set by CDK)."""
    return os.environ.get(f"TABLE_{logical.upper()}", logical)


class Repository:
    """Minimal repository abstraction. Concrete impls use boto3; tests use in-memory."""

    def get(self, key: dict[str, Any]) -> Optional[dict[str, Any]]:
        raise NotImplementedError

    def put(self, item: dict[str, Any]) -> None:
        raise NotImplementedError

    def query(self, **kwargs: Any) -> list[dict[str, Any]]:
        raise NotImplementedError

    def conditional_update(self, key: dict[str, Any], updates: dict[str, Any],
                           condition: str) -> None:
        """Update only if `condition` holds (used for resubmit-once/lock)."""
        raise NotImplementedError


class InMemoryRepository(Repository):
    """In-memory repository for tests and local development."""

    def __init__(self) -> None:
        self._store: dict[tuple, dict[str, Any]] = {}

    @staticmethod
    def _key_tuple(key: dict[str, Any]) -> tuple:
        return tuple(sorted(key.items()))

    def get(self, key: dict[str, Any]) -> Optional[dict[str, Any]]:
        return self._store.get(self._key_tuple(key))

    def put(self, item: dict[str, Any]) -> None:
        # Convention: items carry their own key fields; caller passes full item.
        self._store[self._key_tuple(self._extract_key(item))] = dict(item)

    def query(self, **kwargs: Any) -> list[dict[str, Any]]:
        predicate = kwargs.get("predicate")
        items = list(self._store.values())
        if predicate:
            items = [i for i in items if predicate(i)]
        return items

    def _extract_key(self, item: dict[str, Any]) -> dict[str, Any]:
        # Tests set "_key" listing the key attribute names.
        key_attrs = item.get("_key", ["id"])
        return {k: item[k] for k in key_attrs}
