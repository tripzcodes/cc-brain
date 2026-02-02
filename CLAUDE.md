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
        └── {date}-{time}.md
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

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Claude Code                        │
│                                                      │
│  SessionStart hook ──► loader.js ──► XML output      │
│                         │                            │
│                         ├── T1: <user-profile>       │
│                         ├── T1: <preferences>        │
│                         ├── T2: <project id="...">   │
│                         └── T3: <archive hint />     │
│                                                      │
│  PreCompact hook ──► saver.js ──► atomic writes      │
│                         │                            │
│                         ├── validates input shape     │
│                         ├── enforces line limits      │
│                         ├── warns at 80% capacity     │
│                         └── safeWriteFileSync()       │
│                                                      │
│  /recall skill ──► recall.js ──► scored results      │
│                         │                            │
│                         ├── regex with safe fallback  │
│                         ├── header match scoring      │
│                         └── TTY-aware color output    │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
            ~/.claude/brain/ (persistent)
```

### Data Flow

1. **SessionStart** - `loader.js` loads T1 + T2 into XML-tagged context, auto-prunes archives >90 days
2. **PreCompact** - Agent analyzes session, calls `saver.js` with structured JSON
3. **Manual** - `/save` skill triggers saver, `/recall` searches archive
4. **Archive** - Each save creates `YYYY-MM-DD-HHMMSS.md` (one file per session, no collisions)

### Key Design Decisions

- **Atomic writes**: All file writes go through `safeWriteFileSync()` (write to temp, then rename) to prevent corruption
- **Cross-runtime**: `isMainModule()` helper works in both Node and Bun (replaces `import.meta.main`)
- **Hook preservation**: Install/uninstall detect cc-brain hooks by content matching, never clobber user's other hooks
- **XML output**: Loader wraps content in `<user-profile>`, `<preferences>`, `<project>` tags for reliable Claude parsing

## Project Structure

```
src/
  utils.js            - Shared utilities (safeWriteFileSync, isMainModule)
  loader.js           - Loads T1+T2 into XML context, auto-prunes archive
  saver.js            - Structured saver with validation, limits, atomic writes
  recall.js           - Scored archive search with safe regex and color detection
  archive.js          - Archive management (list, prune, stats)
  project-id.js       - Stable project identity (.brain-id)
  saver-prompt.md     - Instructions for saving
bin/
  cc-brain.js         - CLI entry point with fast runtime detection
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
  install.js          - Install hooks + skills to ~/.claude/
  uninstall.js        - Remove hooks + skills (--purge for full removal)
plugin.json           - Plugin manifest
```

## Install

```bash
npm install -g cc-brain    # Install globally
cc-brain install           # Set up hooks + skills

cc-brain uninstall         # Remove hooks + skills (keeps brain data)
cc-brain uninstall --purge # Remove everything
```

Skills are installed to `~/.claude/skills/` where Claude Code auto-discovers them.

## CLI Tools

```bash
# Loader
cc-brain load                  # Output brain context (XML-tagged)

# Project Identity
cc-brain project-id            # Show current project ID
cc-brain project-id --init     # Create .brain-id file
cc-brain project-id --path     # Show project brain path

# Saver
cc-brain save --help                        # Show usage
cc-brain save --dry-run --json '{...}'      # Preview changes
cc-brain save --json '{...}'                # Apply changes

# Recall (Search)
cc-brain recall "query"           # Search archive (scored results)
cc-brain recall "regex.*pattern"  # Regex search (safe fallback on invalid)
cc-brain recall "term" --context  # Show surrounding lines
cc-brain recall "term" --json     # JSON output

# Archive Management
cc-brain archive list                    # List entries
cc-brain archive stats                   # Statistics (avg size, time span)
cc-brain archive prune --keep 20         # Keep last 20
cc-brain archive prune --older-than 90d  # Delete old entries
```

## Features

- **Stable project identity**: Uses `.brain-id` file, survives directory renames
- **Structured saving**: JSON-based with input validation and dry-run preview
- **Input validation**: Shape checking, key allowlist, type enforcement per tier
- **Capacity warnings**: Warns at 80% of line limits before rejecting
- **Atomic file writes**: Temp file + rename prevents corruption on crash
- **Real search**: Regex with safe fallback, header-weighted scoring
- **Smart color output**: Detects TTY and NO_COLOR before emitting ANSI codes
- **Auto-prune**: Removes archive entries older than 90 days on session start
- **Size limits**: Enforces line limits per tier to prevent bloat
- **Hook-safe install**: Merges hooks without clobbering user's existing config
- **Cross-runtime**: Works in both Node (>=18) and Bun
