import nodemailer from 'nodemailer'
import config from '../config.js'

let transporter = null

// Initialize transporter if SMTP credentials are provided
if (config.smtp.host && config.smtp.user) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  })
}

/**
 * Send official administrator onboarding invitation email
 */
export async function sendAdminInviteEmail({ email, name, username, inviteUrl }) {
  const fullInviteUrl = inviteUrl.startsWith('http') ? inviteUrl : `${config.appBaseUrl}${inviteUrl}`

  const subject = '🏛 Invitation to Join Dharohar Setu Administrative Portal'
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #241A12; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E3D9C9; overflow: hidden; box-shadow: 0 4px 20px rgba(36,26,18,0.06); }
    .header { background: #9C4A2C; padding: 28px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #F5DEC8; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 17px; font-weight: 600; margin-bottom: 16px; color: #241A12; }
    .text { font-size: 14.5px; line-height: 1.6; color: #4A3E31; margin-bottom: 20px; }
    .badge-box { background: #FAF6EF; border: 1px solid #E3D9C9; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
    .badge-item { font-size: 13.5px; color: #241A12; margin-bottom: 4px; }
    .badge-item strong { color: #9C4A2C; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #9C4A2C; color: #FFFFFF !important; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(156,74,44,0.25); }
    .link-fallback { font-size: 12px; color: #8C7B6B; line-height: 1.5; word-break: break-all; margin-top: 24px; padding-top: 16px; border-top: 1px solid #EFE8DA; }
    .footer { background: #F4EFE6; padding: 16px 24px; text-align: center; font-size: 12px; color: #8C7B6B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏛 Dharohar Setu</h1>
      <p>National Heritage Exploration & Spatial Tour Platform</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${name || 'Administrator'},</div>
      <p class="text">
        You have been granted administrative privileges on the <strong>Dharohar Setu Admin Portal</strong>. As an authorized curator, you can map heritage monuments, manage sequential tour nodes, and configure visitor experiences.
      </p>
      
      <div class="badge-box">
        <div class="badge-item"><strong>Registered Email:</strong> ${email}</div>
        ${username ? `<div class="badge-item"><strong>Assigned Username:</strong> @${username}</div>` : ''}
        <div class="badge-item"><strong>Role:</strong> Staff Administrator (ADMIN)</div>
        <div class="badge-item"><strong>Activation Link Validity:</strong> 48 Hours</div>
      </div>

      <p class="text">
        Please click the secure activation button below to configure your personal password and access your dashboard:
      </p>

      <div class="btn-container">
        <a href="${fullInviteUrl}" class="btn" target="_blank">Activate Administrator Account →</a>
      </div>

      <div class="link-fallback">
        If the button above does not work, copy and paste this link into your web browser:<br>
        <a href="${fullInviteUrl}" style="color: #9C4A2C;">${fullInviteUrl}</a>
      </div>
    </div>
    <div class="footer">
      This is a secure system notification from Dharohar Setu. If you were not expecting this invitation, please ignore this email.
    </div>
  </div>
</body>
</html>
  `

  const textContent = `
Hello ${name || 'Administrator'},

You have been granted administrative access on the Dharohar Setu Admin Portal.
Email: ${email}
Role: Staff Administrator (ADMIN)

Please click the following link to set your password and activate your account:
${fullInviteUrl}

Note: This activation link will expire in 48 hours.

Dharohar Setu Administrative Gateway
  `.trim()

  console.log(`\n=======================================================`)
  console.log(`[SMTP INVITATION DISPATCH] Target: ${email}`)
  console.log(`[SMTP INVITATION DISPATCH] Name: ${name || 'Administrator'}`)
  console.log(`[SMTP INVITATION DISPATCH] Activation URL: ${fullInviteUrl}`)

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      })
      console.log(`[SMTP INVITATION DISPATCH] ✔ Email sent via SMTP (Message ID: ${info.messageId})`)
      console.log(`=======================================================\n`)
      return { sent: true, messageId: info.messageId }
    } catch (err) {
      console.error(`[SMTP INVITATION DISPATCH] ❌ SMTP send failed:`, err.message)
      console.log(`=======================================================\n`)
      return { sent: false, error: err.message }
    }
  } else {
    console.log(`[SMTP INVITATION DISPATCH] ℹ SMTP credentials not configured in .env (Invite URL logged above)`)
    console.log(`=======================================================\n`)
    return { sent: false, simulated: true }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({ email, resetUrl }) {
  const fullResetUrl = resetUrl.startsWith('http') ? resetUrl : `${config.appBaseUrl}${resetUrl}`
  const subject = '🔑 Password Reset Request — Dharohar Setu Admin Portal'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; color: #241A12; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E3D9C9; overflow: hidden; }
    .header { background: #9C4A2C; padding: 24px; text-align: center; color: #FFFFFF; }
    .content { padding: 28px; }
    .btn-container { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; background: #9C4A2C; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { background: #F4EFE6; padding: 14px; text-align: center; font-size: 12px; color: #8C7B6B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">Dharohar Setu Admin Portal</h2>
    </div>
    <div class="content">
      <p style="font-size: 15px; font-weight: 600;">Password Reset Request</p>
      <p style="font-size: 14px; color: #4A3E31; line-height: 1.5;">
        A password reset was requested for your administrator account (<strong>${email}</strong>). Click the button below to reset your password:
      </p>
      <div class="btn-container">
        <a href="${fullResetUrl}" class="btn" target="_blank">Reset Administrator Password →</a>
      </div>
      <p style="font-size: 12px; color: #8C7B6B;">This single-use link will expire in ${config.resetTokenExpiresMinutes} minutes.</p>
    </div>
    <div class="footer">
      If you did not request this, please ignore this email.
    </div>
  </div>
</body>
</html>
  `

  console.log(`\n[SMTP RESET DISPATCH] Target: ${email}`)
  console.log(`[SMTP RESET DISPATCH] Reset Link: ${fullResetUrl}\n`)

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject,
        html: htmlContent,
      })
      return { sent: true, messageId: info.messageId }
    } catch (err) {
      console.error(`[SMTP RESET DISPATCH] ❌ SMTP send failed:`, err.message)
      return { sent: false, error: err.message }
    }
  }
  return { sent: false, simulated: true }
}

export default {
  sendAdminInviteEmail,
  sendPasswordResetEmail,
}
