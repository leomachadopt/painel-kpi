import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
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
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
  remember: z.boolean().default(false),
})

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'MENTORA') {
        navigate('/clinicas')
      } else if (user.clinicId) {
        navigate(`/dashboard/${user.clinicId}`)
      }
    }
  }, [isAuthenticated, user, navigate])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const loggedUser = await login(values.email, values.password)

      toast.success(`Bem-vindo de volta!`)

      if (loggedUser.role === 'MENTORA') {
        navigate('/clinicas')
      } else if (loggedUser.clinicId) {
        navigate(`/dashboard/${loggedUser.clinicId}`)
      }
    } catch (error) {
      toast.error('Erro ao realizar login. Verifique suas credenciais.')
      console.error(error)
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
              — Equipe de Sucesso do Cliente
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
              Acesse sua conta
            </h1>
            <p className="text-sm text-muted-foreground">
              Digite suas credenciais para acessar o painel
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
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
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
                  Esqueci minha senha
                </a>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </Form>

          <div className="text-center text-xs text-muted-foreground border p-4 rounded-md bg-muted/30">
            <p className="font-semibold mb-1">Credenciais de Teste:</p>
            <p>Mentora: mentor@kpipanel.com / mentor123</p>
            <p>Clínica: clinica@kpipanel.com / clinica123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
