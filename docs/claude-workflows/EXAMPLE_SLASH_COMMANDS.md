# Example Slash Commands for Agile MCP Workflows

## Overview

These are example slash commands you can add to your Claude Code configuration (`.claude/commands/`) to streamline common agile workflows.

---

## Developer Slash Commands

### `/start-feature` - Begin work on a new feature

**File:** `.claude/commands/start-feature.md`

```markdown
You are starting work on a new feature. Follow this workflow:

1. Ask the user for:
   - Feature name/description
   - Project identifier (or list available projects)
   - Priority (high/medium/low)
   - Estimated story points (if known)

2. Create the story using the Agile MCP:
   - Tool: create_story
   - Include: title, description, priority, acceptance criteria

3. Ask the user to break down implementation steps

4. Create tasks for each step:
   - Tool: create_task (for each implementation task)

5. Mark the first task as "in_progress"

6. Provide a summary showing:
   - Story created (with ID)
   - Tasks created (with IDs)
   - What you'll work on first

Then proceed to implement the first task.

**Output format:**
```
✓ Created Story #123: [Feature Name]
  - Priority: [X]
  - Estimated: [Y] points

✓ Created Tasks:
  1. Task #1: [name] (in_progress)
  2. Task #2: [name]
  3. Task #3: [name]

Starting implementation of Task #1...
```
```

---

### `/complete-task` - Mark current task done and move to next

**File:** `.claude/commands/complete-task.md`

```markdown
You are completing the current task and moving to the next one.

1. Ask which task was just completed (or infer from context)

2. Update the task to "done":
   - Tool: update_task
   - status: "done"

3. Ask if there are any technical notes to add:
   - If yes: create_note with markdown content
   - If no: continue

4. Check for remaining tasks:
   - Tool: list_tasks(story_id: X, status: "todo")

5. If tasks remain:
   - Mark next task as "in_progress"
   - Summarize what's next

6. If no tasks remain:
   - Ask if story is complete
   - If yes: update_story(status: "done")
   - Celebrate completion!

**Output format:**
```
✓ Task #45 marked as done
✓ Added technical note

Next up: Task #46 - [task name]
[Brief description of what this task involves]

Ready to proceed?
```
```

---

### `/add-tech-note` - Document technical decision

**File:** `.claude/commands/add-tech-note.md`

```markdown
You are documenting a technical decision or discovery.

1. Ask the user:
   - What entity type (story/task)
   - Entity ID (or infer from current work)
   - What to document

2. Create a well-formatted markdown note:
   - Tool: create_note
   - parent_type: "story" or "task"
   - parent_id: <ID>
   - content: Use markdown formatting

3. Structure the note with:
   - ## Heading for the topic
   - **Decision:** What was decided
   - **Rationale:** Why this choice
   - **Alternatives considered:** What else was evaluated
   - **Impact:** How this affects the code

**Example note format:**
```markdown
## Authentication Library Choice

**Decision:** Using `jsonwebtoken` v9.0.0 for JWT handling

**Rationale:**
- Industry standard with 25k+ stars
- Active maintenance and security updates
- Simple API matching our needs

**Alternatives considered:**
- jose: More modern but smaller community
- passport-jwt: Too heavyweight for our use case

**Impact:**
- Added dependency (23kb gzipped)
- Standardized auth across all services
```
```

---

### `/check-blockers` - Identify and report blockers

**File:** `.claude/commands/check-blockers.md`

```markdown
You are checking for blocked work in the current project.

1. Get project identifier from context or ask user

2. Check for blocked stories:
   - Tool: list_stories(status: "blocked")

3. Check for blocked tasks:
   - Tool: list_tasks(status: "blocked")

4. For each blocked item:
   - Get details: get_story() or get_task()
   - Check notes for blocker description
   - Check dependencies: list_dependencies()

5. Generate a blocker report:

**Output format:**
```
## Blocker Report

### Blocked Stories (2)

