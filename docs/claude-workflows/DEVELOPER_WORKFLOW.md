# Developer Workflow Guide: Using Agile MCP While Coding

## Overview

This guide shows how Claude (or any AI assistant) can use the Agile MCP server to **document development work in real-time** as features are being built. The goal is to maintain a living backlog without disrupting the development flow.

---

## Core Principle

**Document as you build** - Create stories and tasks that reflect the actual work being done, not just theoretical planning.

---

## Typical Development Session Flow

### Phase 1: Start of Feature Work

When beginning work on a new feature:

```markdown
# Example: User asks to build authentication

1. Register the project (if first time)
   - Tool: register_project
   - identifier: "my-app"
   - name: "My Application"

2. Create a story for the feature
   - Tool: create_story
   - title: "Add user authentication"
   - description: "Implement JWT-based auth with login/logout"
   - priority: "high"
   - acceptance_criteria: "Users can log in, log out, and stay authenticated across sessions"

3. Break down into tasks
   - Tool: create_task (for each implementation step)
   - Tasks:
     - "Set up JWT library and middleware"
     - "Create login endpoint"
     - "Create logout endpoint"
     - "Add authentication middleware"
     - "Add session persistence"
```

### Phase 2: During Development

As you code, update task status:

```markdown
# When starting a task
- Tool: update_task
- status: "in_progress"
- task_id: <the task being worked on>

# When encountering issues
- Tool: create_note
- parent_type: "task"
- parent_id: <task_id>
- content: "Discovered bcrypt hashing needs async/await pattern. Updated implementation."

# When completing a task
- Tool: update_task
- status: "done"
```

### Phase 3: Discovering Dependencies

When you realize components depend on each other:

```markdown
# Example: Realizing auth needs to be done before profile feature

1. Create the dependent story
   - Tool: create_story
   - title: "User profile management"

2. Add the dependency
   - Tool: add_dependency
   - story_id: <profile story>
   - depends_on_id: <auth story>
   - dependency_type: "blocked_by"

3. Add a note explaining why
   - Tool: create_note
   - content: "Profile endpoints require authenticated user context. Blocked until auth is complete."
```

### Phase 4: Technical Decisions & Documentation

Use notes to capture architectural decisions:

```markdown
# When making technical choices
- Tool: create_note
- parent_type: "story"
- parent_id: <story_id>
- content: |
    ## Tech Stack Decision

    **Chose JWT over sessions because:**
    - Stateless auth works better with microservices
    - Easier to scale horizontally
    - Mobile app can use same tokens

    **Libraries:**
    - jsonwebtoken v9.0.0
    - bcryptjs for password hashing

    **Security notes:**
    - Tokens expire in 24h
    - Refresh tokens stored in httpOnly cookies
```

---

## Real-World Examples

### Example 1: Bug Fix During Feature Development

```markdown
User: "The login isn't working in Safari"

Claude's workflow:
1. Create a task under the auth story
   - title: "Fix Safari login compatibility"
   - status: "in_progress"

2. Investigate and fix the issue

3. Add note with findings
   - content: "Safari blocks third-party cookies. Changed to use SameSite=None; Secure"

4. Update task to "done"

5. Update parent story if all tasks complete
   - update_story: status "done"
```

### Example 2: Feature Expansion

```markdown
User: "Can we also add password reset?"

Claude's workflow:
1. Check if this fits in current story or needs new one
   - Decision: New story, related to auth

2. Create new story
   - title: "Password reset flow"
   - description: "Email-based password reset"

3. Add relationship to original auth story
   - Tool: create_relationship
   - relationship_type: "related_to"

4. Create tasks:
   - "Add email service integration"
   - "Create reset token generation"
   - "Build reset password endpoint"
   - "Create password reset email template"

5. Identify dependency on auth story
   - Tool: add_dependency
   - dependency_type: "blocked_by" (needs auth infrastructure)
```

### Example 3: Refactoring Work

