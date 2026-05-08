# Deployment Guide

This guide covers various deployment options for the Test Analytics Platform.

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Production Checklist](#production-checklist)

---

## Local Development

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### Setup Steps

1. **Clone and Install**
```bash
git clone <repository-url>
cd test-analytics-platform
npm run install-all
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup Database**
```bash
# Create database
createdb test_analytics

# Database schema will be created automatically on first run
```

4. **Generate Sample Data (Optional)**
```bash
node server/scripts/sampleData.js
```

5. **Run Application**
```bash
npm run dev
```

Access at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Create docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: test_analytics
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=test_analytics
      - DB_USER=postgres
      - DB_PASSWORD=your_secure_password
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JIRA_HOST=${JIRA_HOST}
      - JIRA_EMAIL=${JIRA_EMAIL}
      - JIRA_API_TOKEN=${JIRA_API_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

2. **Create Dockerfile**
```dockerfile
FROM node:16-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install --production
RUN cd client && npm install

# Copy source code
COPY . .

# Build frontend
RUN cd client && npm run build

# Production image
FROM node:16-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
```

3. **Deploy**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Using Docker Only

```bash
# Build image
docker build -t test-analytics .

# Run PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_DB=test_analytics \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:14-alpine

# Run application
docker run -d \
  --name test-analytics \
  --link postgres:postgres \
  -p 5000:5000 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=your_password \
  -e OPENAI_API_KEY=your_key \
  test-analytics
```

---

## Cloud Deployment

### AWS Deployment

#### Option 1: EC2 + RDS

1. **Setup RDS PostgreSQL**
```bash
# Create RDS instance via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier test-analytics-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YourPassword123 \
  --allocated-storage 20
```

2. **Launch EC2 Instance**
```bash
# Amazon Linux 2 or Ubuntu
# Install Node.js and PostgreSQL client
sudo yum install -y nodejs npm postgresql

# Clone and setup application
git clone <repository-url>
cd test-analytics-platform
npm run install-all

# Configure environment
cp .env.example .env
# Edit .env with RDS endpoint

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start server/index.js --name test-analytics
pm2 startup
pm2 save
```

3. **Setup Nginx Reverse Proxy**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: ECS (Elastic Container Service)

1. **Push Docker image to ECR**
```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t test-analytics .
docker tag test-analytics:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/test-analytics:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/test-analytics:latest
```

2. **Create ECS Task Definition and Service**
- Use AWS Console or CloudFormation
- Configure environment variables
- Set up load balancer
- Configure auto-scaling

### Azure Deployment

#### Azure App Service + Azure Database for PostgreSQL

1. **Create PostgreSQL Database**
```bash
az postgres server create \
  --resource-group myResourceGroup \
  --name test-analytics-db \
  --location eastus \
  --admin-user myadmin \
  --admin-password YourPassword123 \
  --sku-name B_Gen5_1
```

2. **Deploy to App Service**
```bash
# Create App Service
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name test-analytics-app \
  --runtime "NODE|16-lts"

# Configure environment variables
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name test-analytics-app \
  --settings \
    DB_HOST=test-analytics-db.postgres.database.azure.com \
    DB_USER=myadmin@test-analytics-db \
    DB_PASSWORD=YourPassword123 \
    OPENAI_API_KEY=your_key

# Deploy code
az webapp deployment source config-zip \
  --resource-group myResourceGroup \
  --name test-analytics-app \
  --src app.zip
```

### Heroku Deployment

1. **Create Heroku App**
```bash
heroku create test-analytics-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set OPENAI_API_KEY=your_key
heroku config:set JIRA_HOST=your_jira_host
heroku config:set JIRA_EMAIL=your_email
heroku config:set JIRA_API_TOKEN=your_token
```

2. **Create Procfile**
```
web: npm start
```

3. **Deploy**
```bash
git push heroku main
heroku open
```

### DigitalOcean App Platform

1. **Create app.yaml**
```yaml
name: test-analytics
services:
  - name: web
    github:
      repo: your-username/test-analytics-platform
      branch: main
    build_command: npm run install-all && cd client && npm run build
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: OPENAI_API_KEY
        value: ${OPENAI_API_KEY}
        type: SECRET
    http_port: 5000

databases:
  - name: db
    engine: PG
    version: "14"
```

2. **Deploy via CLI or Console**
```bash
doctl apps create --spec app.yaml
```

---

## Production Checklist

### Security
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Set up HTTPS with SSL certificates (Let's Encrypt)
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates

### Performance
- [ ] Enable database connection pooling
- [ ] Set up database indexes
- [ ] Configure caching (Redis)
- [ ] Enable gzip compression
- [ ] Optimize frontend bundle size
- [ ] Use CDN for static assets
- [ ] Set up database backups

### Monitoring
- [ ] Set up application logging
- [ ] Configure error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Configure performance monitoring (New Relic, DataDog)
- [ ] Set up alerts for failures
- [ ] Monitor database performance
- [ ] Track API response times

### Backup & Recovery
- [ ] Automated database backups
- [ ] Test restore procedures
- [ ] Document recovery process
- [ ] Set up disaster recovery plan

### CI/CD
- [ ] Set up automated testing
- [ ] Configure deployment pipeline
- [ ] Implement blue-green deployment
- [ ] Set up staging environment
- [ ] Automate database migrations

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=test_analytics
DB_USER=your-db-user
DB_PASSWORD=strong-password

# OpenAI
OPENAI_API_KEY=your-production-key
OPENAI_MODEL=gpt-4

# Jira
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-production-token
JIRA_PROJECT_KEY=PROD

# Jenkins
JENKINS_URL=https://jenkins.company.com
JENKINS_USER=api-user
JENKINS_TOKEN=your-jenkins-token

# Frontend
FRONTEND_URL=https://analytics.company.com

# Security
SESSION_SECRET=random-secure-string
JWT_SECRET=another-random-string

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
```

### Scaling Considerations

#### Horizontal Scaling
- Use load balancer (AWS ALB, Nginx)
- Stateless application design
- Shared database connection pool
- Session management with Redis

#### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add database read replicas
- Implement caching layer

### Maintenance

#### Regular Tasks
- Database vacuum and analyze
- Log rotation
- Security patches
- Dependency updates
- Performance optimization
- Backup verification

#### Monitoring Metrics
- API response times
- Database query performance
- Error rates
- Memory usage
- CPU utilization
- Disk space
- Active connections

---

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check credentials
psql -h localhost -U postgres -d test_analytics

# Check firewall rules
sudo ufw status
```

**Port Already in Use**
```bash
# Find process using port
lsof -i :5000
netstat -ano | findstr :5000

# Kill process
kill -9 <PID>
```

**Build Failures**
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Clear client cache
cd client
rm -rf node_modules package-lock.json
npm install
```

**Database Migration Issues**
```bash
# Reset database (development only)
dropdb test_analytics
createdb test_analytics
npm start
```

---

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Review firewall rules
5. Check service status

For additional help, refer to the main README.md or create an issue on GitHub.