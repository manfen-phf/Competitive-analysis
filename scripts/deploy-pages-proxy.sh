#!/usr/bin/env bash
set -euo pipefail

pnpm exec wrangler pages deploy pages-public \
  --project-name gx-food-delivery-competition-web \
  --branch main \
  --functions cloudflare-pages/functions \
  --config wrangler.pages.jsonc
