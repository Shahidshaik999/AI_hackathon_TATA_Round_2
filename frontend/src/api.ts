/**
 * Centralized API client for Maintenance Wizard
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'API Error';
    console.error('API Error:', msg);
    return Promise.reject(new Error(msg));
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  location?: string;
  plant_area?: string;
  criticality: string;
  manufacturer?: string;
  model_number?: string;
  is_active: boolean;
  last_maintenance_date?: string;
}

export interface Alert {
  id: string;
  equipment_id: string;
  equipment_name: string;
  plant_area?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  title: string;
  description?: string;
  triggered_at: string;
  ai_analysis?: string;
  recommended_action?: string;
}

export interface DiagnosisResult {
  id: string;
  equipment_id: string;
  equipment_name: string;
  query: string;
  diagnosis: string;
  root_causes: Array<{ cause: string; probability: number; evidence: string }>;
  risk_level: string;
  rul_estimate_days?: number;
  rul_confidence?: number;
  confidence_score: number;
  immediate_actions: string[];
  recommendations: Array<{ action: string; priority: string; timeline: string; responsible: string }>;
  long_term_actions: string[];
  spare_parts_needed: Array<{ part_name: string; part_number?: string; quantity_needed: number; urgency: string }>;
  sources_used: string[];
  created_at: string;
}

export interface ChatResponse {
  session_id: string;
  message: string;
  agent_type: string;
  sources: string[];
  follow_up_suggestions: string[];
  timestamp: string;
}

export interface HealthScore {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  plant_area?: string;
  health_score: number;
  risk_level: string;
  active_alerts: number;
  critical_alerts?: number;
}

export interface DashboardStats {
  total_equipment: number;
  active_alerts: number;
  critical_alerts: number;
  equipment_health_avg: number;
  diagnoses_today: number;
  equipment_health_distribution: Record<string, number>;
  recent_alerts: Alert[];
  equipment_health_scores: HealthScore[];
}

export interface SensorReading {
  id: string;
  timestamp: string;
  sensor_type: string;
  value: number;
  unit?: string;
  is_anomaly: boolean;
  anomaly_score: number;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export const equipmentApi = {
  list: (params?: Record<string, string>) => api.get<Equipment[]>('/equipment/', { params }),
  get: (id: string) => api.get<Equipment>(`/equipment/${id}`),
  create: (data: Partial<Equipment>) => api.post<Equipment>('/equipment/', data),
  update: (id: string, data: Partial<Equipment>) => api.put<Equipment>(`/equipment/${id}`, data),
};

export const diagnosisApi = {
  run: (data: {
    equipment_id: string;
    query: string;
    sensor_data?: Record<string, number>;
    fault_description?: string;
    session_id?: string;
  }) => api.post<DiagnosisResult>('/diagnosis/', data),
  history: (equipmentId: string) => api.get<DiagnosisResult[]>(`/diagnosis/equipment/${equipmentId}`),
  feedback: (diagnosisId: string, score: number, comment?: string) =>
    api.post('/diagnosis/feedback', { diagnosis_id: diagnosisId, score, comment }),
};

export const chatApi = {
  send: (data: {
    session_id?: string;
    message: string;
    equipment_id?: string;
    user_role?: string;
    context?: Record<string, unknown>;
  }) => api.post<ChatResponse>('/chat/', data),
  history: (sessionId: string) => api.get(`/chat/sessions/${sessionId}/history`),
  clear: (sessionId: string) => api.delete(`/chat/sessions/${sessionId}`),
};

export const alertApi = {
  list: (params?: Record<string, string>) => api.get<Alert[]>('/alerts/', { params }),
  stats: () => api.get('/alerts/stats'),
  get: (id: string) => api.get(`/alerts/${id}`),
  acknowledge: (id: string, by: string) => api.post(`/alerts/${id}/acknowledge`, { acknowledged_by: by }),
  resolve: (id: string) => api.post(`/alerts/${id}/resolve`),
};

export const sensorApi = {
  ingest: (data: {
    equipment_id: string;
    readings: Array<{ sensor_type: string; value: number; unit?: string; threshold_min?: number; threshold_max?: number }>;
  }) => api.post('/sensors/ingest', data),
  history: (equipmentId: string, sensorType?: string) =>
    api.get<SensorReading[]>(`/sensors/equipment/${equipmentId}`, { params: sensorType ? { sensor_type: sensorType } : {} }),
  rul: (equipmentId: string, sensorType?: string) =>
    api.post(`/sensors/equipment/${equipmentId}/rul`, null, { params: { sensor_type: sensorType || 'vibration' } }),
};

export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  activity: () => api.get('/dashboard/activity'),
};

export const reportApi = {
  generate: (data: {
    equipment_id: string;
    report_type?: string;
    include_predictions?: boolean;
  }) => api.post('/reports/generate', data),
  health: (equipmentId: string) => api.get<HealthScore>(`/reports/equipment/${equipmentId}/health`),
};

export const knowledgeApi = {
  search: (query: string, equipmentType?: string) =>
    api.post('/knowledge/search', { query, equipment_type: equipmentType }),
  documents: () => api.get('/knowledge/documents'),
};
