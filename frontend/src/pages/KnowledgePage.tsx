import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Search, Upload, Database, FileText, BookOpen,
  Sparkles, Loader, Trash2, Zap, Settings, Wind,
  Cpu, Activity, Anchor, Code, Package, TrendingUp, BarChart2
} from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import toast from 'react-hot-toast';

interface SearchResult {
  content: string;
  source: string;
}

const KB_CATEGORIES = [
  { icon: Zap,        title: 'Blast Furnace',       desc: 'Tuyere, stave cooler, bell & hopper' },
  { icon: Settings,   title: 'Continuous Casting',  desc: 'CCM mold, segments, breakout detection' },
  { icon: Activity,   title: 'Rolling Mill',        desc: 'HSM/CRM, work rolls, chatter, drives' },
  { icon: Cpu,        title: 'Electric Arc Furnace', desc: 'Electrodes, transformer, EAF ops' },
  { icon: Wind,       title: 'Motors & Pumps',      desc: 'ISO 10816, lubrication, bearings' },
  { icon: Anchor,     title: 'Cranes',              desc: 'Wire rope, hooks, brake, runway' },
  { icon: Code,       title: 'Fault Codes',         desc: 'E001–E050 PLC/SCADA codes' },
  { icon: Package,    title: 'Spare Parts',         desc: 'A/B/C class, criticality guide' },
  { icon: TrendingUp, title: 'RUL Methods',         desc: 'P-F interval, Weibull, degradation' },
  { icon: BarChart2,  title: 'RPN Calculation',     desc: 'FMEA severity × occurrence × detection' },
];

