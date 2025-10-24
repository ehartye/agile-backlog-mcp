#!/bin/bash

API_URL="http://localhost:3001/api"

echo "Creating stories for Epic 1: Identifier-Based Project Isolation..."

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 1,
  "title": "Add agent_identifier tracking to all entities",
  "description": "Add agent_identifier column to epics, stories, tasks tables for multi-agent attribution and conflict detection",
  "status": "done", "priority": "high", "points": 3
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 1,
  "title": "Update TypeScript types for identifier-based system",
  "description": "Refactor Project, ProjectContext, and all input types to use identifier instead of working_directory",
  "status": "done", "priority": "high", "points": 3
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 1,
  "title": "Refactor getProjectContext for agent attribution",
  "description": "Update project context utilities to accept project_identifier and agent_identifier, maintain backward compatibility with modified_by",
  "status": "done", "priority": "high", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 1,
  "title": "Update all MCP tool schemas for new parameters",
  "description": "Replace working_directory with project_identifier + agent_identifier in 26+ tool schemas across epic, story, task, dependency, and export tools",
  "status": "done", "priority": "critical", "points": 8
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 1,
  "title": "Create comprehensive test suite for identifier-based isolation",
  "description": "Build 28+ test cases covering project registration, agent attribution, isolation, orphan stories, and all CRUD operations",
  "status": "done", "priority": "high", "points": 8
}' > /dev/null

echo "Creating stories for Epic 2: Web UI Dashboard..."

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 2,
  "title": "Build React project structure with Vite and TypeScript",
  "description": "Set up modern React development environment with Vite, TypeScript, TailwindCSS, and React Router for SPA navigation",
  "status": "done", "priority": "high", "points": 3
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 2,
  "title": "Create Express API server for database access",
  "description": "Build REST API with Express that connects to SQLite database and provides endpoints for projects, epics, stories, tasks",
  "status": "done", "priority": "high", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 2,
  "title": "Implement project selector and dashboard layout",
  "description": "Build top-level navigation with project dropdown, sidebar for epic filtering, and main content area for backlog visualization",
  "status": "in_progress", "priority": "high", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 2,
  "title": "Display epics with collapsible story lists",
  "description": "Create epic cards that expand to show their stories, with status badges, priority indicators, and story point totals",
  "status": "in_progress", "priority": "medium", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 2,
  "title": "Add orphan stories section for unassigned work",
  "description": "Display stories without epic_id in a dedicated section, allowing them to be visible even without epic association",
  "status": "todo", "priority": "medium", "points": 3
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 2,
  "title": "Implement real-time updates with polling or websockets",
  "description": "Add automatic refresh mechanism to keep UI in sync when changes are made via MCP tools or other agents",
  "status": "todo", "priority": "low", "points": 5
}' > /dev/null

echo "Creating stories for Epic 3: MCP Server Implementation..."

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 3,
  "title": "Implement MCP protocol server foundation",
  "description": "Set up stdio transport, implement initialize/initialized handshake, list_tools endpoint, and basic tool routing",
  "status": "done", "priority": "critical", "points": 8
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 3,
  "title": "Create project management tools (register, list, get)",
  "description": "Build MCP tools for registering projects with identifiers, listing all projects, and fetching project details by ID or identifier",
  "status": "done", "priority": "high", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 3,
  "title": "Build epic CRUD tools (create, update, list, get, delete)",
  "description": "Implement all 5 epic management tools with project isolation validation and agent attribution tracking",
  "status": "done", "priority": "high", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 3,
  "title": "Build story CRUD tools with orphan story support",
  "description": "Implement story management tools that handle both epic-associated and orphan stories with proper project_id tracking",
  "status": "done", "priority": "high", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 3,
  "title": "Build task CRUD tools with story relationship",
  "description": "Create task management tools that validate project access via parent story relationship",
  "status": "done", "priority": "high", "points": 3
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 3,
  "title": "Implement dependency management tools (add, remove, list)",
  "description": "Build tools for creating story dependencies with blocks/blocked_by types and circular dependency prevention",
  "status": "done", "priority": "medium", "points": 5
}' > /dev/null

curl -s -X POST "$API_URL/stories" -H "Content-Type: application/json" -d '{
  "project_id": 1, "epic_id": 3,
  "title": "Add export_backlog tool for markdown generation",
  "description": "Create tool that exports project backlog to markdown files in agile-planner compatible format",
  "status": "done", "priority": "low", "points": 3
}' > /dev/null

echo "All test data created successfully!"
