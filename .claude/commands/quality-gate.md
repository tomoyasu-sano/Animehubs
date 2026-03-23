---
description: Run formatter, linter, and type checks. Supports --fix for auto-correction and --strict for zero-warning policy.
---

# Quality Gate Command

Run the quality pipeline on demand for a file or project scope.

## Usage

`/quality-gate [path|.] [--fix] [--strict]`

- default target: current directory (`.`)
- `--fix`: allow auto-format/fix where configured
- `--strict`: fail on warnings where supported

## Pipeline

1. Detect language/tooling for target.
2. Run formatter checks.
3. Run lint/type checks when available.
4. Produce a concise remediation list.

## Output

```
QUALITY GATE: [PASS/FAIL]

Formatter: [OK / X issues found / X issues fixed]
Lint:      [OK / X errors, Y warnings]
Types:     [OK / X errors]

Issues requiring manual fix:
- [file:line] description (if any)
```

## Notes

This command mirrors hook behavior but is operator-invoked.

## Arguments

$ARGUMENTS:
- `[path|.]` optional target path
- `--fix` optional
- `--strict` optional
