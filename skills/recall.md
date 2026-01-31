---
name: recall
description: Search brain archive for past context and decisions
args: query
user_invocable: true
---

# Recall from Brain Archive

Search Tier 3 archive for historical context.

## Instructions

The user wants to recall: `$ARGUMENTS`

1. Find the current project name from $CLAUDE_PROJECT_DIR or cwd

2. Search the archive at:
   `~/.claude/brain/projects/{project}/archive/`

3. Look for:
   - Session summaries matching the query
   - Past decisions related to the topic
   - Historical context that might be relevant

4. Also check T2 context.md for recent related info

5. Present findings concisely:
   - What was found
   - When it was recorded (from filename dates)
   - Key relevant details

6. If nothing found, say so and suggest what might help

## Example Usage

User: `/recall authentication`
→ Search archive for anything about auth decisions, implementations, issues

User: `/recall why did we choose X`
→ Look for decision rationale in archive
