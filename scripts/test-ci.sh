#!/usr/bin/env bash
set -euo pipefail

# Some suites mock shared modules. Separate processes prevent one suite's mocks
# from changing the behavior of another suite.
git ls-files -z 'apps/**/*.test.ts' 'apps/**/*.test.tsx' 'packages/**/*.test.ts' 'packages/**/*.test.tsx' 'scripts/*.test.ts' |
  while IFS= read -r -d '' test_file; do
    bun test "$test_file"
  done
