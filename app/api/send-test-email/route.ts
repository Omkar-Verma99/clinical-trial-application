/**
 * Test Email Endpoint
 * Send a test verification email to verify Resend integration is working
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY
    const fromEmail = process.env.NEXT_PUBLIC_EMAIL_FROM
    const fromName = process.env.NEXT_PUBLIC_EMAIL_FROM_NAME

    if (!apiKey || !fromEmail) {
      return NextResponse.json(
        { error: "Email service not configured. Check environment variables." },
        { status: 500 }
      )
    }

    // Send test email using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: "🎉 Test Email - Kollectcare RWE Study",
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
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
        .success-box {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #155724;
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
            <h1>🏥 Kollectcare RWE Study</h1>
        </div>
        <div class="content">
            <h2>✅ Test Email Successful!</h2>
            
            <div class="success-box">
                <strong>Great news!</strong> Your Resend email service is working perfectly.
            </div>

            <p>This is a test email to verify that:</p>
            <ul>
                <li>✅ Resend API is connected</li>
                <li>✅ Email sending is working</li>
                <li>✅ Custom templates are displayed correctly</li>
                <li>✅ Doctor signup emails will be branded and professional</li>
            </ul>

            <p style="margin-top: 30px;">
                Your registration emails are now ready to send with full Kollectcare branding!
            </p>

            <p style="color: #999; font-size: 14px; margin-top: 30px;">
                If you're seeing this email, your Resend integration is complete and working. 
                Doctors who register will receive professional verification emails.
            </p>
        </div>
        <div class="footer">
            <p>© 2025 Kollectcare RWE Study</p>
            <p>This is a test email</p>
        </div>
    </div>
</body>
</html>
        `,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Resend API error:", error)
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      )
    }

    const result = await response.json()
    return NextResponse.json(
      { 
        success: true, 
        message: "Test email sent successfully!",
        emailId: result.id,
        sentTo: email,
        from: fromEmail
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in test email endpoint:", error)
    return NextResponse.json(
      { error: "Failed to send test email", details: String(error) },
      { status: 500 }
    )
  }
}
