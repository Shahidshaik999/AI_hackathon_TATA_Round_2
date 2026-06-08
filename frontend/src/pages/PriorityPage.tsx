import { useState, useEffect } from 'react';
import { api } from '../api';
import { TrendingUp, AlertTriangle, RefreshCw, Activity, CheckCircle, Clock } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import HealthGauge from '../components/HealthGauge';
import toast from 'react-hot-toast';

interface PriorityItem {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  plant_area: string;
  criticality: string;
  priority_score: number;
  active_alerts: number;
  critical_alerts: number;
  risk_level: string;
  rul_days?: number;
  days_since_maintenance?: number;
  critical_spares_available: boolean;
  recommended_action: string;
}

const ACTION_COLORS: Record<string, string> = {
  'IMMEDIATE SHUTDOWN & REPAIR': 'text-red-400 bg-red-500/10 border-red-500/30',
  'URGENT: Schedule within 24h': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'PLAN: Schedule within 1 week': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'MONITOR: Normal operations': 'text-green-400 bg-green-500/10 border-green-500/30',
};

export default function PriorityPage() {
  const [items, setItems] = useState<PriorityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/priority');
      setItems(res.data);
      setLastUpdated(new Date());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const urgentCount = items.filter(i => i.recommended_action.includes('IMMEDIATE') || i.recommended_action.includes('URGENT')).length;
  const immediateCount = items.filter(i => i.recommended_action.includes('IMMEDIATE')).length;

  // Calculate health score from risk
  const healthFromRisk = (risk: string) => {
    const m: Record<string, number> = { low: 90, medium: 65, high: 40, critical: 15 };
    return m[risk] ?? 65;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Plant Maintenance Priority</h2>
          <p className="text-gray-500 text-sm mt-1">
            Bottleneck analysis — ranked by criticality, alerts, RUL, and spares availability
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-600">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recalculate
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      {immediateCount > 0 && (
        <div className="card border-red-500/40 bg-red-500/5 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400 animate-pulse" />
          </div>
          <div>
            <p className="text-red-400 font-semibold">{immediateCount} equipment require IMMEDIATE attention</p>
            <p className="text-gray-400 text-sm">Unplanned downtime risk is HIGH — dispatch maintenance crew now</p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Immediate Action', value: immediateCount, color: 'red' },
          { label: 'Urgent (24h)', value: urgentCount - immediateCount, color: 'orange' },
          { label: 'Plan (1 week)', value: items.filter(i => i.recommended_action.includes('PLAN')).length, color: 'yellow' },
          { label: 'Normal Operation', value: items.filter(i => i.recommended_action.includes('MONITOR')).length, color: 'green' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className={`text-3xl font-bold mb-1 ${
              s.color === 'red' ? 'text-red-400' :
              s.color === 'orange' ? 'text-orange-400' :
              s.color === 'yellow' ? 'text-yellow-400' : 'text-green-400'
            }`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Priority Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-gray-300">Priority Ranking</span>
          <span className="text-xs text-gray-600 ml-auto">Higher score = more urgent</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                {['Rank','Equipment','Area','Criticality','Health','Alerts','RUL','Last Maint.','Spares','Priority Score','Recommended Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-500">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.equipment_id}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                    item.recommended_action.includes('IMMEDIATE') ? 'bg-red-500/5' :
                    item.recommended_action.includes('URGENT') ? 'bg-orange-500/5' : ''
                  }`}>
                  <td className="px-4 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-red-500 text-white' :
                      idx === 1 ? 'bg-orange-500 text-white' :
                      idx === 2 ? 'bg-yellow-500 text-black' :
                      'bg-gray-700 text-gray-300'
                    }`}>{idx + 1}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium">{item.equipment_name}</div>
                    <div className="text-xs text-gray-500">{item.equipment_type}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{item.plant_area}</td>
                  <td className="px-4 py-3"><RiskBadge level={item.criticality} /></td>
                  <td className="px-4 py-3"><HealthGauge score={healthFromRisk(item.risk_level)} size="sm" /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {item.critical_alerts > 0 && (
                        <span className="text-xs text-red-400 font-medium">{item.critical_alerts} critical</span>
                      )}
                      <span className="text-xs text-gray-400">{item.active_alerts} total</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.rul_days !== null && item.rul_days !== undefined ? (
                      <span className={`text-xs font-bold ${
                        item.rul_days < 7 ? 'text-red-400' :
                        item.rul_days < 30 ? 'text-orange-400' : 'text-green-400'
                      }`}>{item.rul_days.toFixed(0)}d</span>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {item.days_since_maintenance !== null && item.days_since_maintenance !== undefined
                      ? `${item.days_since_maintenance}d ago`
                      : '—'
                    }
                  </td>
                  <td className="px-4 py-3">
                    {item.critical_spares_available ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle size={12} /> OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle size={12} /> Check
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1">
                      <div className={`h-1.5 rounded-full ${
                        item.priority_score >= 60 ? 'bg-red-500' :
                        item.priority_score >= 30 ? 'bg-orange-500' :
                        item.priority_score >= 15 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} style={{ width: `${Math.min(100, item.priority_score)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{item.priority_score}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-lg border whitespace-nowrap ${
                      ACTION_COLORS[item.recommended_action] || 'text-gray-400 bg-gray-800 border-gray-700'
                    }`}>
                      {item.recommended_action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="card bg-gray-900/50">
        <h3 className="text-xs font-semibold text-gray-400 mb-3">Priority Score Calculation</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-500">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-0.5 flex-shrink-0" />
            <span><strong className="text-gray-400">Criticality:</strong> Critical=40, High=30, Medium=20, Low=10</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-0.5 flex-shrink-0" />
            <span><strong className="text-gray-400">Alerts:</strong> Critical alert +30, High alert +15</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-0.5 flex-shrink-0" />
            <span><strong className="text-gray-400">RUL:</strong> &lt;7 days +25, &lt;30 days +15</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-0.5 flex-shrink-0" />
            <span><strong className="text-gray-400">Risk Level:</strong> Critical +20, High +10</span>
          </div>
        </div>
      </div>
    </div>
  );
}
