import jwt from 'jsonwebtoken'

export const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token

  if (!token) {
    return next(new Error('No token provided'))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.user = decoded
    next()
  } catch {
    next(new Error('Invalid or expired token'))
  }
}