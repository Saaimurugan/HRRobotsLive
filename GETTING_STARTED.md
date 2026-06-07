# Getting Started with HR Robots

This guide will help you set up HR Robots on your local machine for development and testing.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **AWS Account** - [Sign up](https://aws.amazon.com/)
- **AWS CLI** (optional but recommended) - [Install Guide](https://aws.amazon.com/cli/)

## 🚀 Quick Start (5 Minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/HRRobotsLive.git
cd HRRobotsLive
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including React, TensorFlow.js, face-api.js, and more.

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
# Windows: notepad .env
# Mac/Linux: nano .env
```

**Minimum required configuration:**
```env
# Get this from your AWS account (see below)
REACT_APP_API_GATEWAY_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev

# Get this from Google reCAPTCHA (see below)
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

### 4. Start Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`

## 🔧 Detailed Setup

### AWS Configuration

#### Option A: Quick Test (Using Existing API)
If the backend API is already deployed, just update your `.env` file with the API Gateway URL.

#### Option B: Deploy Your Own Backend (Recommended)
Follow the [Deployment Guide](DEPLOYMENT.md) to set up your own AWS infrastructure.

**Quick Backend Setup:**

1. **Create AWS Account**
   - Go to [aws.amazon.com](https://aws.amazon.com/)
   - Sign up for free tier

2. **Create IAM User**
   ```bash
   # Using AWS CLI
   aws iam create-user --user-name hrrobots-admin
   
   # Attach policies
   aws iam attach-user-policy --user-name hrrobots-admin \
     --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
   
   # Create access key
   aws iam create-access-key --user-name hrrobots-admin
   ```

3. **Configure Credentials**
   ```bash
   # Copy credentials template
   cp aws-credentials.example.txt aws-credentials.txt
   
   # Edit with your keys
   # Add your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   ```

4. **Deploy Lambda Functions**
   ```bash
   # Make deploy script executable
   chmod +x deploy-lambdas.sh
   
   # Run deployment
   ./deploy-lambdas.sh
   ```

### Google reCAPTCHA Setup

1. **Get reCAPTCHA Keys**
   - Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
   - Click "+" to create a new site
   - Select **reCAPTCHA v3**
   - Add your domain (for local: `localhost`)
   - Copy the **Site Key**

2. **Update Configuration**
   ```env
   # In .env file
   REACT_APP_RECAPTCHA_SITE_KEY=your_site_key_here
   ```

   ```javascript
   // In src/App.js (already configured)
   const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "default_key";
   ```

## 🎯 First-Time Setup Checklist

- [ ] Node.js installed and working (`node --version`)
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] AWS credentials set up (if deploying backend)
- [ ] Google reCAPTCHA configured
- [ ] Development server starts (`npm start`)
- [ ] Can access http://localhost:3000

## 📱 Testing the Application

### 1. Create Admin Account

First time running the app, you'll need to create an admin account:

```bash
# Call the createInitialAdmin Lambda function
# Or sign up through the UI at /signup
```

### 2. Test Core Features

**Login:**
- Go to http://localhost:3000/login
- Enter your credentials
- Accept EULA

**Create Job Description:**
- Click "Create JD" card
- Fill in role details
- Click "Generate Job Description"

**Create Template:**
- Click "Create Template"
- Add questions manually or use AI
- Save template

**Generate Test Link:**
- From dashboard, click "Generate Link" on any template
- Share link with test candidates

## 🛠️ Development Workflow

### Project Structure
```
HRRobotsLive/
├── src/
│   ├── components/     # React components
│   ├── services/       # Service layers
│   ├── utils/          # Helper functions
│   └── App.js         # Main app
├── public/            # Static assets
├── backend/           # Lambda functions
└── build/            # Production build
```

### Available Scripts

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Serve production build locally
npm run serve

# Lint code (if configured)
npm run lint
```

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit files in `src/`
   - Hot reload will update the browser

3. **Test your changes**
   ```bash
   npm test
   npm run build  # Ensure it builds
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add: your feature description"
   git push origin feature/your-feature-name
   ```

## 🐛 Troubleshooting

### Common Issues

#### Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

#### Node Modules Issues
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Build Fails
```bash
# Clear build cache
rm -rf build node_modules/.cache
npm run build
```

#### CORS Errors
- Check API Gateway CORS settings
- Ensure Lambda functions return proper headers
- Verify API endpoint URL in `.env`

#### Face Detection Not Working
```bash
# Models are in public/models/
# Check browser console for loading errors
# Ensure you're using HTTPS or localhost
```

### Getting Help

- **Documentation**: Read the [README](README.md)
- **Issues**: Check [GitHub Issues](https://github.com/your-org/HRRobotsLive/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/your-org/HRRobotsLive/discussions)

## 🎓 Learning Resources

### React
- [React Documentation](https://react.dev/)
- [React Router](https://reactrouter.com/)

### AWS
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [API Gateway](https://aws.amazon.com/api-gateway/)
- [DynamoDB](https://aws.amazon.com/dynamodb/)

### TensorFlow.js
- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [face-api.js](https://github.com/justadudewhohacks/face-api.js)

## 🎬 Next Steps

1. **Explore the code** - Check out `src/components/`
2. **Read the docs** - See [README](README.md) for features
3. **Try the demo** - Watch our [demo videos](https://www.youtube.com/watch?v=yq2vIY_Pt-A)
4. **Deploy your own** - Follow [DEPLOYMENT](DEPLOYMENT.md)
5. **Contribute** - Read [CONTRIBUTING](CONTRIBUTING.md)

## 💡 Quick Tips

- Use **React DevTools** browser extension for debugging
- Enable **Source Maps** in browser for better debugging
- Use **AWS CloudWatch** to monitor Lambda functions
- Check **Network tab** for API call issues
- Use **Application tab** to inspect localStorage/session

## 🚀 Production Deployment

When ready to deploy to production:

1. Follow the [Deployment Guide](DEPLOYMENT.md)
2. Set up proper AWS infrastructure
3. Configure domain and SSL
4. Enable monitoring and logging
5. Set up CI/CD pipeline

---

**Welcome to HR Robots! 🎉**

If you get stuck, don't hesitate to:
- Open an issue
- Ask in discussions
- Check existing documentation

Happy coding! 👨‍💻👩‍💻
