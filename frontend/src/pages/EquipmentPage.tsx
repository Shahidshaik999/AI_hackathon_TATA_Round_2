import { useState, useEffect } from 'react';
import { equipmentApi, sensorApi, reportApi } from '../api';

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

interface SensorReading {
  id: string;
  timestamp: string;
  sensor_type: string;
  value: number;
  unit?: string;
  is_anomaly: boolean;
  anomaly_score: number;
}
import HealthGauge from '../components/HealthGauge';
import RiskBadge from '../components/RiskBadge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Activity, TrendingUp, Wrench, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [sensorType, setSensorType] = useState('vibration');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const [newEq, setNewEq] = useState({
    name: '', equipment_type: '', location: '', plant_area: '', criticality: 'medium',
    manufacturer: '', model_number: '',
  });

  useEffect(() => {
    equipmentApi.list().then(r => setEquipment(r.data));
  }, []);

  useEffect(() => {
    if (selected) {
      reportApi.health(selected.id).then(r => setHealth(r.data)).catch(() => {});
      sensorApi.history(selected.id, sensorType).then(r => {
        setSensorHistory(r.data.slice(0, 48).reverse());
      }).catch(() => {});
    }
  }, [selected, sensorType]);

  const addEquipment = async () => {
    try {
      const res = await equipmentApi.create(newEq);
      setEquipment(prev => [...prev, res.data]);
      setShowAdd(false);
      toast.success(`${newEq.name} added successfully`);
      setNewEq({ name: '', equipment_type: '', location: '', plant_area: '', criticality: 'medium', manufacturer: '', model_number: '' });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = equipment.filter(eq =>
    eq.name.toLowerCase().includes(search.toLowerCase()) ||
    eq.equipment_type.toLowerCase().includes(search.toLowerCase()) ||
    (eq.plant_area || '').toLowerCase().includes(search.toLowerCase())
  );

  const chartData = sensorHistory.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
    value: r.value,
    anomaly: r.is_anomaly,
  }));

  const sensorTypes = ['vibration', 'temperature', 'pressure', 'current', 'oil_level', 'flow'];

  const criticalityColors: Record<string, string> = {
    critical: 'border-red-500/30 text-red-400',
    high: 'border-orange-500/30 text-orange-400',
    medium: 'border-yellow-500/30 text-yellow-400',
    low: 'border-green-500/30 text-green-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Equipment Registry</h2>
          <p className="text-gray-500 text-sm mt-1">Manage and monitor all plant equipment</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Equipment
        </button>
      </div>

      {/* Add Equipment Form */}
      {showAdd && (
        <div className="card border-blue-600/30">
          <h3 className="text-sm font-semibold text-white mb-4">Add New Equipment</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              ['name', 'Equipment Name *'],
              ['equipment_type', 'Type (motor/pump/bearing...)'],
              ['location', 'Location'],
              ['plant_area', 'Plant Area'],
              ['manufacturer', 'Manufacturer'],
              ['model_number', 'Model Number'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="label">{label}</label>
                <input
                  value={newEq[field as keyof typeof newEq]}
                  onChange={e => setNewEq(prev => ({ ...prev, [field]: e.target.value }))}
                  className="input text-sm"
                  placeholder={label}
                />
              </div>
            ))}
            <div>
              <label className="label">Criticality</label>
              <select value={newEq.criticality} onChange={e => setNewEq(prev => ({ ...prev, criticality: e.target.value }))} className="input text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addEquipment} className="btn-primary">Add Equipment</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search equipment..."
              className="input pl-8 text-sm"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {filtered.map(eq => (
              <div
                key={eq.id}
                onClick={() => setSelected(eq)}
                className={`card cursor-pointer transition-all hover:border-blue-600/50 ${
                  selected?.id === eq.id ? 'border-blue-600 bg-blue-600/5' : ''
                } border ${criticalityColors[eq.criticality] || 'border-gray-800'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200 leading-tight">{eq.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{eq.equipment_type}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{eq.plant_area} • {eq.location}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${criticalityColors[eq.criticality] || ''}`}>
                    {eq.criticality}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="card flex flex-col items-center justify-center h-64 border-dashed border-gray-700 text-gray-500">
              <Wrench size={32} className="mb-2 opacity-30" />
              <p>Select equipment to view details</p>
            </div>
          ) : (
            <>
              {/* Info Card */}
              <div className="card">
                <div className="flex items-start gap-5">
                  {health && <HealthGauge score={health.health_score} size="lg" />}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                        <p className="text-gray-500 text-sm">{selected.equipment_type} • {selected.manufacturer || 'Unknown mfr'}</p>
                      </div>
                      {health && <RiskBadge level={health.risk_level} size="md" />}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Location</p>
                        <p className="text-gray-200">{selected.location || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Plant Area</p>
                        <p className="text-gray-200">{selected.plant_area || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Criticality</p>
                        <p className="text-gray-200 capitalize">{selected.criticality}</p>
                      </div>
                      {health && (
                        <>
                          <div>
                            <p className="text-gray-500 text-xs">Active Alerts</p>
                            <p className={health.active_alerts > 0 ? 'text-red-400' : 'text-green-400'}>
                              {health.active_alerts}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">RUL Estimate</p>
                            <p className="text-orange-400">{health.rul_days ? `${health.rul_days.toFixed(0)} days` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Last Maintenance</p>
                            <p className="text-gray-200">{health.last_maintenance ? new Date(health.last_maintenance).toLocaleDateString() : '—'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                  <button onClick={() => navigate(`/diagnosis?equipment=${selected.id}`)} className="btn-primary text-sm flex items-center gap-1.5">
                    <Activity size={14} /> Run Diagnosis
                  </button>
                  <button onClick={() => navigate('/chat')} className="btn-secondary text-sm">
                    Ask AI
                  </button>
                </div>
              </div>

              {/* Sensor Chart */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-400" />
                    Sensor Trend (48h)
                  </h4>
                  <div className="flex gap-1">
                    {sensorTypes.map(st => (
                      <button
                        key={st}
                        onClick={() => setSensorType(st)}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                          sensorType === st ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {st.split('_')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#6b7280' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                    No sensor data available
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
