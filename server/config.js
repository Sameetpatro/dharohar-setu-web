import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Determine the canonical base URL for email invitations and links
function resolveAppBaseUrl() {
  if (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim()) {
    return process.env.APP_BASE_URL.trim()
  }
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim()) {
    return process.env.RENDER_EXTERNAL_URL.trim()
  }
  // Render environment or production mode
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
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

  // SMTP Email Dispatch Settings
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
