<p align="center">
  <h1 align="center">cc-brain</h1>
  <p align="center">
    <strong>Persistent memory for Claude Code</strong><br>
    <em>Remember context across sessions</em>
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cc-brain"><img src="https://img.shields.io/npm/v/cc-brain?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/cc-brain"><img src="https://img.shields.io/npm/dm/cc-brain?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/tripzcodes/cc-brain/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/cc-brain?style=flat-square" alt="license"></a>
  <a href="https://github.com/tripzcodes/cc-brain"><img src="https://img.shields.io/github/stars/tripzcodes/cc-brain?style=flat-square" alt="github stars"></a>
</p>

<p align="center">
  <a href="#installation">Installation</a> -
  <a href="#how-it-works">How It Works</a> -
  <a href="#architecture">Architecture</a> -
  <a href="#commands">Commands</a> -
  <a href="#cli">CLI</a>
</p>

---

## The Problem

Claude Code sessions are **ephemeral**. When context fills up or you start a new session, everything is forgotten. Your preferences, project decisions, debugging history -- gone.

## The Solution

cc-brain creates a persistent memory layer that:

- **Loads** your profile and project context on every session
- **Saves** important learnings before context compaction
- **Searches** past sessions for decisions and context

---

## Installation

### npm (recommended)
```bash
npm install -g cc-brain
cc-brain install
```

### npx (one-liner)
```bash
npx cc-brain install
```

### bun
```bash
bun install -g cc-brain
cc-brain install
```

### GitHub Packages
```bash
npm install -g @tripzcodes/cc-brain --registry=https://npm.pkg.github.com
cc-brain install
```

### Upgrade
```bash
npm install -g cc-brain@latest
cc-brain install
```

---

## How It Works

```
~/.claude/brain/
├── user.md              # Your profile (always loaded)
├── preferences.md       # Code preferences (always loaded)
└── projects/{id}/
    ├── context.md       # Current project state
    └── archive/         # Session history
        └── 2025-01-31-143052.md
```

### Memory Tiers

| Tier | Content | Limit | Loaded |
|:----:|---------|:-----:|:------:|
| **T1** | User identity & preferences | 80 lines | Always |
| **T2** | Project context | 120 lines | Current project |
| **T3** | Archive history | Unlimited | On-demand |

### Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Session Start  │────>│  Brain Loaded   │────>│   You Work...   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  Next Session   │<────│  Brain Saved    │<─────────────┘
└─────────────────┘     └─────────────────┘
                         (before compaction)
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Claude Code                        │
│                                                      │
│  SessionStart hook ──> loader.js ──> XML output      │
│                         │                            │
│                         ├── T1: <user-profile>       │
│                         ├── T1: <preferences>        │
│                         ├── T2: <project id="...">   │
│                         └── T3: <archive hint />     │
│                                                      │
│  PreCompact hook ──> saver.js ──> atomic writes      │
│                         │                            │
│                         ├── validates input shape     │
│                         ├── enforces line limits      │
│                         ├── warns at 80% capacity     │
│                         └── safeWriteFileSync()       │
│                                                      │
│  /recall skill ──> recall.js ──> scored results      │
│                         │                            │
│                         ├── regex with safe fallback  │
│                         ├── header match scoring      │
│                         └── TTY-aware color output    │
└──────────────────────────────────────────────────────┘
                          │
                          v
            ~/.claude/brain/ (persistent)
```

### Data Flow

1. **SessionStart** - `loader.js` loads T1 + T2 into XML-tagged sections, auto-prunes archives older than 90 days
2. **PreCompact** - Agent analyzes session, calls `saver.js` with structured JSON payload
3. **Manual** - `/save` skill triggers the saver, `/recall` searches the archive
4. **Archive** - Each save creates `YYYY-MM-DD-HHMMSS.md` (one file per session, no collisions)

### Design Decisions

- **Atomic writes** - All file writes use temp file + rename to prevent corruption
- **Cross-runtime** - Works in both Node (>=18) and Bun via `isMainModule()` helper
- **Hook preservation** - Install/uninstall detect cc-brain hooks by content matching, never overwrite user's other hooks
- **XML output** - Loader wraps content in semantic tags (`<user-profile>`, `<preferences>`, `<project>`) for reliable Claude parsing
- **Input validation** - Saver checks shape, key names, and types before writing

---

## Skills

Skills are installed to `~/.claude/skills/` and available in Claude Code:

| Skill | Description |
|-------|-------------|
| `/save` | Save session context to brain |
| `/recall <query>` | Search archive for past context |
| `/brain` | View current brain state |

Skills are automatically discovered by Claude Code after installation.

---

## CLI

```bash
# Setup
cc-brain install              # Install hooks + skills
cc-brain uninstall            # Remove hooks + skills (preserves brain data)
cc-brain uninstall --purge    # Remove everything including brain data

# Search & Archive
cc-brain recall "query"       # Search archive (scored results)
cc-brain recall "query" --context   # Show surrounding lines
cc-brain archive list         # List entries
cc-brain archive stats        # Statistics (avg size, time span)
cc-brain archive prune --keep 20

# Project Identity
cc-brain project-id --init    # Create stable .brain-id

# Manual Save
cc-brain save --dry-run --json '{"t2": {"focus": "testing"}}'
cc-brain save --json '{"t3": "Added search functionality"}'
```

---

## Project Structure

```
src/
  utils.js            Shared utilities (safeWriteFileSync, isMainModule)
  loader.js           Loads T1+T2 into XML context, auto-prunes archive
  saver.js            Structured saver with validation, limits, atomic writes
  recall.js           Scored archive search with safe regex and color detection
  archive.js          Archive management (list, prune, stats)
  project-id.js       Stable project identity (.brain-id)
bin/
  cc-brain.js         CLI entry point with fast runtime detection
hooks/
  hooks.json          Hook configuration (SessionStart, PreCompact)
skills/
  save.md             /save skill
  recall.md           /recall skill
  brain.md            /brain skill
scripts/
  install.js          Install hooks + skills to ~/.claude/
  uninstall.js        Remove hooks + skills (--purge for full removal)
```

---

## Features

- **Persistent memory** across sessions and compactions
- **Structured saving** with JSON validation and dry-run preview
- **Input validation** with shape checking, key allowlist, type enforcement
- **Capacity warnings** at 80% of line limits before rejecting
- **Atomic file writes** via temp + rename to prevent corruption
- **Scored search** with regex safe fallback and header-weighted ranking
- **Smart color output** that detects TTY and respects NO_COLOR
- **Auto-prune** removes archive entries older than 90 days
- **Hook-safe install** that merges without clobbering user config
- **Cross-runtime** support for Node (>=18) and Bun
- **Stable project identity** via `.brain-id` that survives renames

---

## Project Identity

By default, projects are identified by directory name. For stable identity that survives renames:

```bash
cc-brain project-id --init
```

Creates a `.brain-id` file with a UUID. Commit it to your repo.

---

## Uninstall

```bash
cc-brain uninstall            # Remove hooks, keep data
cc-brain uninstall --purge    # Remove everything
```

---

## Requirements

- **Node.js** >= 18 or [Bun](https://bun.sh)
- [Claude Code](https://github.com/anthropics/claude-code)

---

## License

MIT - [tripzcodes](https://github.com/tripzcodes)
