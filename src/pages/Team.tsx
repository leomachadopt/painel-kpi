import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from '@/hooks/useTranslation'
import { Users, Stethoscope } from 'lucide-react'
import DoctorsTab from '@/components/team/DoctorsTab'
import CollaboratorsTab from '@/components/team/CollaboratorsTab'

export default function Team() {
  const { t } = useTranslation()
  const { isGestor } = usePermissions()

  if (!isGestor) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">{t('common.noPermission')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('team.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('team.description')}
        </p>
      </div>

      <Tabs defaultValue="doctors" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="doctors" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            {t('team.doctors')}
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="gap-2">
            <Users className="h-4 w-4" />
            {t('team.collaborators')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="doctors" className="mt-6">
          <DoctorsTab />
        </TabsContent>

        <TabsContent value="collaborators" className="mt-6">
          <CollaboratorsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
