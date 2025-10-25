# Quick Start: Real Usage Scenarios

## Introduction

This guide shows **real conversations** between users and Claude using the Agile MCP server. These examples demonstrate how the workflows feel in practice.

---

## Scenario 1: Starting a New Feature (Developer Mode)

### Conversation

```
User: "I need to add a password reset feature to the app"

Claude: "I'll help you build the password reset feature. Let me set up the work tracking first.

[create_story: project_identifier="my-app", title="Password Reset Flow",
 description="Email-based password reset with secure tokens", priority="high"]

✓ Created Story #145: Password Reset Flow (High Priority)

Let me break this down into tasks:

[create_task: story_id=145, title="Design reset token generation"]
[create_task: story_id=145, title="Create reset password endpoint"]
[create_task: story_id=145, title="Build email template"]
[create_task: story_id=145, title="Add frontend reset form"]
[create_task: story_id=145, title="Add tests for reset flow"]

✓ Created 5 tasks

[update_task: task_id=501, status="in_progress"]

I'll start with designing the token generation. Here's my approach:

[Implements the first task...]
"

---

User: "Looks good! Make sure the tokens expire after 1 hour"

Claude: "Good security practice. I'll add that requirement.

[create_note: parent_type="story", parent_id=145, content="## Security Requirements\n\n**Token Expiration:** 1 hour\n- Reduces window for token theft\n- Aligns with industry best practices\n\n**Implementation:** Store expiry timestamp in token payload"]

✓ Added security note to Story #145

[Continues implementing with 1-hour expiration...]
"

---

User: "Great! Can we also add a password strength checker?"

Claude: "That's a good addition but it's technically a separate concern. Let me create a related story for that.

[create_story: project_identifier="my-app", title="Password Strength Validation",
 description="Client and server-side password strength checking"]

[create_relationship: source_type="story", source_id=146, target_type="story",
 target_id=145, relationship_type="related_to"]

✓ Created Story #146: Password Strength Validation
✓ Linked to Story #145 (Password Reset Flow)

Would you like me to implement this now, or finish the reset feature first?"

---

User: "Finish reset first"

Claude: "[Continues working on password reset tasks...]

[update_task: task_id=501, status="done"]
[update_task: task_id=502, status="in_progress"]

✓ Task 1 complete: Token generation implemented
→ Moving to Task 2: Reset password endpoint

[Implements endpoint...]
"
```

**Key Takeaways:**
- Claude automatically tracks work without being asked
- Stories and tasks map to real development flow
- Related features become linked stories
- Progress updates happen naturally

---

## Scenario 2: Hitting a Blocker (Developer Mode)

### Conversation

```
User: "The email sending isn't working in development"

Claude: "[Debugging the email issue...]

I see the problem - we don't have SMTP credentials configured for local development.

[update_task: task_id=503, status="blocked"]

This task is now blocked. Let me document the blocker:

[create_note: parent_type="task", parent_id=503, content="## Blocker\n\n**Issue:** SMTP not configured for local dev\n\n**Options:**\n1. Use mailtrap.io for dev email testing\n2. Mock email service in development\n3. Use Gmail SMTP (not recommended for dev)\n\n**Recommendation:** Set up Mailtrap account"]

While we're blocked on email, I can continue with the frontend reset form (Task 4). Would you like me to work on that, or should we resolve the email blocker first?"

---

User: "Let's use Mailtrap. Can you set that up?"

Claude: "Sure! I'll create a task for that under our auth infrastructure.

[create_task: story_id=145, title="Configure Mailtrap for dev emails"]
[update_task: task_id=507, status="in_progress"]

[Sets up Mailtrap configuration...]

✓ Mailtrap configured
✓ Added credentials to .env.example

Now I can unblock the email task:

[update_task: task_id=503, status="in_progress"]
[create_note: parent_type="task", parent_id=503, content="## Blocker Resolved\n\nMailtrap configured at smtp.mailtrap.io\nDev emails now captured in Mailtrap inbox"]

Let me finish the email template implementation...
"
```

