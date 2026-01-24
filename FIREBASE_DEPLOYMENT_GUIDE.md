# Firebase App Hosting Deployment Setup

## Current Status
- ✅ Firebase project configured: `kollectcare-rwe-study`
- ✅ Firestore rules and indexes deployed
- ✅ Next.js application built successfully
- ✅ Docker configuration ready for App Hosting
- ✅ Git repository initialized locally
- ✅ GitHub workflow configured for automated deployment

## Issue Resolved
Firebase CLI had a bug with the interactive prompt when deploying App Hosting backends. This has been worked around by using GitHub integration instead.

## Next Steps to Complete Deployment

### Option 1: GitHub Integration (Recommended)
1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/clinical-trial-application.git
   git branch -M main
   git push -u origin main
   ```

2. Connect GitHub to Firebase App Hosting:
   - Go to Firebase Console: https://console.firebase.google.com/project/kollectcare-rwe-study
   - Navigate to App Hosting
   - Click "Connect Repository"
   - Select your GitHub repository
   - Configure the build settings (already set up with Node.js 20 and pnpm)
   - Firebase will automatically deploy on every push to main branch

3. Create a Firebase service account for GitHub Actions:
   - Go to Service Accounts in GCP Console
   - Create a new service account key
   - Add the JSON key as `FIREBASE_SERVICE_ACCOUNT` secret in GitHub

### Option 2: Manual Deployment via CLI (If GitHub not available)
The backend has been created. Once the CLI bug is fixed in firebase-tools, you can deploy using:
```bash
firebase deploy
```

## Application Details
- Framework: Next.js 16 with TypeScript
- Port: 3000
- Build: `pnpm build`
- Start: `pnpm start`
- Region: us-central1

## Files Modified/Created
- `firebase.json` - Firebase configuration
- `app.yaml` - App Hosting configuration
- `Dockerfile` - Container configuration
- `.gcloudignore` - Files to exclude from deployment
- `.npmrc` - npm/pnpm configuration
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `.firebaserc` - Firebase project reference

## URLs After Deployment
Once deployed, your app will be available at:
- Primary: `https://default--kollectcare-rwe-study.us-central1.hosted.app`
- Custom domain (if configured): Your domain here
