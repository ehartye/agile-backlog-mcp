# Claude Workflows for Agile MCP

## Overview

This directory contains **practical guides and templates** for using Claude (or any AI assistant) with the Agile MCP server to manage software development workflows.

The goal: **Effortless agile tracking** that happens naturally as you code, without disrupting your development flow.

---

## What's Inside

### 1. [Developer Workflow Guide](./DEVELOPER_WORKFLOW.md)
**For: Developers using Claude to build features**

Learn how to:
- Document development work in real-time
- Create stories and tasks as you code
- Track technical decisions with notes
- Manage dependencies and blockers
- Keep your backlog current without overhead

**Use this if:** You're building features and want automatic work tracking

---

### 2. [Project Manager Agent Template](./PROJECT_MANAGER_AGENT.md)
**For: Creating a dedicated PM agent**

A complete agent persona for:
- Sprint planning based on team velocity
- Daily standup reports with burndown charts
- Backlog grooming and health assessment
- Retrospectives with actionable insights
- Capacity planning and risk management

**Use this if:** You want an AI PM to handle sprint coordination

---

### 3. [Example Slash Commands](./EXAMPLE_SLASH_COMMANDS.md)
**For: Claude Code users (or similar tools)**

Ready-to-use slash commands:
- `/start-feature` - Begin new feature with automatic tracking
- `/complete-task` - Mark work done and move to next
- `/plan-sprint` - Interactive sprint planning
- `/daily-standup` - Generate standup reports
- `/backlog-health` - Assess and groom backlog
- ...and more

**Use this if:** You want one-command access to common workflows

---

### 4. [Quick Start Examples](./QUICKSTART_EXAMPLES.md)
**For: Everyone - see how it works in practice**

Real conversation examples showing:
- Feature development from start to finish
- Handling blockers and dependencies
- Sprint planning and monitoring
- Retrospectives and velocity tracking
- Backlog grooming at scale

**Use this if:** You want to see real usage before diving in

---

## Quick Start

### For Developers

**Goal:** Track your work without thinking about it

1. Read: [Developer Workflow Guide](./DEVELOPER_WORKFLOW.md)
2. Try: Build a feature and let Claude use the MCP to track it
3. Pattern:
   ```
   User asks for feature
   → Claude creates story + tasks
   → Claude codes and updates status
   → Claude adds notes for decisions
   → Story completes automatically
   ```

**Time investment:** 5 min to read, then it's automatic

---

### For Project Managers

**Goal:** Data-driven sprint management

1. Read: [Project Manager Agent Template](./PROJECT_MANAGER_AGENT.md)
2. Set up: Create a PM agent persona (or use prompts directly)
3. Pattern:
   ```
   Plan sprint based on velocity
   → Monitor daily with burndown
   → Identify blockers proactively
   → Complete sprint with retro
   → Repeat with continuous improvement
   ```

**Time investment:** 15 min to understand, saves hours per sprint

---

### For Teams

**Goal:** Seamless coordination between dev and planning

1. Developers use: [Developer Workflow](./DEVELOPER_WORKFLOW.md)
2. PM uses: [PM Agent Template](./PROJECT_MANAGER_AGENT.md)
3. Sync:
   - Devs update work status → PM sees real-time progress
   - PM plans sprints → Devs get organized backlog
   - Both add notes → Shared understanding

**Time investment:** 30 min team setup, continuous value

---

## The Two-Tier Approach

This workflow system uses a **two-tier strategy**:

### Tier 1: Developer Mode (Lightweight)
- **Who:** Claude helping you code
- **What:** Create stories/tasks, update status, add notes
- **When:** During feature development
- **Why:** Keep backlog current without context switching

### Tier 2: PM Mode (Strategic)
- **Who:** Dedicated PM agent (or PM-focused sessions)
- **What:** Sprint planning, burndown analysis, backlog grooming
- **When:** Planning ceremonies and daily standups
- **Why:** Maximize team productivity with data-driven decisions

**Why this works:**
- Developers stay in flow state
- PMs get accurate, real-time data
- No duplicate effort
- Single source of truth

---

## Key Principles

### 1. Document As You Build
Don't plan everything upfront. Create work items as you discover them.