**Key Takeaways:**
- Blockers are explicitly tracked
- Notes document blocker details and resolution
- New tasks created for unplanned work
- Work continues on unblocked tasks

---

## Scenario 3: Sprint Planning (PM Mode)

### Conversation

```
User: "Let's plan Sprint 25"

PM Agent: "I'll help plan Sprint 25. Let me analyze your team's velocity first.

[get_velocity_report: project_identifier="my-app"]

📊 **Velocity Analysis**
- Sprint 22: 42 points
- Sprint 23: 38 points
- Sprint 24: 35 points
- **Average: 38.3 points**

Velocity is trending down slightly. Let's investigate after we plan.

[list_stories: status="todo", priority="high"]

**High-Priority Backlog (Ready for Sprint):**

1. Story #140: User Dashboard Redesign (13 pts) ✓ Has criteria
2. Story #145: Password Reset Flow (8 pts) ✓ Has criteria
3. Story #146: Password Strength Validation (3 pts) ✓ Has criteria
4. Story #150: Admin User Management (21 pts) ⚠️ Needs breakdown
5. Story #152: Search Functionality (13 pts) ✓ Has criteria

[list_dependencies]

**Dependency Check:**
- Story #146 related to #145 (can be same sprint)
- Story #150 has no dependencies but is large (21 pts)
- No blocking dependencies

**My Recommendation:**

**Sprint 25 Plan** (Feb 1 - Feb 14)
- **Capacity:** 36 points (94% of avg, conservative due to downtrend)
- **Goal:** Improve user experience and security

**Stories to Include:**
- Story #140: User Dashboard Redesign (13 pts)
- Story #145: Password Reset Flow (8 pts)
- Story #146: Password Strength Validation (3 pts)
- Story #152: Search Functionality (13 pts)
- **Total:** 37 points (103% - slightly ambitious)

**Defer:**
- Story #150: Admin User Management (too large - recommend splitting)

Shall I create this sprint?"

---

User: "Yes, but let's drop the search feature and stay at 34 points"

PM Agent: "Good call - that gives us a 10% buffer for unknowns.

[create_sprint: project_identifier="my-app", name="Sprint 25",
 goal="Improve user experience and security",
 start_date="2024-02-01", end_date="2024-02-14",
 capacity_points=36]

✓ Created Sprint 25

[add_story_to_sprint: sprint_id=25, story_id=140]
[add_story_to_sprint: sprint_id=25, story_id=145]
[add_story_to_sprint: sprint_id=25, story_id=146]

✓ Added 3 stories to Sprint 25

**Sprint 25 Summary:**

📦 **Committed Work:**
- User Dashboard Redesign (13 pts)
- Password Reset Flow (8 pts)
- Password Strength Validation (3 pts)

📊 **Metrics:**
- Total: 24 points
- Capacity: 36 points
- Utilization: 67% ✓ (healthy buffer)

Ready to start the sprint?"

---

User: "Yes"

PM Agent: "[start_sprint: sprint_id=25]

✓ Sprint 25 is now ACTIVE
✓ Initial burndown snapshot created

**Sprint 25 has begun!**

I'll track daily progress and provide burndown updates. Good luck to the team! 🚀
"
```

**Key Takeaways:**
- PM agent provides data-driven recommendations
- Capacity is based on historical velocity
- User has final say on scope
- Sprint starts with automatic tracking

---

## Scenario 4: Daily Standup (PM Mode)

### Conversation

```
User: "Give me the standup update"

PM Agent: "[get_sprint_burndown: sprint_id=25]
[list_stories: sprint_id=25]
[list_tasks: status="blocked"]

## Daily Standup - February 5, 2024

### Sprint 25 Progress (Day 4 of 10)

📊 **Burndown Status**
- **Total Points:** 24
- **Completed:** 8 points (33%)
- **Remaining:** 16 points (67%)
- **Expected by now:** 9.6 points (40%)

**Trend:** ⚠️ Slightly behind schedule (-1.6 pts)

```
Day | Ideal | Actual
----|-------|-------
  1 |  21.6 |  24
  2 |  19.2 |  24
  3 |  16.8 |  21
  4 |  14.4 |  16  ← We are here
  5 |  12.0 |  ?
