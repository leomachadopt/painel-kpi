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
      {/* Left Side - Visual */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://img.usecurling.com/p/1200/1600?q=medical%20consulting&color=cyan')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="z-10">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="h-8 w-8 rounded bg-white/20 backdrop-blur" />
            Painel KPI
          </div>
        </div>
        <div className="z-10 max-w-md space-y-4">
          <blockquote className="space-y-2">
            <p className="text-2xl font-medium leading-snug">
              "Transforme dados em decisões estratégicas. Otimize a performance
              das suas clínicas com inteligência."
            </p>
            <footer className="text-sm opacity-80">
              — Equipa de Sucesso do Cliente
            </footer>
          </blockquote>
        </div>
        <div className="z-10 text-xs opacity-60">
          © 2024 Painel KPI. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-6">
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
