import { useState, useEffect } from 'react';
import { api, equipmentApi } from '../api';
import { BookOpen, Plus, Clock, Wrench, User, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface LogEntry {
  id: string;
  equipment_id: string;
  equipment_name: string;
  plant_area: string;
  timestamp: string;
  maintenance_type: string;
  description: string;
  technician: string;
  duration_hours?: number;
  parts_replaced: string[];
  root_cause?: string;
  actions_taken?: string;
  outcome?: string;
  cost?: number;
  next_maintenance_due?: string;
}

interface Equipment {
  id: string;
  name: string;
  plant_area?: string;
}

const TYPE_COLORS: Record<string, string> = {
  preventive: 'text-green-400 bg-green-500/10 border-green-500/30',
  corrective: 'text-red-400 bg-red-500/10 border-red-500/30',
  predictive: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

export default function LogbookPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filterEquipment, setFilterEquipment] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [form, setForm] = useState({
    equipment_id: '',
    maintenance_type: 'corrective',
    description: '',
    technician: '',
    duration_hours: '',
    parts_replaced: '',
    root_cause: '',
    actions_taken: '',
    outcome: 'completed',
    cost: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterEquipment) params.equipment_id = filterEquipment;
      if (filterType) params.maintenance_type = filterType;
      const [logsRes, eqRes] = await Promise.all([
        api.get('/maintenance-logs/', { params }),
        equipmentApi.list(),
      ]);
      setLogs(logsRes.data);
      setEquipment(eqRes.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterEquipment, filterType]);

  const addLog = async () => {
    if (!form.equipment_id || !form.description) {
      toast.error('Equipment and description are required');
      return;
    }
    try {
      await api.post('/maintenance-logs/', {
        ...form,
        duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        parts_replaced: form.parts_replaced ? form.parts_replaced.split(',').map(s => s.trim()) : [],
      });
      toast.success('Log entry created');
      setShowAdd(false);
      setForm({ equipment_id: '', maintenance_type: 'corrective', description: '', technician: '', duration_hours: '', parts_replaced: '', root_cause: '', actions_taken: '', outcome: 'completed', cost: '' });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Digital Maintenance Logbook</h2>
          <p className="text-gray-500 text-sm mt-1">Complete history of all maintenance activities across the plant</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={14} />Refresh</button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2"><Plus size={14} />New Entry</button>
        </div>
      </div>

      {/* Add Log Form */}
      {showAdd && (
        <div className="card border-blue-600/30">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen size={14} className="text-blue-400" /> New Maintenance Log Entry
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="label">Equipment *</label>
              <select value={form.equipment_id} onChange={e => setForm(p => ({...p, equipment_id: e.target.value}))} className="input text-sm">
                <option value="">Select equipment</option>
                {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Maintenance Type</label>
              <select value={form.maintenance_type} onChange={e => setForm(p => ({...p, maintenance_type: e.target.value}))} className="input text-sm">
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="predictive">Predictive</option>
              </select>
            </div>
            <div>
              <label className="label">Technician</label>
              <input value={form.technician} onChange={e => setForm(p => ({...p, technician: e.target.value}))} className="input text-sm" placeholder="Technician name" />
            </div>
            <div className="lg:col-span-3">
              <label className="label">Description *</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="input text-sm resize-none h-20" placeholder="Describe the maintenance activity performed..." />
            </div>
            <div>
              <label className="label">Root Cause</label>
              <input value={form.root_cause} onChange={e => setForm(p => ({...p, root_cause: e.target.value}))} className="input text-sm" placeholder="What caused the issue?" />
            </div>
            <div>
              <label className="label">Actions Taken</label>
              <input value={form.actions_taken} onChange={e => setForm(p => ({...p, actions_taken: e.target.value}))} className="input text-sm" placeholder="Steps taken to resolve" />
            </div>
            <div>
              <label className="label">Outcome</label>
              <select value={form.outcome} onChange={e => setForm(p => ({...p, outcome: e.target.value}))} className="input text-sm">
                <option value="completed">Completed</option>
                <option value="partial">Partial - Monitoring</option>
                <option value="deferred">Deferred</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
            <div>
              <label className="label">Parts Replaced (comma-separated)</label>
              <input value={form.parts_replaced} onChange={e => setForm(p => ({...p, parts_replaced: e.target.value}))} className="input text-sm" placeholder="e.g., Bearing, Seal, Filter" />
            </div>
            <div>
              <label className="label">Duration (hours)</label>
              <input type="number" value={form.duration_hours} onChange={e => setForm(p => ({...p, duration_hours: e.target.value}))} className="input text-sm" placeholder="4.5" />
            </div>
            <div>
              <label className="label">Cost (₹)</label>
              <input type="number" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} className="input text-sm" placeholder="25000" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addLog} className="btn-primary flex items-center gap-2"><BookOpen size={14} />Save Entry</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-4">
        <div>
          <select value={filterEquipment} onChange={e => setFilterEquipment(e.target.value)} className="input text-sm w-48">
            <option value="">All Equipment</option>
            {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {['', 'preventive', 'corrective', 'predictive'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filterType === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {t || 'All Types'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-500">{logs.length} entries</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log List */}
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
          {loading ? (
            <div className="card flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="card text-center text-gray-500 py-10">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p>No log entries found</p>
            </div>
          ) : logs.map(log => (
            <div key={log.id} onClick={() => setSelectedLog(log)}
              className={`card cursor-pointer transition-all hover:border-blue-600/50 ${selectedLog?.id === log.id ? 'border-blue-600 bg-blue-600/5' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[log.maintenance_type] || 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                    {log.maintenance_type}
                  </span>
                  {log.outcome && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      log.outcome === 'completed' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                      log.outcome === 'escalated' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                      'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                    }`}>{log.outcome}</span>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : ''}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-200">{log.equipment_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{log.plant_area}</p>
              <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{log.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                {log.technician && <span className="flex items-center gap-1"><User size={10} />{log.technician}</span>}
                {log.duration_hours && <span className="flex items-center gap-1"><Clock size={10} />{log.duration_hours}h</span>}
                {log.cost && <span className="flex items-center gap-1"><Wrench size={10} />₹{log.cost.toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Log Detail */}
        <div>
          {selectedLog ? (
            <div className="card space-y-4 sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Log Entry Details</h3>
                <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-300 text-sm leading-none">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Equipment', selectedLog.equipment_name],
                  ['Plant Area', selectedLog.plant_area],
                  ['Type', selectedLog.maintenance_type],
                  ['Technician', selectedLog.technician || '—'],
                  ['Duration', selectedLog.duration_hours ? `${selectedLog.duration_hours}h` : '—'],
                  ['Cost', selectedLog.cost ? `₹${selectedLog.cost.toLocaleString()}` : '—'],
                  ['Outcome', selectedLog.outcome || '—'],
                  ['Date', selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-gray-200 font-medium capitalize">{val}</p>
                  </div>
                ))}
              </div>
              {selectedLog.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">{selectedLog.description}</p>
                </div>
              )}
              {selectedLog.root_cause && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Root Cause</p>
                  <p className="text-sm text-orange-300 bg-orange-500/5 border border-orange-500/20 p-3 rounded-lg">{selectedLog.root_cause}</p>
                </div>
              )}
              {selectedLog.actions_taken && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Actions Taken</p>
                  <p className="text-sm text-green-300 bg-green-500/5 border border-green-500/20 p-3 rounded-lg">{selectedLog.actions_taken}</p>
                </div>
              )}
              {selectedLog.parts_replaced?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Parts Replaced</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.parts_replaced.map(p => (
                      <span key={p} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center h-64 border-dashed border-gray-700 text-gray-500">
              <BookOpen size={32} className="mb-2 opacity-30" />
              <p>Click a log entry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
