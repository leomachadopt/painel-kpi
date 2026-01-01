import { useState, useCallback } from 'react'
import { patientsApi } from '@/services/api'
import { Patient } from '@/lib/types'

interface UsePatientLookupReturn {
  patient: Patient | null
  loading: boolean
  error: any
  lookupByCode: (clinicId: string, code: string) => Promise<Patient | null>
  createPatient: (clinicId: string, data: Partial<Patient>) => Promise<Patient | null>
  clearPatient: () => void
}

export function usePatientLookup(): UsePatientLookupReturn {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const lookupByCode = useCallback(async (clinicId: string, code: string) => {
    if (!code || !/^\d{1,6}$/.test(code)) {
      setError('Código inválido')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const foundPatient = await patientsApi.getByCode(clinicId, code)
      setPatient(foundPatient)
      return foundPatient
    } catch (err: any) {
      // 404 é esperado quando paciente não existe
      if (err?.status === 404) {
        setPatient(null)
        setError(err)
        return null
      }
      setError(err?.message || 'Erro ao buscar paciente')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createPatient = useCallback(async (clinicId: string, data: Partial<Patient>) => {
    if (!data.code || !data.name) {
      setError('Código e nome são obrigatórios')
      return null
    }
    if (!/^\d{1,6}$/.test(data.code)) {
      setError('Código deve ter 1 a 6 dígitos')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const newPatient = await patientsApi.create(clinicId, data)
      setPatient(newPatient)
      return newPatient
    } catch (err: any) {
      // Sem permissão não deve exibir alerta destrutivo; apenas não cria.
      const msg = String(err?.message || '').toLowerCase()
      if (err?.status === 403 || msg.includes('forbidden')) {
        setError(null)
        return null
      }
      setError(err?.message || 'Erro ao criar paciente')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clearPatient = useCallback(() => {
    setPatient(null)
    setError(null)
  }, [])

  return {
    patient,
    loading,
    error,
    lookupByCode,
    createPatient,
    clearPatient,
  }
}