**Story #123: User Authentication**
- Blocked by: Story #120 (Database Migration)
- Status: Database schema not finalized
- Impact: Cannot implement user table

**Story #145: Payment Integration**
- Blocked by: External API access
- Status: Waiting for vendor API keys
- Impact: Cannot test payment flow

### Blocked Tasks (1)

**Task #67: Deploy to staging**
- Blocked by: CI/CD pipeline setup
- Parent Story: #123

### Recommendations
1. Prioritize Story #120 to unblock authentication
2. Follow up with vendor for API keys
3. Assign DevOps resource to CI/CD setup
```
```

---

## Project Manager Slash Commands

### `/plan-sprint` - Interactive sprint planning

**File:** `.claude/commands/plan-sprint.md`

```markdown
You are a Project Manager planning the next sprint.

1. Get project identifier from user

2. Analyze team velocity:
   - Tool: get_velocity_report()
   - Calculate average from last 3 sprints
   - Present velocity data to user

3. Review backlog:
   - Tool: list_stories(status: "todo")
   - Filter by priority: high first
   - Show stories with estimates

4. Ask user for sprint details:
   - Sprint name (e.g., "Sprint 24")
   - Start and end dates
   - Sprint goal (1 sentence)
   - Desired capacity (suggest based on velocity)

5. Create the sprint:
   - Tool: create_sprint()

6. Recommend stories based on:
   - Priority
   - Estimates fitting in capacity
   - No blocking dependencies
   - Alignment with sprint goal

7. For each recommended story, ask for confirmation

8. Add confirmed stories to sprint:
   - Tool: add_story_to_sprint()

9. Show sprint summary:
   - Total points committed
   - Capacity utilization %
   - List of stories

10. Ask if ready to start sprint:
    - If yes: start_sprint()
    - If no: allow adjustments

**Output format:**
```
## Sprint 24 Planning

### Velocity Analysis
- Last 3 sprints: 42, 38, 45 points
- Average: 41.7 points
- Recommended capacity: 40 points (96%)

### Proposed Stories (38 points)
1. ✓ Story #123: User Dashboard (13 pts) - High priority
2. ✓ Story #124: Dark Mode (8 pts) - High priority
3. ✓ Story #130: Notifications (13 pts) - Medium priority
4. ? Story #135: Mobile Layout (21 pts) - Too large, recommend splitting

### Sprint Summary
- **Goal:** Improve user experience with dashboard and dark mode
- **Capacity:** 40 points
- **Committed:** 34 points (85% utilization)
- **Buffer:** 6 points for unknowns

Ready to start Sprint 24? (yes/no)
```
```

---

### `/daily-standup` - Generate standup report

**File:** `.claude/commands/daily-standup.md`

```markdown
You are generating a daily standup report for the active sprint.

1. Get project identifier

2. Find active sprint:
   - Tool: list_sprints(status: "active")
   - If multiple, ask which one

3. Get burndown data:
   - Tool: get_sprint_burndown()
   - Calculate: completed points, remaining points
   - Compare actual vs. ideal burndown

4. Check for blockers:
   - Tool: list_stories(status: "blocked")
   - Tool: list_tasks(status: "blocked")

5. Get sprint details:
   - Tool: get_sprint()
   - Show story status breakdown

6. Generate report:

**Output format:**
```
## Daily Standup - [Date]
### Sprint 24 Progress

📊 **Burndown Status**
- Total Points: 40
- Completed: 18 (45%)
- Remaining: 22 (55%)
- Days Remaining: 6 of 10

**Trend:** ⚠️  Slightly behind (should be at 20 pts by now)

### Story Status
- ✅ Done: 2 stories (18 points)
- 🔄 In Progress: 3 stories (15 points)
- ⏸️  Todo: 2 stories (7 points)

### Blockers 🚨
- Story #145: Payment Integration
  - Waiting for API keys from vendor
  - Impact: 1 developer idle