```

### Story Status

✅ **Completed (1 story, 8 points)**
- Story #146: Password Strength Validation (3 pts) ✓
- Story #145: Password Reset Flow (5 pts) ✓

🔄 **In Progress (1 story, 13 points)**
- Story #140: User Dashboard Redesign (13 pts)
  - Tasks: 4 of 7 complete
  - Status: On track

⏸️ **Not Started (0 stories)**

### Blockers 🚨

None reported ✓

### Recommendations

1. **Pace adjustment needed:** Team needs to complete ~2.6 pts/day (currently at 2 pts/day)
2. **Dashboard redesign is critical:** All remaining work depends on completing this
3. **Consider pairing:** If dashboard is complex, pair programming might help

**Overall Assessment:** Sprint is achievable but team needs to accelerate slightly.

Would you like me to check in on specific stories or tasks?"
```

**Key Takeaways:**
- Automatic burndown calculation
- Clear visual of progress vs. ideal
- Actionable recommendations
- Blocker tracking

---

## Scenario 5: Discovering Dependencies (Developer Mode)

### Conversation

```
User: "I'm building the profile page but I realize we need auth first"

Claude: "Good catch! Let me check if we have an auth story already.

[list_stories: project_identifier="my-app"]

I don't see an authentication story yet. Let me create one and set up the dependency.

[create_story: project_identifier="my-app", title="User Authentication System",
 description="JWT-based authentication with login/logout",
 priority="critical", points=13]

✓ Created Story #160: User Authentication System (Critical, 13 pts)

Now let me link the dependency:

[add_dependency: story_id=155, depends_on_id=160, dependency_type="blocked_by"]

✓ Story #155 (Profile Page) is now blocked by Story #160 (Auth)

[update_story: story_id=155, status="blocked"]

✓ Updated Profile Page status to blocked

[create_note: parent_type="story", parent_id=155,
 content="## Blocked By Authentication\n\nProfile page requires authenticated user context to:\n- Display user data\n- Handle permissions\n- Track user-specific settings\n\n**Cannot proceed until Story #160 is complete.**"]

**Recommendation:** Let's pivot to working on the authentication system first. I'll create tasks for that. Sound good?"

---

User: "Yes, let's build auth first"

Claude: "[update_story: story_id=160, status="in_progress"]

[create_task: story_id=160, title="Set up JWT library"]
[create_task: story_id=160, title="Create login endpoint"]
[create_task: story_id=160, title="Create logout endpoint"]
[create_task: story_id=160, title="Add auth middleware"]
[create_task: story_id=160, title="Add session persistence"]

✓ Created 5 tasks for authentication

[update_task: task_id=601, status="in_progress"]

Let's start with setting up the JWT library...
"
```

**Key Takeaways:**
- Dependencies discovered during development
- Blocker relationships tracked
- Work reprioritized automatically
- Notes explain why dependency exists

---

## Scenario 6: Sprint Retrospective (PM Mode)

### Conversation

```
User: "Sprint 25 is done. Let's do the retro"

PM Agent: "[complete_sprint: sprint_id=25]

Sprint 25 completed! Generating final report...

## Sprint 25 Retrospective

### Final Results

✅ **Completion Metrics**
- **Committed:** 24 points
- **Completed:** 21 points
- **Completion Rate:** 87.5%
- **Stories Done:** 2 of 3

🎯 **Sprint Goal:** Improve user experience and security
**Goal Met:** Partially - Security improvements complete, dashboard 90% done

### Story Breakdown

✅ **Completed:**
- Story #145: Password Reset Flow (8 pts) ✓
- Story #146: Password Strength Validation (3 pts) ✓

⏸️ **Incomplete:**
- Story #140: User Dashboard Redesign (13 pts)
  - Progress: 10 of 13 points worth of tasks done
  - Remaining: Polish and responsive design

### Velocity Trend

```
Sprint | Points Completed | Trend
-------|------------------|-------
  23   |       38        |
  24   |       35        |  ↓
  25   |       21        |  ↓↓
