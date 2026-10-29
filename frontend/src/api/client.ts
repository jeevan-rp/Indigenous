const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<any>('/health'),

  // Dashboard
  getDashboardSummary: () => request<any>('/dashboard/summary'),

  // BOMs
  listBoms: () => request<any[]>('/boms'),
  getBom: (id: string) => request<any>(`/boms/${id}`),
  deleteBom: (id: string) => request<any>(`/boms/${id}`, { method: 'DELETE' }),
  previewBomUpload: (formData: FormData) => request<any>('/boms/preview', {
    method: 'POST',
    body: formData
  }),
  uploadBom: (formData: FormData) => request<any>('/boms/upload', {
    method: 'POST',
    body: formData
  }),
  createManualBom: (formData: FormData) => request<any>('/boms/manual', {
    method: 'POST',
    body: formData
  }),

  // Components
  listComponents: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any>(`/components?${q.toString()}`);
  },
  getComponent: (id: string) => request<any>(`/components/${id}`),
  updateComponent: (id: string, data: any) => request<any>(`/components/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),

  // Alternatives
  getAlternatives: (componentId: string) => request<any>(`/components/${componentId}/alternatives`),
  explainAlternatives: (componentId: string) => request<any>(`/components/${componentId}/explain`, {
    method: 'POST'
  }),

  // Analysis
  analyzeBom: (bomId: string) => request<any>(`/analysis/${bomId}`, {
    method: 'POST'
  }),

  // Simulations
  runSimulation: (componentId: string, scenarioType = 'COMPONENT_UNAVAILABLE') => request<any>('/simulations', {
    method: 'POST',
    body: JSON.stringify({ component_id: componentId, scenario_type: scenarioType })
  }),
  getSimulation: (id: string) => request<any>(`/simulations/${id}`),
  listSimulations: () => request<any[]>('/simulations'),

  // Reports
  generateReport: (bomId?: string, reportType: 'PDF' | 'CSV' = 'PDF') => {
    const q = new URLSearchParams({ report_type: reportType });
    if (bomId) q.append('bom_id', bomId);
    return request<any>(`/reports/generate?${q.toString()}`, { method: 'POST' });
  },
  listReports: () => request<any[]>('/reports'),
  getReportDownloadUrl: (reportId: string) => `${BASE_URL}/reports/${reportId}/download`,
  getSampleBomTemplateUrl: () => `${BASE_URL}/reports/template/csv`,

  // Settings & Data Sources
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) => request<any>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  resetDemoWorkspace: () => request<any>('/settings/reset-demo', {
    method: 'POST'
  }),
  getDataSourcesStatus: () => request<any>('/sellers/sources/status'),

  // Indian Seller Discovery
  listSellers: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any[]>(`/sellers?${q.toString()}`);
  },
  getSeller: (id: string) => request<any>(`/sellers/${id}`),
  searchPartSellers: (partNumber: string, bomId?: string, quantity?: number) => {
    const q = new URLSearchParams();
    if (bomId) q.append('bom_id', bomId);
    if (quantity) q.append('quantity', String(quantity));
    return request<any>(`/sellers/search/${encodeURIComponent(partNumber)}?${q.toString()}`);
  },
  saveSeller: (sellerId: string, notes?: string) => {
    const q = new URLSearchParams();
    if (notes) q.append('notes', notes);
    return request<any>(`/sellers/${sellerId}/save?${q.toString()}`, { method: 'POST' });
  },
  removeSavedSeller: (sellerId: string) => request<any>(`/sellers/saved/${sellerId}`, { method: 'DELETE' }),
  listSavedSellers: () => request<any[]>('/sellers/saved'),

  // RFQ - Request for Quotation
  createRfq: (payload: any) => request<any>('/rfqs', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  listRfqs: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any[]>(`/rfqs?${q.toString()}`);
  },
  getRfq: (id: string) => request<any>(`/rfqs/${id}`),
  updateRfqStatus: (id: string, data: { status: string; notes?: string; changed_by?: string }) => request<any>(`/rfqs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  getRfqMailto: (id: string) => request<any>(`/rfqs/${id}/mailto`)
};

