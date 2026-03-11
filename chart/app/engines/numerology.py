from __future__ import annotations


def calculate_mulank(dob: str) -> int:
    day = int(dob.split("-")[2])
    while day > 9:
        day = sum(int(d) for d in str(day))
    return day
