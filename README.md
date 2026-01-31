# cc-brain

Persistent memory for [Claude Code](https://github.com/anthropics/claude-code). Remembers context across sessions.

## What It Does

Claude Code sessions are ephemeral - when context fills up or you start a new session, everything is forgotten. cc-brain fixes this by:

- **Loading** your profile and project context on every session start
- **Saving** important learnings before context compaction
- **Searching** past sessions for decisions and context

## Installation

Choose your preferred method:

### Option 1: npm (recommended)

```bash
npm install -g cc-brain
cc-brain install
```

### Option 2: npx/bunx (no install)

```bash
npx cc-brain install
# or
bunx cc-brain install
```

### Option 3: Claude Plugin

```bash
claude plugins add cc-brain
```

### Option 4: Git Clone

```bash
git clone https://github.com/tripzero/cc-brain.git
cd cc-brain
node scripts/install.js
```

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

## CLI

```bash
cc-brain install          # Install hooks
cc-brain uninstall        # Remove hooks
cc-brain uninstall --purge # Remove everything

cc-brain recall "query"   # Search archive
cc-brain archive list     # List archive entries
cc-brain archive stats    # Show statistics
cc-brain archive prune --keep 20  # Keep last 20

cc-brain project-id --init  # Create stable .brain-id
cc-brain save --dry-run --json '{"t2": {"focus": "testing"}}'
```

## How It Works

1. **SessionStart hook** runs on every session:
   - Loads T1 (user profile + preferences)
   - Loads T2 (current project context)
   - Auto-prunes archives older than 90 days

2. **PreCompact hook** triggers before context dies:
   - Analyzes session for important learnings
   - Saves to appropriate tier using structured format

3. **Skills** for manual control:
   - `/save` - capture context anytime
   - `/recall` - search past sessions
   - `/brain` - see what's loaded

## Project Identity

By default, projects are identified by directory name. For stable identity that survives renames:

```bash
cc-brain project-id --init
```

This creates a `.brain-id` file with a UUID. Commit it to your repo.

## Uninstall

```bash
cc-brain uninstall          # Remove hooks, keep brain data
cc-brain uninstall --purge  # Remove everything
```

Or if installed via npm:

```bash
npm uninstall -g cc-brain
```

## Requirements

- Node.js >= 18 or [Bun](https://bun.sh)
- [Claude Code](https://github.com/anthropics/claude-code) CLI

## License

MIT
