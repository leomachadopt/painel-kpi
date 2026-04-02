import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
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

    // Simple password check (plain text for now - in production use bcrypt)
    const result = await query(
      `SELECT id, name, email, role, clinic_id, avatar_url, active, language
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
        language: user.language,
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

    const { name, email, avatarUrl, language } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    // Validate language if provided
    const validLanguages = ['pt-BR', 'pt-PT', 'it', 'es', 'en', 'fr']
    if (language !== undefined && language !== null && !validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language' })
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
       SET name = $1, email = $2, avatar_url = $3, language = $4, updated_at = NOW()
       WHERE id = $5`,
      [name, email, avatarUrl || null, language || null, userId]
    )

    // Get updated user
    const result = await query(
      'SELECT id, name, email, role, clinic_id, avatar_url, language FROM users WHERE id = $1',
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
        language: user.language,
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

    // Update password (plain text for now - in production use bcrypt)
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

    // Store base64 image directly in database (compatible with serverless environments)
    // The image is already in base64 format, so we can store it directly
    const avatarUrl = image

    // Update user's avatar_url with base64 data
    await query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    )

    // Get updated user
    const result = await query(
      'SELECT id, name, email, role, clinic_id, avatar_url, language FROM users WHERE id = $1',
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
        language: user.language,
      },
    })
  } catch (error: any) {
    console.error('Upload avatar error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    })
    res.status(500).json({
      error: 'Failed to upload avatar',
      message: error.message
    })
  }
})

// Update user language preference
router.put('/language', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { language } = req.body

    // Validate language (null is allowed to reset to clinic default)
    const validLanguages = ['pt-BR', 'pt-PT', 'it', 'es', 'en', 'fr']
    if (language !== null && !validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language' })
    }

    // Update user language
    await query(
      'UPDATE users SET language = $1, updated_at = NOW() WHERE id = $2',
      [language, userId]
    )

    // Get updated user
    const result = await query(
      'SELECT id, name, email, role, clinic_id, avatar_url, language FROM users WHERE id = $1',
      [userId]
    )

    const user = result.rows[0]

    res.json({
      message: 'Language preference updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinic_id,
        avatarUrl: user.avatar_url,
        language: user.language,
      },
    })
  } catch (error) {
    console.error('Update language error:', error)
    res.status(500).json({ error: 'Failed to update language preference' })
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

// ================================
// N8N API KEY MANAGEMENT (MENTOR ONLY)
// ================================

// POST /api/auth/n8n-api-key — Gerar nova API key global
router.post('/n8n-api-key', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.role

    // Apenas MENTOR pode gerar API keys
    if (role !== 'MENTOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only MENTOR can manage n8n API keys'
      })
    }

    // Gerar API key aleatória
    const rawKey = 'n8n_' + crypto.randomBytes(32).toString('hex')

    // Hash da chave (bcrypt com salt rounds = 12)
    const hash = await bcrypt.hash(rawKey, 12)

    // Guardar hash na base de dados
    await query(
      `UPDATE system_settings
       SET value = $1, updated_at = NOW()
       WHERE key = 'n8n_api_key_hash'`,
      [hash]
    )

    // Retornar a chave em plaintext (ÚNICA VEZ que é mostrada)
    res.json({
      apiKey: rawKey,
      message: 'API key gerada com sucesso. Guarde esta chave — não será mostrada novamente.'
    })
  } catch (error) {
    console.error('Generate n8n API key error:', error)
    res.status(500).json({ error: 'Failed to generate API key' })
  }
})

// DELETE /api/auth/n8n-api-key — Revogar API key
router.delete('/n8n-api-key', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.role

    // Apenas MENTOR pode revogar API keys
    if (role !== 'MENTOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only MENTOR can manage n8n API keys'
      })
    }

    // Remover hash da base de dados
    await query(
      `UPDATE system_settings
       SET value = NULL, updated_at = NOW()
       WHERE key = 'n8n_api_key_hash'`
    )

    res.json({ message: 'API key revogada com sucesso' })
  } catch (error) {
    console.error('Revoke n8n API key error:', error)
    res.status(500).json({ error: 'Failed to revoke API key' })
  }
})

// GET /api/auth/n8n-api-key/status — Estado da chave (sem revelar o valor)
router.get('/n8n-api-key/status', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.role

    // Apenas MENTOR pode ver o estado da API key
    if (role !== 'MENTOR') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only MENTOR can view n8n API key status'
      })
    }

    // Buscar estado da chave
    const result = await query(
      'SELECT value, updated_at FROM system_settings WHERE key = $1',
      ['n8n_api_key_hash']
    )

    if (result.rows.length === 0) {
      return res.json({ hasKey: false, updatedAt: null })
    }

    const row = result.rows[0]
    res.json({
      hasKey: row.value !== null,
      updatedAt: row.updated_at
    })
  } catch (error) {
    console.error('Get n8n API key status error:', error)
    res.status(500).json({ error: 'Failed to get API key status' })
  }
})

export default router
