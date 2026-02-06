import React, { useRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Check, ChevronDown } from 'lucide-react'
import { usePatientLookup } from '@/hooks/usePatientLookup'
import { useTranslation } from '@/hooks/useTranslation'
import { Patient } from '@/lib/types'

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
  label,
  required = true,
  codeError,
  patientNameError,
  codeHint,
}: PatientCodeInputProps) {
  const { t } = useTranslation()
  const defaultLabel = label || t('forms.patientCode')
  const defaultCodeHint = codeHint || t('forms.codeHelp')
  const [code, setCode] = useState(value)
  const [nameSearchQuery, setNameSearchQuery] = useState('')
  const [showNameDropdown, setShowNameDropdown] = useState(false)
  const [patientNotFound, setPatientNotFound] = useState(false)
  const [canAutoCreate, setCanAutoCreate] = useState(true)
  const createSeq = useRef(0)
  const onPatientNameChangeRef = useRef(onPatientNameChange)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const nameDropdownRef = useRef<HTMLDivElement>(null)
  const nameSearchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    onPatientNameChangeRef.current = onPatientNameChange
  }, [onPatientNameChange])
  const {
    patient,
    patients,
    loading,
    error,
    lookupByCode,
    lookupByName,
    createPatient,
    clearPatient,
    clearPatients
  } = usePatientLookup()

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
      setNameSearchQuery(patient.name)
      setPatientNotFound(false)
      setShowNameDropdown(false)
    } else if (code.length > 0 && !loading && error?.status === 404) {
      setPatientNotFound(true)
    }
  }, [patient, code.length, loading, error])

  // Sincronizar nameSearchQuery com patientName quando vier de fora
  useEffect(() => {
    if (patientName && !patient) {
      setNameSearchQuery(patientName)
    }
  }, [patientName, patient])

  // Buscar pacientes por nome com debounce
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setNameSearchQuery(newName)
    onPatientNameChangeRef.current(newName)

    // Limpar paciente selecionado se o nome foi alterado
    if (patient && newName !== patient.name) {
      clearPatient()
      onCodeChange('')
      setCode('')
    }

    // Limpar timeout anterior
    if (nameSearchTimeoutRef.current) {
      clearTimeout(nameSearchTimeoutRef.current)
    }

    // Se nome vazio, limpar resultados
    if (!newName.trim()) {
      clearPatients()
      setShowNameDropdown(false)
      return
    }

    // Buscar com debounce de 300ms
    if (newName.trim().length >= 2) {
      setShowNameDropdown(true)
      nameSearchTimeoutRef.current = setTimeout(() => {
        lookupByName(clinicId, newName)
      }, 300)
    } else {
      setShowNameDropdown(false)
      clearPatients()
    }
  }

  // Selecionar paciente do dropdown
  const handleSelectPatient = (selectedPatient: Patient) => {
    setCode(selectedPatient.code)
    onCodeChange(selectedPatient.code)
    setNameSearchQuery(selectedPatient.name)
    onPatientNameChangeRef.current(selectedPatient.name)
    clearPatient()
    // Buscar dados completos do paciente por código
    lookupByCode(clinicId, selectedPatient.code)
    setShowNameDropdown(false)
    clearPatients()
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        nameDropdownRef.current &&
        !nameDropdownRef.current.contains(event.target as Node) &&
        nameInputRef.current &&
        !nameInputRef.current.contains(event.target as Node)
      ) {
        setShowNameDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (nameSearchTimeoutRef.current) {
        clearTimeout(nameSearchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="patient-code">
            {defaultLabel} {required && <span className="text-destructive">*</span>}
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
              placeholder={t('forms.codePlaceholder')}
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
            <p className="text-xs text-muted-foreground mt-1">{defaultCodeHint}</p>
          )}
          {patientNotFound && code.length > 0 && !loading && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700">
                {t('forms.patientNotFound')}
              </p>
            </div>
          )}
        </div>

        <div className="relative">
          <Label htmlFor="patient-name">
            {t('forms.patientName')} {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="relative">
            <Input
              ref={nameInputRef}
              id="patient-name"
              type="text"
              value={nameSearchQuery}
              onChange={handleNameChange}
              onFocus={() => {
                if (patients.length > 0 && nameSearchQuery.trim().length >= 2) {
                  setShowNameDropdown(true)
                }
              }}
              placeholder={t('forms.patientNamePlaceholder')}
              required={required}
              disabled={patient !== null || loading}
              className={patient ? 'bg-muted' : ''}
              aria-invalid={!!patientNameError}
            />
            {loading && patients.length === 0 && nameSearchQuery.length >= 2 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {showNameDropdown && patients.length > 0 && !patient && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Dropdown de sugestões */}
          {showNameDropdown && patients.length > 0 && !patient && (
            <div
              ref={nameDropdownRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {patients.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPatient(p)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b last:border-b-0 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{p.name}</div>
                    {p.email && (
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    )}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground ml-2 px-2 py-1 bg-gray-100 rounded">
                    {p.code}
                  </div>
                </button>
              ))}
              {patients.length === 0 && !loading && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum paciente encontrado
                </div>
              )}
            </div>
          )}

          {patient && (
            <p className="text-xs text-green-600 mt-1">{t('forms.patientFound')}</p>
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
