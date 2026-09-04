#!/usr/bin/env python3
"""Validate the App target's iPad and Designed-for-iPad build settings."""

from pathlib import Path
import re
import sys


project_path = Path(
    sys.argv[1] if len(sys.argv) > 1 else "ios/App/App.xcodeproj/project.pbxproj"
)
project = project_path.read_text(encoding="utf-8")

list_match = re.search(
    r"/\* Build configuration list for PBXNativeTarget \"App\" \*/\s*=\s*\{"
    r".*?buildConfigurations\s*=\s*\((.*?)\);",
    project,
    re.DOTALL,
)
if not list_match:
    raise SystemExit("Unable to find the App target build configuration list")

configuration_refs = dict(
    (name, object_id)
    for object_id, name in re.findall(
        r"([A-F0-9]+)\s*/\*\s*(Debug|Release)\s*\*/", list_match.group(1)
    )
)

required = {
    "TARGETED_DEVICE_FAMILY": "2",
    "SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD": "YES",
    "SUPPORTS_MACCATALYST": "NO",
}

for configuration in ("Debug", "Release"):
    object_id = configuration_refs.get(configuration)
    if not object_id:
        raise SystemExit(f"App {configuration}: configuration reference is missing")

    block_match = re.search(
        rf"{re.escape(object_id)}\s*/\*\s*{configuration}\s*\*/\s*=\s*\{{"
        rf"(.*?)\n\s*name\s*=\s*{configuration};\s*\n\s*\}};",
        project,
        re.DOTALL,
    )
    if not block_match:
        raise SystemExit(f"App {configuration}: build configuration is missing")

    settings_match = re.search(
        r"buildSettings\s*=\s*\{(.*?)\n\s*\};", block_match.group(1), re.DOTALL
    )
    if not settings_match:
        raise SystemExit(f"App {configuration}: build settings are missing")

    settings = {
        key: value.strip().strip('"')
        for key, value in re.findall(
            r"^\s*([A-Z0-9_]+)\s*=\s*([^;]+);",
            settings_match.group(1),
            re.MULTILINE,
        )
    }
    for key, expected in required.items():
        actual = settings.get(key)
        if actual != expected:
            raise SystemExit(
                f"App {configuration}: expected {key} = {expected}, "
                f"found {actual or 'missing'}"
            )

    print(
        f"App {configuration}: "
        + ", ".join(f"{key} = {value}" for key, value in required.items())
    )
