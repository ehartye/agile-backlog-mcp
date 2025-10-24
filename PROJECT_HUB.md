# Project Hub Configuration

This project is registered with the Project Hub for easy management.

## Registration Details

- **Name**: agile-mcp
- **Type**: node
- **Port**: 3004
- **Description**: Agile backlog management MCP server with dependency visualization web UI

## Access URLs

- **Web UI**: http://100.76.77.115:3004
- **Hub Dashboard**: http://100.76.77.115:3000

## Starting the Project

### Via Project Hub Dashboard

1. Open http://100.76.77.115:3000
2. Find "agile-mcp" in the project list
3. Click "Start" to launch the project

### Via Command Line

```bash
# From the web-ui directory
cd web-ui
npm run dev
```

This will start:
- Express API server on port 3001
- Vite dev server on port 3004

## Port Configuration

The project is configured to use port **3004** (not 3000) to avoid conflicts:

- **Vite Config**: `web-ui/vite.config.ts` - port 3004, host 0.0.0.0
- **API Server**: `web-ui/server/index.ts` - port 3001
- **Documentation**: All references updated to port 3004

## First Time Setup

Before starting via the hub, make sure to:

```bash
# Install dependencies
npm install

# Build shared package
cd shared && npm run build && cd ..

# Build MCP server
cd mcp-server && npm run build && cd ..
```

## Accessing the Application

Once running, access these URLs:

- **Backlog List**: http://100.76.77.115:3004/
- **Dependency Graph**: http://100.76.77.115:3004/dag
- **Hierarchy Tree**: http://100.76.77.115:3004/tree
- **API Health**: http://100.76.77.115:3001/api/health

## Stopping the Project

Via hub dashboard or:

```bash
# Ctrl+C in the terminal running npm run dev
```

## Troubleshooting

### Port already in use
If port 3004 is already in use, you can either:
1. Stop the other service using port 3004
2. Update `web-ui/vite.config.ts` to use a different port

### Hub shows project as stopped
Run the build steps above, then start from the hub dashboard.
