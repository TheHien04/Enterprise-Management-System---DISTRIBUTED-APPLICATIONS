import json
import os
from pathlib import Path
from typing import Any


def get_config_dir() -> Path:
    env_dir = os.getenv("CONFIG_DIR")
    if env_dir:
        return Path(env_dir)
    # Local dev: repo root config/
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "config"
        if candidate.is_dir():
            return candidate
    return Path("/config")


def load_json_config(filename: str) -> Any:
    path = get_config_dir() / filename
    if not path.exists():
        raise FileNotFoundError(f"Config not found: {path}")
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)
