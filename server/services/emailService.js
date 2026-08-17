import dns from 'dns'
import nodemailer from 'nodemailer'
import config from '../config.js'

// Force IPv4 resolution to prevent ENETUNREACH errors on cloud platforms like Render
if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder('ipv4first')
  } catch (e) {
    console.warn('dns.setDefaultResultOrder not supported:', e.message)
  }
}

// Custom lookup function forcing IPv4 for socket connections
const ipv4Lookup = (hostname, options, callback) => {
  return dns.lookup(hostname, { family: 4, all: false }, callback)
}

let transporter = null

// Initialize transporter if SMTP credentials are provided
if (config.smtp.host && config.smtp.user) {
  const isGmail = config.smtp.host.toLowerCase().includes('gmail')

  const transportOptions = {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    lookup: ipv4Lookup,
    family: 4,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  }

  // Use gmail service shortcut if applicable
  if (isGmail) {
    transportOptions.service = 'gmail'
  }

  transporter = nodemailer.createTransport(transportOptions)
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
      return { success: true, messageId: info.messageId }
    } catch (err) {
      console.error(`[SMTP INVITATION DISPATCH] ❌ SMTP send failed:`, err.message)
      console.log(`=======================================================\n`)
      throw new Error(`SMTP email delivery failed: ${err.message}`)
    }
  } else {
    console.log(`[SMTP INVITATION DISPATCH] ℹ SMTP credentials not configured in .env (Invite URL logged above)`)
    console.log(`=======================================================\n`)
    return { success: true, mode: 'console-log' }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({ email, resetUrl }) {
  const fullResetUrl = resetUrl.startsWith('http') ? resetUrl : `${config.appBaseUrl}${resetUrl}`

  const subject = '🔒 Reset Your Dharohar Administrator Password'
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF6EF; color: #241A12; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background: #FFF; border-radius: 12px; border: 1px solid #E3D9C9; overflow: hidden; }
    .header { background: #9C4A2C; padding: 24px; text-align: center; color: #FFF; }
    .content { padding: 28px; }
    .btn { display: inline-block; background: #9C4A2C; color: #FFF !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">Dharohar Setu Security</h2>
    </div>
    <div class="content">
      <p>A password reset request was submitted for your administrative account: <strong>${email}</strong>.</p>
      <p>Click below to configure a new password (valid for 15 minutes):</p>
      <div style="text-align:center;">
        <a href="${fullResetUrl}" class="btn">Reset Password →</a>
      </div>
      <p style="font-size:12px; color:#8C7B6B;">If you did not request this, you can safely ignore this message.</p>
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
      return { success: true, messageId: info.messageId }
    } catch (err) {
      console.error('[SMTP RESET DISPATCH] ❌ Failed to send reset email:', err.message)
      return { success: false, error: err.message }
    }
  }

  return { success: true, mode: 'console-log' }
}

export default {
  sendAdminInviteEmail,
  sendPasswordResetEmail,
}
