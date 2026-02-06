---
name: brain
description: View current brain state (what Claude remembers about you)
user_invocable: true
---

# View Brain State

Show the user what's currently in persistent memory.

## Instructions

1. **Show Tier 1** (always loaded):
```bash
cat ~/.claude/brain/user.md
cat ~/.claude/brain/preferences.md
```

2. **Show Tier 2** (current project):
```bash
npx cc-brain project-id --path
# Then read context.md from that path
```

3. **Show Tier 3 stats**:
```bash
npx cc-brain archive stats
```

4. **Format output** showing:
   - T1: User profile and preferences
   - T2: Current project context
   - T3: Archive statistics (count, date range, size)

5. **Note any empty sections** or missing files

6. **Remind user** of available commands:
   - `/save` - Update brain from session
   - `/recall <query>` - Search archive
   - `npx cc-brain archive list` - List all archive entries
   - `npx cc-brain archive prune --keep 20` - Prune old entries
   - Direct file edits for precision

## Project Identity

Show the project ID being used:
```bash
npx cc-brain project-id
```

If using directory name fallback, suggest:
```bash
npx cc-brain project-id --init
```
to create a stable `.brain-id` file.