**Anti-pattern:**
```
1. Plan 50 tasks
2. Get halfway through
3. Realize half the tasks are wrong
4. Backlog is now misleading
```

**Better:**
```
1. Create high-level story
2. Create first few tasks
3. Code and discover more tasks
4. Add tasks as you go
5. Backlog accurately reflects reality
```

### 2. Status Updates in Real-Time
Update task status when you start/complete work, not at end of day.

**Why:** Real-time data enables accurate burndown charts

### 3. Capture Decisions in Notes
Technical decisions fade from memory. Write them down immediately.

**What to capture:**
- Why you chose library X over Y
- Why you structured code this way
- What you learned debugging
- What didn't work and why

### 4. Link Related Work
Use dependencies and relationships to show connections.

**Benefits:**
- Prevent planning errors (working on blocked items)
- Visualize critical path
- Understand impact of changes

### 5. Trust the Data
Velocity, burndown, and completion rates don't lie. Use them for planning.

**Data-driven decisions:**
- Sprint capacity based on historical velocity
- Identify trends (improving/declining performance)
- Adjust estimates based on actual completion times

---

## Workflow Comparison

| Traditional Manual Tracking | With Agile MCP |
|----------------------------|----------------|
| Update Jira after coding | Update happens during coding |
| Context switch to PM tool | Claude handles it in-flow |
| Stale status (updated EOD) | Real-time status |
| Missing technical notes | Decisions captured immediately |
| PM manually tracks burndown | Automatic burndown charts |
| Velocity calculated manually | Velocity auto-calculated |
| Dependencies often missed | Dependencies tracked as discovered |

**Result:** Same quality of tracking, fraction of the effort

---

## Integration Patterns

### Pattern 1: Embedded Developer Tracking

```
User: "Add dark mode to the app"

Claude:
[Creates story in background]
[Implements dark mode]
[Updates task status as it codes]
[Adds notes on approach]
[Marks complete]

User sees: Feature being built
Backlog shows: Complete audit trail
```

**When:** Every feature implementation

---

### Pattern 2: Explicit Sprint Planning

```
User: "Plan next sprint"

Claude (PM mode):
[Analyzes velocity]
[Reviews backlog]
[Recommends stories]
[Creates sprint]
[Starts tracking]

User sees: Data-driven sprint plan
Team gets: Organized, realistic work
```

**When:** Start of each sprint

---

### Pattern 3: Daily Progress Check

```
User: "How's the sprint going?"

Claude (PM mode):
[Gets burndown data]
[Checks for blockers]
[Calculates completion %]
[Provides forecast]

User sees: Clear status report
Team adjusts: Based on real data
```

**When:** Daily standups

---

### Pattern 4: Retrospective with Insights

```
User: "Sprint's done, let's retro"

Claude (PM mode):
[Completes sprint]
[Generates metrics]
[Gathers feedback]
[Documents learnings]
[Recommends improvements]

User sees: Data + team feedback
Next sprint: Continuous improvement
```

**When:** End of each sprint

---

## Tool Access Requirements

To use these workflows, Claude needs access to the Agile MCP server.

### Setup (Quick)

1. **MCP Server Running:**
   ```bash
   npm run dev:mcp
   ```

2. **Claude Configuration:**
   Add MCP server to Claude's config (e.g., in Claude Code or Claude Desktop):
   ```json
   {
     "mcpServers": {
       "agile-backlog": {
         "command": "node",
         "args": ["/path/to/agile-backlog-mcp/mcp-server/build/index.js"]
       }
     }
   }
   ```

3. **Project Setup:**
   ```
   First interaction: Register project
   Tool: register_project
   Then: Normal workflow
   ```

See [MCP_SERVER.md](../../MCP_SERVER.md) for detailed setup instructions.

---

## Customization

These workflows are **templates** - customize for your team:

### Customize Developer Workflow
- Add team-specific task templates
- Modify when to create notes (e.g., always for security changes)
- Change story point scale
- Add custom fields to stories

### Customize PM Workflow
- Adjust velocity calculation (last N sprints)
- Change sprint capacity buffers (80% vs 90% vs 100%)
- Modify burndown snapshot frequency
- Add team-specific metrics

