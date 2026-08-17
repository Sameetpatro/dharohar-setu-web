import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Determine the canonical base URL for email invitations and links
function resolveAppBaseUrl() {
  const isCloudOrProd = Boolean(process.env.RENDER || process.env.NODE_ENV === 'production')

  if (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim()) {
    const raw = process.env.APP_BASE_URL.trim()
    // If running in production or on Render, ignore accidental localhost configuration
    if (isCloudOrProd && raw.includes('localhost')) {
      return process.env.RENDER_EXTERNAL_URL || 'https://dharohar-setu.onrender.com'
    }
    return raw
  }

  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim()) {
    return process.env.RENDER_EXTERNAL_URL.trim()
  }

  if (isCloudOrProd) {
    return 'https://dharohar-setu.onrender.com'
  }

  return 'http://localhost:5173'
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  appBaseUrl: resolveAppBaseUrl().replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL || '',
  remoteBackendUrl: (process.env.REMOTE_BACKEND_URL || 'https://humsafar-backend-5u74.onrender.com').replace(/\/$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'dharohar_heritage_super_secure_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  resetTokenExpiresMinutes: parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES || '15', 10),
  bcryptSaltRounds: 10,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Email API Keys (HTTP Port 443 - Recommended for Render/Vercel)
  resendApiKey: process.env.RESEND_API_KEY || '',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Dharohar Setu <onboarding@resend.dev>',

  // Traditional SMTP Settings (Blocked by Render firewall, works locally)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Dharohar Setu <noreply@dharohar.app>',
  },
}

export default config
