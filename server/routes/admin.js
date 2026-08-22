import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import prisma from '../db/prisma.js'
import config from '../config.js'
import { authenticateToken } from '../middleware/auth.js'
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js'

const router = express.Router()

// Rate limiter for admin creation: max 20 creations per 15 minutes per IP
const createAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'TooManyRequests',
    message: 'Rate limit exceeded: Too many administrator invitation requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Helper: Generate JWT token for admin session
function generateAdminToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      mustChangePassword: false,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )
}

// 0. GET /api/admin/me & /admin/me (Verify Admin Session)
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        createdAt: true,
      },
    })
    if (!user) {
      return res.status(404).json({ error: 'UserNotFound', message: 'User not found' })
    }
    return res.json({
      success: true,
      user_id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      user,
    })
  } catch (err) {
    next(err)
  }
})

// 1. POST /api/admin/create-admin (Super Admin Only - Signed Expiring Invite Email Flow)
router.post('/create-admin', authenticateToken, requireSuperAdmin, createAdminLimiter, async (req, res, next) => {
  try {
    const { email, username, name } = req.body

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'MissingEmail',
        message: 'Administrator email address is required.',
      })
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanUsername = username ? username.toLowerCase().trim() : cleanEmail.split('@')[0]
    const cleanName = name && name.trim() ? name.trim() : 'Administrator'

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        error: 'InvalidEmail',
        message: 'Please provide a valid email address.',
      })
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
    })

    if (existingEmail) {
      return res.status(409).json({
        error: 'EmailAlreadyExists',
        message: `An account with email '${cleanEmail}' already exists in the system.`,
      })
    }

    // Check if username already exists
    if (cleanUsername) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: {
            equals: cleanUsername,
            mode: 'insensitive',
          },
        },
      })

      if (existingUser) {
        return res.status(409).json({
          error: 'UsernameAlreadyExists',
          message: `Username '${cleanUsername}' is already taken. Please choose another username.`,
        })
      }
    }

    // Random unguessable placeholder locked hash until user accepts invite and sets password
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.bcryptSaltRounds)

    // Generate signed expiring invitation token (48 hours validity)
    const rawInviteToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawInviteToken).digest('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 Hours

    // Invalidate existing unused invites for this email
    await prisma.adminInvite.deleteMany({
      where: { email: cleanEmail },
    })

    // Create User record and AdminInvite record in transaction
    const [newAdmin] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: cleanEmail,
          username: cleanUsername,
          name: cleanName,
          passwordHash: placeholderHash,
          role: 'ADMIN',
          mustChangePassword: false,
          createdBy: req.user.id || req.user.email,
          isActive: true,
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
      }),
      prisma.adminInvite.create({
        data: {
          email: cleanEmail,
          tokenHash,
          expiresAt,
          used: false,
          invitedBy: req.user.id || req.user.email,
        },
      }),
    ])

    // Determine the actual live origin from incoming request headers
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https'
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const dynamicOrigin = host ? `${proto}://${host}` : null

    const canonicalBaseUrl = (dynamicOrigin && !dynamicOrigin.includes('localhost'))
      ? dynamicOrigin
      : config.appBaseUrl

    const fullInviteUrl = `${canonicalBaseUrl}/admin/accept-invite?token=${rawInviteToken}`

    return res.status(201).json({
      success: true,
      message: `Administrator '${newAdmin.name}' created successfully. Share the activation link with the new administrator.`,
      admin: newAdmin,
      token: rawInviteToken,
      inviteUrl: fullInviteUrl,
      expiresAt,
      dev_invite_token: rawInviteToken,
    })
  } catch (err) {
    next(err)
  }
})

// 2. GET /api/admin/invite-info (Verify token & get invite metadata for acceptance page)
router.get('/invite-info', async (req, res, next) => {
  try {
    const { token } = req.query

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'MissingToken',
        message: 'Invitation token is required.',
      })
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')

    const invite = await prisma.adminInvite.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!invite) {
      return res.status(400).json({
        error: 'InvalidOrExpiredToken',
        message: 'This administrator invitation link is invalid, expired, or has already been used.',
      })
    }

    const user = await prisma.user.findFirst({
      where: { email: invite.email },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
      },
    })

    return res.json({
      valid: true,
      email: invite.email,
      expiresAt: invite.expiresAt,
      user: user || { email: invite.email, name: 'Administrator' },
    })
  } catch (err) {
    next(err)
  }
})

// 3. POST /api/admin/accept-invite (New admin sets password & activates account)
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({
        error: 'MissingFields',
        message: 'Invitation token and chosen password are required.',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'WeakPassword',
        message: 'Password must be at least 8 characters long.',
      })
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')

    const invite = await prisma.adminInvite.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!invite) {
      return res.status(400).json({
        error: 'InvalidOrExpiredToken',
        message: 'This invitation link is invalid, has expired, or was already used.',
      })
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds)

    // Update user password and mark invitation used
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { email: invite.email },
        data: {
          passwordHash,
          mustChangePassword: false,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.adminInvite.update({
        where: { id: invite.id },
        data: { used: true },
      }),
    ])

    // Generate authenticated admin session token
    const authToken = generateAdminToken(updatedUser)

    res.cookie('dharohar_admin_token', authToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      message: `Welcome to Dharohar Setu, ${updatedUser.name}! Your administrator password has been set.`,
      token: authToken,
      user: updatedUser,
    })
  } catch (err) {
    next(err)
  }
})

// 4. GET /api/admin/admins (List all administrators - Super Admin Only)
router.get('/admins', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' },
        ],
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
      orderBy: { createdAt: 'desc' },
    })

    return res.json({
      success: true,
      count: admins.length,
      admins,
    })
  } catch (err) {
    next(err)
  }
})

// 5. POST /api/admin/change-password (Authenticated User Password Update)
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

    const token = generateAdminToken(updatedUser)
    res.cookie('dharohar_admin_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      message: 'Your password has been updated successfully.',
      token,
      user: updatedUser,
    })
  } catch (err) {
    next(err)
  }
})

// 6. DELETE /api/admin/admins/:id (Delete Administrator - Super Admin Only)
router.delete('/admins/:id', authenticateToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        error: 'MissingAdminId',
        message: 'Administrator ID is required.',
      })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return res.status(404).json({
        error: 'AdminNotFound',
        message: 'Administrator record not found.',
      })
    }

    // Safety guard: Prevent deleting self
    if (targetUser.id === req.user.id || targetUser.email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({
        error: 'CannotDeleteSelf',
        message: 'You cannot delete your own administrative account.',
      })
    }

    // Clean up related invites/resets for this email
    await prisma.adminInvite.deleteMany({
      where: { email: targetUser.email },
    })
    await prisma.passwordReset.deleteMany({
      where: { email: targetUser.email },
    })

    // Delete user record from database
    await prisma.user.delete({
      where: { id: targetUser.id },
    })

    return res.json({
      success: true,
      message: `Administrator '${targetUser.name || targetUser.email}' has been removed successfully.`,
      deletedId: targetUser.id,
    })
  } catch (err) {
    next(err)
  }
})

export default router