```markdown
User: "Let's refactor the authentication middleware to be more testable"

Claude's workflow:
1. Create a technical debt story
   - title: "Refactor auth middleware for testability"
   - description: "Extract business logic from middleware, add dependency injection"
   - priority: "medium"

2. Create tasks for refactoring steps
   - "Extract auth logic into AuthService"
   - "Add dependency injection container"
   - "Update middleware to use injected service"
   - "Add unit tests for AuthService"

3. Add note with refactoring plan
   - Tool: create_note
   - content: |
     ## Refactoring Plan

     **Current issues:**
     - Middleware directly calls database
     - Hard to mock for tests
     - Business logic mixed with HTTP concerns

     **Target architecture:**
     - AuthService handles business logic
     - Middleware is thin wrapper
     - Service is easily mockable
```

---

## Best Practices for Dev Workflow

### ✅ DO

1. **Create stories before coding** - Even if brief, establish the work item first
2. **Update task status in real-time** - Helps track progress
3. **Add notes liberally** - Capture decisions, blockers, and discoveries
4. **Link related work** - Use dependencies and relationships to show connections
5. **Use meaningful titles** - Future you will thank present you
6. **Set realistic story points** - After completing tasks, add points estimation

### ❌ DON'T

1. **Over-plan** - Don't create 50 tasks before writing any code
2. **Forget to update status** - Stale status = misleading backlog
3. **Create duplicate stories** - Check existing stories first with `list_stories`
4. **Skip acceptance criteria** - Even simple criteria help define "done"
5. **Ignore dependencies** - Document blocking relationships as you discover them

---

## Quick Command Reference for Developers

```bash
# Start new feature
register_project → create_story → create_task (x N)

# During coding
update_task (status: in_progress) → create_note → update_task (status: done)

# Found a dependency
create_story (for blocking work) → add_dependency

# Technical decision
create_note (parent: story, markdown content)

# Check what's left
list_tasks (filter by story_id, status: todo)

# Mark feature complete
update_story (status: done)
```

---

## Integration with Development Flow

### Scenario: Claude is helping build a feature

```markdown
User: "Add a dark mode toggle to the app"

Claude's internal workflow:

1. [Check if project exists, create if needed]
2. [Create story: "Implement dark mode toggle"]
3. [Create tasks: CSS variables, toggle component, persistence]
4. [Start first task: "in_progress"]
5. Write code for CSS variables
6. [Complete first task: "done"]
7. [Start second task: "in_progress"]
8. Write toggle component
9. [Add note: "Using React Context for theme state"]
10. [Complete second task: "done"]
... and so on
```

**The user just sees Claude building the feature**, but the MCP is quietly maintaining a perfect audit trail and task breakdown.

---

## Advanced: Auto-Documentation Pattern

For complex features, Claude can create comprehensive documentation automatically:

```markdown
After completing a story:

1. Get the full story with all tasks
   - Tool: get_story (returns story + all tasks + dependencies)

2. Create a completion note
   - Tool: create_note
   - parent_type: "story"
   - content: |
     ## Completion Summary

     **Tasks completed:** [list all tasks]
     **Files modified:** [list files changed]
     **Dependencies resolved:** [list any blocking work done]
     **Technical notes:** [key decisions made]
     **Testing:** [tests added]

     ✅ All acceptance criteria met.

3. Export for documentation
   - Tool: export_backlog
   - Generates markdown files in .agile-backlog/
```

---

## Measuring Your Work

After several stories are complete:

```markdown
# View all completed stories
list_stories(status: "done")

# Check story with full task details
get_story(story_id: X)

# See dependency chain
list_dependencies(story_id: X)

# Export to markdown
export_backlog()
```

---

## Summary

The dev workflow is about **frictionless documentation**:
- Create work items that mirror your actual code work
- Update status as you progress
- Capture decisions in notes
- Link dependencies as you discover them

This creates a **living backlog** that accurately reflects what was built, why, and how - without slowing down development.
