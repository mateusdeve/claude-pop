# Claude Overlay

A floating macOS overlay for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that lets you manage permissions, answer questions, switch sessions, and send text — all from a global hotkey.

![Claude Overlay](https://img.shields.io/badge/platform-macOS-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Global hotkey** (`Cmd+J`) to toggle the overlay from anywhere
- **Permission prompts** — approve or deny tool usage without switching to the terminal
- **Question dialogs** — answer Claude's questions (multi-select, single-select, or free text)
- **Session switching** — see all active Claude Code sessions and switch between them
- **Text input** — send text directly to Claude in any session
- **Status indicator** — see if Claude is working, waiting, or idle
- **Native notifications** — get alerted when Claude needs your attention
- **Draggable** — move the overlay anywhere on screen
- **Favorites & naming** — star and rename sessions for quick access

## Requirements

- macOS (uses AppleScript for terminal interaction)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Node.js 18+

## Quick Start

```bash
# Clone the repo
git clone https://github.com/mateuspires/claude-overlay.git
cd claude-overlay

# Install dependencies
npm install

# Install Claude Code hooks (configures ~/.claude/settings.json)
npm run install-hooks

# Start the overlay
npm start
```

## How It Works

Claude Overlay runs as a frameless Electron window that stays on top of all other windows. It communicates with Claude Code through [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) — shell scripts that Claude Code calls at key moments:

1. **PreToolUse hook** (`permission-gate.sh`) — intercepts tool usage requests and shows them in the overlay for approval
2. **PreToolUse hook** (`question-gate.sh`) — intercepts `AskUserQuestion` calls and shows them as dialogs
3. **Notification hook** (`notify-overlay.sh`) — forwards notifications to the overlay

The overlay runs an HTTP server on `localhost:31415` that these hooks communicate with.

## Usage

| Action | How |
|---|---|
| Toggle overlay | `Cmd+J` |
| Send text to Claude | Type in the input field and press `Enter` |
| Switch session | Click the session pill, then select a session |
| Rename session | Double-click the session pill |
| Favorite session | Click the star icon |
| Move overlay | Drag the bar |
| Approve permission | Click "Allow" on the permission bar |
| Deny permission | Click "Deny" on the permission bar |

## Development

```bash
# Watch mode (rebuild on changes)
npm run dev:main    # Watch TypeScript (main process)
npm run dev:renderer # Watch Webpack (renderer)

# Run with DevTools
DEBUG_OVERLAY=1 npm start
```

## Architecture

```
src/
  main/           # Electron main process
    index.ts      # Window management, IPC, shortcuts
    server.ts     # Express HTTP server (port 31415)
    sessions.ts   # Monitors ~/.claude/sessions/ for active sessions
    responder.ts  # Sends text to terminals via AppleScript
    store.ts      # Persistent storage for session metadata
    tray.ts       # System tray icon
  renderer/       # React UI
    App.tsx        # Main component
    styles.css     # Styles
  preload/        # Electron context bridge
  shared/         # Shared TypeScript types
  scripts/        # Setup scripts
hooks/            # Shell scripts for Claude Code hooks
```

## License

MIT
