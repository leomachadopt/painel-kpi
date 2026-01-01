import { Router } from 'express'
import { query } from '../db.js'
import { signAuthToken } from '../auth/token.js'

const router = Router()

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // In production, use proper password hashing (bcrypt)
    const result = await query(
      `SELECT id, name, email, role, clinic_id, avatar_url
       FROM users
       WHERE email = $1 AND password_hash = $2`,
      [email, password]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]
    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      clinicId: user.clinic_id,
    })
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinic_id,
        avatarUrl: user.avatar_url,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Logout (client-side only for now)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

export default router
