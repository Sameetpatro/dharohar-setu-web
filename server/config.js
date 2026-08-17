import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://alexdaye84_db_user:WsvciP5vAcDaTNI1@cluster0.gjhehdj.mongodb.net/dharohar?retryWrites=true&w=majority',
  remoteBackendUrl: (process.env.REMOTE_BACKEND_URL || 'https://humsafar-backend-5u74.onrender.com').replace(/\/$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'dharohar_heritage_super_secure_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  resetTokenExpiresMinutes: parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES || '15', 10),
  bcryptSaltRounds: 10,
  nodeEnv: process.env.NODE_ENV || 'development',
}

export default config
