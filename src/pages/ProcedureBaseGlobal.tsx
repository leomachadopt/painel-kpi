import { Navigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import useAuthStore from '@/stores/useAuthStore'
import { ProcedureBaseEditorGlobal } from '@/components/settings/ProcedureBaseEditorGlobal'

export default function ProcedureBaseGlobal() {
  const { user } = useAuthStore()

  // Only MENTOR can access
  if (user?.role !== 'MENTOR') {
    return <Navigate to="/clinicas" replace />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tabela Base de Procedimentos</h1>
        <p className="text-muted-foreground">
          Tabela padrão global compartilhada por todas as clínicas. Define quais procedimentos são Periciáveis ou Não Periciáveis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabela Base Global</CardTitle>
          <CardDescription>
            Esta tabela é compartilhada por todas as clínicas da rede. Alterações aqui afetam todas as clínicas.
            Use esta tabela para definir os procedimentos padrão que serão utilizados em todo o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProcedureBaseEditorGlobal />
        </CardContent>
      </Card>
    </div>
  )
}



