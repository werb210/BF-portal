# Portal

## Branch protection and merge policy

- Merges to `main` are expected to happen through pull requests.
- Branch protection is configured in GitHub repository settings.
- Direct pushes to `main` should be blocked by GitHub settings.

## CI policy

- CI is strict and blocking for pull requests.
- Installs are strict (`npm ci`) and failures are not ignored.
- Verification runs typecheck, build, tests, and output checks.
- Portal CI includes guard checks for known regressions.
