import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { AlertTriangle, Activity, Wrench, TrendingDown, Clock, CheckCircle } from 'lucide-react';
import { dashboardApi } from '../api';

interface DashboardStats {
  total_equipment: number;
  active_alerts: number;
  critical_alerts: number;
  equipment_health_avg: number;
  diagnoses_today: number;
  equipment_health_distribution: Record<string, number>;
  recent_alerts: any[];
  equipment_health_scores: HealthScore[];
}

interface HealthScore {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  plant_area?: string;
  health_score: number;
  risk_level: string;
  active_alerts: number;
}
import HealthGauge from '../components/HealthGauge';
import RiskBadge from '../components/RiskBadge';
import { formatDistanceToNow } from 'date-fns';

const RISK_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          dashboardApi.stats(),
          dashboardApi.activity(),
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const distributionData = stats ? Object.entries(stats.equipment_health_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value, color: RISK_COLORS[name as keyof typeof RISK_COLORS]
  })) : [];

  const topRiskEquipment = stats?.equipment_health_scores?.slice(0, 6) || [];

  // Simulated trend data
  const trendData = Array.from({ length: 12 }, (_, i) => ({
    hour: `${i * 2}:00`,
    alerts: Math.floor(Math.random() * 5),
    diagnoses: Math.floor(Math.random() * 3),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Plant Overview</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time equipment health and maintenance intelligence</p>
        </div>
        <div className="text-xs text-gray-600">
          Auto-refreshes every 30s • {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          icon={<Wrench size={20} />}
          label="Total Equipment"
          value={stats?.total_equipment || 0}
          color="blue"
        />
        <KPICard
          icon={<AlertTriangle size={20} />}
          label="Active Alerts"
          value={stats?.active_alerts || 0}
          color={stats?.active_alerts ? 'red' : 'green'}
          sub={`${stats?.critical_alerts || 0} critical`}
        />
        <KPICard
          icon={<Activity size={20} />}
          label="Avg Health Score"
          value={`${stats?.equipment_health_avg?.toFixed(0) || 0}%`}
          color={stats?.equipment_health_avg >= 70 ? 'green' : 'orange'}
        />
        <KPICard
          icon={<TrendingDown size={20} />}
          label="Diagnoses Today"
          value={stats?.diagnoses_today || 0}
          color="purple"
        />
        <KPICard
          icon={<CheckCircle size={20} />}
          label="Critical Alerts"
          value={stats?.critical_alerts || 0}
          color={stats?.critical_alerts ? 'red' : 'green'}
          sub="require attention"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Health Status */}
        <div className="lg:col-span-2 card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Equipment Health Status
          </h3>
          <div className="space-y-3">
            {topRiskEquipment.map((eq) => (
              <EquipmentHealthRow key={eq.equipment_id} equipment={eq} />
            ))}
            {topRiskEquipment.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No equipment data available</p>
            )}
          </div>
        </div>

        {/* Health Distribution Pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {distributionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {distributionData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-gray-400">{d.name}: <span className="text-white font-medium">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-400" />
            24h Activity Trend
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="alerts" stroke="#ef4444" fill="url(#alertGrad)" strokeWidth={2} name="Alerts" />
              <Area type="monotone" dataKey="diagnoses" stroke="#3b82f6" fill="url(#alertGrad)" strokeWidth={2} name="Diagnoses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            Recent Active Alerts
          </h3>
          <div className="space-y-2">
            {stats?.recent_alerts?.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-2.5 bg-gray-800/50 rounded-lg border border-gray-800">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                  alert.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                }`} />
                <div className="min-w-0">
                  <p className="text-xs text-gray-200 font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {alert.equipment_name} • {alert.triggered_at ? formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true }) : 'recently'}
                  </p>
                </div>
                <RiskBadge level={alert.severity} />
              </div>
            ))}
            {(!stats?.recent_alerts || stats.recent_alerts.length === 0) && (
              <div className="flex items-center gap-3 p-4 text-green-400">
                <CheckCircle size={20} />
                <span className="text-sm">No active alerts — all systems normal</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number;
  color: string; sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  const cls = colors[color] || colors.blue;

  return (
    <div className={`card border ${cls.split(' ').slice(2).join(' ')}`}>
      <div className={`w-9 h-9 rounded-lg ${cls.split(' ').slice(1, 2).join(' ')} flex items-center justify-center mb-3`}>
        <span className={cls.split(' ')[0]}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${cls.split(' ')[0]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function EquipmentHealthRow({ equipment }: { equipment: HealthScore }) {
  return (
    <div className="flex items-center gap-3 p-2.5 bg-gray-800/30 rounded-lg hover:bg-gray-800/60 transition-colors">
      <HealthGauge score={equipment.health_score} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium truncate">{equipment.equipment_name}</p>
        <p className="text-xs text-gray-500 truncate">{equipment.plant_area} • {equipment.equipment_type}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {equipment.active_alerts > 0 && (
          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
            {equipment.active_alerts} alerts
          </span>
        )}
        <RiskBadge level={equipment.risk_level} />
      </div>
    </div>
  );
}
