import React, { useRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Check } from 'lucide-react'
import { usePatientLookup } from '@/hooks/usePatientLookup'

interface PatientCodeInputProps {
  clinicId: string
  value: string
  onCodeChange: (code: string) => void
  patientName: string
  onPatientNameChange: (name: string) => void
  label?: string
  required?: boolean
  codeError?: string
  patientNameError?: string
  codeHint?: string
}

export function PatientCodeInput({
  clinicId,
  value,
  onCodeChange,
  patientName,
  onPatientNameChange,
  label = 'Código do Paciente',
  required = true,
  codeError,
  patientNameError,
  codeHint = '1 a 6 dígitos',
}: PatientCodeInputProps) {
  const [code, setCode] = useState(value)
  const [patientNotFound, setPatientNotFound] = useState(false)
  const [canAutoCreate, setCanAutoCreate] = useState(true)
  const createSeq = useRef(0)
  const onPatientNameChangeRef = useRef(onPatientNameChange)

  useEffect(() => {
    onPatientNameChangeRef.current = onPatientNameChange
  }, [onPatientNameChange])
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
    setPatientNotFound(false)
    
    if (newCode.length === 0) {
      onPatientNameChangeRef.current('')
      return
    }
    
    // Buscar paciente quando código tiver 1-6 dígitos
    if (newCode.length >= 1 && newCode.length <= 6) {
      lookupByCode(clinicId, newCode)
    }
  }

  // Preencher nome automaticamente quando paciente for encontrado
  useEffect(() => {
    if (patient) {
      onPatientNameChangeRef.current(patient.name)
      setPatientNotFound(false)
    } else if (code.length > 0 && !loading && error?.status === 404) {
      setPatientNotFound(true)
    }
  }, [patient, code.length, loading, error])

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="patient-code">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="relative">
            <Input
              id="patient-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,6}"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="Ex: 1234"
              className="font-mono text-lg"
              required={required}
              aria-invalid={!!codeError}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {patient && code.length > 0 && !loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>
          {codeError ? (
            <p className="text-xs text-destructive mt-1">{codeError}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{codeHint}</p>
          )}
          {patientNotFound && code.length > 0 && !loading && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700">
                Paciente não encontrado. Preencha o nome para cadastrar automaticamente.
              </p>
            </div>
          )}
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
            onBlur={() => {
              // Auto-criação desabilitada para evitar 403; mantemos o preenchimento livre.
              const trimmed = (patientName || '').trim()
              if (!trimmed) return
              setPatientNotFound(false)
              setCanAutoCreate(true)
            }}
            placeholder="Nome completo"
            required={required}
            disabled={patient !== null || loading}
            className={patient ? 'bg-muted' : ''}
            aria-invalid={!!patientNameError}
          />
          {patient && (
            <p className="text-xs text-green-600 mt-1">✓ Paciente encontrado</p>
          )}
          {!patient && !loading && patientNameError && (
            <p className="text-xs text-destructive mt-1">{patientNameError}</p>
          )}
        </div>
      </div>

      {error && error?.message && error?.status !== 404 && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
