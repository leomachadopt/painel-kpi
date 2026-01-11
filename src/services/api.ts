// API Service para comunicação com o backend
// Em produção (Vercel), o ideal é usar o mesmo domínio via "/api".
// Em dev, você pode definir VITE_API_URL="http://localhost:3001/api".
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

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
        // Não redirecionar se a requisição é para a rota de login
        // (permite que o erro de login seja tratado pelo componente)
        const isLoginEndpoint = endpoint.includes('/auth/login')
        
        // Limpar dados de autenticação
        localStorage.removeItem('kpi_user')
        localStorage.removeItem('kpi_token')
        
        // Para login, tratar o erro normalmente sem redirecionar
        if (isLoginEndpoint) {
          const error = await response.json().catch(() => ({ error: 'Invalid credentials' }))
          const message = error.error || 'Credenciais inválidas'
          const err: any = new Error(message)
          err.status = response.status
          err.payload = error
          throw err
        }
        
        // Para outras rotas, redirecionar para login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new Error('Sessão expirada. Faça login novamente.')
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      const message = error.error || `HTTP ${response.status}`
      const err: any = new Error(message)
      err.status = response.status
      err.payload = error
      throw err
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '')
      throw new Error(
        `Resposta inválida da API (esperado JSON). Content-Type="${contentType}". ` +
          `Verifique proxy /api no dev e se o backend está no ar. ` +
          (text ? `Primeiros chars: ${JSON.stringify(text.slice(0, 120))}` : '')
      )
    }

    return await response.json()
  } catch (error) {
    // 4xx são esperados em alguns fluxos (404: não encontrado, 403: sem permissão, 400: validação)
    const status = (error as any)?.status
    if (!status || (status >= 500)) {
      console.error('API call failed:', error)
    }
    // Não logar 4xx no console (esperados); apenas relançar para tratamento upstream
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

  getPermissions: () =>
    apiCall<{ permissions: any }>('/auth/permissions', {
      method: 'GET',
    }),

  updateProfile: (data: { name: string; email: string; avatarUrl?: string }) =>
    apiCall<{ user: any; message: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiCall<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadAvatar: (data: { image: string }) =>
    apiCall<{ url: string; message: string; user: any }>('/auth/avatar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ================================
// CLINICS API
// ================================
export const clinicsApi = {
  getAll: () => apiCall<any[]>('/clinics'),

  getById: (id: string) => apiCall<any>(`/clinics/${id}`),

  create: (data: {
    name: string;
    ownerName: string;
    email: string;
    password: string;
    targetRevenue?: number;
    targetNPS?: number
  }) =>
    apiCall<{ id: string; message: string }>('/clinics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (clinicId: string) =>
    apiCall<{ message: string }>(`/clinics/${clinicId}`, {
      method: 'DELETE',
    }),

  update: (clinicId: string, data: any) =>
    apiCall<{ message: string }>(`/clinics/${clinicId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

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

  getHistory: (clinicId: string, patientId: string) =>
    apiCall<any>(`/patients/${clinicId}/${patientId}/history`),

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

    update: (clinicId: string, entryId: string, entry: any) =>
      apiCall<any>(`/daily-entries/financial/${clinicId}/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      }),

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/financial/${clinicId}/${entryId}`, {
        method: 'DELETE',
      }),
  },

  // Consultation
  consultation: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/consultation/${clinicId}`),

    getByCode: (clinicId: string, code: string) =>
      apiCall<any>(`/daily-entries/consultation/${clinicId}/code/${code}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/consultation/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),

    update: (clinicId: string, entryId: string, entry: any) =>
      apiCall<any>(`/daily-entries/consultation/${clinicId}/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      }),

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/consultation/${clinicId}/${entryId}`, {
        method: 'DELETE',
      }),
  },

  // Prospecting
  prospecting: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/prospecting/${clinicId}`),

    getByDate: (clinicId: string, date: string) =>
      apiCall<any>(`/daily-entries/prospecting/${clinicId}/${date}`),

    save: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/prospecting/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/prospecting/${clinicId}/${entryId}`, {
        method: 'DELETE',
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

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/cabinet/${clinicId}/${entryId}`, {
        method: 'DELETE',
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

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/service-time/${clinicId}/${entryId}`, {
        method: 'DELETE',
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

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/source/${clinicId}/${entryId}`, {
        method: 'DELETE',
      }),
  },

  // Consultation Control
  consultationControl: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/consultation-control/${clinicId}`),

    getByDate: (clinicId: string, date: string) =>
      apiCall<any>(`/daily-entries/consultation-control/${clinicId}/${date}`),

    save: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/consultation-control/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/consultation-control/${clinicId}/${entryId}`, {
        method: 'DELETE',
      }),
  },

  // Aligners
  aligner: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/aligner/${clinicId}`),

    getByCode: (clinicId: string, code: string) =>
      apiCall<any>(`/daily-entries/aligner/${clinicId}/code/${code}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/aligner/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),

    update: (clinicId: string, entryId: string, entry: any) =>
      apiCall<any>(`/daily-entries/aligner/${clinicId}/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      }),

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/aligner/${clinicId}/${entryId}`, {
        method: 'DELETE',
      }),
  },

  // Suppliers
  supplier: {
    getAll: (clinicId: string, search?: string) => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      return apiCall<any[]>(`/daily-entries/suppliers/${clinicId}${params}`)
    },

    getById: (clinicId: string, supplierId: string) =>
      apiCall<any>(`/daily-entries/suppliers/${clinicId}/${supplierId}`),

    create: (clinicId: string, supplier: any) =>
      apiCall<any>(`/daily-entries/suppliers/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(supplier),
      }),

    update: (clinicId: string, supplierId: string, supplier: any) =>
      apiCall<any>(`/daily-entries/suppliers/${clinicId}/${supplierId}`, {
        method: 'PUT',
        body: JSON.stringify(supplier),
      }),

    delete: (clinicId: string, supplierId: string) =>
      apiCall<{ message: string }>(`/daily-entries/suppliers/${clinicId}/${supplierId}`, {
        method: 'DELETE',
      }),
  },

  // Orders
  order: {
    getAll: (clinicId: string, params?: { startDate?: string; endDate?: string; supplierId?: string }) => {
      const queryParams = new URLSearchParams()
      if (params?.startDate) queryParams.set('startDate', params.startDate)
      if (params?.endDate) queryParams.set('endDate', params.endDate)
      if (params?.supplierId) queryParams.set('supplierId', params.supplierId)
      const queryString = queryParams.toString()
      return apiCall<any[]>(`/daily-entries/orders/${clinicId}${queryString ? `?${queryString}` : ''}`)
    },

    getById: (clinicId: string, orderId: string) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}/${orderId}`),

    create: (clinicId: string, order: any) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(order),
      }),

    update: (clinicId: string, orderId: string, order: any) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(order),
      }),

    approve: (clinicId: string, orderId: string) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}/${orderId}/approve`, {
        method: 'POST',
      }),

    reject: (clinicId: string, orderId: string, rejectionReason: string) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}/${orderId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      }),

    confirmPayment: (clinicId: string, orderId: string) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}/${orderId}/confirm-payment`, {
        method: 'POST',
      }),

    check: (clinicId: string, orderId: string, password: string, conform: boolean, nonConformReason?: string) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}/${orderId}/check`, {
        method: 'POST',
        body: JSON.stringify({ password, conform, nonConformReason }),
      }),

    getPendingCount: (clinicId: string) =>
      apiCall<{ count: number }>(`/daily-entries/orders/${clinicId}/pending-count`),

    getPaymentPendingCount: (clinicId: string) =>
      apiCall<{ count: number }>(`/daily-entries/orders/${clinicId}/payment-pending-count`),

    getInvoicePendingCount: (clinicId: string) =>
      apiCall<{ count: number }>(`/daily-entries/orders/${clinicId}/invoice-pending-count`),

    uploadDocument: (clinicId: string, orderId: string, file: string, filename: string, mimeType?: string) =>
      apiCall<any>(`/daily-entries/orders/${clinicId}/${orderId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ file, filename, mimeType }),
      }),

    getDocuments: (clinicId: string, orderId: string) =>
      apiCall<any[]>(`/daily-entries/orders/${clinicId}/${orderId}/documents`),

    downloadDocument: (clinicId: string, orderId: string, documentId: string) =>
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/daily-entries/orders/${clinicId}/${orderId}/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      }).then(res => {
        if (!res.ok) throw new Error('Failed to download document')
        return res.blob()
      }),

    deleteDocument: (clinicId: string, orderId: string, documentId: string) =>
      apiCall<{ message: string }>(`/daily-entries/orders/${clinicId}/${orderId}/documents/${documentId}`, {
        method: 'DELETE',
      }),

    delete: (clinicId: string, orderId: string) =>
      apiCall<{ message: string }>(`/daily-entries/orders/${clinicId}/${orderId}`, {
        method: 'DELETE',
      }),
  },

  // Order Items
  orderItem: {
    getAll: (clinicId: string, search?: string) => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      return apiCall<any[]>(`/daily-entries/order-items/${clinicId}${params}`)
    },

    getById: (clinicId: string, itemId: string) =>
      apiCall<any>(`/daily-entries/order-items/${clinicId}/${itemId}`),

    create: (clinicId: string, item: any) =>
      apiCall<any>(`/daily-entries/order-items/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(item),
      }),

    update: (clinicId: string, itemId: string, item: any) =>
      apiCall<any>(`/daily-entries/order-items/${clinicId}/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(item),
      }),

    delete: (clinicId: string, itemId: string) =>
      apiCall<{ message: string }>(`/daily-entries/order-items/${clinicId}/${itemId}`, {
        method: 'DELETE',
      }),
  },

  // Advance Invoice
  advanceInvoice: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/advance-invoice/${clinicId}`),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/advance-invoice/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),

    update: (clinicId: string, entryId: string, entry: any) =>
      apiCall<any>(`/daily-entries/advance-invoice/${clinicId}/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      }),

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/advance-invoice/${clinicId}/${entryId}`, {
        method: 'DELETE',
      }),
  },

  // Accounts Payable
  accountsPayable: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/daily-entries/accounts-payable/${clinicId}`),

    getCounts: (clinicId: string) =>
      apiCall<{ overdue: number; today: number; week: number }>(
        `/daily-entries/accounts-payable/${clinicId}/counts`
      ),

    getCategories: (clinicId: string, search?: string) =>
      apiCall<string[]>(
        `/daily-entries/accounts-payable/${clinicId}/categories${search ? `?search=${encodeURIComponent(search)}` : ''}`
      ),

    create: (clinicId: string, entry: any) =>
      apiCall<any>(`/daily-entries/accounts-payable/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),

    update: (clinicId: string, entryId: string, entry: any) =>
      apiCall<any>(`/daily-entries/accounts-payable/${clinicId}/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      }),

    delete: (clinicId: string, entryId: string) =>
      apiCall<{ message: string }>(`/daily-entries/accounts-payable/${clinicId}/${entryId}`, {
        method: 'DELETE',
      }),

    uploadDocument: (clinicId: string, entryId: string, file: string, filename: string, mimeType?: string) =>
      apiCall<any>(`/daily-entries/accounts-payable/${clinicId}/${entryId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ file, filename, mimeType }),
      }),

    getDocuments: (clinicId: string, entryId: string) =>
      apiCall<any[]>(`/daily-entries/accounts-payable/${clinicId}/${entryId}/documents`),

    downloadDocument: (clinicId: string, entryId: string, documentId: string) =>
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/daily-entries/accounts-payable/${clinicId}/${entryId}/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      }).then(res => {
        if (!res.ok) throw new Error('Failed to download document')
        return res.blob()
      }),

    deleteDocument: (clinicId: string, entryId: string, documentId: string) =>
      apiCall<{ message: string }>(`/daily-entries/accounts-payable/${clinicId}/${entryId}/documents/${documentId}`, {
        method: 'DELETE',
      }),
  },
}

// ================================
// ADVANCES API
// ================================
export const advancesApi = {
  insuranceProviders: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/advances/insurance-providers/${clinicId}`),

    create: (clinicId: string, provider: any) =>
      apiCall<any>(`/advances/insurance-providers/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(provider),
      }),

    update: (clinicId: string, providerId: string, provider: any) =>
      apiCall<any>(`/advances/insurance-providers/${clinicId}/${providerId}`, {
        method: 'PUT',
        body: JSON.stringify(provider),
      }),

    delete: (clinicId: string, providerId: string) =>
      apiCall<{ message: string }>(`/advances/insurance-providers/${clinicId}/${providerId}`, {
        method: 'DELETE',
      }),
  },

  contracts: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/advances/contracts/${clinicId}`),

    getById: (clinicId: string, contractId: string) =>
      apiCall<any>(`/advances/contracts/${clinicId}/${contractId}`),

    create: (clinicId: string, contract: any) =>
      apiCall<any>(`/advances/contracts/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(contract),
      }),

    update: (clinicId: string, contractId: string, contract: any) =>
      apiCall<any>(`/advances/contracts/${clinicId}/${contractId}`, {
        method: 'PUT',
        body: JSON.stringify(contract),
      }),

    delete: (clinicId: string, contractId: string) =>
      apiCall<{ message: string }>(`/advances/contracts/${clinicId}/${contractId}`, {
        method: 'DELETE',
      }),

    addPayment: (clinicId: string, contractId: string, payment: any) =>
      apiCall<any>(`/advances/contracts/${clinicId}/${contractId}/payments`, {
        method: 'POST',
        body: JSON.stringify(payment),
      }),

    getEligibleProcedures: (clinicId: string, contractId: string) =>
      apiCall<any>(`/advances/contracts/${clinicId}/${contractId}/eligible-procedures`),

    getBilledProcedures: (clinicId: string, contractId: string) =>
      apiCall<any[]>(`/advances/contracts/${clinicId}/${contractId}/billed-procedures`),

    // Calculate billing items without creating the batch (for auto-selection preview)
    calculateBillingItems: (clinicId: string, contractId: string, data: {
      targetAmount: number
      serviceDate?: string
    }) =>
      apiCall<any>(`/advances/contracts/${clinicId}/${contractId}/billing-items/calculate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Get all batches for a contract
    getBatches: (clinicId: string, contractId: string) =>
      apiCall<any[]>(`/advances/contracts/${clinicId}/${contractId}/batches`),

    // Get batch details with items
    getBatchDetails: (clinicId: string, batchId: string) =>
      apiCall<any>(`/advances/batches/${clinicId}/${batchId}`),

    // Delete batch
    deleteBatch: (clinicId: string, batchId: string) =>
      apiCall<any>(`/advances/batches/${clinicId}/${batchId}`, {
        method: 'DELETE',
      }),

    createBillingBatchAuto: (clinicId: string, contractId: string, data: {
      targetAmount: number
      serviceDate?: string
      doctorId: string
    }) =>
      apiCall<any>(`/advances/contracts/${clinicId}/${contractId}/billing-batch/auto`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createBillingBatchManual: (clinicId: string, contractId: string, data: {
      items: Array<{
        procedureId: string
        procedureCode: string
        procedureDescription: string
        isPericiable: boolean
        unitValue: number
        quantity: number
        totalValue: number
        dependentId: string | null
      }>
      serviceDate?: string
      doctorId: string
    }) =>
      apiCall<any>(`/advances/contracts/${clinicId}/${contractId}/billing-batch/manual`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  proceduresBase: {
    getAll: (clinicId: string) =>
      apiCall<any[]>(`/advances/procedures/base/${clinicId}`),

    create: (clinicId: string, procedure: any) =>
      apiCall<any>(`/advances/procedures/base/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(procedure),
      }),

    update: (clinicId: string, procedureId: string, procedure: any) =>
      apiCall<any>(`/advances/procedures/base/${clinicId}/${procedureId}`, {
        method: 'PUT',
        body: JSON.stringify(procedure),
      }),

    delete: (clinicId: string, procedureId: string) =>
      apiCall<{ message: string }>(`/advances/procedures/base/${clinicId}/${procedureId}`, {
        method: 'DELETE',
      }),
  },

  proceduresBaseGlobal: {
    getAll: () =>
      apiCall<any[]>(`/advances/procedures/base/global`),

    create: (procedure: any) =>
      apiCall<any>(`/advances/procedures/base/global`, {
        method: 'POST',
        body: JSON.stringify(procedure),
      }),

    update: (procedureId: string, procedure: any) =>
      apiCall<any>(`/advances/procedures/base/global/${procedureId}`, {
        method: 'PUT',
        body: JSON.stringify(procedure),
      }),

    delete: (procedureId: string) =>
      apiCall<{ message: string }>(`/advances/procedures/base/global/${procedureId}`, {
        method: 'DELETE',
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

export const targetsApi = {
  get: (clinicId: string, year: number, month: number) =>
    apiCall<any>(`/targets/${clinicId}/${year}/${month}`),

  getAll: (clinicId: string) =>
    apiCall<any[]>(`/targets/${clinicId}`),

  update: (clinicId: string, year: number, month: number, targets: any) =>
    apiCall<{ message: string }>(`/targets/${clinicId}/${year}/${month}`, {
      method: 'PUT',
      body: JSON.stringify(targets),
    }),
}

// ================================
// COLLABORATORS API
// ================================
export const collaboratorsApi = {
  list: () => apiCall<any[]>('/collaborators'),

  create: (data: { name: string; email: string; password: string }) =>
    apiCall<{ collaborator: any; message: string }>('/collaborators', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name: string; email: string; active?: boolean; password?: string }) =>
    apiCall<{ message: string }>(`/collaborators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updatePermissions: (id: string, permissions: any) =>
    apiCall<{ message: string }>(`/collaborators/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),

  delete: (id: string) =>
    apiCall<{ message: string }>(`/collaborators/${id}`, {
      method: 'DELETE',
    }),
}

// ================================
// AUDIT LOGS API
// ================================
export const auditLogsApi = {
  list: (params?: { limit?: number; offset?: number; resource?: string; userId?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    if (params?.resource) query.set('resource', params.resource)
    if (params?.userId) query.set('userId', params.userId)

    const queryString = query.toString()
    return apiCall<{
      logs: any[]
      pagination: { total: number; limit: number; offset: number; hasMore: boolean }
    }>(`/audit-logs${queryString ? `?${queryString}` : ''}`)
  },
}

// ================================
// TICKETS API
// ================================
export const ticketsApi = {
  list: (clinicId: string, filters?: { status?: string; assignedTo?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo)
    
    return apiCall<{ tickets: any[] }>(`/tickets/${clinicId}?${params.toString()}`)
  },

  getCount: (clinicId: string) =>
    apiCall<{ count: number }>(`/tickets/${clinicId}/count`),

  getById: (ticketId: string) =>
    apiCall<{ ticket: any }>(`/tickets/ticket/${ticketId}`),

  create: (clinicId: string, data: {
    title: string
    description?: string
    assignedTo?: string
  }) =>
    apiCall<{ ticket: any }>(`/tickets/${clinicId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (ticketId: string, data: {
    title?: string
    description?: string
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    assignedTo?: string
  }) =>
    apiCall<{ ticket: any }>(`/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (ticketId: string) =>
    apiCall<{ message: string }>(`/tickets/${ticketId}`, {
      method: 'DELETE',
    }),

  getComments: (ticketId: string) =>
    apiCall<{ comments: any[] }>(`/tickets/${ticketId}/comments`),

  addComment: (ticketId: string, comment: string) =>
    apiCall<{ comment: any }>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  getUsers: (clinicId: string) =>
    apiCall<{ users: any[] }>(`/tickets/${clinicId}/users`),
}

export default {
  auth: authApi,
  clinics: clinicsApi,
  monthlyData: monthlyDataApi,
  dailyEntries: dailyEntriesApi,
  patients: patientsApi,
  config: configApi,
  marketing: marketingApi,
  targets: targetsApi,
  collaborators: collaboratorsApi,
  auditLogs: auditLogsApi,
  tickets: ticketsApi,
}
