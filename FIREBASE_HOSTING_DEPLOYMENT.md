# Firebase App Hosting Deployment Guide

## Issue: Environment Variables Not Used During Build

The problem: GitHub Actions secrets were set, but **Firebase App Hosting build** was not using them because they weren't being passed to the build process.

## Solution: Create .env.production.local Before Build

The updated `.github/workflows/deploy.yml` now creates a `.env.production.local` file from GitHub Actions secrets before building. This ensures Next.js reads the variables during the build process.

## Setup Instructions

### Step 1: Add GitHub Actions Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Click **"New repository secret"** and add:

```
Secret Name                              Value
──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY            [Your Firebase API Key]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        [your-project.firebaseapp.com]
NEXT_PUBLIC_FIREBASE_PROJECT_ID         [your-project-id]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     [your-project.firebasestorage.app]
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID [Your Sender ID]
NEXT_PUBLIC_FIREBASE_APP_ID             [Your App ID]
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     [Your Measurement ID]
NEXT_PUBLIC_ENCRYPTION_KEY              [Your 32-byte hex encryption key]
NEXT_PUBLIC_SENTRY_DSN                  [Your Sentry Client DSN]
NEXT_PUBLIC_SENTRY_ENVIRONMENT          production
NEXT_PUBLIC_APP_VERSION                 1.0.0
SENTRY_DSN                              [Your Sentry Server DSN]
WIF_PROVIDER                            [Your Workload Identity Provider]
WIF_SERVICE_ACCOUNT                     [Your Service Account]
```

### Step 2: Get Your Values

#### Firebase Values
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (kollectcare-rwe-study)
3. Click **Project Settings** ⚙️
4. Under **Your apps**, click your web app
5. Copy the config values

#### Sentry Values
1. Go to [Sentry Dashboard](https://sentry.io)
2. Go to your project settings
3. Under **Client Keys (DSN)**, copy your DSN

#### Encryption Key
Generate a new one (if needed):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### WIF Provider & Service Account
Set up Workload Identity Federation:
```bash
gcloud iam workload-identity-pools create github \
  --project=YOUR_PROJECT_ID \
  --location=global \
  --display-name=Github

# Get the provider details and service account email
# Add to GitHub Secrets as WIF_PROVIDER and WIF_SERVICE_ACCOUNT
```

### Step 3: Verify Setup

Push to `main` or `master` branch and check the GitHub Actions workflow:
- Go to your repo → **Actions**
- Click the workflow run
- Check if "Create .env file for build" step passes
- Verify "Deploy to Firebase App Hosting" step succeeds

## How It Works

1. **GitHub Actions triggers** on push to main/master
2. **Checks out** your code
3. **Creates .env.production.local** from GitHub Actions secrets
4. **Runs pnpm install** to install dependencies
5. **Builds the app** with `next build` (Next.js reads .env.production.local)
6. **NEXT_PUBLIC_* variables are inlined** into the JavaScript bundle
7. **Firebase CLI deploys** to App Hosting

## Environment Variable Flow

```
GitHub Actions Secrets
    ↓
.env.production.local (created in step 3)
    ↓
Next.js build process reads variables
    ↓
NEXT_PUBLIC_* are inlined into JavaScript
    ↓
Built app is deployed to Firebase Hosting
    ↓
Browser loads app with hardcoded environment values
```

## Important Notes

- ⚠️ `.env.production.local` is created during build, **NOT** committed to git
- ✅ All `NEXT_PUBLIC_*` variables become **hardcoded in the JavaScript bundle**
- ✅ These are then **inlined** into the app and sent to the browser
- ❌ Do NOT hardcode secrets in source code
- ✅ Use GitHub Actions secrets for all environment variables

## Troubleshooting

### Build says "variables not found"
1. Check GitHub Actions secrets are properly set
2. Verify secret names match exactly (case-sensitive)
3. Re-run the workflow

### Firebase deployment fails
1. Check WIF_PROVIDER and WIF_SERVICE_ACCOUNT are correct
2. Verify service account has Firebase permissions
3. Check `firebase.json` includes your backend configuration

### App shows "undefined" for variables
1. Check the browser console for variable values
2. Inspect the bundled JavaScript
3. Verify `.env.production.local` was created in build step

## Testing Locally

To test the same build process locally:

```bash
# Create .env.production.local with your values
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_FIREBASE_API_KEY=your-key-here
NEXT_PUBLIC_SENTRY_DSN=your-dsn-here
EOF

# Build with production variables
npm run build

# Deploy
firebase deploy --only apphosting
```

## Next Steps

1. Add all required GitHub Actions secrets
2. Push to main/master branch
3. Monitor the GitHub Actions workflow
4. Verify deployment succeeds
5. Test your Firebase Hosting app to confirm variables are loaded

Need help? Check the workflow logs in GitHub Actions for detailed error messages.