### Customize Slash Commands
- Change command names to match team vocabulary
- Add project-specific defaults
- Combine multiple commands
- Add validation or approval steps

---

## Measuring Success

### For Developers
**Success = Invisible tracking**

You should barely notice you're documenting work. If it feels like overhead, something's wrong.

**Good signs:**
- ✓ You don't think about updating Jira
- ✓ Backlog always matches what you built
- ✓ Technical decisions are captured
- ✓ You can find context later

### For PMs
**Success = Data-driven confidence**

You should trust your burndown, velocity, and forecasts.

**Good signs:**
- ✓ Sprint planning takes <1 hour
- ✓ Daily standups have clear data
- ✓ Velocity predictions are accurate
- ✓ Retrospectives drive real change

### For Teams
**Success = Seamless coordination**

Developers and PMs should operate on the same data without sync meetings.

**Good signs:**
- ✓ No "what's the status?" questions
- ✓ Blockers identified early
- ✓ Dependency conflicts avoided
- ✓ Continuous improvement visible in metrics

---

## Common Questions

### Q: Won't this slow down development?
**A:** No - tracking happens during coding, not after. It's actually faster than manual updates.

### Q: Do I have to create tasks for everything?
**A:** No - only for work you want to track. Trivial fixes don't need tracking.

### Q: What if I forget to update status?
**A:** The PM agent can detect stale work and prompt for updates during standups.

### Q: Can multiple developers use the same backlog?
**A:** Yes - the MCP tracks `agent_identifier` to handle multi-user scenarios.

### Q: How does this compare to Jira/Linear/etc?
**A:** This is lightweight and embedded in your dev flow. Export to those tools if needed.

### Q: Can I export the data?
**A:** Yes - use `export_backlog` to generate markdown files. Perfect for documentation.

---

## Anti-Patterns to Avoid

### ❌ Over-Planning
Creating 50 detailed tasks before writing any code.

**Why it fails:** Requirements change, half the tasks become irrelevant

**Better:** Create 3-5 initial tasks, add more as you learn

---

### ❌ Batch Status Updates
Updating all task statuses at end of day.

**Why it fails:** Burndown becomes inaccurate, PM can't help with blockers

**Better:** Update status when you start/complete tasks

---

### ❌ Skipping Notes
Not documenting technical decisions.

**Why it fails:** 6 months later, you can't remember why you did something

**Better:** Quick note when making any non-obvious choice

---

### ❌ Ignoring Velocity Data
Planning sprints based on "gut feel" instead of data.

**Why it fails:** Chronic over-commitment, missed deadlines

**Better:** Use velocity report to set realistic capacity

---

### ❌ Not Linking Dependencies
Building features without checking what they depend on.

**Why it fails:** Discover blocker halfway through sprint

**Better:** Map dependencies as you discover them

---

## Next Steps

1. **Choose your role:**
   - Developer → Start with [Developer Workflow](./DEVELOPER_WORKFLOW.md)
   - PM → Start with [PM Agent Template](./PROJECT_MANAGER_AGENT.md)
   - New user → Start with [Quick Start Examples](./QUICKSTART_EXAMPLES.md)

2. **Try one workflow:**
   - Pick the simplest example that matches your need
   - Follow it exactly first time
   - Customize after you understand it

3. **Measure results:**
   - Is your backlog more accurate?
   - Are you finding blockers earlier?
   - Is planning easier?

4. **Iterate:**
   - Keep what works
   - Drop what doesn't
   - Share improvements with your team

---

## Contributing

Found a better workflow? Have suggestions? This is a living document.

**How to improve these guides:**
1. Try a workflow in practice
2. Document what worked / didn't work
3. Create a PR with improvements
4. Help others learn from your experience

---

## Summary

These workflows enable **effortless agile**:
- Developers track work naturally while coding
- PMs make data-driven decisions
- Teams coordinate without overhead
- Backlog stays accurate and useful

**The key insight:** Don't make people adapt to tools. Make tools adapt to how people already work.

Start simple, iterate based on results, and let the data guide your improvement.

Happy shipping! 🚀
