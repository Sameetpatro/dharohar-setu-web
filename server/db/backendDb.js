import { PrismaClient } from '@prisma/client'
import config from '../config.js'

const globalForDb = globalThis

export const backendDb =
  globalForDb.backendDb ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.backendDatabaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForDb.backendDb = backendDb

export default backendDb
