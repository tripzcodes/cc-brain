# cc-brain

Persistent memory for [Claude Code](https://github.com/anthropics/claude-code). Remembers context across sessions.

## What It Does

Claude Code sessions are ephemeral - when context fills up or you start a new session, everything is forgotten. cc-brain fixes this by:

- **Loading** your profile and project context on every session start
- **Saving** important learnings before context compaction
- **Searching** past sessions for decisions and context

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/cc-brain.git
cd cc-brain

# Install hooks to Claude Code
bun scripts/install.js
```

That's it. Start a new Claude Code session and your brain will be loaded automatically.

## Memory Tiers

```
~/.claude/brain/
├── user.md              # T1: Your profile (always loaded)
├── preferences.md       # T1: Code preferences (always loaded)
└── projects/{id}/
    ├── context.md       # T2: Current project state
    └── archive/         # T3: Session history
        └── 2025-01-31.md
```

| Tier | What | Limit | Loaded |
|------|------|-------|--------|
| T1 | User identity & preferences | 80 lines | Always |
| T2 | Project context | 120 lines | Current project |
| T3 | Archive | Unlimited | On-demand |

## Skills

| Command | Description |
|---------|-------------|
| `/save` | Save session context to brain |
| `/recall <query>` | Search archive for past context |
| `/brain` | View current brain state |

## CLI Tools

```bash
# Project Identity
bun src/project-id.js --init     # Create stable .brain-id

# Archive Search
bun src/recall.js "query"        # Search archive
bun src/recall.js "regex.*"      # Regex search

# Archive Management
bun src/archive.js list          # List entries
bun src/archive.js stats         # Show statistics
bun src/archive.js prune --keep 20  # Keep last 20

# Structured Saving
bun src/saver.js --dry-run --json '{"t2": {"focus": "testing"}}'
bun src/saver.js --json '{"t2": {"focus": "testing"}}'
```

## How It Works

1. **SessionStart hook** runs `loader.js`:
   - Loads T1 (user profile + preferences)
   - Loads T2 (current project context)
   - Auto-prunes archives older than 90 days
   - Outputs everything wrapped in `<brain>` tags

2. **PreCompact hook** triggers agent to save:
   - Analyzes session for important learnings
   - Saves to appropriate tier using structured saver
   - Creates archive entry if significant work done

3. **Manual control** via skills:
   - `/save` - capture context anytime
   - `/recall` - search past sessions
   - `/brain` - see what's loaded

## Project Identity

By default, projects are identified by directory name. For stable identity that survives renames:

```bash
bun src/project-id.js --init
```

This creates a `.brain-id` file with a UUID. Commit it to your repo.

## Install / Uninstall

```bash
bun scripts/install.js           # Install hooks
bun scripts/uninstall.js         # Remove hooks (keeps data)
bun scripts/uninstall.js --purge # Remove everything
```

## Requirements

- [Bun](https://bun.sh) runtime
- [Claude Code](https://github.com/anthropics/claude-code) CLI

## License

MIT
