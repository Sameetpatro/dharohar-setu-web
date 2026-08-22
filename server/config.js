import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Determine the canonical base URL for invitation links
function resolveAppBaseUrl() {
  const isCloudOrProd = Boolean(process.env.RENDER || process.env.NODE_ENV === 'production')

  if (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim()) {
    const raw = process.env.APP_BASE_URL.trim()
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
  backendDatabaseUrl: process.env.BACKEND_DATABASE_URL || 'postgresql://neondb_owner:npg_Y0oP3bNCXGkB@ep-summer-sea-aovo4zps-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  remoteBackendUrl: (process.env.REMOTE_BACKEND_URL || 'https://humsafar-backend-5u74.onrender.com').replace(/\/$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'dharohar_heritage_super_secure_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  resetTokenExpiresMinutes: parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES || '15', 10),
  bcryptSaltRounds: 10,
  nodeEnv: process.env.NODE_ENV || 'development',
}

export default config
