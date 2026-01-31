<p align="center">
  <h1 align="center">🧠 cc-brain</h1>
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
  <a href="#-installation">Installation</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-commands">Commands</a> •
  <a href="#-cli">CLI</a>
</p>

---

## ⚡ The Problem

Claude Code sessions are **ephemeral**. When context fills up or you start a new session, everything is forgotten. Your preferences, project decisions, debugging history — gone.

## 💡 The Solution

cc-brain creates a persistent memory layer that:

- 📥 **Loads** your profile and project context on every session
- 💾 **Saves** important learnings before context compaction
- 🔍 **Searches** past sessions for decisions and context

---

## 📦 Installation

### npm (recommended)
```bash
npm install -g cc-brain
cc-brain install
```

### npx (no install)
```bash
npx cc-brain install
```

### bunx
```bash
bunx cc-brain install
```

### Claude Plugin
```bash
claude plugins add cc-brain
```

---

## 🧩 How It Works

```
~/.claude/brain/
├── 📄 user.md              # Your profile (always loaded)
├── 📄 preferences.md       # Code preferences (always loaded)
└── 📁 projects/{id}/
    ├── 📄 context.md       # Current project state
    └── 📁 archive/         # Session history
        └── 📄 2025-01-31.md
```

### Memory Tiers

| Tier | Content | Limit | Loaded |
|:----:|---------|:-----:|:------:|
| **T1** | User identity & preferences | 80 lines | ✅ Always |
| **T2** | Project context | 120 lines | ✅ Current project |
| **T3** | Archive history | ∞ | 🔍 On-demand |

### Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Session Start  │────▶│  Brain Loaded   │────▶│   You Work...   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  Next Session   │◀────│  Brain Saved    │◀─────────────┘
└─────────────────┘     └─────────────────┘
                         (before compaction)
```

---

## 🎯 Commands

Use these skills in Claude Code:

| Command | Description |
|---------|-------------|
| `/save` | 💾 Save session context to brain |
| `/recall <query>` | 🔍 Search archive for past context |
| `/brain` | 👁️ View current brain state |

---

## 🔧 CLI

```bash
# Setup
cc-brain install              # Install hooks
cc-brain uninstall            # Remove hooks
cc-brain uninstall --purge    # Remove everything

# Search & Archive
cc-brain recall "query"       # Search archive
cc-brain archive list         # List entries
cc-brain archive stats        # Show statistics
cc-brain archive prune --keep 20

# Project Identity
cc-brain project-id --init    # Create stable .brain-id

# Manual Save
cc-brain save --dry-run --json '{"t2": {"focus": "testing"}}'
cc-brain save --json '{"t2": {"focus": "testing"}}'
```

---

## 🆔 Project Identity

By default, projects are identified by directory name. For stable identity that survives renames:

```bash
cc-brain project-id --init
```

Creates a `.brain-id` file with a UUID. Commit it to your repo.

---

## 🗑️ Uninstall

```bash
cc-brain uninstall            # Remove hooks, keep data
cc-brain uninstall --purge    # Remove everything
```

---

## 📋 Requirements

- **Node.js** >= 18 or [Bun](https://bun.sh)
- [Claude Code](https://github.com/anthropics/claude-code)

---

## 📄 License

MIT © [tripzcodes](https://github.com/tripzcodes)

---

<p align="center">
  <sub>Built with 🧠 for Claude Code users</sub>
</p>
