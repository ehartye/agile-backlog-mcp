# Deployment Guide

> Complete guide for deploying Agile MCP in production environments

## Table of Contents

- [Prerequisites](#prerequisites)
- [Build Process](#build-process)
- [MCP Server Deployment](#mcp-server-deployment)
- [Web UI Deployment](#web-ui-deployment)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running in Production](#running-in-production)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Operating System**: Linux, macOS, or Windows
- **RAM**: Minimum 512MB (1GB recommended)
- **Disk Space**: 500MB for application + database
- **Network**: Port 3004 available for API server

### Dependencies

All dependencies are listed in package.json files. No external services required (SQLite is embedded).

---

## Build Process

### 1. Clone Repository

```bash
git clone https://github.com/your-org/agile-mcp.git
cd agile-mcp
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This installs dependencies for:
- Root workspace
- `shared/` package
- `mcp-server/` package
- `web-ui/` package

### 3. Build All Packages

```bash
# Build shared package first (required by others)
cd shared
npm run build
cd ..

# Build MCP server
cd mcp-server
npm run build
cd ..

# Build Web UI
cd web-ui
npm run build
cd ..
```

### Verify Build

```bash
# Check compiled outputs
ls -la shared/dist/
ls -la mcp-server/dist/
ls -la web-ui/dist/
```

Expected outputs:
- `shared/dist/`: JavaScript files + `.d.ts` type definitions
- `mcp-server/dist/`: JavaScript files with `index.js` entry point
- `web-ui/dist/`: Static HTML, CSS, JS bundle + `server/` directory

---

## MCP Server Deployment

### For Claude Desktop

The MCP server runs as a child process of Claude Desktop via stdio transport.

**Configuration file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Add to config:**
```json
{
  "mcpServers": {
    "agile-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/agile-mcp/mcp-server/dist/index.js"]
    }
  }
}
```

**Important**: Use absolute path, not relative path.

### For Claude Code

Claude Code automatically detects MCP servers in project directories. No manual configuration needed.

### Standalone Deployment

For headless/server deployments:

```bash
# Run MCP server via stdio
cd mcp-server
node dist/index.js
```

Connect via MCP client using stdio transport.

---

## Web UI Deployment

### Option 1: Node.js Server (Recommended)

Run the built Express server that serves both API and static files.

**1. Build the Web UI:**
```bash
cd web-ui
npm run build
```

**2. Start the server:**
```bash
cd web-ui
npm start
```

This runs:
- Express API server on port 3004 (or `PORT` env variable)
- Serves static React build from `dist/`

**3. Access the application:**
```
http://your-server:3004/
```

### Option 2: Nginx Reverse Proxy

For production deployments with Nginx:

**1. Build the Web UI:**
```bash
cd web-ui
npm run build
```

**2. Start API server:**
```bash
cd web-ui
node dist/server/index.js
```

**3. Configure Nginx:**
```nginx
server {
    listen 80;
    server_name agile-mcp.example.com;

    # Serve static files
    location / {
        root /path/to/agile-mcp/web-ui/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**4. Restart Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Option 3: Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY web-ui/package*.json ./web-ui/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY web-ui/ ./web-ui/

# Build packages
RUN cd shared && npm run build
RUN cd web-ui && npm run build

# Expose port
EXPOSE 3004

# Start server
CMD ["node", "web-ui/dist/server/index.js"]
```

**Build and run:**
```bash
docker build -t agile-mcp .
docker run -p 3004:3004 -v $(pwd)/agile-backlog.db:/app/agile-backlog.db agile-mcp
```

---

## Database Setup

### Database Location

The SQLite database is created at `./agile-backlog.db` relative to the project root.

**For production**, consider moving to a dedicated location:

```bash
# Create data directory
mkdir -p /var/lib/agile-mcp

# Set permissions
chown app-user:app-group /var/lib/agile-mcp
chmod 750 /var/lib/agile-mcp
```

### Database Initialization

The database is automatically initialized on first run. The `AgileDatabase` class:
1. Checks if database file exists
2. Creates file if missing
3. Runs schema initialization
4. Executes migrations
5. Enables foreign keys and WAL mode

**No manual setup required.**

### Migrations

Automatic migrations run on database initialization:
- Stories `project_id` column migration
- Agent identifier column migrations
- Identifier-based project system migration

**Check migration status:**
```bash
# The database class logs migration activity
# Check console output on first run
```

### Pre-populate Data (Optional)

For testing or demo environments:

```bash
# Use the MCP tools via Claude or API to create initial data
# Or write a seed script using the shared database class
```

---

## Environment Configuration

### Environment Variables

**API Server (web-ui/server/index.ts):**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3004` | API server port |
| `NODE_ENV` | `development` | Node environment |
| `DB_PATH` | `./agile-backlog.db` | Database file path |

**Example `.env` file:**
```bash
PORT=3004
NODE_ENV=production
DB_PATH=/var/lib/agile-mcp/agile-backlog.db
```

**Load with:**
```bash
npm install dotenv

# In server/index.ts
require('dotenv').config();
```

### Port Configuration

**Change API server port:**
```bash
PORT=8080 node web-ui/dist/server/index.js
```

**Update Vite proxy (for development):**
```typescript
// web-ui/vite.config.ts
export default defineConfig({
  server: {
    port: 3005,
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Match PORT env var
        changeOrigin: true
      }
    }
  }
});
```

---

## Running in Production

### Process Management with PM2

**Install PM2:**
```bash
npm install -g pm2
```

**Create ecosystem file:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'agile-mcp-api',
    script: './web-ui/dist/server/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3004
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**Start with PM2:**
```bash
# Start application
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Setup auto-restart on boot
pm2 startup
```

**PM2 Commands:**
```bash
pm2 list              # List processes
pm2 logs agile-mcp-api  # View logs
pm2 restart agile-mcp-api
pm2 stop agile-mcp-api
pm2 delete agile-mcp-api
```

### Systemd Service (Linux)

**Create service file:**
```ini
# /etc/systemd/system/agile-mcp.service
[Unit]
Description=Agile MCP API Server
After=network.target

[Service]
Type=simple
User=app-user
WorkingDirectory=/path/to/agile-mcp
Environment="NODE_ENV=production"
Environment="PORT=3004"
ExecStart=/usr/bin/node web-ui/dist/server/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable agile-mcp
sudo systemctl start agile-mcp
sudo systemctl status agile-mcp
```

**View logs:**
```bash
sudo journalctl -u agile-mcp -f
```

---

## Monitoring & Logging

### Application Logs

**Console Logging:**
```typescript
// Add to web-ui/server/index.ts
import morgan from 'morgan';

app.use(morgan('combined'));
```

**File Logging:**
```bash
# With PM2
pm2 logs agile-mcp-api

# With systemd
journalctl -u agile-mcp -f

# Manual redirect
node dist/server/index.js >> /var/log/agile-mcp/app.log 2>&1
```

### Health Monitoring

**Health check endpoint:**
```bash
curl http://localhost:3004/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

**Uptime monitoring:**
```bash
# With PM2
pm2 monit

# Or use external tools:
# - UptimeRobot
# - Pingdom
# - New Relic
```

### Security Log Monitoring

**Check security logs regularly:**
```bash
curl http://localhost:3004/api/security-logs?limit=100
```

**Watch for:**
- `unauthorized_access` events
- `project_violation` attempts
- Unusual agent activity

### Performance Monitoring

**Database stats:**
```sql
-- Check database size
.databases

-- Check table row counts
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM epics;
SELECT COUNT(*) FROM stories;
SELECT COUNT(*) FROM tasks;

-- Check WAL mode
PRAGMA journal_mode;
```

---

## Backup & Recovery

### Database Backup

**Manual backup:**
```bash
# Simple copy (stop application first)
cp agile-backlog.db agile-backlog.backup.$(date +%Y%m%d).db

# Or use SQLite backup command
sqlite3 agile-backlog.db ".backup agile-backlog.backup.db"
```

**Automated backup script:**
```bash
#!/bin/bash
# backup-agile-mcp.sh

DB_PATH="/path/to/agile-backlog.db"
BACKUP_DIR="/backups/agile-mcp"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Create backup
sqlite3 $DB_PATH ".backup $BACKUP_DIR/agile-backlog-$DATE.db"

# Compress
gzip $BACKUP_DIR/agile-backlog-$DATE.db

# Keep last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: agile-backlog-$DATE.db.gz"
```

**Schedule with cron:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-agile-mcp.sh
```

### Database Restore

**From backup:**
```bash
# Stop application
pm2 stop agile-mcp-api

# Restore database
cp agile-backlog.backup.db agile-backlog.db

# Or
gunzip -c agile-backlog-20251024.db.gz > agile-backlog.db

# Start application
pm2 start agile-mcp-api
```

### Export Data

**Via MCP tool:**
```
Tool: export_backlog
{
  "project_identifier": "my-app",
  "agent_identifier": "admin"
}
```

**Manual SQL export:**
```bash
sqlite3 agile-backlog.db .dump > agile-backlog-dump.sql
```

---

## Security Considerations

### Database Security

**File permissions:**
```bash
chmod 600 agile-backlog.db
chown app-user:app-group agile-backlog.db
```

**Location:**
- Store outside web root
- Use non-default filename
- Restrict access to application user only

### API Security

**Add authentication middleware (recommended for production):**

```typescript
// web-ui/server/index.ts
import { auth } from './middleware/auth';

app.use('/api', auth);
```

**CORS configuration:**
```typescript
import cors from 'cors';

// Restrict origins in production
app.use(cors({
  origin: 'https://your-domain.com',
  credentials: true
}));
```

**Rate limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per window
});

app.use('/api', limiter);
```

### Network Security

**Firewall rules:**
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP (if using Nginx)
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 3004/tcp   # API (or use Nginx proxy)
sudo ufw enable
```

**HTTPS with Let's Encrypt:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d agile-mcp.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### MCP Server Security

**Project isolation:**
- All operations require `project_identifier`
- Cross-project access blocked
- Security events logged

**Audit trail:**
- Review security logs regularly
- Monitor for unauthorized access attempts
- Track agent activity

---

## Troubleshooting

### API Server Won't Start

**Check port availability:**
```bash
lsof -i :3004
```

**Check logs:**
```bash
pm2 logs agile-mcp-api
# or
journalctl -u agile-mcp -f
```

**Common issues:**
- Port already in use → Change `PORT` env variable
- Database file permissions → Check ownership and permissions
- Missing build files → Run `npm run build`

### Database Errors

**"Database is locked":**
```bash
# Check for stuck processes
lsof agile-backlog.db

# Kill stuck processes
kill -9 <PID>

# Verify WAL mode
sqlite3 agile-backlog.db "PRAGMA journal_mode;"
# Should return: wal
```

**Foreign key violations:**
```bash
# Check foreign key status
sqlite3 agile-backlog.db "PRAGMA foreign_keys;"
# Should return: 1

# If 0, database needs to be rebuilt
# Backup data, drop tables, recreate
```

### MCP Server Issues

**Server not appearing in Claude:**
- Verify absolute path in config
- Check Node.js is in PATH
- Restart Claude Desktop
- Check Claude logs

**Tool errors:**
- Verify project is registered
- Check `project_identifier` spelling
- Review security logs for violations

### Web UI Issues

**Blank page:**
- Check browser console for errors
- Verify API server is running
- Check API health endpoint
- Clear browser cache

**API connection failed:**
- Verify API server URL
- Check CORS configuration
- Check network/firewall rules

### Performance Issues

**Slow queries:**
```bash
# Analyze query performance
sqlite3 agile-backlog.db
.timer on
SELECT * FROM stories WHERE project_id = 1;

# Check database size
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();
```

**High memory usage:**
- Check for memory leaks in Node.js
- Monitor with `pm2 monit`
- Restart server if necessary

**Database growing too large:**
- Implement data archival strategy
- Delete old security logs
- Vacuum database: `VACUUM;`

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor security logs
- Check application health
- Review error logs

**Weekly:**
- Database backup
- Review disk space
- Check for updates

**Monthly:**
- Database vacuum
- Archive old data
- Review security events

### Updates

**Update dependencies:**
```bash
# Check for updates
npm outdated

# Update packages
npm update

# Rebuild
npm run build
```

**Database migrations:**
```bash
# Migrations run automatically on startup
# Backup database before major updates
```

---

## Production Checklist

- [ ] All packages built successfully
- [ ] Database file permissions set (600)
- [ ] Environment variables configured
- [ ] Process manager configured (PM2/systemd)
- [ ] Automated backups scheduled
- [ ] Health monitoring enabled
- [ ] Security logs reviewed
- [ ] HTTPS configured (if public)
- [ ] Firewall rules applied
- [ ] Documentation reviewed
- [ ] Disaster recovery plan documented

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
