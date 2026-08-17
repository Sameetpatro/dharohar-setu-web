import jwt from 'jsonwebtoken'
import config from '../config.js'
import User from '../models/User.js'

export async function authenticateToken(req, res, next) {
  let token = null

  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No authorization token provided. Please log in.',
    })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)

    // Lookup fresh user from MongoDB
    const user = await User.findOne({ id: decoded.id }).select('id name email role')
    if (!user) {
      return res.status(401).json({
        error: 'Invalid session',
        message: 'User associated with this token no longer exists in MongoDB.',
      })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      message: err.message || 'Please log in again.',
    })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate before accessing admin resources.',
    })
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied. You do not have the required ADMIN role to access this resource.',
    })
  }

  next()
}
