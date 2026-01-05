import { Router } from 'express'
import { query } from '../db.js'
import { signAuthToken } from '../auth/token.js'
import { authMiddleware } from '../auth/middleware.js'
import { getUserPermissions } from '../middleware/permissions.js'

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
      `SELECT id, name, email, role, clinic_id, avatar_url, active
       FROM users
       WHERE email = $1 AND password_hash = $2`,
      [email, password]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Check if user is active
    if (user.active === false) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.id, user.role, user.clinic_id)

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
        active: user.active,
        permissions,
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

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { name, email, avatarUrl } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    // Check if email is already in use by another user
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    // Update user
    await query(
      `UPDATE users
       SET name = $1, email = $2, avatar_url = $3, updated_at = NOW()
       WHERE id = $4`,
      [name, email, avatarUrl || null, userId]
    )

    // Get updated user
    const result = await query(
      'SELECT id, name, email, role, clinic_id, avatar_url FROM users WHERE id = $1',
      [userId]
    )

    const user = result.rows[0]

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinic_id,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// Change password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }

    // Verify current password
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    if (user.password_hash !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPassword, userId]
    )

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// Upload avatar
router.post('/avatar', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { image } = req.body

    if (!image || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data' })
    }

    // Extract base64 data
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' })
    }

    const [, extension, base64Data] = matches
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate file size (max 2MB)
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be less than 2MB' })
    }

    // Generate filename
    const filename = `${userId}-${Date.now()}.${extension}`
    const fs = await import('fs/promises')
    const path = await import('path')

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    await fs.mkdir(uploadsDir, { recursive: true })

    // Save file
    const filePath = path.join(uploadsDir, filename)
    await fs.writeFile(filePath, buffer)

    // Generate URL
    const avatarUrl = `/uploads/avatars/${filename}`

    // Update user's avatar_url
    await query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    )

    // Get updated user
    const result = await query(
      'SELECT id, name, email, role, clinic_id, avatar_url FROM users WHERE id = $1',
      [userId]
    )

    const user = result.rows[0]

    res.json({
      message: 'Avatar uploaded successfully',
      url: avatarUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinic_id,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (error) {
    console.error('Upload avatar error:', error)
    res.status(500).json({ error: 'Failed to upload avatar' })
  }
})

// Get current user permissions (for refreshing permissions without re-login)
router.get('/permissions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub
    const role = req.user?.role
    const clinicId = req.user?.clinicId

    if (!userId || !role || !clinicId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get updated permissions
    const permissions = await getUserPermissions(userId, role, clinicId)

    res.json({ permissions })
  } catch (error) {
    console.error('Get permissions error:', error)
    res.status(500).json({ error: 'Failed to get permissions' })
  }
})

export default router
