import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from '@/hooks/useTranslation'
import TeamMembersTab from '@/components/team/TeamMembersTab'

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
          Gerencie todos os membros da equipe: donos, médicos e colaboradores em um único lugar
        </p>
      </div>

      <TeamMembersTab />
    </div>
  )
}
