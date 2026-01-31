---
name: save
description: Manually save important context to brain memory
user_invocable: true
---

# Save to Brain

Save important information from this session to persistent memory.

## Instructions

1. Read the current brain files:
   - `~/.claude/brain/user.md` (T1)
   - `~/.claude/brain/preferences.md` (T1)
   - `~/.claude/brain/projects/{current-project}/context.md` (T2)

2. Review this session and identify:
   - New insights about the user (rare - only if genuinely new)
   - New preferences discovered
   - Project decisions made + rationale
   - Current project state/focus

3. Update the appropriate files:
   - **T1 files**: Only update if genuinely new insight (max 40 lines each)
   - **T2 context.md**: Update with current state (max 120 lines)
   - **T3 archive**: If significant session, create `archive/{date}.md` summary

4. Rules:
   - REPLACE outdated info, don't just append
   - Keep within line limits
   - Only save what helps future sessions
   - Decisions need rationale (the "why")

5. Report what you saved.

Current project: Look at $CLAUDE_PROJECT_DIR or current working directory.
Brain location: `~/.claude/brain/`
