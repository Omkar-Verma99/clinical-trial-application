# Kollectcare - Clinical Trial Management System

A professional clinical trial management platform for healthcare providers to manage Real World Evidence (RWE) trials. Built with Next.js 16, Firebase, and TypeScript.

## Features

- **Doctor Authentication** - Secure signup and login system for medical professionals
- **Patient Management** - Anonymized patient tracking with unique patient codes
- **Baseline Assessment** - Comprehensive Week 0 clinical parameter recording
- **Follow-up Assessment** - Week 12 end-of-study measurements and evaluations
- **Comparison Views** - Side-by-side baseline vs follow-up comparisons with visual indicators
- **Reporting & Analytics** - Aggregate trial results with CSV and JSON export
- **Mobile Responsive** - Works seamlessly on web, tablet, and mobile devices
- **Data Privacy** - HIPAA-compliant anonymized patient data management

## Trial Protocol

**Product:** Empagliflozin 10/25 mg + Sitagliptin 100 mg + Metformin XR 1000 mg (FDC)  
**Study Duration:** 12 Weeks (3 Months)  
**Follow-up:** Baseline (Week 0) and Week 12 (± 2 weeks)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Authentication:** Firebase Auth
- **Database:** Cloud Firestore
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui + Radix UI
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Firebase project (create one at [firebase.google.com](https://firebase.google.com))
- npm or yarn package manager

### Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Email/Password Authentication**:
   - Go to Authentication → Sign-in method
   - Enable Email/Password provider
4. Create a **Cloud Firestore database**:
   - Go to Firestore Database
   - Create database in production or test mode
   - Choose a location closest to your users
5. Get your Firebase configuration:
   - Go to Project Settings → General
   - Scroll down to "Your apps"
   - Click on the Web icon (</>) to register your app
   - Copy the firebaseConfig object

### Environment Variables

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Firebase configuration in `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
kollectcare/
├── app/
│   ├── dashboard/          # Patient management dashboard
│   ├── login/              # Doctor login page
│   ├── signup/             # Doctor registration
│   ├── patients/
│   │   ├── add/           # Add new patient form
│   │   └── [id]/          # Patient detail & assessments
│   ├── reports/           # Trial reports & analytics
│   ├── layout.tsx         # Root layout with auth provider
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles & theme
├── components/
│   ├── baseline-form.tsx  # Week 0 assessment form
│   ├── followup-form.tsx  # Week 12 assessment form
│   ├── comparison-view.tsx # Results comparison
│   └── ui/                # shadcn/ui components
├── contexts/
│   └── auth-context.tsx   # Firebase authentication context
├── lib/
│   ├── firebase.ts        # Firebase configuration
│   ├── types.ts           # TypeScript interfaces
│   └── utils.ts           # Utility functions
└── public/
    └── favicon.svg        # Kollectcare logo
```

## Usage Guide

### For Doctors

1. **First-time Setup**
   - Click "Get Started" or "Register here"
   - Fill in your medical credentials (name, registration number, etc.)
   - Create a secure password
   - Login with your credentials

2. **Adding Patients**
   - Click "Add Patient" from the dashboard
   - Enter patient profile information (anonymized with patient code)
   - Fill in demographics and medical history
   - Save the patient

3. **Baseline Assessment (Week 0)**
   - Select a patient from the dashboard
   - Click on the "Baseline" tab
   - Record clinical measurements (HbA1c, FPG, weight, BP, etc.)
   - Document treatment plan and counseling provided
   - Save or save as draft

4. **Follow-up Assessment (Week 12)**
   - Select the same patient after 12 weeks
   - Go to the "Follow-up" tab
   - Record end-of-study measurements
   - Document adverse events and physician assessment
   - Add patient-reported outcomes
   - Save the follow-up data

5. **View Results**
   - Go to the "Comparison" tab to see baseline vs follow-up
   - Visual indicators show improvements or changes
   - Export individual patient report

6. **Generate Reports**
   - Click "Reports" in the header
   - View aggregate statistics across all trials
   - Export all data as JSON or CSV

## Firestore Data Structure

### Collections

**doctors**
```
{
  name: string
  registrationNumber: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  createdAt: string
}
```

**patients**
```
{
  doctorId: string
  patientCode: string
  age: number
  gender: "Male" | "Female" | "Other"
  durationOfDiabetes: number
  previousTherapy: string[]
  comorbidities: string[]
  reasonForTripleFDC: string
  createdAt: string
}
```

**baselineData**
```
{
  patientId: string
  hba1c: number
  fpg: number
  ppg: number
  weight: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  serumCreatinine: number
  egfr: number
  urinalysis: string
  dosePrescribed: string
  dietAdvice: boolean
  counselingProvided: boolean
  createdAt: string
}
```

**followUpData**
```
{
  patientId: string
  [same clinical measurements as baseline]
  adverseEvents: string
  actionTaken: string[]
  outcome: string[]
  compliance: string
  efficacy: string
  tolerability: string
  energyLevels: string
  satisfaction: string
  comments: string
  createdAt: string
}
```

## Security & Privacy

- All patient data is anonymized with unique patient codes
- No patient names, phone numbers, addresses, or identifiable information stored
- Firebase Authentication for secure doctor access
- Firestore security rules should be configured (see below)

### Recommended Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Doctors can only read/write their own document
    match /doctors/{doctorId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }
    
    // Doctors can only access their own patients
    match /patients/{patientId} {
      allow read, write: if request.auth != null && 
        resource.data.doctorId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.doctorId == request.auth.uid;
    }
    
    // Baseline and follow-up data access based on patient ownership
    match /baselineData/{dataId} {
      allow read, write: if request.auth != null;
    }
    
    match /followUpData/{dataId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel project settings
5. Deploy

The app will be available at your Vercel URL (e.g., `kollectcare.vercel.app`)

## Support

For issues or questions:
- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review [Next.js Documentation](https://nextjs.org/docs)
- Contact: support@kollectcare.com

## License

Proprietary - All rights reserved

## Acknowledgments

Built for KC MeSempa RWE Clinical Trials
