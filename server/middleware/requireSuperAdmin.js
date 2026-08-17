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

export default requireSuperAdmin
