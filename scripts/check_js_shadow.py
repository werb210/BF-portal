from pathlib import Path
import subprocess
import sys

result = subprocess.run(
    ["git", "ls-files", "--others", "--exclude-standard", "src"],
    check=True,
    capture_output=True,
    text=True,
)

untracked = [Path(line.strip()) for line in result.stdout.splitlines() if line.strip()]
js_files = [path for path in untracked if path.suffix == ".js"]

if js_files:
    print("JS FILES DETECTED IN SRC")
    for file in js_files:
        print(file)
    sys.exit(1)
