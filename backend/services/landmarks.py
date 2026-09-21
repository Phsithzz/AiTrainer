from dataclasses import dataclass
from math import isfinite
from typing import Any, Iterable


EXPECTED_LANDMARK_COUNT = 33


@dataclass(frozen=True, slots=True)
class ClientLandmark:
    x: float
    y: float
    z: float
    visibility: float


@dataclass(frozen=True, slots=True)
class ClientLandmarkList:
    """MediaPipe-compatible landmark container backed by client JSON data."""

    landmark: tuple[ClientLandmark, ...]


def _value(item: Any, name: str) -> Any:
    if isinstance(item, dict):
        return item[name]
    return getattr(item, name)


def coerce_landmarks(items: Iterable[Any]) -> ClientLandmarkList:
    raw_items = list(items)
    if len(raw_items) != EXPECTED_LANDMARK_COUNT:
        raise ValueError(
            f"Expected {EXPECTED_LANDMARK_COUNT} pose landmarks, got {len(raw_items)}"
        )

    landmarks = []
    for index, item in enumerate(raw_items):
        try:
            values = tuple(
                float(_value(item, field))
                for field in ("x", "y", "z", "visibility")
            )
        except (AttributeError, KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid pose landmark at index {index}") from exc

        if not all(isfinite(value) for value in values):
            raise ValueError(f"Non-finite pose landmark at index {index}")

        landmarks.append(ClientLandmark(*values))

    return ClientLandmarkList(tuple(landmarks))


def serialize_landmarks(landmarks: ClientLandmarkList) -> list[dict[str, float]]:
    return [
        {
            "x": landmark.x,
            "y": landmark.y,
            "z": landmark.z,
            "visibility": landmark.visibility,
        }
        for landmark in landmarks.landmark
    ]
