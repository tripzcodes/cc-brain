---
name: save
description: Save important context to brain memory
user_invocable: true
---

# Save to Brain

Save important information from this session to persistent memory.

## Instructions

1. **Analyze this session** and identify what's worth saving:
   - New insights about the user (T1 - rare)
   - New code/tool preferences (T1 - rare)
   - Project decisions + rationale (T2 - common)
   - Current focus/state (T2 - common)
   - Session summary (T3 - if significant work done)

2. **Build the save payload** as JSON:

```json
{
  "t1_user": {
    "Communication Style": ["new insight 1", "new insight 2"],
    "Pet Peeves": ["discovered pet peeve"]
  },
  "t1_prefs": {
    "Code Style": ["preference learned"],
    "Tools": ["tool preference"]
  },
  "t2": {
    "what": "One-line project description",
    "focus": ["current task 1", "current task 2"],
    "decisions": {
      "Decision made": "rationale for why"
    },
    "files": {
      "path/to/file.js": "what it does"
    },
    "blockers": ["any blockers"]
  },
  "t3": "Summary of significant work done this session."
}
```

3. **Preview changes** with dry-run:
```bash
npx cc-brain save --dry-run --json '<payload>'
```

4. **Apply changes** if preview looks good:
```bash
npx cc-brain save --json '<payload>'
```

5. **Report** what was saved.

## Rules

- Only include tiers that have new information
- T1 updates are rare - only genuine new user insights
- T2 updates are common - project state changes frequently
- T3 is optional - only for significant sessions
- REPLACE outdated info, don't append endlessly
- Decisions need rationale (the "why")

## Size Limits

- T1 user.md: 40 lines max
- T1 preferences.md: 40 lines max
- T2 context.md: 120 lines max
- T3 archive: unlimited (but keep summaries concise)
