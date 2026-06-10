import { useState, useEffect } from 'react';
import { equipmentApi, diagnosisApi } from '../api';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  location?: string;
  plant_area?: string;
  criticality: string;
  manufacturer?: string;
  is_active: boolean;
  last_maintenance_date?: string;
}

interface DiagnosisResult {
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
import RiskBadge from '../components/RiskBadge';
import HealthGauge from '../components/HealthGauge';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, CheckCircle, Clock,
  Wrench, Send, Star, TrendingDown, BookOpen, ArrowRight, RotateCcw
} from 'lucide-react';

export default function DiagnosisPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [query, setQuery] = useState('');
  const [faultDesc, setFaultDesc] = useState('');
  const [sensorData, setSensorData] = useState({
    vibration_mm_s: '',
    temperature_c: '',
    pressure_bar: '',
    current_a: '',
    oil_level_pct: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [feedback, setFeedback] = useState(0);

  useEffect(() => {
    equipmentApi.list().then(r => setEquipment(r.data));
  }, []);

  useEffect(() => {
    if (selectedEquipment) {
      diagnosisApi.history(selectedEquipment).then(r => setHistory(r.data));
    }
  }, [selectedEquipment]);

  const runDiagnosis = async () => {
    if (!selectedEquipment || !query.trim()) {
      toast.error('Please select equipment and describe the issue');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const sensors: Record<string, number> = {};
      Object.entries(sensorData).forEach(([k, v]) => {
        if (v) sensors[k] = parseFloat(v);
      });

      const res = await diagnosisApi.run({
        equipment_id: selectedEquipment,
        query,
        sensor_data: Object.keys(sensors).length > 0 ? sensors : undefined,
        fault_description: faultDesc || undefined,
      });
      setResult(res.data);
      toast.success('Diagnosis complete');
      // Refresh history
      diagnosisApi.history(selectedEquipment).then(r => setHistory(r.data));
    } catch (e: any) {
      toast.error(e.message || 'Diagnosis failed');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (score: number) => {
    if (!result) return;
    try {
      await diagnosisApi.feedback(result.id, score);
      setFeedback(score);
      toast.success('Feedback submitted. Thank you!');
    } catch {}
  };

  const quickQueries = [
    'High vibration detected — diagnose probable cause',
    'Equipment overheating — root cause analysis',
    'Unusual noise from bearing area',
    'Oil pressure dropping steadily',
    'Motor drawing excess current',
    'Predict remaining useful life',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Fault Diagnosis</h2>
          <p className="text-gray-500 text-sm mt-1">Intelligent root cause analysis with predictive insights</p>
        </div>
        {result && (
          <button
            onClick={() => {
              setResult(null);
              setQuery('');
              setFaultDesc('');
              setSensorData({ vibration_mm_s: '', temperature_c: '', pressure_bar: '', current_a: '', oil_level_pct: '' });
              setFeedback(0);
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            New Diagnosis
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Wrench size={16} className="text-blue-400" />
              Configure Diagnosis
            </h3>

            {/* Equipment Select */}
            <div className="mb-4">
              <label className="label">Select Equipment *</label>
              <select
                value={selectedEquipment}
                onChange={e => setSelectedEquipment(e.target.value)}
                className="input"
              >
                <option value="">-- Choose equipment --</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.plant_area})
                  </option>
                ))}
              </select>
            </div>

            {/* Issue Description */}
            <div className="mb-4">
              <label className="label">Issue Description *</label>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Describe the fault or issue you're experiencing..."
                className="input resize-none h-24"
              />
            </div>

            {/* Quick queries */}
            <div className="mb-4">
              <label className="label">Quick Queries</label>
              <div className="flex flex-wrap gap-1.5">
                {quickQueries.map(q => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full border border-gray-700 transition-colors"
                  >
                    {q.slice(0, 30)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Fault code */}
            <div className="mb-4">
              <label className="label">Fault Code / Error Message (optional)</label>
              <input
                value={faultDesc}
                onChange={e => setFaultDesc(e.target.value)}
                placeholder="e.g., E003 - Vibration alarm, F-2244 Motor fault"
                className="input"
              />
            </div>

            {/* Sensor Data */}
            <details className="mb-4">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-200 select-none">
                + Add Sensor Readings (optional)
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {Object.keys(sensorData).map(k => (
                  <div key={k}>
                    <label className="label capitalize">{k.replace(/_/g, ' ')}</label>
                    <input
                      type="number"
                      value={sensorData[k as keyof typeof sensorData]}
                      onChange={e => setSensorData(prev => ({ ...prev, [k]: e.target.value }))}
                      placeholder="value"
                      className="input text-sm"
                    />
                  </div>
                ))}
              </div>
            </details>

            <button
              onClick={runDiagnosis}
              disabled={loading || !selectedEquipment || !query.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Run AI Diagnosis
                </>
              )}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Diagnoses</h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="p-2.5 bg-gray-800/50 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between mb-1">
                      <RiskBadge level={h.risk_level} />
                      <span className="text-xs text-gray-600">
                        {h.created_at ? new Date(h.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">{h.diagnosis}</p>
                    {h.rul_estimate_days && (
                      <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                        <TrendingDown size={10} /> RUL: {h.rul_estimate_days.toFixed(0)} days
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          {loading && (
            <div className="card h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">AI agents analyzing equipment data...</p>
                <p className="text-gray-600 text-sm mt-1">Querying knowledge base & running predictive models</p>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="card h-64 flex items-center justify-center border-dashed border-gray-700">
              <div className="text-center text-gray-500">
                <Activity size={40} className="mx-auto mb-3 opacity-30" />
                <p>Select equipment and describe the issue</p>
                <p className="text-sm mt-1">AI will analyze and provide diagnosis</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="card border-l-4" style={{
                borderLeftColor: result.risk_level === 'critical' ? '#ef4444' :
                  result.risk_level === 'high' ? '#f97316' :
                  result.risk_level === 'medium' ? '#eab308' : '#22c55e'
              }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <RiskBadge level={result.risk_level} size="md" />
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round((result.confidence_score || 0) * 100)}%
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-lg">{result.equipment_name}</h3>
                  </div>
                  {result.rul_estimate_days && (
                    <div className="text-center bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                      <HealthGauge score={Math.min(100, (result.rul_estimate_days / 90) * 100)} size="sm" />
                      <div className="text-xs text-orange-400 mt-1 font-medium">
                        {result.rul_estimate_days.toFixed(0)}d RUL
                      </div>
                    </div>
                  )}
                </div>
                <MarkdownRenderer content={result.diagnosis} className="text-gray-300" />

                {result.sources_used?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.sources_used.map(s => (
                      <span key={s} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                        <BookOpen size={10} />
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Root Causes */}
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-400" />
                  Root Cause Analysis
                  <span className="ml-auto text-xs text-gray-600 font-normal">
                    {result.root_causes?.length || 0} probable causes identified
                  </span>
                </h4>
                <div className="space-y-4">
                  {result.root_causes?.map((rc, i) => {
                    const pct = Math.round(rc.probability * 100);
                    const barColor = pct >= 70 ? 'bg-red-500' : pct >= 45 ? 'bg-orange-500' : 'bg-yellow-500';
                    const badgeColor = pct >= 70 ? 'text-red-400 bg-red-500/10 border-red-500/20' : pct >= 45 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                    const likelihood = pct >= 70 ? 'Most Likely' : pct >= 45 ? 'Probable' : 'Possible';

                    // Split evidence by semicolons or bullet markers into individual points
                    const evidencePoints = rc.evidence
                      ? rc.evidence.split(/[;•\n]/).map(e => e.trim()).filter(e => e.length > 5)
                      : [];

                    return (
                      <div key={i} className="border border-gray-800 rounded-xl p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs flex items-center justify-center font-bold mt-0.5">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white leading-tight">{rc.cause}</p>
                              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded border font-medium ${badgeColor}`}>
                                {likelihood}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-xl font-bold text-orange-400">{pct}%</div>
                            <div className="text-xs text-gray-600">probability</div>
                          </div>
                        </div>

                        {/* Probability bar */}
                        <div className="mb-3">
                          <div className="w-full bg-gray-900 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Evidence section — the key explainability block */}
                        {evidencePoints.length > 0 && (
                          <div className="bg-gray-900/80 border border-gray-700/50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                              Supporting Evidence
                            </p>
                            <ul className="space-y-1.5">
                              {evidencePoints.map((point, j) => (
                                <li key={j} className="flex items-start gap-2">
                                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                                  <span className="text-xs text-gray-300 leading-relaxed">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Fallback: single evidence line */}
                        {evidencePoints.length === 0 && rc.evidence && (
                          <div className="bg-gray-900/80 border border-gray-700/50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                              Supporting Evidence
                            </p>
                            <p className="text-xs text-gray-300">{rc.evidence}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Immediate Actions */}
              {result.immediate_actions?.length > 0 && (
                <div className="card border border-red-500/20 bg-red-500/5">
                  <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Immediate Actions Required
                  </h4>
                  <ul className="space-y-2">
                    {result.immediate_actions.map((action, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <ArrowRight size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-400" />
                  Prioritized Recommendations
                </h4>
                <div className="space-y-2">
                  {result.recommendations?.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <RiskBadge level={rec.priority} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">{rec.action}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock size={10} />{rec.timeline}</span>
                          <span>👤 {rec.responsible}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spare Parts */}
              {result.spare_parts_needed?.length > 0 && (
                <div className="card">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Wrench size={14} className="text-blue-400" />
                    Spare Parts Required
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-800">
                          <th className="text-left pb-2">Part</th>
                          <th className="text-left pb-2">P/N</th>
                          <th className="text-center pb-2">Qty</th>
                          <th className="text-center pb-2">Urgency</th>
                        </tr>
                      </thead>
                      <tbody className="space-y-1">
                        {result.spare_parts_needed.map((sp, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            <td className="py-2 text-gray-300">{sp.part_name}</td>
                            <td className="py-2 text-blue-400">{sp.part_number || '—'}</td>
                            <td className="py-2 text-center text-gray-300">{sp.quantity_needed}</td>
                            <td className="py-2 text-center"><RiskBadge level={sp.urgency === 'immediate' ? 'critical' : sp.urgency === 'within_week' ? 'high' : 'medium'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Rate this Diagnosis</h4>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => submitFeedback(s)}
                      className={`p-1.5 rounded-lg transition-colors ${feedback >= s ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                    >
                      <Star size={20} fill={feedback >= s ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                  {feedback > 0 && <span className="text-xs text-gray-500 ml-2">Thanks for your feedback!</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