### Recommendations
- Consider pulling Story #150 (5 pts) from backlog to keep team busy
- Follow up with vendor on API keys today
- Team pace needs to increase slightly to hit sprint goal
```
```

---

### `/sprint-retro` - Complete sprint and retrospective

**File:** `.claude/commands/sprint-retro.md`

```markdown
You are facilitating a sprint retrospective.

1. Get project identifier and sprint ID (or find active sprint)

2. Complete the sprint:
   - Tool: complete_sprint()
   - This generates final metrics

3. Get sprint details:
   - Tool: get_sprint()
   - Show final status of all stories

4. Get velocity data:
   - Tool: get_velocity_report()
   - Compare this sprint to historical average

5. Ask the team for retrospective feedback:
   - What went well?
   - What could be improved?
   - Action items for next sprint?

6. Document retrospective:
   - Tool: create_note
   - parent_type: "sprint"
   - parent_id: <sprint_id>
   - content: Structured retrospective notes

7. Handle incomplete work:
   - List stories still in_progress
   - Ask if they should move to next sprint or backlog

8. Generate sprint summary:

**Output format:**
```
## Sprint 24 Retrospective

### Final Results
- **Committed:** 40 points
- **Completed:** 35 points
- **Completion Rate:** 87.5%
- **Stories Done:** 5 of 7

### Velocity Trend
- Sprint 22: 45 pts
- Sprint 23: 38 pts
- Sprint 24: 35 pts ⬇️
- Average: 39.3 pts

### Retrospective Notes

#### What Went Well ✅
- [Team feedback]
- [Team feedback]

#### What to Improve 📈
- [Team feedback]
- [Team feedback]

#### Action Items 🎯
- [ ] [Action item 1]
- [ ] [Action item 2]

### Incomplete Work
- Story #145: Payment Integration (8 pts) - 80% complete
  - Recommendation: Move to Sprint 25

**Sprint 24 marked as complete. Ready to plan Sprint 25?**
```
```

---

### `/backlog-health` - Assess backlog health

**File:** `.claude/commands/backlog-health.md`

```markdown
You are assessing the health of the product backlog.

1. Get project identifier

2. Gather backlog metrics:
   - Tool: list_stories()
   - Count by status
   - Count by priority
   - Identify stories missing estimates
   - Identify stories missing acceptance criteria

3. Check epics:
   - Tool: list_epics()
   - Find stories without epic (orphaned)

4. Check dependencies:
   - Tool: list_dependencies()
   - Identify complex dependency chains

5. Calculate health score:
   - Stories with estimates: +1 point each
   - Stories with acceptance criteria: +1 point each
   - Stories in epics: +1 point each
   - Score = (total points / possible points) * 100

6. Generate health report:

**Output format:**
```
## Backlog Health Report

### Overall Health: 🟡 Yellow (68%)

### Metrics
- **Total Stories:** 45
  - Todo: 30
  - In Progress: 8
  - Done: 7

- **By Priority:**
  - Critical: 2
  - High: 12
  - Medium: 20
  - Low: 11

### Issues Found

❌ **Missing Estimates** (12 stories)
- Story #150: User Settings
- Story #151: Email Templates
- [... 10 more]

⚠️ **Missing Acceptance Criteria** (8 stories)
- Story #145: Payment Integration
- Story #148: Search Feature
- [... 6 more]

ℹ️ **Orphaned Stories** (5 stories)
- Not assigned to any epic
- Recommend creating thematic epics

### Recommendations

1. **Immediate Actions:**
   - Add estimates to top 12 stories (enables sprint planning)
   - Define acceptance criteria for high-priority work

2. **Backlog Grooming:**
   - Create epics for orphaned stories
   - Archive low-priority stories older than 6 months

3. **Target Health:** 🟢 Green (>85%)
   - Requires: Estimating 12 stories + criteria for 8 stories

**Schedule backlog grooming session?**
```
```

---

## Utility Slash Commands

### `/export-docs` - Export backlog to markdown

