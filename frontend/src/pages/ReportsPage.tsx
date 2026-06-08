import { useState, useEffect } from 'react';
import { reportApi, equipmentApi } from '../api';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  location?: string;
  plant_area?: string;
  criticality: string;
  is_active: boolean;
}
import RiskBadge from '../components/RiskBadge';
import HealthGauge from '../components/HealthGauge';
import { FileText, Download, Loader, RefreshCw, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [reportType, setReportType] = useState('maintenance_summary');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [healthScores, setHealthScores] = useState<any[]>([]);

  useEffect(() => {
    equipmentApi.list().then(r => {
      setEquipment(r.data);
      // Load health for all equipment
      Promise.all(r.data.map(eq => reportApi.health(eq.id).then(hr => hr.data).catch(() => null)))
        .then(scores => setHealthScores(scores.filter(Boolean)));
    });
  }, []);

  const generateReport = async () => {
    if (!selectedEquipment) {
      toast.error('Please select equipment');
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await reportApi.generate({
        equipment_id: selectedEquipment,
        report_type: reportType,
        include_predictions: true,
      });
      setReport(res.data);
      toast.success('Report generated successfully');
    } catch (e: any) {
      toast.error(e.message || 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance_report_${report.equipment_name?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Maintenance Reports</h2>
          <p className="text-gray-500 text-sm mt-1">Generate AI-powered structured maintenance reports</p>
        </div>
        {report && (
          <button
            onClick={() => { setReport(null); setSelectedEquipment(''); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            New Report
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Configure Report</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Equipment *</label>
                <select value={selectedEquipment} onChange={e => setSelectedEquipment(e.target.value)} className="input text-sm">
                  <option value="">-- Select equipment --</option>
                  {equipment.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Report Type</label>
                <select value={reportType} onChange={e => setReportType(e.target.value)} className="input text-sm">
                  <option value="maintenance_summary">Maintenance Summary</option>
                  <option value="rca">Root Cause Analysis</option>
                  <option value="health_status">Health Status Report</option>
                </select>
              </div>
              <button
                onClick={generateReport}
                disabled={loading || !selectedEquipment}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader size={14} className="animate-spin" /> Generating...</>
                ) : (
                  <><FileText size={14} /> Generate Report</>
                )}
              </button>
            </div>
          </div>

          {/* Equipment Health Summary */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Equipment Health</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {healthScores.map(h => (
                <div key={h.equipment_id} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                  <HealthGauge score={h.health_score} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate font-medium">{h.equipment_name}</p>
                    <RiskBadge level={h.risk_level} />
                  </div>
                </div>
              ))}
              {healthScores.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-3">Loading health data...</p>
              )}
            </div>
          </div>
        </div>

        {/* Report Display */}
        <div className="lg:col-span-3">
          {loading && (
            <div className="card flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400">AI generating maintenance report...</p>
              </div>
            </div>
          )}

          {!loading && !report && (
            <div className="card flex flex-col items-center justify-center h-64 border-dashed border-gray-700 text-gray-500">
              <FileText size={40} className="mb-3 opacity-30" />
              <p>Configure and generate a report</p>
              <p className="text-sm mt-1">AI will analyze all available data</p>
            </div>
          )}

          {report && !loading && (
            <div className="card">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {report.report_type?.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {report.equipment_name} • Generated {new Date(report.generated_at).toLocaleString()}
                  </p>
                  {report.health_score !== undefined && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-gray-400">Health Score:</span>
                      <HealthGauge score={report.health_score} size="sm" />
                      <span className="text-white font-bold">{report.health_score}%</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={generateReport} className="btn-secondary text-sm flex items-center gap-1.5">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                  <button onClick={downloadReport} className="btn-primary text-sm flex items-center gap-1.5">
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>

              {/* Report Metadata */}
              {report.metadata && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    ['Diagnoses', report.metadata.diagnoses_count],
                    ['Alerts', report.metadata.alerts_count],
                    ['Maintenance Actions', report.metadata.maintenance_actions_count],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-blue-400">{val}</div>
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Report Content */}
              <div className="bg-gray-950 rounded-xl p-5 border border-gray-800">
                <MarkdownRenderer content={report.content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