```

⚠️ **Velocity declining** - from 38 → 21 over 3 sprints

[get_velocity_report]

**Average Velocity (last 3 sprints):** 31.3 points

---

Now let me gather retrospective feedback. What went well this sprint?"

---

User: "The password reset feature went smoothly. Dashboard took longer than expected."

PM Agent: "Thanks. What could we improve?"

---

User: "Better estimation on UI work. Dashboard was underestimated."

PM Agent: "Noted. Any action items for next sprint?"

---

User: "1. Add UI buffer to estimates. 2. Finish dashboard first thing."

PM Agent: "[create_note: parent_type="sprint", parent_id=25, content="# Sprint 25 Retrospective\n\n## What Went Well ✅\n- Password reset feature: smooth implementation\n- Security features completed without issues\n- No major blockers\n\n## What to Improve 📈\n- UI work estimation: Dashboard took 30% longer than estimated\n- Could have caught estimation issue in planning\n\n## Action Items 🎯\n- [ ] Add 20-30% buffer to UI-heavy stories in estimation\n- [ ] Start Sprint 26 with dashboard completion (carry-over)\n- [ ] Consider design review before estimating UI work\n\n## Metrics\n- Completion: 87.5% (below our 90% target)\n- Velocity: 21 pts (concerning downward trend)\n- Team morale: Good (based on smooth execution)"]

✓ Retrospective notes saved

**Handling Incomplete Work:**

Story #140 (Dashboard) is 77% complete. Options:
1. Carry over to Sprint 26 (recommended - nearly done)
2. Return to backlog
3. Split remaining work into new story

What would you like to do?"

---

User: "Carry it to Sprint 26"

PM Agent: "Perfect. I'll keep Story #140 in its current state. When we plan Sprint 26, I'll recommend starting with this to build momentum.

[create_note: parent_type="story", parent_id=140,
 content="## Carried Over from Sprint 25\n\n**Completion:** 77% (10/13 points of work done)\n\n**Remaining work:**\n- Polish animations\n- Responsive design for mobile\n- Cross-browser testing\n\n**Priority for Sprint 26:** Start with this story"]

**Sprint 25 Summary:**

📊 Delivered 21 points (87.5% completion)
📉 Velocity trend concerning - recommend investigating
✅ Security goal achieved
⏳ UX goal: carry-over to next sprint

**Action Items:**
- [x] Document retrospective ✓
- [ ] Plan Sprint 26 with dashboard as top priority
- [ ] Investigate velocity decline (schedule team discussion)
- [ ] Improve UI estimation practices

Great work overall! Ready to plan Sprint 26?"
```

**Key Takeaways:**
- Comprehensive sprint metrics
- Structured retrospective process
- Action items documented
- Incomplete work handled gracefully
- Velocity trends highlighted

---

## Scenario 7: Backlog Grooming (PM Mode)

### Conversation

