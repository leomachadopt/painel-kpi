import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, UserPlus, Check } from 'lucide-react'
import { usePatientLookup } from '@/hooks/usePatientLookup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PatientCodeInputProps {
  clinicId: string
  value: string
  onCodeChange: (code: string) => void
  patientName: string
  onPatientNameChange: (name: string) => void
  label?: string
  required?: boolean
}

export function PatientCodeInput({
  clinicId,
  value,
  onCodeChange,
  patientName,
  onPatientNameChange,
  label = 'Código do Paciente',
  required = true,
}: PatientCodeInputProps) {
  const [code, setCode] = useState(value)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const { patient, loading, error, lookupByCode, createPatient, clearPatient } = usePatientLookup()

  // Update local state when prop changes
  useEffect(() => {
    setCode(value)
  }, [value])

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(newCode)
    onCodeChange(newCode)
    clearPatient()

    // Auto-lookup when 6 digits are entered
    if (newCode.length === 6) {
      lookupByCode(clinicId, newCode).then((foundPatient) => {
        if (foundPatient) {
          onPatientNameChange(foundPatient.name)
        } else {
          // Patient not found, show create dialog
          setNewPatientData({ name: '', email: '', phone: '' })
          setShowCreateDialog(true)
        }
      })
    } else {
      onPatientNameChange('')
    }
  }

  const handleCreatePatient = async () => {
    if (!newPatientData.name.trim()) {
      return
    }

    const created = await createPatient(clinicId, {
      code,
      name: newPatientData.name.trim(),
      email: newPatientData.email || undefined,
      phone: newPatientData.phone || undefined,
    })

    if (created) {
      onPatientNameChange(created.name)
      setShowCreateDialog(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="patient-code">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="relative">
            <Input
              id="patient-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className="font-mono text-lg"
              required={required}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {patient && code.length === 6 && !loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">6 dígitos</p>
        </div>

        <div>
          <Label htmlFor="patient-name">
            Nome do Paciente {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="patient-name"
            type="text"
            value={patientName}
            onChange={(e) => onPatientNameChange(e.target.value)}
            placeholder="Nome completo"
            required={required}
            disabled={patient !== null || loading}
            className={patient ? 'bg-muted' : ''}
          />
          {patient && (
            <p className="text-xs text-green-600 mt-1">✓ Paciente encontrado</p>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Create Patient Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Novo Paciente
            </DialogTitle>
            <DialogDescription>
              Paciente com código <strong>{code}</strong> não encontrado. Deseja criar um novo
              cadastro?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-patient-name">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-patient-name"
                value={newPatientData.name}
                onChange={(e) =>
                  setNewPatientData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nome completo do paciente"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="new-patient-email">Email (opcional)</Label>
              <Input
                id="new-patient-email"
                type="email"
                value={newPatientData.email}
                onChange={(e) =>
                  setNewPatientData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="new-patient-phone">Telefone (opcional)</Label>
              <Input
                id="new-patient-phone"
                type="tel"
                value={newPatientData.phone}
                onChange={(e) =>
                  setNewPatientData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+351 900 000 000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setCode('')
                onCodeChange('')
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreatePatient} disabled={!newPatientData.name.trim()}>
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
