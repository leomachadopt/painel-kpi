import React from 'react'
import { Label } from '@/components/ui/label'
import { RESOURCE_PERMISSIONS, type PermissionLevel } from '@/lib/permissionsMapping'
import type { ResourcePermissions } from '@/lib/types'
import { Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResourcePermissionsGridProps {
  permissions: ResourcePermissions
  onChange: (resourceId: string, level: PermissionLevel) => void
  disabled?: boolean
}

export function ResourcePermissionsGrid({
  permissions,
  onChange,
  disabled = false,
}: ResourcePermissionsGridProps) {
  const handleSliderClick = (resourceId: string, currentLevel: PermissionLevel) => {
    if (disabled) return

    // Cycle through levels: DENIED -> ALLOWED -> DENIED
    // (IF_RESPONSIBLE can be added later if needed)
    const nextLevel: PermissionLevel = currentLevel === 'DENIED' ? 'ALLOWED' : 'DENIED'
    onChange(resourceId, nextLevel)
  }

  const getLevelIcon = (level: PermissionLevel) => {
    switch (level) {
      case 'ALLOWED':
        return <Check className="h-4 w-4 text-green-600" />
      case 'IF_RESPONSIBLE':
        return <Minus className="h-4 w-4 text-yellow-600" />
      case 'DENIED':
        return <X className="h-4 w-4 text-red-600" />
    }
  }

  const getLevelColor = (level: PermissionLevel) => {
    switch (level) {
      case 'ALLOWED':
        return 'bg-green-100 border-green-300'
      case 'IF_RESPONSIBLE':
        return 'bg-yellow-100 border-yellow-300'
      case 'DENIED':
        return 'bg-red-100 border-red-300'
    }
  }

  const getLevelLabel = (level: PermissionLevel) => {
    switch (level) {
      case 'ALLOWED':
        return 'Permitido'
      case 'IF_RESPONSIBLE':
        return 'Se responsável'
      case 'DENIED':
        return 'Negado'
    }
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-semibold">Recurso</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Ações</th>
              <th className="px-4 py-3 text-center text-sm font-semibold w-32">Permissão</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCE_PERMISSIONS.map((resource) => {
              const currentLevel = permissions[resource.id] || 'DENIED'
              console.log(`Resource ${resource.id}: currentLevel = ${currentLevel}, permissions object:`, permissions)
              return (
                <tr
                  key={resource.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{resource.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {resource.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-muted-foreground">{resource.actions}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleSliderClick(resource.id, currentLevel)}
                        disabled={disabled}
                        className={cn(
                          'relative w-11 h-6 rounded-full border transition-all',
                          'flex items-center transition-colors duration-200',
                          'hover:opacity-80 active:scale-95',
                          currentLevel === 'ALLOWED' 
                            ? 'bg-green-500 border-green-600' 
                            : 'bg-red-500 border-red-600',
                          disabled && 'opacity-50 cursor-not-allowed',
                          !disabled && 'cursor-pointer'
                        )}
                        title={`Clique para alternar: ${getLevelLabel(currentLevel)}`}
                      >
                        {/* Toggle circle */}
                        <div
                          className={cn(
                            'absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                            currentLevel === 'ALLOWED' ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        >
                          <div className="flex items-center justify-center h-full">
                            {currentLevel === 'ALLOWED' ? (
                              <Check className="h-2.5 w-2.5 text-green-600" />
                            ) : (
                              <X className="h-2.5 w-2.5 text-red-600" />
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(currentLevel)}
                      <span className="text-sm font-medium">{getLevelLabel(currentLevel)}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

