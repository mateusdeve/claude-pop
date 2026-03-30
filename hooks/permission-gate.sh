#!/bin/bash
# Claude Code hook: gates permission prompts through the overlay app.
# Reads JSON from stdin, POSTs to the overlay and WAITS for user decision.
# If the overlay is not running, exits with no output (Claude handles normally).

# Check if overlay is running
if ! curl -s http://127.0.0.1:31415/health --connect-timeout 0.5 >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)

# Long-poll: overlay holds this request until user responds (up to 120s)
RESPONSE=$(curl -s -X POST http://127.0.0.1:31415/permission \
  -H "Content-Type: application/json" \
  -d "$INPUT" \
  --connect-timeout 1 --max-time 120 2>/dev/null)

# Return the decision JSON to Claude Code
if [ -n "$RESPONSE" ]; then
  echo "$RESPONSE"
fi
