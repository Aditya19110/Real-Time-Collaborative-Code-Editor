# Deployment Guide

## Project Structure for Deployment

This project is designed to be deployed as two separate services:
1. **Frontend (React)** - Static site on Vercel
2. **Backend (Node.js/Express + Socket.io)** - Web service on Render

## 🚀 Vercel Deployment (Frontend)

### Prerequisites
- GitHub account
- Vercel account (free)
- Code pushed to GitHub repository

### Steps:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it's a React app
   - **Important**: In "Environment Variables" section, add:
     - Key: `REACT_APP_BACKEND_URL`
     - Value: `https://your-backend-url.onrender.com` (replace with actual backend URL)
   - Click "Deploy"

3. **Configuration**
   - Vercel will use the `vercel.json` file automatically
   - Build command: `npm run build`
   - Output directory: `build`

### Environment Variables for Vercel:

**During Deployment Setup:**
1. In the Vercel deployment form, scroll down to "Environment Variables"
2. Add the following variables:

```
Key: REACT_APP_BACKEND_URL
Value: https://code-editor-backend-zh8c.onrender.com
```

```
Key: REACT_APP_SOCKET_TIMEOUT  
Value: 20000
```

```
Key: REACT_APP_RECONNECT_ATTEMPTS
Value: 10
```

```
Key: REACT_APP_PING_INTERVAL
Value: 25000
```

**Note:** Replace the backend URL with your actual Render backend URL once deployed.

## 🎯 Render Deployment (Backend)

### Prerequisites
- GitHub account
- Render account (free)
- Code pushed to GitHub repository

### Steps:

1. **Create Web Service on Render**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure service:
     - **Name**: `code-editor-backend`
     - **Region**: Choose closest to your users
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm run server:prod`

2. **Environment Variables for Render**
   ```
   NODE_ENV=production
   PORT=10000
   FRONTEND_ORIGIN=https://your-frontend-url.vercel.app
   ```

3. **Advanced Settings**
   - **Auto-Deploy**: Yes
   - **Health Check Path**: Leave empty

### Alternative: Using render.yaml
If you prefer infrastructure as code, you can use the `render.yaml` file:
1. In Render dashboard, go to "Blueprint"
2. Connect repository and select `render.yaml`

## 🔄 Full Deployment Process

### Step 1: Prepare Repository
```bash
# Ensure all files are committed
git add .
git commit -m "Deployment ready"
git push origin main
```

### Step 2: Deploy Backend First (Render)
1. Deploy backend service on Render
2. Note the backend URL (e.g., `https://code-editor-backend.onrender.com`)

### Step 3: Deploy Frontend (Vercel)
1. Deploy frontend on Vercel
2. Set `REACT_APP_BACKEND_URL` to your Render backend URL
3. Note the frontend URL (e.g., `https://code-editor.vercel.app`)

### Step 4: Update Backend CORS
1. In Render dashboard, update environment variable:
   - `FRONTEND_ORIGIN`: Your Vercel frontend URL

## 🛠 Alternative Deployment Options

### Option 1: Both on Render
- Deploy frontend as a static site on Render
- Deploy backend as a web service on Render

### Option 2: Both on Railway
- Deploy as monorepo with separate services

### Option 3: Backend on Railway, Frontend on Vercel
- Similar to Render + Vercel setup

## 🔧 Development vs Production

### Development URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5002`

### Production URLs:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`

## 📝 Environment Variables Summary

### Frontend (.env for local development):
```
REACT_APP_BACKEND_URL=http://localhost:5002
REACT_APP_SOCKET_TIMEOUT=20000
REACT_APP_RECONNECT_ATTEMPTS=10
REACT_APP_PING_INTERVAL=25000
```

### Backend Environment Variables:
```
NODE_ENV=production
PORT=10000
FRONTEND_ORIGIN=https://your-frontend-url.vercel.app
```

## 🚨 Important Notes

1. **CORS Configuration**: Backend automatically configures CORS based on `FRONTEND_ORIGIN`
2. **Socket.io**: Works seamlessly with the deployment setup
3. **File Uploads**: Temporary files are cleaned up automatically
4. **Python Execution**: Requires Python 3 on the server (Render provides this)
5. **Free Tier Limitations**: 
   - Render free tier has 750 hours/month
   - Vercel free tier is generous for static sites

## 🔍 Troubleshooting

### Common Issues:
1. **CORS Errors**: Check `FRONTEND_ORIGIN` environment variable
2. **Socket Connection Failed**: Verify `REACT_APP_BACKEND_URL` is correct
3. **Build Fails**: Check Node.js version compatibility
4. **Python Code Not Running**: Ensure Render service has Python installed

### Debugging:
- Check Render logs for backend issues
- Check Vercel function logs for frontend issues
- Use browser developer tools for client-side debugging
