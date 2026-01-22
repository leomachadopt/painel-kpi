import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import useAuthStore from '@/stores/useAuthStore'
import { toast } from 'sonner'

const formSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(1, { message: 'A palavra-passe é obrigatória.' }),
  remember: z.boolean().default(false),
})

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user, loading } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [contextReady, setContextReady] = useState(false)

  // Verificar se o contexto está disponível (para evitar problemas de hot-reload)
  useEffect(() => {
    // Se loading for true por muito tempo, pode ser que o contexto não esteja disponível
    if (loading) {
      const timer = setTimeout(() => {
        // Se após 2 segundos ainda estiver loading, considerar que o contexto está pronto
        // (pode ser apenas uma verificação inicial do localStorage)
        setContextReady(true)
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setContextReady(true)
    }
  }, [loading])

  useEffect(() => {
    // Only redirect on initial auth check, not during page reload
    if (!loading && isAuthenticated && user) {
      if (user.role === 'MENTOR') {
        navigate('/clinicas', { replace: true })
      } else if (user.clinicId) {
        navigate(`/dashboard/${user.clinicId}`, { replace: true })
      }
    }
  }, [isAuthenticated, user, loading, navigate])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Verificar se o contexto está pronto antes de tentar fazer login
    if (!contextReady && loading) {
      toast.error('Aguarde a inicialização do sistema...')
      return
    }

    setIsLoading(true)
    try {
      const loggedUser = await login(values.email, values.password)

      // Se o contexto não estava disponível, o login foi feito via API diretamente
      // Neste caso, precisamos recarregar a página para que o Provider pegue o estado
      if (!contextReady || loading) {
        toast.success(`Bem-vindo(a) de volta! A recarregar...`)
        setTimeout(() => {
          window.location.reload()
        }, 500)
        return
      }

      toast.success(`Bem-vindo(a) de volta!`)

      if (loggedUser.role === 'MENTOR') {
        navigate('/clinicas')
      } else if (loggedUser.clinicId) {
        navigate(`/dashboard/${loggedUser.clinicId}`)
      }
    } catch (error: any) {
      // Tratar erro específico do AuthProvider ausente
      if (error?.message?.includes('AuthProvider ausente')) {
        toast.error('Erro de inicialização. Recarregando a página...')
        console.error('AuthProvider não disponível:', error)
        // Recarregar após um delay
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast.error(error?.message || 'Erro ao realizar login. Verifique as suas credenciais.')
        console.error(error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Side - Institutional Landing Page */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/login.png')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>

        {/* Main Content */}
        <div className="z-10 max-w-lg space-y-8">
          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight">
              Uma plataforma de indicadores e performance para clínicas.
            </h1>
            <p className="text-lg opacity-90 leading-relaxed">
              Centralize métricas, acompanhe resultados e tome decisões estratégicas com base em dados reais.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider opacity-80">
              Principais Funcionalidades
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-foreground flex-shrink-0"></div>
                <span className="text-sm leading-relaxed">
                  Painel de indicadores de performance da clínica
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-foreground flex-shrink-0"></div>
                <span className="text-sm leading-relaxed">
                  Acompanhamento de métricas operacionais e de marketing
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-foreground flex-shrink-0"></div>
                <span className="text-sm leading-relaxed">
                  Integração com Google Business Profile via OAuth (opcional)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-foreground flex-shrink-0"></div>
                <span className="text-sm leading-relaxed">
                  Monitoramento de reputação e avaliações
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-foreground flex-shrink-0"></div>
                <span className="text-sm leading-relaxed">
                  Gestão financeira integrada e controle de fornecedores
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-foreground flex-shrink-0"></div>
                <span className="text-sm leading-relaxed">
                  Sistema NPS para medição de satisfação de pacientes
                </span>
              </li>
            </ul>
          </div>

          {/* Trust Section */}
          <div className="pt-4 border-t border-primary-foreground/20">
            <p className="text-sm opacity-80 leading-relaxed">
              A plataforma apenas acessa dados de serviços externos mediante autorização explícita do usuário.
              Todas as integrações seguem os protocolos de segurança OAuth 2.0 e suas permissões podem ser
              revogadas a qualquer momento.
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="z-10 space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <a href="/privacy" className="opacity-70 hover:opacity-100 hover:underline transition-opacity">
              Política de Privacidade
            </a>
            <span className="opacity-40">•</span>
            <a href="/terms" className="opacity-70 hover:opacity-100 hover:underline transition-opacity">
              Termos de Serviço
            </a>
            <span className="opacity-40">•</span>
            <a href="/about" className="opacity-70 hover:opacity-100 hover:underline transition-opacity">
              Sobre a empresa
            </a>
          </div>
          <div className="text-xs opacity-60">
            © 2024 Dental KPI. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo no topo */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/logo_kpi_horizontal.png" 
              alt="Dental KPI" 
              className="h-32 w-auto"
            />
          </div>
          
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Aceda à sua conta
            </h1>
            <p className="text-sm text-muted-foreground">
              Digite as suas credenciais para aceder ao painel
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="nome@kpipanel.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Palavra-passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••"
                          {...field}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="remember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal cursor-pointer text-sm">
                          Lembrar-me
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <a
                  href="#"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Esqueci-me da palavra-passe
                </a>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !contextReady}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!contextReady ? 'A inicializar...' : 'Entrar'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
