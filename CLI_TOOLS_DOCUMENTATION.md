# CLI Tools Documentation
**Installation Date:** January 24, 2026  
**Environment:** Windows PowerShell (User: Omkar.Verma)  
**Installation Method:** Scoop Package Manager  

---

## 📋 Summary

This document tracks all command-line tools installed for the clinical-trial-application project, including versions, installation paths, and configuration details.

---

## 1. Google Cloud SDK (gcloud CLI)

### Installation Details
| Field | Value |
|-------|-------|
| **Tool Name** | Google Cloud SDK |
| **Version** | 553.0.0 |
| **Installation Date** | January 24, 2026 |
| **Installation Method** | Scoop Package Manager |
| **Package Manager Bucket** | extras |
| **Installation Command** | `scoop bucket add extras` → `scoop install gcloud` |

### Installation Path
```
C:\Users\Omkar.Verma\scoop\apps\gcloud\current
C:\Users\Omkar.Verma\scoop\apps\gcloud\553.0.0
```

### Executables & Shims
| Executable | Location | Purpose |
|-----------|----------|---------|
| `gcloud` | Shim created in PATH | Main Google Cloud CLI |
| `gsutil` | Shim created in PATH | Google Cloud Storage utility |
| `bq` | Shim created in PATH | BigQuery command-line tool |
| `docker-credential-gcloud` | Shim | Docker credential helper |
| `git-credential-gcloud` | Shim | Git credential helper |

### Version Information
```
Google Cloud SDK 553.0.0
bq 2.1.27
core 2026.01.16
gcloud-crc32c 1.0.0
gsutil 5.35
```

### Key Components
- **Core Version:** 2026.01.16
- **BigQuery CLI:** 2.1.27
- **GSUtil (Storage):** 5.35
- **CRC32C (Checksum):** 1.0.0

### Configuration
```bash
# Current Project
gcloud config set project kollectcare-rwe-study

# Authenticated User
omkar@tattvan.com

# Project ID
kollectcare-rwe-study

# Project Number
716627719667
```

### Authentication Status
✅ **Authenticated** - `gcloud auth login` completed successfully

### Dependencies Installed
- **7zip19.00-helper** (19.00) - Required for extraction
  - Downloaded: 7z1900-x64.msi (1.7 MB)
  - Purpose: Extract bundled Python runtime in gcloud SDK

---

## 2. GitHub CLI (gh)

### Installation Details
| Field | Value |
|-------|-------|
| **Tool Name** | GitHub CLI |
| **Version** | 2.86.0 |
| **Installation Date** | January 24, 2026 |
| **Installation Method** | Scoop Package Manager |
| **Package Manager Bucket** | main |
| **Installation Command** | `scoop install gh` |

### Installation Path
```
C:\Users\Omkar.Verma\scoop\apps\gh\current
C:\Users\Omkar.Verma\scoop\apps\gh\2.86.0
```

### Main Executable
| Executable | Location | Purpose |
|-----------|----------|---------|
| `gh` | Shim created in PATH | GitHub CLI main command |

### Authentication Status
✅ **Authenticated** - `gh auth login --web` completed successfully

### Authenticated Account
```
Username: Omkar-Verma99
Protocol: HTTPS (for Git operations)
Authentication Method: Device flow with one-time code
```

### Configuration
```bash
# Git Protocol Configuration
git_protocol = https

# Authenticated Host
default host = github.com

# User Account
Omkar-Verma99
```

### Key Capabilities Installed
- ✅ Repository management (`gh repo`)
- ✅ Issue tracking (`gh issue`)
- ✅ Pull request management (`gh pr`)
- ✅ Secret management (`gh secret`)
- ✅ Repository secrets setting (used for Workload Identity)

### Secret Management Operations Performed
```bash
# Successfully executed:
gh secret set WIF_PROVIDER --body "..." -R Omkar-Verma99/clinical-trial-application
gh secret set WIF_SERVICE_ACCOUNT --body "..." -R Omkar-Verma99/clinical-trial-application
gh secret list -R Omkar-Verma99/clinical-trial-application
```

---

## 3. Scoop Package Manager

### Installation Details
| Field | Value |
|-------|-------|
| **Tool Name** | Scoop Package Manager |
| **Version** | 0.5.3 |
| **Status** | Pre-installed (available at session start) |
| **Purpose** | Windows package manager for command-line tools |

### Scoop Configuration
```bash
# Version Check Command
scoop --version

# Output
Current Scoop version: b588a06e (v0.5.3)

# Default Buckets
main (synced - contains most packages)
extras (added for gcloud - contains extended packages)
```

### Buckets Configured
| Bucket | Added | Purpose | Last Sync |
|--------|-------|---------|-----------|
| main | Default | Standard applications | recent |
| extras | Jan 24, 2026 | Extended applications (gcloud) | recent |

---

## 4. Installed Tools Summary Table

| Tool | Version | Method | Status | Date |
|------|---------|--------|--------|------|
| Google Cloud SDK | 553.0.0 | Scoop (extras) | ✅ Installed & Authenticated | Jan 24 |
| GitHub CLI | 2.86.0 | Scoop (main) | ✅ Installed & Authenticated | Jan 24 |
| Scoop | 0.5.3 | Pre-installed | ✅ Active | N/A |
| 7zip Helper | 19.00 | Scoop (main) | ✅ Dependency | Jan 24 |

---

## 5. Installation Commands Reference

### Google Cloud SDK Installation
```powershell
# Add extras bucket
scoop bucket add extras

# Install gcloud
scoop install gcloud

# Verify installation
gcloud --version

# Authenticate
gcloud auth login --no-launch-browser
```

