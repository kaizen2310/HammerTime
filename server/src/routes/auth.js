import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { validate } from '../middleware/validate.js'
import { registerSchema, loginSchema } from '../validation/schemas.js'

const router = Router()

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { username, email, password } = req.body

    const existing = await User.findOne({ $or: [{ email }, { username }] })
    if (existing) {
      return res.status(400).json({ error: 'Username or email already taken' })
    }

    const user = await User.create({ username, email, passwordHash: password })

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValid = await user.comparePassword(password)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router