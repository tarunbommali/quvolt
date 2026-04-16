# AWS EC2 Deployment Guide: QuizBolt

This document is the current deployment runbook for QuizBolt on EC2.

## 1. Architecture Summary

QuizBolt production deployment consists of:
- client: static Vite build served by Nginx
- server: main API and Socket.IO service
- payment-service: payments, subscriptions, and revenue APIs
- MongoDB and Redis: data + realtime/session support

Recommended path for a single EC2 host:
- PM2 + Nginx process deployment using `ecosystem.config.js`.

Future option:
- Docker Compose deployment can be introduced later if you choose containerized operations.

## 2. EC2 Prerequisites

Recommended instance baseline:
- t3.medium minimum
- t3.large preferred for moderate live-session traffic

Security group inbound rules:
- 22 (SSH) from trusted IPs only
- 80 (HTTP) from internet
- 443 (HTTPS) from internet

Do not expose 5000/5001 publicly if Nginx is the edge.

System packages (Ubuntu 22.04/24.04):

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx
```

Critical production rule:
- Do not run npm run dev on EC2 production hosts.
- npm run dev launches nodemon processes and can conflict with PM2-managed services, causing EADDRINUSE on 5000/5001.

## 3. Prepare Application

```bash
git clone <your-repo-url> quiz-bolt
cd quiz-bolt
cp .env.example .env
```

Update .env with production values.

Required highlights:
- SERVER_PORT=5000
- PAYMENT_SERVICE_PORT=5001
- MONGO_URI and DATABASE_URL (Atlas or managed Mongo)
- REDIS_URL
- JWT_SECRET and JWT_REFRESH_SECRET
- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / WEBHOOK_SECRET
- CLIENT_URL and CORS_ORIGIN with your HTTPS domain
- VITE_API_URL=/api

Important:
- Keep one shared root .env as the single source of truth.
- Use strong random secrets for JWT and webhook keys.

## 4. Deployment (Current): PM2 + Nginx on EC2

### Install app dependencies

```bash
npm install
npm run install:all
```

Build client:

```bash
cd client
npm run build
cd ..
```

Copy built client:

```bash
sudo mkdir -p /var/www/quizbolt
sudo cp -r client/dist/* /var/www/quizbolt/
```

### Start backend processes with PM2

```bash
mkdir -p logs
npx pm2 start ecosystem.config.js --env production
npx pm2 save
npx pm2 startup
```

Alternative with root scripts:

```bash
npm run prod:start
npm run prod:save
npm run prod:status
```

The ecosystem file starts:
- quiz-server (cluster)
- quiz-server-job-runner (single instance)
- payment-service (cluster)
- payment-service-job-runner (single instance)

### Nginx site config

Create /etc/nginx/sites-available/quizbolt:

```nginx
server {
   listen 80;
   server_name yourdomain.com;
   root /var/www/quizbolt;
   index index.html;

   location / {
      try_files $uri /index.html;
   }

   location /api/ {
      proxy_pass http://127.0.0.1:5000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   }

   location /socket.io/ {
      proxy_pass http://127.0.0.1:5000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
   }

   location /payment/ {
      proxy_pass http://127.0.0.1:5001;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   }
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/quizbolt /etc/nginx/sites-enabled/quizbolt
sudo nginx -t
sudo systemctl reload nginx
```

Enable TLS:

```bash
sudo certbot --nginx -d yourdomain.com
```

## 5. Post-Deployment Verification

Required checks:
- GET /api/health returns status healthy
- GET /payment/health returns status healthy
- host flow transitions: draft -> waiting -> live -> completed
- abort flow transitions to aborted
- cross-host mutation attempts return 403
- paid quiz join enforcement works only after successful payment state

Recommended pre-release gates:

```bash
npm run lint:client
npm run build:client
npm run test:server
npm run test:payment
cd server && npm run test:integration
```

## 6. Operations and Rollback

PM2 operations:

```bash
npx pm2 status
npx pm2 logs
npx pm2 restart all
```

Safe restart after deploy:

```bash
npm run prod:stop
npm run prod:start
npm run prod:save
```

One-shot EC2 deploy helper:

```bash
chmod +x scripts/ec2-prod-deploy.sh
./scripts/ec2-prod-deploy.sh /home/ubuntu/quvolt
```

Quick rollback strategy:
- keep previous git tag available
- checkout previous tag
- redeploy using the same PM2 command path

## 7. Common Failure Checks

- EADDRINUSE on 5000/5001:
   - stop PM2 and stale listeners, then start only PM2 ecosystem

```bash
pm2 delete all || true
for port in 5000 5001; do sudo fuser -k ${port}/tcp || true; done
npm run prod:start
```

- Socket disconnects: confirm Upgrade/Connection headers in Nginx for /socket.io/
- 401/403 across services: confirm JWT_SECRET consistency in shared .env
- Payment verify/webhook mismatch: confirm Razorpay key pair and WEBHOOK_SECRET
- Service boot failure: check missing env vars from server/config/env.js and payment-service/config/env.js