### GitHub CLI Installation
```powershell
# Install gh
scoop install gh

# Verify installation
gh --version

# Authenticate
gh auth login --web
```

### Configuration Commands
```powershell
# Set gcloud project
gcloud config set project kollectcare-rwe-study

# Add GitHub secrets
gh secret set WIF_PROVIDER --body "projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider" -R Omkar-Verma99/clinical-trial-application

gh secret set WIF_SERVICE_ACCOUNT --body "github-actions-sa@kollectcare-rwe-study.iam.gserviceaccount.com" -R Omkar-Verma99/clinical-trial-application

# List secrets
gh secret list -R Omkar-Verma99/clinical-trial-application
```

---

## 6. Environment Variables & Paths

### User Installation Path
```
C:\Users\Omkar.Verma\scoop\
├── apps\
│   ├── gcloud\
│   │   ├── current → 553.0.0
│   │   └── 553.0.0\
│   ├── gh\
│   │   ├── current → 2.86.0
│   │   └── 2.86.0\
│   └── 7zip19.00-helper\
│       ├── current → 19.00
│       └── 19.00\
└── shims\  (added to PATH)
    ├── gcloud
    ├── gh
    ├── gsutil
    ├── bq
    └── 7z1900-helper
```

### PATH Configuration
Scoop automatically adds shims directory to PATH:
```
C:\Users\Omkar.Verma\scoop\shims
```

All CLI tools are accessible from PowerShell globally.

---

## 7. Used for Workload Identity Federation Setup

### Google Cloud SDK Operations
```bash
# Enable APIs
gcloud services enable iamcredentials.googleapis.com
gcloud services enable sts.googleapis.com
gcloud services enable serviceusage.googleapis.com

# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --project=kollectcare-rwe-study \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=kollectcare-rwe-study \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud,assertion.repository_owner=assertion.repository_owner" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-condition="assertion.aud == 'sts.googleapis.com'"

# Create Service Account
gcloud iam service-accounts create github-actions-sa \
  --project=kollectcare-rwe-study \
  --display-name="GitHub Actions"

# Grant Firebase Admin permissions
gcloud projects add-iam-policy-binding kollectcare-rwe-study \
  --member="serviceAccount:github-actions-sa@kollectcare-rwe-study.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

# Create Workload Identity Binding
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-sa@kollectcare-rwe-study.iam.gserviceaccount.com \
  --project=kollectcare-rwe-study \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider/attribute.repository_owner/Omkar-Verma99"
```

### GitHub CLI Operations
```bash
# Set WIF secrets for GitHub Actions
gh secret set WIF_PROVIDER \
  --body "projects/716627719667/locations/global/workloadIdentityPools/github-pool/providers/github-provider" \
  -R Omkar-Verma99/clinical-trial-application

gh secret set WIF_SERVICE_ACCOUNT \
  --body "github-actions-sa@kollectcare-rwe-study.iam.gserviceaccount.com" \
  -R Omkar-Verma99/clinical-trial-application
```

---

## 8. Troubleshooting & Notes

### Authentication Issues
If you need to re-authenticate:
```powershell
# Google Cloud
gcloud auth login

# GitHub
gh auth logout
gh auth login --web
```

### Verify CLI Access
```powershell
# Test gcloud
gcloud --version
gcloud config list

# Test gh
gh --version
gh auth status

# List available commands
gh secret list -R Omkar-Verma99/clinical-trial-application
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `gcloud: command not found` | Restart PowerShell after installation |
| `gh: command not found` | Verify Scoop PATH is set correctly |
| Authentication failed | Run `gcloud auth login` / `gh auth login` |
| Bucket not found | Run `scoop bucket add extras` for gcloud |

---

## 9. Security & Best Practices

### Security Measures Implemented
✅ **No credentials stored locally** - Using Workload Identity Federation (keyless)  
✅ **OIDC token exchange** - Temporary credentials per deployment  
✅ **Service account impersonation** - Least privilege access  
✅ **GitHub secrets encrypted** - Stored securely in GitHub  
✅ **No FIREBASE_TOKEN in use** - Deprecated and replaced  

### Credentials Management
- Google Cloud credentials stored in: `~/.config/gcloud/`
- GitHub credentials stored in: `~/.config/gh/`
- All credentials are encrypted at rest
- No hardcoded secrets in codebase

---

## 10. Maintenance & Updates

### Checking for Updates
```powershell
# Google Cloud SDK
gcloud components update

# GitHub CLI
scoop update gh

# Scoop itself
scoop update
```

### Last Verified
- **Date:** January 24, 2026
- **gcloud:** v553.0.0
- **gh:** v2.86.0
- **Scoop:** v0.5.3
- **Status:** ✅ All tools functional and authenticated

---

## 11. Quick Reference Commands

```powershell
# Check versions
gcloud --version
gh --version

# Authenticate
gcloud auth login --no-launch-browser
gh auth login --web

# Verify authentication
gcloud auth list
gh auth status

# Project configuration
gcloud config get project
gcloud config set project kollectcare-rwe-study

# GitHub operations
gh secret set KEY --body "value" -R owner/repo
gh secret list -R owner/repo
gh secret delete KEY -R owner/repo

# Workload Identity
gcloud iam workload-identity-pools list --project=kollectcare-rwe-study --location=global
gcloud iam service-accounts list --project=kollectcare-rwe-study
```

---

**Document Version:** 1.0  
**Last Updated:** January 24, 2026  
**Maintained By:** System Setup Documentation  
**Status:** ✅ Complete & Active
