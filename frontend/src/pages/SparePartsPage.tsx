import { useState, useEffect } from 'react';
import { api } from '../api';
import { Package, AlertTriangle, CheckCircle, Clock, RefreshCw, Plus, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SparePart {
  id: string;
  part_number: string;
  name: string;
  description?: string;
  quantity_available: number;
  reorder_level: number;
  stock_status: 'ok' | 'low_stock' | 'out_of_stock';
  unit_cost?: number;
  supplier?: string;
  procurement_lead_days?: number;
  location?: string;
  is_critical: boolean;
  equipment_compatibility: string[];
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'low_stock'>('all');
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [newQty, setNewQty] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newPart, setNewPart] = useState({
    part_number: '', name: '', supplier: '', quantity_available: 0,
    reorder_level: 5, unit_cost: 0, procurement_lead_days: 7, is_critical: false,
    location: '', equipment_compatibility: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === 'critical') params.is_critical = true;
      if (filter === 'low_stock') params.low_stock = true;
      const [partsRes, statsRes] = await Promise.all([
        api.get('/spare-parts/', { params }),
        api.get('/spare-parts/stats'),
      ]);
      setParts(partsRes.data);
      setStats(statsRes.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const updateStock = async (id: string) => {
    try {
      await api.put(`/spare-parts/${id}/stock`, null, { params: { quantity: parseInt(newQty) } });
      toast.success('Stock updated');
      setEditingStock(null);
      setNewQty('');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const addPart = async () => {
    try {
      await api.post('/spare-parts/', newPart);
      toast.success('Spare part added');
      setShowAdd(false);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const stockColor = (status: string) => {
    if (status === 'out_of_stock') return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (status === 'low_stock') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  const stockLabel = (status: string) => {
    if (status === 'out_of_stock') return 'Out of Stock';
    if (status === 'low_stock') return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Spare Parts Inventory</h2>
          <p className="text-gray-500 text-sm mt-1">Track availability, reorder levels and procurement lead times</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={14} />Refresh</button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2"><Plus size={14} />Add Part</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Parts', value: stats.total, icon: <Package size={18} />, color: 'blue' },
            { label: 'Critical Parts', value: stats.critical, icon: <AlertTriangle size={18} />, color: 'red' },
            { label: 'Low Stock', value: stats.low_stock, icon: <Clock size={18} />, color: 'orange' },
            { label: 'Out of Stock', value: stats.out_of_stock, icon: <AlertTriangle size={18} />, color: stats.out_of_stock > 0 ? 'red' : 'green' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className={`w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                s.color === 'red' ? 'bg-red-500/10 text-red-400' :
                s.color === 'orange' ? 'bg-orange-500/10 text-orange-400' :
                s.color === 'green' ? 'bg-green-500/10 text-green-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>{s.icon}</div>
              <div className={`text-2xl font-bold ${
                s.color === 'red' ? 'text-red-400' : s.color === 'orange' ? 'text-orange-400' :
                s.color === 'green' ? 'text-green-400' : 'text-blue-400'
              }`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add Part Form */}
      {showAdd && (
        <div className="card border-blue-600/30">
          <h3 className="text-sm font-semibold text-white mb-4">Add New Spare Part</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[['part_number','Part Number *'],['name','Name *'],['supplier','Supplier'],['location','Storage Location']].map(([f,l]) => (
              <div key={f}>
                <label className="label">{l}</label>
                <input value={(newPart as any)[f]} onChange={e => setNewPart(p => ({...p,[f]:e.target.value}))} className="input text-sm" />
              </div>
            ))}
            {[['quantity_available','Qty Available'],['reorder_level','Reorder Level'],['unit_cost','Unit Cost (₹)'],['procurement_lead_days','Lead Days']].map(([f,l]) => (
              <div key={f}>
                <label className="label">{l}</label>
                <input type="number" value={(newPart as any)[f]} onChange={e => setNewPart(p => ({...p,[f]:parseFloat(e.target.value)||0}))} className="input text-sm" />
              </div>
            ))}
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={newPart.is_critical} onChange={e => setNewPart(p => ({...p,is_critical:e.target.checked}))} className="w-4 h-4" />
              <label className="text-sm text-gray-400">Critical Part</label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addPart} className="btn-primary">Add Part</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all','critical','low_stock'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter===f?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {f === 'all' ? 'All Parts' : f === 'critical' ? 'Critical Only' : 'Low Stock'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500 self-center">{parts.length} parts</span>
      </div>

      {/* Parts Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                {['Part Number','Name','Stock','Available','Reorder Level','Unit Cost','Supplier','Lead Days','Type','Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-500">Loading...</td></tr>
              ) : parts.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-500">No parts found</td></tr>
              ) : parts.map(part => (
                <tr key={part.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-400 text-xs">{part.part_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium">{part.name}</div>
                    {part.description && <div className="text-xs text-gray-500 truncate max-w-[200px]">{part.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${stockColor(part.stock_status)}`}>
                      {stockLabel(part.stock_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingStock === part.id ? (
                      <div className="flex gap-1 items-center">
                        <input type="number" value={newQty} onChange={e => setNewQty(e.target.value)}
                          className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                        <button onClick={() => updateStock(part.id)} className="text-green-400 hover:text-green-300 text-xs font-medium">Save</button>
                        <button onClick={() => setEditingStock(null)} className="text-gray-500 hover:text-gray-400 text-xs">Cancel</button>
                      </div>
                    ) : (
                      <span className={`font-bold ${part.quantity_available <= 0 ? 'text-red-400' : part.quantity_available <= part.reorder_level ? 'text-orange-400' : 'text-green-400'}`}>
                        {part.quantity_available}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{part.reorder_level}</td>
                  <td className="px-4 py-3 text-gray-300">₹{part.unit_cost?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{part.supplier || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs ${(part.procurement_lead_days || 0) > 7 ? 'text-orange-400' : 'text-gray-400'}`}>
                      {part.procurement_lead_days ? `${part.procurement_lead_days}d` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {part.is_critical ? (
                      <span className="badge-critical">Critical</span>
                    ) : (
                      <span className="badge-low">Standard</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditingStock(part.id); setNewQty(String(part.quantity_available)); }}
                      className="text-gray-500 hover:text-blue-400 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Procurement Alert */}
      {parts.filter(p => p.stock_status !== 'ok' && p.is_critical).length > 0 && (
        <div className="card border-red-500/30 bg-red-500/5">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Critical Parts Requiring Immediate Procurement
          </h3>
          <div className="space-y-2">
            {parts.filter(p => p.stock_status !== 'ok' && p.is_critical).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-800/50 rounded-lg">
                <div>
                  <span className="text-sm text-white font-medium">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({p.part_number})</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-400">Only {p.quantity_available} in stock</span>
                  <span className="text-orange-400">{p.procurement_lead_days}d lead time</span>
                  <span className="text-gray-400">Supplier: {p.supplier}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
