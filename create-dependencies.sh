#!/bin/bash

API_URL="http://localhost:3001/api"

# Get story IDs by title keywords
get_story_id() {
  curl -s "$API_URL/stories?project_id=1" | python3 -c "import sys, json; stories = json.load(sys.stdin); print([s['id'] for s in stories if '$1' in s['title'].lower()][0])"
}

SCHEMA_STORY=$(get_story_id "repository_path with project identifier")
TYPES_STORY=$(get_story_id "typescript types")
CONTEXT_STORY=$(get_story_id "getprojectcontext")
SCHEMAS_STORY=$(get_story_id "mcp tool schemas")
EXPRESS_API_STORY=$(get_story_id "express api")
UI_SELECTOR_STORY=$(get_story_id "project selector")

echo "Creating story dependencies to show workflow..."

# Database schema must be done before TypeScript types can be updated
curl -s -X POST "$API_URL/dependencies" -H "Content-Type: application/json" -d "{
  \"story_id\": $TYPES_STORY,
  \"depends_on_story_id\": $SCHEMA_STORY,
  \"dependency_type\": \"blocked_by\"
}" > /dev/null

echo "  ✓ TypeScript types blocked by database schema"

# Project context depends on updated types
curl -s -X POST "$API_URL/dependencies" -H "Content-Type: application/json" -d "{
  \"story_id\": $CONTEXT_STORY,
  \"depends_on_story_id\": $TYPES_STORY,
  \"dependency_type\": \"blocked_by\"
}" > /dev/null

echo "  ✓ Project context blocked by TypeScript types"

# MCP tool schemas depend on project context being refactored
curl -s -X POST "$API_URL/dependencies" -H "Content-Type: application/json" -d "{
  \"story_id\": $SCHEMAS_STORY,
  \"depends_on_story_id\": $CONTEXT_STORY,
  \"dependency_type\": \"blocked_by\"
}" > /dev/null

echo "  ✓ MCP tool schemas blocked by project context"

# UI selector depends on Express API being ready
curl -s -X POST "$API_URL/dependencies" -H "Content-Type: application/json" -d "{
  \"story_id\": $UI_SELECTOR_STORY,
  \"depends_on_story_id\": $EXPRESS_API_STORY,
  \"dependency_type\": \"blocked_by\"
}" > /dev/null

echo "  ✓ UI project selector blocked by Express API"

# UI also depends on database schema changes
curl -s -X POST "$API_URL/dependencies" -H "Content-Type: application/json" -d "{
  \"story_id\": $UI_SELECTOR_STORY,
  \"depends_on_story_id\": $SCHEMA_STORY,
  \"dependency_type\": \"blocked_by\"
}" > /dev/null

echo "  ✓ UI project selector blocked by database schema"

echo ""
echo "✓ All dependencies created successfully!"
