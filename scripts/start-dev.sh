#!/bin/bash
# trinity: package=metronome
# trinity: health=/metronome/
set -e
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
exec pnpm exec vite --host 127.0.0.1 --port "${PORT:-5173}"