export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiSources, setAiSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'upload'>('about');
  const [uploadForm, setUploadForm] = useState({
    title: '', document_type: 'manual', equipment_type: '', content: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/knowledge/documents').then(r => setDocuments(r.data)).catch(() => {});
  }, []);

  const search = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLoading(true);
    setResults([]);
    setAiAnswer('');
    try {
      const res = await api.post('/knowledge/search', { query: searchQuery, equipment_type: null });
      setResults(res.data.results || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getAiAnswer = async () => {
    if (!query.trim()) { toast.error('Enter a question first'); return; }
    setAiLoading(true);
    setAiAnswer('');
    try {
      const res = await api.post('/knowledge/ai-answer', { query });
      setAiAnswer(res.data.answer);
      setAiSources(res.data.sources || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const uploadDocument = async () => {
    if (!uploadForm.title || !uploadForm.content) {
      toast.error('Title and content are required');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('document_type', uploadForm.document_type);
      formData.append('equipment_type', uploadForm.equipment_type);
      formData.append('content', uploadForm.content);
      const res = await fetch('http://localhost:8000/api/v1/knowledge/upload', {
        method: 'POST', body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      toast.success(`Indexed ${data.chunks_indexed} chunks from "${uploadForm.title}"`);
      setUploadForm({ title: '', document_type: 'manual', equipment_type: '', content: '' });
      api.get('/knowledge/documents').then(r => setDocuments(r.data));
      setActiveTab('about');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/knowledge/documents/${docId}`);
      toast.success('Document removed from knowledge base');
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const quickTopics = [
    { label: 'Blast furnace bearing maintenance', q: 'blast furnace bearing maintenance procedure' },
    { label: 'CCM mold copper plate wear', q: 'CCM continuous casting mold copper plate wear' },
    { label: 'Rolling mill vibration', q: 'rolling mill work roll vibration diagnosis' },
    { label: 'Motor lubrication intervals', q: 'motor bearing lubrication interval calculation' },
    { label: 'Hydraulic seal replacement', q: 'hydraulic seal replacement procedure' },
    { label: 'ISO vibration thresholds', q: 'ISO 10816 vibration alarm thresholds motor' },
    { label: 'RUL estimation method', q: 'remaining useful life RUL estimation bearing' },
    { label: 'Risk Priority Number', q: 'risk priority number RPN calculation FMEA' },
    { label: 'EAF transformer maintenance', q: 'electric arc furnace transformer maintenance' },
    { label: 'Fault codes E001-E050', q: 'PLC fault codes vibration temperature alarm' },
  ];

  const DOC_TYPE_LABELS: Record<string, string> = {
    manual: 'Equipment Manual',
    sop: 'SOP',
    failure_report: 'Failure Report',
    maintenance_record: 'Maintenance Record',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Knowledge Base</h2>
        <p className="text-gray-500 text-sm mt-1">
          Search equipment manuals, SOPs, and failure reports — or get a direct AI-generated answer
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Search + Results ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Search bar */}
          <div className="card space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="Search knowledge base... e.g. bearing failure vibration diagnosis"
                  className="input pl-9"
                />
              </div>
              <button
                onClick={() => search()}
                disabled={loading}
                className="btn-primary flex items-center gap-2 flex-shrink-0"
              >
                {loading ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
              <button
                onClick={getAiAnswer}
                disabled={aiLoading}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {aiLoading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                AI Answer
              </button>
            </div>

            {/* Quick topics */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Quick Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {quickTopics.map(t => (
                  <button
                    key={t.label}
                    onClick={() => search(t.q)}
                    className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Answer panel */}
          {(aiLoading || aiAnswer) && (
            <div className="card border-indigo-600/30 bg-indigo-600/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-300">AI Generated Answer</span>
                </div>
                {aiSources.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} className="text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {[...new Set(aiSources)].slice(0, 2).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-3 text-gray-400 py-4">
                  <Loader size={16} className="animate-spin text-indigo-400" />
                  <span className="text-sm">Querying knowledge base and generating answer...</span>
                </div>
              ) : (
                <div className="border-t border-gray-800 pt-3">
                  <MarkdownRenderer content={aiAnswer} />
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <BookOpen size={14} className="text-blue-400" />
                <span>{results.length} sections found</span>
                <span className="text-gray-600">— "{query}"</span>
              </div>
              {results.map((r, i) => (
                <div key={i} className="card hover:border-gray-700 transition-colors">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
                    <FileText size={12} className="text-blue-400" />
                    <span className="text-xs text-blue-400 font-medium">{r.source}</span>
                    <span className="text-xs text-gray-600 ml-auto">Result {i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {r.content?.slice(0, 600)}{r.content?.length > 600 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !aiAnswer && results.length === 0 && query && (
            <div className="card text-center py-10 border-dashed border-gray-800">
              <Search size={28} className="mx-auto mb-3 text-gray-700" />
              <p className="text-gray-400 font-medium">No results for "{query}"</p>
              <p className="text-gray-600 text-sm mt-1">
                Use the <span className="text-indigo-400 font-medium">AI Answer</span> button for a generated response
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Info + Upload ── */}
        <div className="space-y-4">

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-gray-800 overflow-hidden">
            {([['about', 'Knowledge Base'], ['upload', 'Upload Document']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-900 text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Upload form */}
          {activeTab === 'upload' && (
            <div className="card space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Upload size={14} className="text-blue-400" />
                <span className="text-sm font-semibold text-gray-300">Add to Knowledge Base</span>
              </div>
              <div>
                <label className="label">Title *</label>
                <input
                  value={uploadForm.title}
                  onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                  className="input text-sm"
                  placeholder="e.g. BF-1 Motor Maintenance Manual"
                />
              </div>
              <div>
                <label className="label">Document Type</label>
                <select
                  value={uploadForm.document_type}
                  onChange={e => setUploadForm(p => ({ ...p, document_type: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="manual">Equipment Manual</option>
                  <option value="sop">Standard Operating Procedure</option>
                  <option value="failure_report">Failure Report</option>
                  <option value="maintenance_record">Maintenance Record</option>
                </select>
              </div>
              <div>
                <label className="label">Equipment Type</label>
                <input
                  value={uploadForm.equipment_type}
                  onChange={e => setUploadForm(p => ({ ...p, equipment_type: e.target.value }))}
                  className="input text-sm"
                  placeholder="e.g. motor, pump, bearing, blast furnace"
                />
              </div>
              <div>
                <label className="label">Content *</label>
                <textarea
                  value={uploadForm.content}
                  onChange={e => setUploadForm(p => ({ ...p, content: e.target.value }))}
                  className="input text-sm resize-none h-36"
                  placeholder="Paste manual text, SOP steps, or failure report content here..."
                />
              </div>
              <button
                onClick={uploadDocument}
                disabled={uploading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {uploading
                  ? <><Loader size={14} className="animate-spin" /> Indexing...</>
                  : <><Upload size={14} /> Upload & Index</>
                }
              </button>
            </div>
          )}

          {/* KB categories */}
          {activeTab === 'about' && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Database size={14} className="text-blue-400" />
                <span className="text-sm font-semibold text-gray-300">Built-in Coverage</span>
              </div>
              <div className="space-y-1">
                {KB_CATEGORIES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-800/60 transition-colors">
                    <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={12} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-200">{title}</p>
                      <p className="text-xs text-gray-600">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded documents list */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-blue-400" />
                <span className="text-sm font-semibold text-gray-300">Uploaded Documents</span>
              </div>
              <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                {documents.length}
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
                <FileText size={20} className="mx-auto mb-2 text-gray-700" />
                <p className="text-xs text-gray-600">No documents uploaded yet</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
                >
                  Upload a document
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {documents.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 group transition-colors"
                  >
                    <FileText size={12} className="text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 font-medium truncate">{d.title}</p>
                      <p className="text-xs text-gray-600">
                        {DOC_TYPE_LABELS[d.document_type] || d.document_type}
                        {d.chunk_count > 0 && ` · ${d.chunk_count} chunks`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteDocument(d.id, d.title)}
                      className="flex-shrink-0 p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                      title="Delete document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
