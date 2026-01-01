// API Service para comunicação com o backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function getAuthToken() {
  return localStorage.getItem('kpi_token')
}

// Helper function for making API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const token = getAuthToken()
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      if (response.status === 401) {
        // Session expired / token missing
        localStorage.removeItem('kpi_user')
        localStorage.removeItem('kpi_token')
        // Redirect to login (best-effort)
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new Error('Sessão expirada. Faça login novamente.')
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

// ================================
// AUTH API
// ================================
export const authApi = {
  login: (email: string, password: string) =>
    apiCall<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiCall<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),
}

// ================================
// CLINICS API
// ================================
export const clinicsApi = {
  getAll: () => apiCall<any[]>('/clinics'),

  getById: (id: string) => apiCall<any>(`/clinics/${id}`),

  updateTargets: (clinicId: string, targets: any) =>
    apiCall<{ message: string }>(`/clinics/${clinicId}/targets`, {
      method: 'PUT',
      body: JSON.stringify(targets),
    }),
}

// ================================
// MONTHLY DATA API
// ================================
export const monthlyDataApi = {
  getByMonth: (clinicId: string, year: number, month: number) =>
    apiCall<any>(`/monthly-data/${clinicId}/${year}/${month}`),

  getByYear: (clinicId: string, year: number) =>
    apiCall<any[]>(`/monthly-data/${clinicId}/${year}`),
}

// ================================
// PATIENTS API
// ================================
export const patientsApi = {
  getAll: (clinicId: string, search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiCall<any[]>(`/patients/${clinicId}${params}`)
  },

  getByCode: (clinicId: string, code: string) =>
    apiCall<any>(`/patients/${clinicId}/code/${code}`),

  create: (clinicId: string, patient: any) =>
    apiCall<any>(`/patients/${clinicId}`, {
      method: 'POST',
      body: JSON.stringify(patient),
    }),

  update: (clinicId: string, patientId: string, patient: any) =>
    apiCall<any>(`/patients/${clinicId}/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    }),

  delete: (clinicId: string, patientId: string) =>
    apiCall<{ message: string }>(`/patients/${clinicId}/${patientId}`, {
      method: 'DELETE',
    }),
}

// ================================
// CONFIG API
// ================================
export const configApi = {
  update: (clinicId: string, config: any) =>
    apiCall<{ message: string }>(`/config/${clinicId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
}

// ================================
// DAILY ENTRIES API
// ================================
export const dailyEntriesApi = {
  // Financial
  financial: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/financial/${clinicId}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/financial/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },

  // Consultation
  consultation: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/consultation/${clinicId}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/consultation/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },

  // Prospecting
  prospecting: {
    getByDate: (clinicId: string, date: string) =>
      apiCall<any>(`/daily-entries/prospecting/${clinicId}/${date}`),

    save: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/prospecting/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },

  // Cabinet Usage
  cabinet: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/cabinet/${clinicId}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/cabinet/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },

  // Service Time
  serviceTime: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/service-time/${clinicId}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/service-time/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },

  // Source
  source: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/source/${clinicId}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/source/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },
}

// ================================
// MARKETING API (Social + GBP + SEO)
// ================================
export const marketingApi = {
  integrations: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/marketing/integrations/${clinicId}`),
    updateMeta: (clinicId: string, payload: any) =>
      apiCall<{ message: string }>(`/marketing/integrations/${clinicId}/meta`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updateGbp: (clinicId: string, payload: any) =>
      apiCall<{ message: string }>(`/marketing/integrations/${clinicId}/gbp`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updateRankTracker: (clinicId: string, payload: any) =>
      apiCall<{ message: string }>(
        `/marketing/integrations/${clinicId}/rank-tracker`,
        { method: 'PUT', body: JSON.stringify(payload) },
      ),
    disconnect: (clinicId: string, provider: string) =>
      apiCall<{ message: string }>(
        `/marketing/integrations/${clinicId}/${provider}`,
        { method: 'DELETE' },
      ),
  },
  meta: {
    assets: (clinicId: string) => apiCall<{ pages: any[] }>(`/marketing/meta/assets/${clinicId}`),
    select: (clinicId: string, payload: { facebookPageId: string; igBusinessId: string }) =>
      apiCall<{ message: string }>(`/marketing/meta/select/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  oauth: {
    metaUrl: (clinicId: string, returnTo: string) =>
      apiCall<{ url: string }>(
        `/marketing/oauth/meta/url/${clinicId}?returnTo=${encodeURIComponent(returnTo)}`,
      ),
    googleUrl: (clinicId: string, returnTo: string) =>
      apiCall<{ url: string }>(
        `/marketing/oauth/google/url/${clinicId}?returnTo=${encodeURIComponent(returnTo)}`,
      ),
  },
  keywords: {
    list: (clinicId: string) => apiCall<any[]>(`/marketing/keywords/${clinicId}`),
    create: (clinicId: string, payload: any) =>
      apiCall<any>(`/marketing/keywords/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (clinicId: string, keywordId: string, payload: any) =>
      apiCall<any>(`/marketing/keywords/${clinicId}/${keywordId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (clinicId: string, keywordId: string) =>
      apiCall<{ message: string }>(`/marketing/keywords/${clinicId}/${keywordId}`, {
        method: 'DELETE',
      }),
  },
  metrics: {
    list: (clinicId: string, start?: string, end?: string) => {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const qs = params.toString() ? `?${params.toString()}` : ''
      return apiCall<any[]>(`/marketing/metrics/${clinicId}${qs}`)
    },
  },
  gbp: {
    searchTerms: (clinicId: string, year: number, month: number) =>
      apiCall<any[]>(`/marketing/gbp/search-terms/${clinicId}/${year}/${month}`),
    locations: (clinicId: string) =>
      apiCall<{ locations: any[] }>(`/marketing/gbp/locations/${clinicId}`),
    selectLocation: (clinicId: string, payload: { accountId: string; locationId: string }) =>
      apiCall<{ message: string }>(`/marketing/gbp/select/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  rankings: {
    list: (clinicId: string, start?: string, end?: string) => {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const qs = params.toString() ? `?${params.toString()}` : ''
      return apiCall<any[]>(`/marketing/rankings/${clinicId}${qs}`)
    },
  },
  run: {
    runClinic: (clinicId: string) =>
      apiCall<{ message: string; date: string }>(`/marketing/run/${clinicId}`, {
        method: 'POST',
      }),
  },
}

export default {
  auth: authApi,
  clinics: clinicsApi,
  monthlyData: monthlyDataApi,
  dailyEntries: dailyEntriesApi,
  patients: patientsApi,
  config: configApi,
  marketing: marketingApi,
}
