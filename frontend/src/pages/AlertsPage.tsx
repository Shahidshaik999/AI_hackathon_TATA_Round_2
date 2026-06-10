import { useState, useEffect } from 'react';
import { alertApi } from '../api';

interface Alert {
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
import RiskBadge from '../components/RiskBadge';
import { CheckCircle, Eye, Filter, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;

      const [alertsRes, statsRes] = await Promise.all([
        alertApi.list(params),
        alertApi.stats(),
      ]);
      setAlerts(alertsRes.data);
      setStats(statsRes.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, [filterStatus, filterSeverity]);

  const acknowledge = async (id: string) => {
    try {
      await alertApi.acknowledge(id, 'Engineer');
      toast.success('Alert acknowledged');
      loadAlerts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const resolve = async (id: string) => {
    try {
      await alertApi.resolve(id);
      toast.success('Alert resolved');
      loadAlerts();
      if (selectedAlert?.id === id) setSelectedAlert(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const viewAlert = async (id: string) => {
    try {
      const res = await alertApi.get(id);
      setSelectedAlert(res.data);
    } catch {}
  };

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedAlerts = [...alerts].sort((a, b) =>
    (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Alert Management</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor and manage equipment abnormality alerts</p>
        </div>
        <button onClick={loadAlerts} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Alerts', value: stats.total, color: 'gray' },
            { label: 'Active', value: stats.active, color: 'red' },
            { label: 'Critical', value: stats.critical, color: 'red' },
            { label: 'High', value: stats.high, color: 'orange' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className={`text-2xl font-bold ${s.color === 'red' ? 'text-red-400' : s.color === 'orange' ? 'text-orange-400' : 'text-gray-300'}`}>
                {s.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card flex items-center gap-4">
        <Filter size={16} className="text-gray-500" />
        <div className="flex gap-2">
          {['', 'active', 'acknowledged', 'resolved'].map(s => (
            <button
              key={s || 'all'}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex gap-2">
          {['', 'critical', 'high', 'medium', 'low'].map(s => (
            <button
              key={s || 'any'}
              onClick={() => setFilterSeverity(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterSeverity === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s || 'Any Severity'}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-gray-500">{alerts.length} alerts</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert List */}
        <div className="space-y-3">
          {loading ? (
            <div className="card flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="card flex flex-col items-center justify-center h-40 text-gray-500">
              <CheckCircle size={32} className="text-green-500 mb-2" />
              <p>No alerts matching filter</p>
            </div>
          ) : (
            sortedAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => viewAlert(alert.id)}
                className={`card cursor-pointer transition-all hover:border-blue-600/50 ${
                  selectedAlert?.id === alert.id ? 'border-blue-600 bg-blue-600/5' : ''
                } ${alert.severity === 'critical' && alert.status === 'active' ? 'border-red-500/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                    alert.severity === 'high' ? 'bg-orange-500' :
                    alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <RiskBadge level={alert.severity} />
                      <RiskBadge level={alert.status} />
                    </div>
                    <p className="text-sm font-medium text-gray-200 leading-tight">{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.equipment_name} • {alert.plant_area}</p>
                    {alert.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{alert.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {alert.triggered_at ? formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true }) : 'recently'}
                    </p>
                  </div>
                </div>
                {alert.status === 'active' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                    <button
                      onClick={e => { e.stopPropagation(); acknowledge(alert.id); }}
                      className="btn-secondary flex-1 text-xs py-1.5"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); resolve(alert.id); }}
                      className="flex-1 text-xs py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg border border-green-600/30 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Alert Detail */}
        <div>
          {selectedAlert ? (
            <div className="card space-y-4 sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Alert Details</h3>
                <button onClick={() => setSelectedAlert(null)} className="text-gray-500 hover:text-gray-300">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Equipment</p>
                  <p className="text-sm text-white font-medium">{selectedAlert.equipment_name}</p>
                </div>
                <div className="flex gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Severity</p>
                    <RiskBadge level={selectedAlert.severity} size="md" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <RiskBadge level={selectedAlert.status} size="md" />
                  </div>
                </div>

                {selectedAlert.description && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description</p>
                    <p className="text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">{selectedAlert.description}</p>
                  </div>
                )}

                {selectedAlert.ai_analysis && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">🤖 AI Analysis</p>
                    <p className="text-sm text-blue-300 bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg">{selectedAlert.ai_analysis}</p>
                  </div>
                )}

                {selectedAlert.recommended_action && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Recommended Action</p>
                    <p className="text-sm text-green-300 bg-green-500/5 border border-green-500/20 p-3 rounded-lg">{selectedAlert.recommended_action}</p>
                  </div>
                )}

                {selectedAlert.sensor_data && Object.keys(selectedAlert.sensor_data).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Sensor Data</p>
                    <div className="bg-gray-800 p-3 rounded-lg space-y-1">
                      {Object.entries(selectedAlert.sensor_data).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-gray-500">{k}</span>
                          <span className="text-white font-mono">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlert.status === 'active' && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => acknowledge(selectedAlert.id)} className="btn-secondary flex-1">
                      Acknowledge
                    </button>
                    <button onClick={() => resolve(selectedAlert.id)} className="btn-primary flex-1">
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center h-64 border-dashed border-gray-700 text-gray-500">
              <Eye size={32} className="mb-2 opacity-30" />
              <p>Click an alert to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
