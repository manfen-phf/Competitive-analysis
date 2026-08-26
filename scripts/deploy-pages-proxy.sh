#!/usr/bin/env bash
set -euo pipefail

pnpm exec wrangler --cwd pages-deploy pages deploy --branch main
