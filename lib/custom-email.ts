/**
 * Custom Email Service for Firebase Auth
 * Sends branded verification emails instead of Firebase defaults
 */

import { User } from "firebase/auth"

interface EmailConfig {
  apiKey: string
  fromEmail: string
  fromName: string
}

// Get email config from environment variables
const getEmailConfig = (): EmailConfig => {
  const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY || process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.warn("Email service API key not configured. Using Firebase default.")
    return {
      apiKey: "",
      fromEmail: "noreply@kollectcare-rwe-study.firebaseapp.com",
      fromName: "Kollectcare RWE Study"
    }
  }

  return {
    apiKey,
    fromEmail: process.env.NEXT_PUBLIC_EMAIL_FROM || "noreply@kollectcare-rwe-study.com",
    fromName: "Kollectcare RWE Study"
  }
}

/**
 * Send custom verification email using Resend
 * More branded and customizable than Firebase default
 */
export async function sendCustomVerificationEmail(user: User, verificationLink: string) {
  const config = getEmailConfig()

  // If no API key, skip custom email
  if (!config.apiKey) {
    console.log("Custom email service not configured, skipping.")
    return
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: user.email,
        subject: "Verify Your Email - Kollectcare RWE Study",
        html: generateVerificationEmailHTML(verificationLink, user.email || ""),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send verification email: ${response.statusText}`)
    }

    console.log("✅ Custom verification email sent successfully")
    return await response.json()
  } catch (error) {
    console.error("❌ Error sending custom verification email:", error)
    // Don't throw - let Firebase handle it if custom email fails
  }
}

/**
 * Generate branded HTML email template
 */
function generateVerificationEmailHTML(verificationLink: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .content {
            padding: 40px 20px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .message {
            color: #666;
            margin-bottom: 30px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .verify-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 40px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
        }
        .verify-button:hover {
            opacity: 0.9;
        }
        .link-text {
            color: #999;
            font-size: 12px;
            margin-top: 15px;
            word-break: break-all;
        }
        .link-text a {
            color: #667eea;
            text-decoration: none;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
        }
        .study-info {
            background-color: #e8f4f8;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .study-info p {
            margin: 0;
            color: #555;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏥 Kollectcare RWE Study</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                <strong>Hello,</strong>
            </div>

            <div class="message">
                <p>Thank you for registering with the <strong>Kollectcare Real-World Evidence Study</strong>. To complete your registration and gain access to the patient data management system, please verify your email address.</p>
            </div>

            <!-- Verify Button -->
            <div class="button-container">
                <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
            </div>

            <div class="link-text">
                If the button above doesn't work, copy and paste this link in your browser:<br>
                <a href="${verificationLink}">${verificationLink}</a>
            </div>

            <!-- Study Info -->
            <div class="study-info">
                <p><strong>ℹ️ Important:</strong> This is an automated email from the Kollectcare RWE Study platform. Please do not reply to this email.</p>
            </div>

            <!-- Security Note -->
            <div class="message" style="font-size: 13px; color: #999; margin-top: 30px;">
                <p><strong>Security Note:</strong> If you didn't request this verification, please ignore this email or contact your study administrator at <a href="mailto:admin@kollectcare-rwe-study.com">admin@kollectcare-rwe-study.com</a></p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>© 2025 Kollectcare RWE Study. All rights reserved.</p>
            <p>This email was sent to <strong>${email}</strong></p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

/**
 * Generate welcome email for after verification
 */
export function generateWelcomeEmailHTML(doctorName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Kollectcare</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .content {
            padding: 40px 20px;
        }
        .feature-list {
            margin: 20px 0;
        }
        .feature {
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .feature:last-child {
            border-bottom: none;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome, ${doctorName}! 👋</h1>
        </div>
        <div class="content">
            <p>Your email has been verified successfully. Your account is now active.</p>
            
            <h3>🎯 You can now:</h3>
            <div class="feature-list">
                <div class="feature">✅ Enroll new patients in the study</div>
                <div class="feature">📋 Record baseline measurements</div>
                <div class="feature">📊 Track follow-up visits and outcomes</div>
                <div class="feature">📈 Generate patient reports</div>
                <div class="feature">🔄 Sync data offline with automatic sync when online</div>
            </div>

            <p style="margin-top: 30px;">If you have any questions or need assistance, please contact your study coordinator.</p>
        </div>
        <div class="footer">
            <p>© 2025 Kollectcare RWE Study</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}
