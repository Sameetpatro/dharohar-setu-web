import jwt from 'jsonwebtoken'
import config from '../config.js'
import prisma from '../db/prisma.js'

export async function authenticateToken(req, res, next) {
  let token = null

  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (req.cookies && (req.cookies.dharohar_admin_token || req.cookies.admin_token)) {
    token = req.cookies.dharohar_admin_token || req.cookies.admin_token
  }

  if (!token) {
    return res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'No authorization token provided. Please log in.',
    })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)

    // Lookup fresh user from PostgreSQL via Prisma
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: decoded.id },
          { email: decoded.email },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        mustChangePassword: true,
        createdBy: true,
        isActive: true,
      },
    })

    if (!user) {
      return res.status(401).json({
        error: 'InvalidSession',
        message: 'User associated with this token no longer exists in database.',
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'AccountDeactivated',
        message: 'Your account has been deactivated.',
      })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({
      error: 'InvalidToken',
      message: err.message || 'Please log in again.',
    })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'Please authenticate before accessing admin resources.',
    })
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. You do not have the required administrative role to access this resource.',
    })
  }

  next()
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'Please authenticate before accessing administrative resources.',
    })
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access restricted: Only SUPER_ADMIN accounts can perform this action.',
    })
  }

  next()
}