```
User: "Our backlog is a mess. Can you help clean it up?"

PM Agent: "I'll conduct a backlog health assessment and grooming session.

[list_stories: project_identifier="my-app"]
[list_epics: project_identifier="my-app"]
[list_dependencies]

Analyzing backlog...

## Backlog Health Report

### Overall Health: 🟡 Yellow (62%)

### Current State
- **Total Stories:** 38
  - Todo: 25
  - In Progress: 5
  - Done: 8
  - Blocked: 0

- **Priority Distribution:**
  - Critical: 2 (5%)
  - High: 8 (21%)
  - Medium: 18 (47%)
  - Low: 10 (26%)

### Issues Identified

❌ **Critical Issues (15 stories)**

1. **Missing Story Points:** 15 stories
   - Cannot plan sprints without estimates
   - Recommendation: Estimation session for top 10 stories

2. **Missing Acceptance Criteria:** 12 stories
   - Unclear "definition of done"
   - High risk of rework

3. **Orphaned Stories:** 8 stories
   - Not organized under epics
   - Reduces strategic visibility

⚠️ **Medium Issues**

4. **Old Low-Priority Stories:** 6 stories older than 90 days
   - Recommend: Archive or re-evaluate priority

ℹ️ **Minor Issues**

5. **No Dependencies Mapped:** Only 3 stories have dependency links
   - May lead to planning surprises

---

**Grooming Recommendations:**

**Immediate (This Week):**
1. Estimate top 10 high-priority stories
2. Add acceptance criteria to critical/high priority items
3. Create epics for major themes

**Soon (This Sprint):**
4. Archive or reprioritize old low-priority stories
5. Map dependencies for complex features

**Ongoing:**
6. Maintain health score >85%

Shall I help with the immediate grooming tasks?"

---

User: "Yes, start with creating epics"

PM Agent: "I'll analyze the stories and suggest epic groupings.

[Analyzing story titles and descriptions...]

I identified 4 major themes:

**Proposed Epics:**

1. **User Authentication & Security** (7 stories, ~45 points)
   - Password reset, 2FA, OAuth, etc.

2. **User Experience Enhancements** (12 stories, ~78 points)
   - Dashboard, dark mode, notifications, etc.

3. **Admin & Management Tools** (5 stories, ~34 points)
   - User management, analytics, settings

4. **Performance & Infrastructure** (6 stories, ~23 points)
   - Caching, optimization, monitoring

**Orphaned Stories (8):**
- These don't fit into themes yet
- Recommend keeping in backlog until pattern emerges

Shall I create these epics?"

---

User: "Yes"

PM Agent: "[create_epic: title="User Authentication & Security", ...]
[create_epic: title="User Experience Enhancements", ...]
[create_epic: title="Admin & Management Tools", ...]
[create_epic: title="Performance & Infrastructure", ...]

✓ Created 4 epics

Now assigning stories to epics...

[update_story: story_id=145, epic_id=1]
[update_story: story_id=146, epic_id=1]
...

✓ Assigned 25 stories to epics
✓ 8 stories remain orphaned (as planned)

**Updated Backlog Structure:**

📁 **Epic 1: User Authentication & Security** (7 stories)
📁 **Epic 2: User Experience Enhancements** (12 stories)
📁 **Epic 3: Admin & Management Tools** (5 stories)
📁 **Epic 4: Performance & Infrastructure** (6 stories)
📄 **Orphaned Stories:** 8 stories

**New Health Score: 🟢 78%** (up from 62%)

Next: Should we tackle the missing estimates?"
```

**Key Takeaways:**
- Automated health assessment
- Data-driven grooming recommendations
- Epic creation based on thematic analysis
- Incremental improvement tracked

---

## Summary: Key Patterns

### Developer Workflows
- **Create-as-you-go:** Stories/tasks created during feature work
- **Track-in-real-time:** Status updates as code is written
- **Document-decisions:** Technical notes capture "why"
- **Link-dependencies:** Blocker relationships discovered naturally

### PM Workflows
- **Data-driven planning:** Velocity analysis guides capacity
- **Daily monitoring:** Burndown + blockers checked regularly
- **Sprint rituals:** Planning → Standup → Retro with full data
- **Backlog health:** Periodic grooming maintains quality

### Common Tools
```
Developers → create_story, create_task, update_task, create_note
PMs       → create_sprint, add_story_to_sprint, get_sprint_burndown, complete_sprint
Both      → list_stories, get_story, add_dependency, export_backlog
```

---

## Next Steps

Try these workflows with your own projects:
1. **Start small:** Use developer workflow for one feature
2. **Track progress:** Update tasks as you code
3. **Add PM layer:** Once you have several stories, try sprint planning
4. **Iterate:** Refine your workflow based on what works

The key is to **make tracking effortless** - if it feels like overhead, you're doing too much. The MCP should fade into the background while keeping your backlog perfectly up-to-date.
