# cc-brain

Persistent memory system for Claude Code. Remembers context across sessions.

## Memory Tiers

```
~/.claude/brain/
│
├── user.md                    T1: Always loaded (40 lines max)
├── preferences.md             T1: Always loaded (40 lines max)
│
└── projects/{name}/
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
| `/save` | Manually save session context to brain |
| `/recall <query>` | Search T3 archive for past context |
| `/brain` | View current brain state |

## Project Structure

```
src/
  loader.js           - Loads T1+T2 into context on session start
  saver-prompt.md     - Instructions for saving before compaction
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
plugin.json           - Plugin manifest
```

## How It Works

1. **SessionStart** → loader.js injects T1 + T2 into context (~200 lines)
2. **PreCompact** → agent saves important bits before context dies
3. **Manual** → `/save` to capture context anytime
4. **Search** → `/recall` to query archive
5. Brain persists in ~/.claude/brain/, survives sessions

## Install

```bash
node scripts/install.js  # Install hooks to ~/.claude/settings.json
```

Or add as plugin:
```bash
claude plugins add /path/to/cc-brain
```

## Dev Commands

```bash
node src/loader.js       # Test loader output
node scripts/install.js  # Install hooks
```
