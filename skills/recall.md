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

1. **Run the search**:
```bash
bun src/recall.js "$ARGUMENTS"
```

2. **For regex patterns or context**:
```bash
bun src/recall.js "$ARGUMENTS" --context
```

3. **Present the results** to the user:
   - What was found
   - When it was recorded (from dates)
   - Key relevant details

4. **If nothing found**, let the user know and suggest:
   - Different search terms
   - Checking T2 context.md for recent info

## Examples

User: `/recall authentication`
→ Searches archive for anything about auth decisions, implementations, issues

User: `/recall why did we choose bun`
→ Look for decision rationale in archive

User: `/recall API.*endpoint`
→ Regex search for API endpoint mentions
