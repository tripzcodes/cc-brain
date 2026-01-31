# cc-brain

Persistent memory system for Claude Code. Remembers context across sessions.

## Memory Tiers

```
~/.claude/brain/
│
├── user.md                    T1: Always loaded (40 lines max)
├── preferences.md             T1: Always loaded (40 lines max)
│
└── projects/{id}/
    ├── context.md             T2: Current project (120 lines max)
    └── archive/               T3: On-demand (unlimited)
        └── {date}.md
```

| Tier | What | Size | When Loaded |
|------|------|------|-------------|
| T1 | User identity + preferences | ~80 lines | Always |
| T2 | Project context | ~120 lines | Current project |
| T3 | Archive/history | Unlimited | On-demand only |

## Skills

| Skill | Description |
|-------|-------------|
| `/save` | Save session context to brain (structured) |
| `/recall <query>` | Search T3 archive for past context |
| `/brain` | View current brain state and stats |

## Project Structure

```
src/
  loader.js           - Loads T1+T2 into context, auto-prunes archive
  saver.js            - Structured saver with validation and dry-run
  recall.js           - Grep-based archive search
  archive.js          - Archive management (list, prune, stats)
  project-id.js       - Stable project identity (.brain-id)
  saver-prompt.md     - Instructions for saving
hooks/
  hooks.json          - Hook configuration (SessionStart, PreCompact)
skills/
  save.md             - /save skill
  recall.md           - /recall skill
  brain.md            - /brain skill
brain/
  user.md             - Template: user profile
  preferences.md      - Template: preferences
  projects/           - Template: per-project structure
scripts/
  install.js          - Install hooks to ~/.claude/
  uninstall.js        - Remove hooks (--purge for full removal)
plugin.json           - Plugin manifest
```

## How It Works

1. **SessionStart** → loader.js injects T1 + T2, auto-prunes old archives
2. **PreCompact** → agent saves using structured saver.js
3. **Manual** → `/save` to capture context anytime
4. **Search** → `/recall` greps archive with real search
5. Brain persists in ~/.claude/brain/, survives sessions

## Install

```bash
bun scripts/install.js    # Install hooks
bun scripts/uninstall.js  # Remove hooks (keeps brain data)
bun scripts/uninstall.js --purge  # Remove everything
```

## CLI Tools

```bash
# Loader
bun src/loader.js              # Output brain context

# Project Identity
bun src/project-id.js          # Show current project ID
bun src/project-id.js --init   # Create .brain-id file
bun src/project-id.js --path   # Show project brain path

# Saver
bun src/saver.js --help                        # Show usage
bun src/saver.js --dry-run --json '{...}'      # Preview changes
bun src/saver.js --json '{...}'                # Apply changes

# Recall (Search)
bun src/recall.js "query"           # Search archive
bun src/recall.js "regex.*pattern"  # Regex search
bun src/recall.js "term" --context  # Show surrounding lines

# Archive Management
bun src/archive.js list                    # List entries
bun src/archive.js stats                   # Show statistics
bun src/archive.js prune --keep 20         # Keep last 20
bun src/archive.js prune --older-than 90d  # Delete old entries
```

## Features

- **Stable project identity**: Uses `.brain-id` file, survives directory renames
- **Structured saving**: JSON-based with validation and dry-run preview
- **Real search**: Grep-based archive search with regex support
- **Auto-prune**: Removes archive entries older than 90 days on session start
- **Size limits**: Enforces line limits per tier to prevent bloat
