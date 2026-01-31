# Brain Saver

Context is being compacted. Extract and save important information to persistent memory.

## Memory Tiers

```
~/.claude/brain/
│
├── user.md                    ← TIER 1: Who they are (MAX 40 lines)
├── preferences.md             ← TIER 1: How they code (MAX 40 lines)
│
└── projects/{name}/
    ├── context.md             ← TIER 2: Current state (MAX 120 lines)
    └── archive/               ← TIER 3: Deep history (unlimited, not auto-loaded)
        └── {date}.md
```

## Tier 1: User & Preferences (Always Loaded)

**user.md** - Stable traits, rarely changes
- Communication style (terse? detailed?)
- Thinking patterns (systems thinker? pragmatist?)
- Pet peeves and strong opinions
- Skill levels / knowledge areas

**preferences.md** - Code/tool choices
- Formatting (tabs/spaces, semicolons, etc.)
- Frameworks and tools favored
- Patterns they like
- Things they explicitly avoid

## Tier 2: Project Context (Loaded for Current Project)

**context.md** - Living document, updates frequently
- What this project IS (one-liner)
- Current focus / active work
- Recent decisions + rationale
- Known issues / blockers
- Key files and their purposes

## Tier 3: Archive (On-Demand Only)

**archive/{date}.md** - Historical record
- Session summaries
- Detailed decision logs
- Problem-solving history
- Old context that might be useful later

## Save Process

1. Read existing brain files (Tier 1 + current project Tier 2)
2. Identify NEW information from this session
3. For each tier:
   - **Tier 1**: Update only if genuinely new insight about user (rare)
   - **Tier 2**: Merge new context, prune stale info, keep under 120 lines
   - **Tier 3**: Append session summary if significant work was done
4. REPLACE outdated info, don't just append

## Size Enforcement

If a file exceeds its limit:
- Tier 1: Compress/combine entries, keep only most relevant
- Tier 2: Move old context to archive, keep current state
- Tier 3: No limit, but summarize rather than dump raw content

## What NOT to Save

- Transient errors and their fixes (unless pattern)
- Exploration that led nowhere
- Verbose explanations
- Anything already in the codebase (comments, READMEs)

## Example Updates

**Good Tier 1 update:**
```markdown
## Communication Style
- Terse, dislikes fluff
- Prefers solving root causes
+ Interrupts when direction is wrong (iterate fast)
```

**Good Tier 2 update:**
```markdown
## Current Focus
- Building persistent memory system for Claude Code
- Working on: tiered loading to avoid context bloat

## Decisions
- Chose hook-based approach over plugin (simpler)
- Three tiers: always/project/archive
```

Now analyze this session and update the appropriate brain files.
