import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { Trash2, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const { user } = useAuthStore()
  const { clinics, updateClinicConfig } = useDataStore()
  const navigate = useNavigate()

  // Mentor can select clinic, Manager sees only theirs
  const [selectedClinicId, setSelectedClinicId] = useState(
    user?.clinicId || clinics[0]?.id,
  )

  const clinic = clinics.find((c) => c.id === selectedClinicId)

  // Local state for editing before save
  const [config, setConfig] = useState(clinic?.configuration)

  if (!clinic || !config) return <div className="p-8">Carregando...</div>

  // Sync state if clinic changes
  if (clinic.id !== selectedClinicId) {
    // This is a bit unsafe in render, but for mock simplicity
  }

  const handleSave = () => {
    updateClinicConfig(clinic.id, config)
    toast.success('Configurações salvas com sucesso!')
  }

  const ListEditor = ({
    title,
    items,
    onUpdate,
  }: {
    title: string
    items: { id: string; name: string; standardHours?: number }[]
    onUpdate: (items: any[]) => void
  }) => {
    const [newItem, setNewItem] = useState('')
    const [newHours, setNewHours] = useState('8')

    const add = () => {
      if (!newItem) return
      const entry: any = { id: Math.random().toString(36), name: newItem }
      if (title === 'Gabinetes') entry.standardHours = parseFloat(newHours)
      onUpdate([...items, entry])
      setNewItem('')
    }

    const remove = (id: string) => {
      onUpdate(items.filter((i) => i.id !== id))
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`Novo ${title}`}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          {title === 'Gabinetes' && (
            <Input
              type="number"
              placeholder="Horas"
              className="w-24"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
            />
          )}
          <Button onClick={add} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 border rounded bg-background"
            >
              <div className="flex gap-2">
                <span>{item.name}</span>
                {item.standardHours && (
                  <span className="text-muted-foreground text-sm">
                    ({item.standardHours}h)
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as listas e parâmetros da clínica.
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="cabinets">Gabinetes</TabsTrigger>
          <TabsTrigger value="doctors">Médicos</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categorias Financeiras</CardTitle>
              <CardDescription>
                Defina as categorias de receita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Categoria"
                items={config.categories}
                onUpdate={(items) =>
                  setConfig({ ...config, categories: items })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cabinets">
          <Card>
            <CardHeader>
              <CardTitle>Gabinetes</CardTitle>
              <CardDescription>
                Gerencie os gabinetes e horas disponíveis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Gabinetes"
                items={config.cabinets}
                onUpdate={(items) => setConfig({ ...config, cabinets: items })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <CardTitle>Corpo Clínico</CardTitle>
              <CardDescription>
                Lista de médicos para registro de tempo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Médico"
                items={config.doctors}
                onUpdate={(items) => setConfig({ ...config, doctors: items })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Fontes de Aquisição</CardTitle>
              <CardDescription>Canais de marketing e origem.</CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Fonte"
                items={config.sources}
                onUpdate={(items) => setConfig({ ...config, sources: items })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
