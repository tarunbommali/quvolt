# AWS EC2 Deployment Guide: QuizBolt

This document is the current deployment runbook for QuizBolt on EC2.

---

## 1. Architecture Summary

QuizBolt production deployment consists of:
- **client**: static Vite build served by Nginx.
- **server (OOP)**: Core API and Socket.IO service (Node.js).
- **payment-service**: Payments, subscriptions, and revenue APIs.
- **MongoDB + Redis**: Data persistence and real-time state.

---

## 2. EC2 Prerequisites

Recommended instance baseline:
- **t3.medium** (Minimum) / **t3.large** (Preferred for live sessions).

### Security Group Rules
- **22 (SSH)**: Restricted to trusted IPs.
- **80/443 (HTTP/S)**: Public.
- *Internal (5000/5001)*: Do not expose publicly.

---

## 3. Deployment Flow (PM2 + Nginx)

### Step 1: Install Dependencies
```bash
npm install
npm run install:all
```

### Step 2: Build and Move Client
```bash
cd client
npm run build
sudo mkdir -p /var/www/quizbolt
sudo cp -r dist/* /var/www/quizbolt/
```

### Step 3: Start Backend (PM2)
Ensure your `.env` is configured with production secrets and database URIs.
```bash
# Clean start
npm run prod:stop
npm run prod:start
npm run prod:save
npm run prod:status
```

The `ecosystem.config.js` manages:
- `quiz-server`: API cluster (Ports: 5000).
- `quiz-server-job-runner`: Background tasks.
- `payment-service`: Payment cluster (Ports: 5001).

---

## 4. Nginx Configuration

Create `/etc/nginx/sites-available/quizbolt`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/quizbolt;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # Backend API & Sockets
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Payment Service
    location /payment/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable and reload:
```bash
sudo ln -sf /etc/nginx/sites-available/quizbolt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 5. Operations and Troubleshooting

### Common Commands
- **Logs**: `npm run prod:logs` or `pm2 logs`.
- **Status**: `npm run prod:status`.
- **Restart**: `npm run prod:restart`.

### Port Collision (EADDRINUSE)
If ports 5000/5001 are blocked by stale processes:
```bash
# Use the cleanup helper
node scripts/free-dev-ports.js
# Or manual cleanup
for port in 5000 5001; do sudo fuser -k ${port}/tcp || true; done
npm run prod:start
```

### Verification Checklist
- [ ] `GET /api/health` returns 200.
- [ ] `GET /payment/health` returns 200.
- [ ] WebSocket connection upgrades correctly (101 Switching Protocols).
- [ ] Shared `.env` has consistent `JWT_SECRET` across all services.
