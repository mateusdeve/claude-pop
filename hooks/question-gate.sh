#!/bin/bash
# Claude Code hook: gates AskUserQuestion through the overlay app.
# Only activates for AskUserQuestion tool - other tools pass through.
# Reads JSON from stdin, checks if it's AskUserQuestion, POSTs to overlay and WAITS.

INPUT=$(cat)

# Check if this is AskUserQuestion
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('toolName',''))" 2>/dev/null)

if [ "$TOOL_NAME" != "AskUserQuestion" ]; then
  # Not a question - let it pass, just notify
  curl -s -X POST http://127.0.0.1:31415/event \
    -H "Content-Type: application/json" \
    -d "$INPUT" \
    --connect-timeout 1 --max-time 2 2>/dev/null || true
  exit 0
fi

# Check if overlay is running
if ! curl -s http://127.0.0.1:31415/health --connect-timeout 0.5 >/dev/null 2>&1; then
  exit 0
fi

# Long-poll: overlay holds this request until user responds
RESPONSE=$(curl -s -X POST http://127.0.0.1:31415/question \
  -H "Content-Type: application/json" \
  -d "$INPUT" \
  --connect-timeout 1 --max-time 120 2>/dev/null)

if [ -n "$RESPONSE" ]; then
  echo "$RESPONSE"
fi
