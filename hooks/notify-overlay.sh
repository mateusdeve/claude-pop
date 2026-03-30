#!/bin/bash
# Claude Code hook: sends notification events to the overlay app.
# Reads JSON from stdin, POSTs to the local overlay server, exits immediately.
# If the overlay is not running, silently exits.

INPUT=$(cat)
curl -s -X POST http://127.0.0.1:31415/event \
  -H "Content-Type: application/json" \
  -d "$INPUT" \
  --connect-timeout 1 --max-time 2 2>/dev/null || true
