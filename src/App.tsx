import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type RequestType = 'payment_voucher' | 'memorandum';
type Status = 'pending' | 'approved' | 'rejected' | 'paid';
type Urgency = 'normal' | 'urgent' | 'emergency';

type ApprovalRequest = {
  id: string;
  request_number: string;
  request_type: RequestType;
  title: string;
  description: string;
  amount: number;
  currency: string;
  requester: string;
  department: string;
  recipient: string;
  from_party: string;
  urgency: Urgency;
  status: Status;
  created_at: string;
  updated_at: string;
};

type RequestForm = {
  requestType: RequestType;
  title: string;
  description: string;
  amount: string;
  requester: string;
  department: string;
  recipient: string;
  urgency: Urgency;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const demoRequests: ApprovalRequest[] = [
  {
    id: 'demo-1', request_number: 'ALS-SEP-159', request_type: 'memorandum', title: 'Payment for TNT to Anyinam & Kwabeng', description: 'Servicing of machines at both branches.', amount: 250, currency: 'GHC', requester: 'General Manager', department: 'General Management', recipient: 'Managing Director', from_party: 'Accounts', urgency: 'emergency', status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2', request_number: 'ALS-SEP-158', request_type: 'payment_voucher', title: 'Office stationery replenishment', description: 'Monthly stationery and printer supplies.', amount: 1840, currency: 'GHC', requester: 'Adwoa Mensah', department: 'Administration', recipient: 'Procurement', from_party: 'Administration', urgency: 'normal', status: 'approved', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'demo-3', request_number: 'ALS-SEP-157', request_type: 'payment_voucher', title: 'Generator maintenance service', description: 'Preventive maintenance and replacement parts.', amount: 6200, currency: 'GHC', requester: 'Kofi Arthur', department: 'Operations', recipient: 'Finance', from_party: 'Operations', urgency: 'urgent', status: 'paid', created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date(Date.now() - 90000000).toISOString(),
  },
  {
    id: 'demo-4', request_number: 'ALS-SEP-156', request_type: 'memorandum', title: 'Staff welfare support', description: 'Request for staff welfare contribution.', amount: 0, currency: 'GHC', requester: 'Lydia Owusu', department: 'People & Culture', recipient: 'Managing Director', from_party: 'HR', urgency: 'normal', status: 'rejected', created_at: new Date(Date.now() - 259200000).toISOString(), updated_at: new Date(Date.now() - 200000000).toISOString(),
  },
];

const initialForm: RequestForm = { requestType: 'payment_voucher', title: '', description: '', amount: '', requester: '', department: 'General Management', recipient: '', urgency: 'normal' };

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(amount).replace('GHS', 'GHC');
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

function statusLabel(status: Status) {
  return status === 'paid' ? 'Paid' : status.charAt(0).toUpperCase() + status.slice(1);
}

function App() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(demoRequests);
  const [activeView, setActiveView] = useState<'overview' | 'requests'>('overview');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [form, setForm] = useState<RequestForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const loadRequests = async () => {
      const { data, error: loadError } = await supabase.from('approval_requests').select('*').order('created_at', { ascending: false });
      if (!loadError && data && data.length > 0) setRequests(data as ApprovalRequest[]);
    };
    void loadRequests();
  }, []);

  const filteredRequests = useMemo(() => requests.filter((request) => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const query = search.toLowerCase();
    const matchesSearch = !query || `${request.request_number} ${request.title} ${request.requester} ${request.department}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  }), [filter, requests, search]);

  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const approvedAmount = requests.filter((request) => request.status === 'approved').reduce((sum, request) => sum + request.amount, 0);
  const totalThisMonth = requests.reduce((sum, request) => sum + request.amount, 0);

  const updateStatus = async (request: ApprovalRequest, status: Status) => {
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status, updated_at: new Date().toISOString() } : item));
    if (supabase && !request.id.startsWith('demo-')) {
      const { error: updateError } = await supabase.from('approval_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', request.id);
      if (updateError) setError('We could not update that request.');
    }
    setNotice(`${request.request_number} marked as ${statusLabel(status).toLowerCase()}.`);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const createRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.requester.trim() || !form.description.trim()) {
      setError('Add a subject, requester, and description before submitting.');
      return;
    }
    setSaving(true);
    setError('');
    const requestNumber = `ALS-${new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date()).toUpperCase()}-${159 + requests.length + 1}`;
    const payload = { request_number: requestNumber, request_type: form.requestType, title: form.title.trim(), description: form.description.trim(), amount: Number(form.amount) || 0, currency: 'GHC', requester: form.requester.trim(), department: form.department, recipient: form.recipient.trim(), from_party: form.department, urgency: form.urgency, status: 'pending' as Status };
    if (supabase) {
      const { data, error: insertError } = await supabase.from('approval_requests').insert(payload).select().maybeSingle();
      if (insertError) {
        setError('We could not save the request. Please try again.');
        setSaving(false);
        return;
      }
      if (data) setRequests((current) => [data as ApprovalRequest, ...current]);
    } else {
      setRequests((current) => [{ ...payload, id: `local-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...current]);
    }
    setForm(initialForm);
    setShowNewRequest(false);
    setSaving(false);
    setNotice(`${requestNumber} submitted for approval.`);
    window.setTimeout(() => setNotice(''), 2800);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <img src="/photo_2026-09-23_14-50-00.jpg" alt="ALSALE Banking Machines, Elevators and ACP" className="company-logo" />
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          <button className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => { setActiveView('overview'); setShowMobileNav(false); }}><LayoutDashboard size={18} /> Overview</button>
          <button className={`nav-item ${activeView === 'requests' ? 'active' : ''}`} onClick={() => { setActiveView('requests'); setShowMobileNav(false); }}><ClipboardCheck size={18} /> All requests <span className="nav-count">{requests.length}</span></button>
          <button className="nav-item" onClick={() => setShowNewRequest(true)}><Plus size={18} /> New request</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><Sparkles size={17} /><div><strong>Simple approvals</strong><span>One clear place for every request.</span></div></div>
          <button className="nav-item"><Settings size={18} /> Settings</button>
          <div className="profile"><div className="avatar">JM</div><div><strong>Jonathan Mensah</strong><span>Administrator</span></div><ChevronDown size={16} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb"><span>ALSALE</span><span>/</span><strong>{activeView === 'overview' ? 'Overview' : 'All requests'}</strong></div>
          <div className="topbar-actions"><button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button><div className="topbar-user"><div className="avatar small">JM</div><span>Jonathan</span><ChevronDown size={15} /></div></div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div><p className="eyebrow">Wednesday, 23 September 2026</p><h1>{activeView === 'overview' ? 'Good morning, Jonathan' : 'All requests'}</h1><p className="heading-copy">{activeView === 'overview' ? 'Here is what is happening across your approval workspace.' : 'Review and manage every payment voucher and memorandum.'}</p></div>
            <button className="primary-button" onClick={() => setShowNewRequest(true)}><Plus size={18} /> New request</button>
          </section>

          {activeView === 'overview' ? <>
            <section className="metric-grid">
              <div className="metric-card accent-blue"><div className="metric-top"><span>Awaiting approval</span><span className="metric-icon"><Clock3 size={18} /></span></div><strong>{pendingCount}</strong><small><span className="trend up">+2</span> since last week</small></div>
              <div className="metric-card accent-green"><div className="metric-top"><span>Approved this month</span><span className="metric-icon"><Check size={18} /></span></div><strong>{formatMoney(approvedAmount)}</strong><small><span className="trend up">+12.4%</span> from last month</small></div>
              <div className="metric-card accent-sand"><div className="metric-top"><span>Total requests</span><span className="metric-icon"><FileText size={18} /></span></div><strong>{requests.length}</strong><small><span className="trend neutral">{formatMoney(totalThisMonth)}</span> total value</small></div>
            </section>

            <section className="workspace-grid">
              <div className="panel recent-panel"><div className="panel-header"><div><h2>Recent requests</h2><p>The latest activity in your workspace</p></div><button className="text-button" onClick={() => setActiveView('requests')}>View all <ArrowUpRight size={16} /></button></div><RequestTable requests={filteredRequests.slice(0, 4)} onStatusChange={updateStatus} onOpen={setSelectedRequest} /></div>
              <div className="panel quick-panel"><div className="panel-header"><div><h2>Start something new</h2><p>Create a request in a few steps.</p></div></div><button className="quick-action" onClick={() => { setForm({ ...initialForm, requestType: 'payment_voucher' }); setShowNewRequest(true); }}><span className="quick-icon blue"><WalletCards size={19} /></span><span><strong>Payment voucher</strong><small>Request a payment or cash release</small></span><ArrowUpRight size={17} /></button><button className="quick-action" onClick={() => { setForm({ ...initialForm, requestType: 'memorandum' }); setShowNewRequest(true); }}><span className="quick-icon green"><FileText size={19} /></span><span><strong>Memorandum</strong><small>Send a request for management approval</small></span><ArrowUpRight size={17} /></button><div className="tip"><Sparkles size={16} /><span><strong>Good to know</strong>Your request number is created automatically when you submit.</span></div></div>
            </section>
          </> : <section className="panel requests-page"><div className="list-toolbar"><div className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests..." /></div><div className="filter-tabs">{(['all', 'pending', 'approved', 'paid', 'rejected'] as const).map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : statusLabel(item)}</button>)}</div></div><RequestTable requests={filteredRequests} onStatusChange={updateStatus} onOpen={setSelectedRequest} emptyMessage="No requests match your search." /></section>}
        </div>
      </main>

      {showMobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setShowMobileNav(false)} />}
      {notice && <div className="toast"><Check size={17} /> {notice}</div>}
      {selectedRequest && <div className="modal-backdrop"><div className="request-modal detail-modal"><div className="modal-header"><div><p className="eyebrow">{selectedRequest.request_number} · {selectedRequest.request_type === 'memorandum' ? 'Memorandum' : 'Payment voucher'}</p><h2>{selectedRequest.title}</h2><p>{selectedRequest.description}</p></div><button className="icon-button" onClick={() => setSelectedRequest(null)} aria-label="Close"><X size={19} /></button></div><div className="detail-status"><span className={`status-pill ${selectedRequest.status}`}>{statusLabel(selectedRequest.status)}</span><span>Submitted {formatDate(selectedRequest.created_at)}</span><span>{selectedRequest.urgency.charAt(0).toUpperCase() + selectedRequest.urgency.slice(1)} priority</span></div><div className="detail-grid"><div><span>Requester</span><strong>{selectedRequest.requester}</strong></div><div><span>Department</span><strong>{selectedRequest.department}</strong></div><div><span>Send through to</span><strong>{selectedRequest.recipient || 'Not specified'}</strong></div><div><span>Amount</span><strong>{formatMoney(selectedRequest.amount)}</strong></div></div><div className="detail-actions"><button className="secondary-button" onClick={() => setSelectedRequest(null)}>Close</button>{selectedRequest.status === 'pending' && <button className="secondary-button approve-button" onClick={() => { void updateStatus(selectedRequest, 'approved'); setSelectedRequest({ ...selectedRequest, status: 'approved' }); }}> <Check size={15} /> Approve</button>}<button className="primary-button" onClick={() => window.print()}><Printer size={16} /> Print {selectedRequest.request_type === 'memorandum' ? 'memorandum' : 'PV'}</button></div></div></div>}
      {selectedRequest && <div className="print-sheet"><div className="print-header"><img src="/photo_2026-09-23_14-50-00.jpg" alt="ALSALE" /><div><strong>{selectedRequest.request_type === 'memorandum' ? 'MEMORANDUM' : 'PAYMENT VOUCHER'}</strong><span>{selectedRequest.request_number}</span></div></div><div className="print-title">{selectedRequest.title}</div><div className="print-meta"><div><span>Requester</span><strong>{selectedRequest.requester}</strong></div><div><span>Department</span><strong>{selectedRequest.department}</strong></div><div><span>Date</span><strong>{formatDate(selectedRequest.created_at)}</strong></div><div><span>Amount</span><strong>{formatMoney(selectedRequest.amount)}</strong></div></div><div className="print-section"><span>Details / Purpose</span><p>{selectedRequest.description}</p></div><div className="print-routing"><div><span>From</span><strong>{selectedRequest.from_party || selectedRequest.department}</strong></div><div><span>Through</span><strong>{selectedRequest.recipient || '____________________'}</strong></div><div><span>Urgency</span><strong>{selectedRequest.urgency.toUpperCase()}</strong></div></div><div className="print-signatures"><div>Prepared by<div className="signature-line" />Name / Signature / Date</div><div>Checked by<div className="signature-line" />Name / Signature / Date</div><div>Approved by<div className="signature-line" />Name / Signature / Date</div></div><div className="print-footer">ALSALE · Banking Machines | Elevators | ACP · Official internal record</div></div>}
      {showNewRequest && <div className="modal-backdrop"><div className="request-modal"><div className="modal-header"><div><p className="eyebrow">New submission</p><h2>Create a request</h2><p>Capture the details your approver needs.</p></div><button className="icon-button" onClick={() => setShowNewRequest(false)} aria-label="Close"><X size={19} /></button></div><form onSubmit={createRequest}><div className="type-switch"><button type="button" className={form.requestType === 'payment_voucher' ? 'selected' : ''} onClick={() => setForm({ ...form, requestType: 'payment_voucher' })}><WalletCards size={17} /> Payment voucher</button><button type="button" className={form.requestType === 'memorandum' ? 'selected' : ''} onClick={() => setForm({ ...form, requestType: 'memorandum' })}><FileText size={17} /> Memorandum</button></div><div className="form-grid"><label className="full">Subject<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Payment for servicing of machines" /></label><label>Requester<input value={form.requester} onChange={(event) => setForm({ ...form, requester: event.target.value })} placeholder="Full name" /></label><label>Amount <span>(GHC)</span><input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></label><label>Department<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option>General Management</option><option>Accounts</option><option>Administration</option><option>Operations</option><option>People & Culture</option></select></label><label>Send through to<input value={form.recipient} onChange={(event) => setForm({ ...form, recipient: event.target.value })} placeholder="e.g. Managing Director" /></label><label className="full">Details<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explain what this request is for..." /></label><label className="full">Urgency<select value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value as Urgency })}><option value="normal">Normal — within 3 working days</option><option value="urgent">Urgent — needs attention today</option><option value="emergency">Emergency — immediate attention</option></select></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setShowNewRequest(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Submitting...' : 'Submit for approval'} <ArrowUpRight size={16} /></button></div></form></div></div>}
    </div>
  );
}

