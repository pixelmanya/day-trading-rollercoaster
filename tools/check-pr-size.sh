#!/usr/bin/env bash
# Fails a pull request that changes more than FAIL_AT lines and warns above WARN_AT.
# Lines are additions plus deletions between the merge base and the PR head, without
# generated files. The `large-pr` label lets a mechanical change (rename, move, bump) through.
#
# Usage: BASE_SHA=… HEAD_SHA=… IS_LARGE_PR=true|false tools/check-pr-size.sh
# Locally: BASE_SHA=origin/main HEAD_SHA=HEAD tools/check-pr-size.sh
set -euo pipefail

readonly WARN_AT=200
readonly FAIL_AT=400
readonly GENERATED=(
  ':(exclude)pnpm-lock.yaml'
  ':(exclude)src/routeTree.gen.ts'
  ':(exclude,glob)**/*.d.css.ts'
)

# Binary files report "-" for both counts; they don't add reviewable lines
numstat=$(git diff --numstat --find-renames "${BASE_SHA}...${HEAD_SHA}" -- . "${GENERATED[@]}")
total=$(awk '$1 != "-" { sum += $1 + $2 } END { print sum + 0 }' <<<"$numstat")

echo "Changed lines (added + deleted, generated files excluded): ${total}"
echo "Largest files:"
awk '$1 != "-" { print $1 + $2 "\t" $3 }' <<<"$numstat" | sort -rn | head -n 10

if (( total > FAIL_AT )); then
  if [[ "${IS_LARGE_PR:-false}" == "true" ]]; then
    echo "::warning::${total} changed lines, over the ${FAIL_AT}-line limit; allowed by the large-pr label."
    exit 0
  fi

  echo "::error::${total} changed lines; the limit is ${FAIL_AT}. Split the PR (CONTRIBUTING.md → Small pull requests), or add the large-pr label to a mechanical change and say why in the description."
  exit 1
fi

if (( total > WARN_AT )); then
  echo "::warning::${total} changed lines; aim for ${WARN_AT} or fewer so the PR can be reviewed in one sitting."
fi
