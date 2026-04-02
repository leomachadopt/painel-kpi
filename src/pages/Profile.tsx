import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import useAuthStore from '@/stores/useAuthStore'
import { authApi } from '@/services/api'
import { toast } from 'sonner'
import { Loader2, User, Mail, Lock, Key, AlertTriangle } from 'lucide-react'

export default function Profile() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // N8N API Key state (MENTOR only)
  const [n8nKeyStatus, setN8nKeyStatus] = useState<{ hasKey: boolean; updatedAt: string | null } | null>(null)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [loadingN8n, setLoadingN8n] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setAvatarUrl(user.avatarUrl || '')
      setAvatarPreview(user.avatarUrl || null)

      // Load n8n API key status if MENTOR
      if (user.role === 'MENTOR') {
        loadN8nKeyStatus()
      }
    }
  }, [user])

  const loadN8nKeyStatus = async () => {
    try {
      const status = await authApi.getN8nApiKeyStatus()
      setN8nKeyStatus(status)
    } catch (error: any) {
      console.error('Failed to load n8n key status:', error)
    }
  }

  const handleGenerateN8nKey = async () => {
    if (!window.confirm('Isto invalida a chave actual. Tem a certeza?')) {
      return
    }

    setLoadingN8n(true)
    try {
      const response = await authApi.generateN8nApiKey()
      setGeneratedApiKey(response.apiKey)
      setShowApiKeyModal(true)
      await loadN8nKeyStatus()
      toast.success('API key gerada com sucesso')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar API key')
    } finally {
      setLoadingN8n(false)
    }
  }

  const handleRevokeN8nKey = async () => {
    if (!window.confirm('Tem a certeza que deseja revogar a API key? Os relatórios automáticos deixarão de funcionar.')) {
      return
    }

    setLoadingN8n(true)
    try {
      await authApi.revokeN8nApiKey()
      await loadN8nKeyStatus()
      toast.success('API key revogada com sucesso')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao revogar API key')
    } finally {
      setLoadingN8n(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Chave copiada para a área de transferência')
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB')
      return
    }

    setAvatarFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatarIfNeeded = async (): Promise<string> => {
    if (!avatarFile) return avatarUrl

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string
          const response = await authApi.uploadAvatar({ image: base64 })

          // Update localStorage with new user data
          localStorage.setItem('kpi_user', JSON.stringify(response.user))

          resolve(response.url)
        } catch (error: any) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Erro ao processar imagem'))
      reader.readAsDataURL(avatarFile)
    })
  }

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!email.trim()) {
      toast.error('Email é obrigatório')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast.error('Email inválido')
      return
    }

    setLoading(true)
    try {
      // Upload avatar first if there's a new file
      let finalAvatarUrl = avatarUrl
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatarIfNeeded()
        setAvatarFile(null)
        setAvatarPreview(null)
      }

      const response = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
        avatarUrl: finalAvatarUrl.trim() || undefined,
      })

      // Update localStorage with new user data
      localStorage.setItem('kpi_user', JSON.stringify(response.user))

      toast.success('Perfil atualizado com sucesso!')
      // Reload to update user data everywhere
      setTimeout(() => window.location.reload(), 500)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Senha atual é obrigatória')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('Nova senha deve ter no mínimo 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      })
      toast.success('Senha alterada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">
          Gerir informações pessoais e configurações da conta
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações básicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || avatarUrl} alt={name} />
                <AvatarFallback className="text-2xl">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="avatar-upload">Foto de Perfil</Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, GIF. Tamanho máximo: 2MB.
                    {avatarFile && ' Clique em "Guardar Alterações" para enviar.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={user.role === 'MENTOR' ? 'Mentor' : 'Gestor de Clínica'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Atualize sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite novamente a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* N8N API Key Management (MENTOR only) */}
        {user.role === 'MENTOR' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Integração n8n — API Key Global
              </CardTitle>
              <CardDescription>
                Chave de autenticação global do n8n. Usada no nó de variáveis de todos os workflows.
                Só você tem acesso a esta chave.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {n8nKeyStatus?.hasKey ? (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">Chave activa</span>
                      </div>
                      {n8nKeyStatus.updatedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Desde {new Date(n8nKeyStatus.updatedAt).toLocaleDateString('pt-PT')}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-gray-400 rounded-full" />
                        <span className="text-sm font-medium">Sem chave configurada</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleGenerateN8nKey}
                  disabled={loadingN8n}
                  variant="default"
                >
                  {loadingN8n ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  {n8nKeyStatus?.hasKey ? 'Gerar nova chave' : 'Gerar chave'}
                </Button>

                {n8nKeyStatus?.hasKey && (
                  <Button
                    onClick={handleRevokeN8nKey}
                    disabled={loadingN8n}
                    variant="destructive"
                  >
                    {loadingN8n ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="mr-2 h-4 w-4" />
                    )}
                    Revogar
                  </Button>
                )}
              </div>

              <div className="mt-4 p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Gerar nova chave invalida a anterior. Actualize o n8n imediatamente depois.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de exibição da API key gerada */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🔑 API Key Gerada com Sucesso</DialogTitle>
            <DialogDescription>
              Guarde esta chave num local seguro. Ela não será mostrada novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-2">Chave API:</p>
              <code className="block p-3 bg-background rounded border text-sm font-mono break-all">
                {generatedApiKey}
              </code>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => generatedApiKey && copyToClipboard(generatedApiKey)}
                className="flex-1"
              >
                📋 Copiar Chave
              </Button>
              <Button
                onClick={() => {
                  setShowApiKeyModal(false)
                  setGeneratedApiKey(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Fechar
              </Button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md">
              <p className="text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Adicione esta chave no n8n imediatamente. Configure em:
                  <br />
                  Settings → Variables → N8N_API_KEY
                </span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