function RequestTable({ requests, onStatusChange, onOpen, emptyMessage = 'No requests yet.' }: { requests: ApprovalRequest[]; onStatusChange: (request: ApprovalRequest, status: Status) => void; onOpen: (request: ApprovalRequest) => void; emptyMessage?: string }) {
  if (!requests.length) return <div className="empty-state"><FileText size={24} /><strong>{emptyMessage}</strong><span>Try a different search or create a new request.</span></div>;
  return <div className="table-wrap"><table><thead><tr><th>Request</th><th>Requester</th><th>Amount</th><th>Status</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><button className="request-cell request-cell-button" onClick={() => onOpen(request)}><span className={`request-type ${request.request_type === 'memorandum' ? 'memo' : 'voucher'}`}>{request.request_type === 'memorandum' ? <FileText size={15} /> : <WalletCards size={15} />}</span><span><strong>{request.title}</strong><small>{request.request_number} · {request.request_type === 'memorandum' ? 'Memorandum' : 'Payment voucher'}</small></span></button></td><td><span className="person-name">{request.requester}</span><small className="department">{request.department}</small></td><td><strong className="amount">{formatMoney(request.amount)}</strong></td><td><button className={`status-pill ${request.status}`} onClick={() => request.status === 'pending' && onStatusChange(request, 'approved')}>{statusLabel(request.status)}{request.status === 'pending' && <Check size={12} />}</button></td><td className="date-cell">{formatDate(request.created_at)}</td><td><button className="row-menu" aria-label={`Open ${request.request_number}`} onClick={() => onOpen(request)}><ArrowUpRight size={16} /></button></td></tr>)}</tbody></table></div>;
}

export default App;
