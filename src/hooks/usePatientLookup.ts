import { useState, useCallback } from 'react'
import { patientsApi } from '@/services/api'
import { Patient } from '@/lib/types'

interface UsePatientLookupReturn {
  patient: Patient | null
  loading: boolean
  error: string | null
  lookupByCode: (clinicId: string, code: string) => Promise<Patient | null>
  createPatient: (clinicId: string, data: Partial<Patient>) => Promise<Patient | null>
  clearPatient: () => void
}

export function usePatientLookup(): UsePatientLookupReturn {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookupByCode = useCallback(async (clinicId: string, code: string) => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Código deve ter exatamente 6 dígitos')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const foundPatient = await patientsApi.getByCode(clinicId, code)
      setPatient(foundPatient)
      return foundPatient
    } catch (err: any) {
      if (err.message.includes('404') || err.message.includes('not found')) {
        setPatient(null)
        setError(null) // Not an error, just not found
        return null
      }
      setError(err.message || 'Erro ao buscar paciente')
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

    setLoading(true)
    setError(null)

    try {
      const newPatient = await patientsApi.create(clinicId, data)
      setPatient(newPatient)
      return newPatient
    } catch (err: any) {
      setError(err.message || 'Erro ao criar paciente')
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
