---
name: brain
description: View current brain state (what Claude remembers about you)
user_invocable: true
---

# View Brain State

Show the user what's currently in persistent memory.

## Instructions

1. Read and display:

**Tier 1 (Always Loaded):**
- `~/.claude/brain/user.md`
- `~/.claude/brain/preferences.md`

**Tier 2 (Current Project):**
- `~/.claude/brain/projects/{project}/context.md`

**Tier 3 (Archive):**
- List files in `~/.claude/brain/projects/{project}/archive/`
- Just show filenames/dates, not full content

2. Format output clearly showing what's in each tier

3. Note any empty sections or missing files

4. Remind user they can:
   - Edit files directly
   - Use `/save` to update from session
   - Use `/recall <query>` to search archive
