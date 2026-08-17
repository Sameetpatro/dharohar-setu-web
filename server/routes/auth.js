import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import config from '../config.js'
import User from '../models/User.js'
import PasswordReset from '../models/PasswordReset.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// 1. Admin Login (Requires ADMIN role in MongoDB)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'MissingCredentials',
        message: 'Both email and password are required to log in.',
      })
    }

    const trimmedEmail = email.trim()

    // Case-insensitive lookup
    const user = await User.findOne({
      email: { $regex: new RegExp('^' + trimmedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
    })

    if (!user) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: `No account found for '${trimmedEmail}'. Please check your email or contact the system administrator.`,
      })
    }

    // Compare password first
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Incorrect password for this administrator account. Click "Forgot Password?" if you need to reset it.',
      })
    }

    // Verify role is strictly ADMIN
    const userRole = (user.role || '').trim().toUpperCase()
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'AccessDenied',
        message: `Access denied. The account '${user.email}' has role '${user.role}', but only accounts with the 'ADMIN' role are permitted to enter the Admin Portal.`,
      })
    }

    // Generate signed JWT token
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'ADMIN',
    }

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    })

    // Set HTTP-only cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    console.log(`✔ [AUTH SUCCESS] Admin login: ${user.email} [Role: ADMIN]`)

    return res.json({
      success: true,
      message: 'Admin login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'ADMIN',
      },
    })
  } catch (err) {
    next(err)
  }
})

// 2. Admin Forgot Password (Generates single-use token in MongoDB)
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        error: 'MissingEmail',
        message: 'Please provide your registered admin email address.',
      })
    }

    const trimmedEmail = email.trim()
    const user = await User.findOne({
      email: { $regex: new RegExp('^' + trimmedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      role: 'ADMIN',
    })

    if (!user) {
      return res.json({
        success: true,
        message: 'If an active admin account exists for this email, a secure password-reset link has been dispatched.',
      })
    }

    // Generate secure random 32-byte token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // 15-minute expiration
    const expiresAt = new Date(Date.now() + config.resetTokenExpiresMinutes * 60 * 1000)
    const resetId = 'RST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)

    // Mark previous unused tokens for this user as used
    await PasswordReset.updateMany({ userId: user.id, used: false }, { used: true })

    // Save token hash to MongoDB
    await PasswordReset.create({
      id: resetId,
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
      used: false,
    })

    const resetLink = `/admin/reset-password?token=${rawToken}`

    console.log(`[AUTH EMAIL DISPATCH - MONGODB] Reset requested for ${user.email}`)
    console.log(`[AUTH EMAIL DISPATCH - MONGODB] Reset Link: ${resetLink}`)

    return res.json({
      success: true,
      message: 'A secure, short-lived password-reset link has been generated and dispatched.',
      resetLink,
      expiresInMinutes: config.resetTokenExpiresMinutes,
    })
  } catch (err) {
    next(err)
  }
})

// 3. Reset Password (Applies new password with token in MongoDB)
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'MissingData',
        message: 'Both reset token and new password are required.',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'WeakPassword',
        message: 'New password must be at least 8 characters long.',
      })
    }

    // Hash token to compare with MongoDB
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')

    const resetRecord = await PasswordReset.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    })

    if (!resetRecord) {
      return res.status(400).json({
        error: 'InvalidOrExpiredToken',
        message: 'This password reset link is invalid, expired, or has already been used.',
      })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds)

    // Update user in MongoDB
    await User.findOneAndUpdate(
      { id: resetRecord.userId },
      { passwordHash: newPasswordHash, updatedAt: new Date() }
    )

    // Mark token as used
    resetRecord.used = true
    await resetRecord.save()

    return res.json({
      success: true,
      message: 'Password has been successfully updated. You can now log in with your new password.',
    })
  } catch (err) {
    next(err)
  }
})

// 4. Verify Current Admin User
router.get('/me', authenticateToken, requireAdmin, (req, res) => {
  return res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  })
})

// 5. Logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token')
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  })
})

// 6. Change Password (Authenticated Admin)
router.post('/change-password', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'MissingFields',
        message: 'Both current password and new password are required.',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'WeakPassword',
        message: 'New password must be at least 8 characters long.',
      })
    }

    const user = await User.findOne({ id: req.user.id })
    const matches = await bcrypt.compare(currentPassword, user.passwordHash)

    if (!matches) {
      return res.status(400).json({
        error: 'IncorrectPassword',
        message: 'The current password provided is incorrect.',
      })
    }

    const newPasswordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds)
    user.passwordHash = newPasswordHash
    user.updatedAt = new Date()
    await user.save()

    return res.json({
      success: true,
      message: 'Password changed successfully in MongoDB.',
    })
  } catch (err) {
    next(err)
  }
})

export default router