**File:** `.claude/commands/export-docs.md`

```markdown
You are exporting the project backlog to markdown documentation.

1. Get project identifier

2. Export backlog:
   - Tool: export_backlog()
   - This creates `.agile-backlog/` directory with markdown files

3. Explain the export structure:

**Output format:**
```
✓ Backlog exported to .agile-backlog/

### Structure Created:
```
.agile-backlog/
├── backlog.json           # Raw JSON export
├── epics/
│   ├── user-authentication/
│   │   ├── epic.md        # Epic overview
│   │   └── features/
│   │       ├── login.md   # Story details
│   │       └── logout.md
│   └── payment-system/
│       ├── epic.md
│       └── features/
└── orphan-stories/
    └── standalone-feature.md
```

### What's Included:
- ✓ All epics with descriptions
- ✓ All stories with tasks
- ✓ Acceptance criteria
- ✓ Story points and priorities
- ✓ Dependencies
- ✓ All notes (technical decisions, etc.)

### Use Cases:
- Share with stakeholders
- Version control your backlog
- Generate external documentation
- Review historical work

Files are now in `.agile-backlog/` - would you like me to open any specific files?
```
```

---

### `/show-dependencies` - Visualize dependency graph

**File:** `.claude/commands/show-dependencies.md`

```markdown
You are visualizing the dependency graph for the project.

1. Get project identifier

2. Get all dependencies:
   - Tool: list_dependencies()

3. Get all stories:
   - Tool: list_stories()

4. Build dependency graph:
   - Map which stories block which
   - Identify critical path (longest chain)
   - Find independent work

5. Present in text format:

**Output format:**
```
## Dependency Graph

### Critical Path (20 points, ~2 sprints)
```
Story #120: Database Schema (8 pts)
    ↓ blocks
Story #123: User Authentication (5 pts)
    ↓ blocks
Story #125: User Profile (5 pts)
    ↓ blocks
Story #130: Settings Page (2 pts)
```

### Parallel Work (can start immediately)
- Story #140: Email Service (8 pts) - No dependencies
- Story #141: UI Components (13 pts) - No dependencies
- Story #145: Documentation (3 pts) - No dependencies

### Blocked Work (cannot start yet)
- Story #150: Admin Panel
  - Blocked by: #123 (User Authentication)
  - Can start after: Sprint 24

### Recommendations
1. **Prioritize critical path** - Start #120 immediately
2. **Parallelize independent work** - Assign to different team members
3. **Plan ahead** - Story #150 ready for Sprint 25

**Would you like me to create a sprint plan based on this dependency analysis?**
```
```

---

## Installation Instructions

To use these slash commands:

1. Create `.claude/commands/` directory in your project
2. Create individual `.md` files for each command
3. Copy the command content (without the outer markdown code fence)
4. Use in Claude Code with `/command-name`

Example:
```bash
mkdir -p .claude/commands
cat > .claude/commands/start-feature.md << 'EOF'
You are starting work on a new feature. Follow this workflow:
...
EOF
```

---

## Customization

You can customize these commands by:
- Changing output format
- Adding project-specific defaults
- Combining multiple commands
- Adding team-specific workflows

---

## Command Chaining

You can chain commands for common workflows:

```markdown
# Example: Full feature implementation workflow

User: "Let's build user authentication"

Claude:
1. /start-feature (creates story + tasks)
2. [Implements code]
3. /add-tech-note (documents decisions)
4. /complete-task (marks tasks done)
5. [Repeat for each task]
6. Story automatically marked done when all tasks complete
```

---

## Summary

These slash commands make agile workflows **effortless**:
- **Developers:** `/start-feature`, `/complete-task`, `/add-tech-note`
- **PM:** `/plan-sprint`, `/daily-standup`, `/sprint-retro`, `/backlog-health`
- **Utilities:** `/export-docs`, `/show-dependencies`

Copy, customize, and use them to streamline your agile process!
