# Quick Start Guide

Get up and running with Agile MCP in 5 minutes.

## Installation

```bash
# Install dependencies
npm install

# Build shared package
cd shared && npm run build && cd ..

# Build MCP server
cd mcp-server && npm run build && cd ..
```

## Test the System

### 1. Start the Web UI

```bash
cd web-ui
npm run dev
```

Visit http://localhost:3004 - you should see an empty backlog.

### 2. Use the MCP Server with Claude Code

If you're using Claude Code, the MCP server is already configured. Try these commands:

```
Create an epic called "User Authentication System" with description "Implement secure user authentication"
```

```
Create a story called "Login Page" in the authentication epic with description "Build a login form with email and password"
```

```
Create another story called "Session Management" with description "Implement JWT-based session management"
```

```
Add a dependency: Login Page depends on Session Management
```

```
List all stories
```

### 3. View in Web UI

Refresh the web UI at http://localhost:3004 and you should see:
- **Backlog List**: Your stories listed with details
- **Dependency Graph** (/dag): Visual representation of dependencies
- **Hierarchy Tree** (/tree): Tree view of epics and stories

## Example Workflow

### Creating a Complete Epic

```
Create an epic "E-commerce Features"
```

```
Add these stories to the E-commerce epic:
1. "Shopping Cart" - Users can add items to cart
2. "Checkout Flow" - Users can complete purchases
3. "Payment Integration" - Integrate Stripe for payments
4. "Order History" - Users can view past orders
```

```
Add dependencies:
- Checkout Flow depends on Shopping Cart
- Payment Integration depends on Checkout Flow
- Order History depends on Payment Integration
```

```
Create tasks for the Shopping Cart story:
1. "Design cart UI" - Create mockups for cart interface
2. "Implement add to cart" - Add backend endpoint and frontend logic
3. "Cart persistence" - Save cart to localStorage and database
```

### Visualizing Dependencies

Open http://localhost:3004/dag to see:
- Nodes colored by status (gray=todo, blue=in progress, etc.)
- Arrows showing dependencies
- Interactive zoom and pan

### Updating Status

```
Update the "Shopping Cart" story status to "in_progress"
```

```
Update task "Design cart UI" status to "done"
```

Refresh the web UI to see updated colors and status.

### Exporting to Markdown

```
Export the backlog to markdown files
```

Check the `.agile-backlog/` directory for markdown files organized by epic.

## Common Commands

### Epic Management
```
Create an epic "Epic Name" with description "Epic description"
List all epics
Update epic #1 status to "in_progress"
Delete epic #1
```

### Story Management
```
Create a story "Story Name" with description "Story description" and priority "high"
Add story to epic #1
Set story #2 points to 5
List stories with status "in_progress"
```

### Dependency Management
```
Add dependency: story #2 depends on story #1
List dependencies for story #2
Remove dependency #1
```

### Status Updates
```
Move story #1 to in_progress
Mark task #3 as done
Block story #2
```

## Tips

1. **Use Filters**: In the web UI backlog list, use filters to find specific stories
2. **Zoom the Graph**: Use mouse wheel to zoom in/out on the dependency graph
3. **Check Circular Dependencies**: The system automatically prevents circular dependencies
4. **Export Regularly**: Use the export tool to create markdown snapshots of your backlog
5. **Color Legend**: In the web UI sidebar, check the status color legend

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore the MCP tools and resources
- Customize the status workflow in `shared/src/database.ts`
- Add custom views to the web UI

## Troubleshooting

### MCP Server not appearing in Claude Code
1. Check that the build completed successfully
2. Verify the path in Claude config is correct
3. Restart Claude Code

### Web UI not loading
1. Ensure both API server (port 3001) and client (port 3004) are running
2. Check for port conflicts
3. Clear browser cache and reload

### Database errors
1. Check that `shared` package is built
2. Verify database file permissions
3. Delete `agile-backlog.db` to start fresh (warning: loses all data)
