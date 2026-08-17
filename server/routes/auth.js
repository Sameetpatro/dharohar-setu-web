import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../db/prisma.js'
import config from '../config.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Helper: Generate JWT token for admin session
function generateAdminToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword || false,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )
}

// 1. POST /api/auth/login (Admin / Super Admin login)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'MissingCredentials',
        message: 'Email and password are required for admin sign-in.',
      })
    }

    const trimmedIdentifier = email.trim()

    // Case-insensitive lookup by email or username in PostgreSQL via Prisma
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: {
              equals: trimmedIdentifier,
              mode: 'insensitive',
            },
          },
          {
            username: {
              equals: trimmedIdentifier,
              mode: 'insensitive',
            },
          },
        ],
      },
    })

    if (!user) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid administrative email or password.',
      })
    }

    // Role check: Only ADMIN or SUPER_ADMIN
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'ForbiddenAccess',
        message: 'Access restricted: Only authorized administrative personnel can access this portal.',
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'AccountSuspended',
        message: 'Your administrator account has been deactivated. Please contact the Super Administrator.',
      })
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Invalid administrative email or password.',
      })
    }

    const token = generateAdminToken(user)

    // Set secure HTTP-only cookie
    res.cookie('dharohar_admin_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      message: `Welcome back, ${user.name || 'Administrator'}.`,
      token,
      mustChangePassword: Boolean(user.mustChangePassword),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword),
        createdBy: user.createdBy,
      },
    })
  } catch (err) {
    next(err)
  }
})

// 2. GET /api/auth/me (Verify active session)
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdBy: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Active session is not authorized for administrative access.',
      })
    }

    return res.json({
      authenticated: true,
      user,
    })
  } catch (err) {
    next(err)
  }
})

// 3. POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('dharohar_admin_token')
  return res.json({
    success: true,
    message: 'Logged out of administrator session.',
  })
})

// 4. POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'WeakPassword',
        message: 'New password must be at least 8 characters long.',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      return res.status(404).json({
        error: 'UserNotFound',
        message: 'User account not found.',
      })
    }

    // Verify current password if user is not in forced change mode and provided it
    if (!user.mustChangePassword && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isMatch) {
        return res.status(400).json({
          error: 'InvalidCurrentPassword',
          message: 'Current password provided is incorrect.',
        })
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
      },
    })

    // Issue refreshed token with mustChangePassword = false
    const token = generateAdminToken(updatedUser)
    res.cookie('dharohar_admin_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      message: 'Password updated successfully.',
      token,
      user: updatedUser,
    })
  } catch (err) {
    next(err)
  }
})

// 5. POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        error: 'MissingEmail',
        message: 'Admin email is required to request password reset.',
      })
    }

    const trimmedEmail = email.trim()

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: trimmedEmail,
          mode: 'insensitive',
        },
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' },
        ],
      },
    })

    // Generic success response to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an authorized administrator account exists for this email, a reset link has been dispatched.',
      })
    }

    // Invalidate previous unused tokens for this email
    await prisma.passwordReset.deleteMany({
      where: { email: user.email },
    })

    // Generate crypto token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    const expiresAt = new Date(Date.now() + config.resetTokenExpiresMinutes * 60 * 1000)

    await prisma.passwordReset.create({
      data: {
        email: user.email,
        tokenHash,
        expiresAt,
        used: false,
      },
    })

    const resetUrl = `/admin/reset-password?token=${resetToken}`

    return res.json({
      success: true,
      message: 'If an authorized administrator account exists for this email, a reset link has been dispatched.',
      token: resetToken,
      resetUrl: `${config.appBaseUrl}${resetUrl}`,
      dev_reset_token: resetToken,
      dev_reset_url: resetUrl,
    })
  } catch (err) {
    next(err)
  }
})

// 6. POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'MissingFields',
        message: 'Reset token and new password are required.',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'WeakPassword',
        message: 'Password must be at least 8 characters long.',
      })
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!resetRecord) {
      return res.status(400).json({
        error: 'InvalidOrExpiredToken',
        message: 'Password reset link is invalid, has expired, or was already used.',
      })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds)

    // Update user password, clear mustChangePassword, and mark token used in transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetRecord.email },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ])

    return res.json({
      success: true,
      message: 'Admin password reset successfully. You can now log in with your new password.',
    })
  } catch (err) {
    next(err)
  }
})

export default router
