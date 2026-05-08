# Test Analytics Platform

An AI-powered Test Analytics and Failure Intelligence Platform for automated test reporting, predictive failure analysis, and intelligent defect correlation.

## 🚀 Features

### Core Capabilities
- **Automated Test Execution Tracking** - Captures Cucumber test reports from Jenkins pipelines
- **Interactive Heatmap Visualization** - Daily execution heatmap with pass/fail trends
- **AI-Powered Failure Analysis** - Intelligent root cause prediction using OpenAI
- **Jira Integration** - Automatic defect correlation and ticket creation
- **Flaky Test Detection** - Identifies tests with inconsistent behavior
- **Trend Analytics** - Historical failure patterns and predictive insights
- **Real-time Dashboard** - Comprehensive metrics and KPIs

### AI Intelligence Features
- Match current failures with historical executions
- Identify recurring vs new failures
- Cluster similar failures
- Predict probable root causes
- Suggest related Jira defects
- Detect flaky tests automatically
- Generate failure summaries

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: React + Material-UI
- **Charts**: Recharts
- **AI**: OpenAI GPT-4
- **Integrations**: Jenkins, Jira Cloud APIs

### Project Structure
```
test-analytics-platform/
├── server/
│   ├── config/
│   │   └── database.js          # PostgreSQL configuration
│   ├── services/
│   │   ├── aiAnalysisService.js # AI failure analysis
│   │   └── jiraService.js       # Jira integration
│   └── index.js                 # Express server
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Heatmap.js
│   │   │   ├── Analytics.js
│   │   │   ├── Executions.js
│   │   │   ├── ExecutionDetails.js
│   │   │   └── FlakyTests.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── .env.example
├── package.json
└── README.md
```

## 📋 Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+
- OpenAI API key (for AI analysis)
- Jira Cloud account (optional)
- Jenkins (for CI/CD integration)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd test-analytics-platform
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_analytics
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# Jira Configuration (optional)
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=TEST

# Jenkins Configuration (optional)
JENKINS_URL=http://localhost:8080
JENKINS_USER=admin
JENKINS_TOKEN=your_jenkins_token
```

### 4. Setup Database
```bash
# Create PostgreSQL database
createdb test_analytics

# Initialize database schema (automatic on first run)
npm start
```

## 🚀 Running the Application

### Development Mode
```bash
# Run both backend and frontend concurrently
npm run dev

# Or run separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### Production Mode
```bash
# Build frontend
npm run build

# Start server
npm start
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📊 Usage

### 1. Jenkins Integration

Add a post-build action in your Jenkins pipeline to send Cucumber reports:

```groovy
post {
    always {
        script {
            def cucumberReport = readJSON file: 'target/cucumber-report.json'
            
            httpRequest(
                url: 'http://your-server:5000/api/executions',
                httpMode: 'POST',
                contentType: 'APPLICATION_JSON',
                requestBody: groovy.json.JsonOutput.toJson([
                    buildNumber: env.BUILD_NUMBER,
                    buildUrl: env.BUILD_URL,
                    environment: 'staging',
                    gitCommit: env.GIT_COMMIT,
                    gitBranch: env.GIT_BRANCH,
                    cucumberReport: cucumberReport,
                    metadata: [
                        executor: env.BUILD_USER,
                        duration: currentBuild.duration
                    ]
                ])
            )
        }
    }
}
```

### 2. Manual Report Upload

```bash
curl -X POST http://localhost:5000/api/executions \
  -H "Content-Type: application/json" \
  -d @sample-cucumber-report.json
```

### 3. API Endpoints

#### Test Executions
- `POST /api/executions` - Create new execution
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details

#### Analytics
- `GET /api/heatmap` - Get heatmap data
- `GET /api/analytics/trends` - Get failure trends
- `GET /api/analytics/flaky-tests` - Get flaky tests
- `GET /api/analytics/top-failures` - Get top failures

#### AI Analysis
- `GET /api/analysis/:scenarioId` - Get AI analysis
- `POST /api/analysis/:scenarioId/reanalyze` - Trigger re-analysis

#### Jira Integration
- `POST /api/jira/sync` - Sync Jira defects
- `POST /api/jira/create-defect` - Create defect from failure

## 🎨 Dashboard Features

### 1. Dashboard
- Real-time execution metrics
- Pass/fail trends
- Top failures
- Recent executions

### 2. Heatmap
- Visual representation of test health
- Date and environment-based filtering
- Interactive drill-down
- Color-coded pass rates

### 3. Analytics
- Environment performance comparison
- Flaky test detection
- Failure frequency analysis
- Pass/fail distribution

### 4. Executions
- Complete execution history
- Detailed execution views
- Feature-level breakdown
- Scenario-level insights

### 5. Flaky Tests
- Automated flaky test detection
- Flaky score calculation
- Pass/fail history
- Recommendations

## 🤖 AI Analysis

The platform uses OpenAI GPT-4 to provide intelligent failure analysis:

1. **Failure Classification** - Categorizes failures (Infrastructure, Application Bug, Data Issue, etc.)
2. **Root Cause Prediction** - Suggests probable causes based on error patterns
3. **Historical Correlation** - Finds similar past failures
4. **Jira Ticket Matching** - Links to related defects
5. **Flaky Test Detection** - Identifies inconsistent test behavior
6. **New Failure Detection** - Flags previously unseen failures

## 🔧 Configuration

### Database Schema
The application automatically creates the following tables:
- `test_executions` - Test run metadata
- `features` - Feature-level results
- `scenarios` - Scenario-level results
- `steps` - Step-level details
- `failure_analysis` - AI analysis results
- `jira_defects` - Synced Jira tickets
- `flaky_tests` - Flaky test tracking

### Customization
- Modify AI prompts in `server/services/aiAnalysisService.js`
- Adjust flaky test thresholds in the same file
- Customize UI theme in `client/src/App.js`

## 🚢 Deployment

### Docker Deployment (Recommended)

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN cd client && npm install && npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t test-analytics .
docker run -p 5000:5000 --env-file .env test-analytics
```

### Cloud Deployment
- **AWS**: Deploy on EC2 with RDS PostgreSQL
- **Azure**: Use App Service with Azure Database for PostgreSQL
- **Heroku**: Deploy with Heroku Postgres add-on
- **Vercel/Netlify**: Frontend only (requires separate backend)

## 📈 Monitoring

- Health check endpoint: `GET /api/health`
- Database connection monitoring
- API response time tracking
- Error logging with Winston

## 🔒 Security

- Environment variables for sensitive data
- Helmet.js for HTTP security headers
- CORS configuration
- Input validation
- SQL injection prevention with parameterized queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review API endpoints

## 🎯 Roadmap

- [ ] Real-time notifications (Slack/Teams)
- [ ] Advanced ML models for failure prediction
- [ ] Custom report templates
- [ ] Multi-project support
- [ ] Role-based access control
- [ ] Export capabilities (PDF, Excel)
- [ ] Mobile responsive improvements
- [ ] GraphQL API
- [ ] Webhook support
- [ ] Test execution scheduling

## 📚 Additional Resources

- [Cucumber Documentation](https://cucumber.io/docs)
- [Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [OpenAI API](https://platform.openai.com/docs)

---

Built with ❤️ for QA Engineers and DevOps Teams