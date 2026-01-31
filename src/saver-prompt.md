# Brain Saver

Save session context using the structured saver tool.

## Memory Tiers

```
~/.claude/brain/
│
├── user.md                    ← T1: Who they are (40 lines max)
├── preferences.md             ← T1: How they code (40 lines max)
│
└── projects/{id}/
    ├── context.md             ← T2: Current state (120 lines max)
    └── archive/               ← T3: History (unlimited)
        └── {date}.md
```

## What to Save

**T1 (rare)** - Only genuine new insights:
- Communication style discoveries
- Thinking patterns observed
- Strong preferences revealed
- Pet peeves encountered

**T2 (common)** - Project state:
- What the project is
- Current focus/active work
- Recent decisions + rationale
- Key files and purposes
- Blockers

**T3 (optional)** - Significant sessions:
- Major features implemented
- Important decisions made
- Problems solved

## How to Save

Build a JSON payload with only the tiers that have new information:

```json
{
  "t1_user": {
    "Section Name": ["item1", "item2"]
  },
  "t1_prefs": {
    "Section Name": ["preference1"]
  },
  "t2": {
    "what": "One-line description",
    "focus": ["task1", "task2"],
    "decisions": {
      "Decision": "rationale"
    },
    "files": {
      "path/file.js": "purpose"
    }
  },
  "t3": "Summary of significant work."
}
```

Preview with dry-run:
```bash
bun src/saver.js --dry-run --json '<payload>'
```

Apply changes:
```bash
bun src/saver.js --json '<payload>'
```

## Rules

- REPLACE outdated info, don't append endlessly
- Decisions need rationale (the "why")
- Keep within size limits
- Only save what helps future sessions
- T1 updates should be rare and meaningful
