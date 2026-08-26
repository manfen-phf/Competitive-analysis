#!/usr/bin/env bash
set -euo pipefail

pnpm exec wrangler pages deploy \
  --branch main \
  --config wrangler.pages.jsonc
