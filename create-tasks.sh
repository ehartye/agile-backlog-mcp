#!/bin/bash

API_URL="http://localhost:3001/api"

# Get story IDs
STORY_8=$(curl -s "$API_URL/stories?project_id=1" | python3 -c "import sys, json; stories = json.load(sys.stdin); print([s['id'] for s in stories if 'project selector' in s['title'].lower()][0])")
STORY_9=$(curl -s "$API_URL/stories?project_id=1" | python3 -c "import sys, json; stories = json.load(sys.stdin); print([s['id'] for s in stories if 'collapsible story' in s['title'].lower()][0])")
STORY_4=$(curl -s "$API_URL/stories?project_id=1" | python3 -c "import sys, json; stories = json.load(sys.stdin); print([s['id'] for s in stories if 'MCP tool schemas' in s['title']][0])")

echo "Creating tasks for Story $STORY_8: Implement project selector..."

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_8,
  \"title\": \"Create ProjectSelector component with dropdown\",
  \"description\": \"Build React component with project list dropdown and state management\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_8,
  \"title\": \"Add project creation form\",
  \"description\": \"Implement inline form for creating new projects with identifier, name, description fields\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_8,
  \"title\": \"Update UI to use identifier instead of repository_path\",
  \"description\": \"Refactor TypeScript interfaces and form fields to use new identifier-based schema\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_8,
  \"title\": \"Add API error banner for connection failures\",
  \"description\": \"Implement health check and error banner to notify when API server is down\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

echo "Creating tasks for Story $STORY_9: Display epics with collapsible story lists..."

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_9,
  \"title\": \"Create EpicCard component\",
  \"description\": \"Build collapsible epic card with title, description, status badge\",
  \"status\": \"in_progress\",
  \"assignee\": \"User\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_9,
  \"title\": \"Add story list within epic cards\",
  \"description\": \"Display stories nested under their epic with expand/collapse functionality\",
  \"status\": \"todo\",
  \"assignee\": \"User\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_9,
  \"title\": \"Calculate and display story point totals\",
  \"description\": \"Sum story points for each epic and show in epic header\",
  \"status\": \"todo\"
}" > /dev/null

echo "Creating tasks for Story $STORY_4: Update MCP tool schemas..."

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_4,
  \"title\": \"Update epic tool schemas (5 tools)\",
  \"description\": \"Replace working_directory with project_identifier + agent_identifier in create, update, list, get, delete epic tools\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_4,
  \"title\": \"Update story tool schemas (5 tools)\",
  \"description\": \"Update all story management tool schemas with new parameter structure\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_4,
  \"title\": \"Update task tool schemas (5 tools)\",
  \"description\": \"Update all task management tool schemas with new parameter structure\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_4,
  \"title\": \"Update dependency and export tool schemas\",
  \"description\": \"Update remaining tool schemas for dependencies and export functionality\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

curl -s -X POST "$API_URL/tasks" -H "Content-Type: application/json" -d "{
  \"story_id\": $STORY_4,
  \"title\": \"Update project tool schemas\",
  \"description\": \"Update register_project, get_project, list_projects schemas to use identifier\",
  \"status\": \"done\",
  \"assignee\": \"Claude\"
}" > /dev/null

echo "✓ All tasks created successfully!"
