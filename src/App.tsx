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
  LogOut,
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
type Status = 'pending' | 'checked' | 'approved' | 'rejected' | 'paid';
type Urgency = 'normal' | 'urgent' | 'emergency';
type Role = 'accountant' | 'md' | 'auditor' | 'general_manager' | 'madam_charity' | 'staff';

type Profile = {
  id: string;
  full_name: string;
  role: Role;
};

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
  requested_by: string | null;
  requested_by_name: string;
  checked_by: string | null;
  checked_by_name: string | null;
  checked_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_by_name: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type RequestForm = {
  requestType: RequestType;
  title: string;
  description: string;
  amount: string;
  requesterName: string;
  department: string;
  recipient: string;
  urgency: Urgency;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const roleLabels: Record<Role, string> = {
  accountant: 'Accountant',
  md: 'Managing Director',
  auditor: 'Auditor',
  general_manager: 'General Manager',
  madam_charity: 'Madam Charity',
  staff: 'Staff',
};

const roleOptions: { value: Role; label: string }[] = [
  { value: 'accountant', label: 'Accountant — full access' },
  { value: 'md', label: 'Managing Director (MD)' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'general_manager', label: 'General Manager' },
  { value: 'madam_charity', label: 'Madam Charity' },
  { value: 'staff', label: 'Staff' },
];

const initialForm: RequestForm = { requestType: 'payment_voucher', title: '', description: '', amount: '', requesterName: '', department: 'General Management', recipient: '', urgency: 'normal' };

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(amount).replace('GHS', 'GHC');
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

function statusLabel(status: Status) {
  const labels: Record<Status, string> = { pending: 'Pending', checked: 'Checked', approved: 'Approved', rejected: 'Rejected', paid: 'Paid' };
  return labels[status];
}

function canCheck(role: Role) { return role === 'auditor' || role === 'accountant' || role === 'madam_charity'; }
function canApprove(role: Role) { return role === 'md' || role === 'accountant' || role === 'general_manager'; }
function canPay(role: Role) { return role === 'accountant'; }
function canReject(role: Role) { return role === 'md' || role === 'accountant' || role === 'madam_charity'; }

function App() {
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '', role: 'staff' as Role });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
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
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as { user: { id: string; email: string } } | null);
      if (!data.session) setAuthLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, sessionState) => {
      (async () => {
        setSession(sessionState as { user: { id: string; email: string } } | null);
        if (!sessionState) { setProfile(null); setAuthLoading(false); return; }
        const { data: profileData } = await supabase!.from('profiles').select('*').eq('id', sessionState.user.id).maybeSingle();
        setProfile(profileData as Profile | null);
        setAuthLoading(false);
      })();
    });
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    const loadRequests = async () => {
      const { data } = await supabase!.from('approval_requests').select('*').order('created_at', { ascending: false });
      if (data) setRequests(data as ApprovalRequest[]);
    };
    void loadRequests();
  }, [session]);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError('');
    if (authView === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: authForm.email.trim(),
        password: authForm.password,
      });
      if (signUpError) { setAuthError(signUpError.message); setAuthBusy(false); return; }
      if (data.user) {
        await supabase.from('profiles').insert({ id: data.user.id, full_name: authForm.fullName.trim(), role: authForm.role });
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authForm.email.trim(),
        password: authForm.password,
      });
      if (signInError) { setAuthError(signInError.message); setAuthBusy(false); return; }
    }
    setAuthBusy(false);
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
    setRequests([]);
  };

  const filteredRequests = useMemo(() => requests.filter((request) => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const query = search.toLowerCase();
    const matchesSearch = !query || `${request.request_number} ${request.title} ${request.requested_by_name} ${request.department}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  }), [filter, requests, search]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const checkedCount = requests.filter((r) => r.status === 'checked').length;
  const approvedAmount = requests.filter((r) => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
  const totalThisMonth = requests.reduce((sum, r) => sum + r.amount, 0);

  const advanceStatus = async (request: ApprovalRequest, action: 'check' | 'approve' | 'pay' | 'reject') => {
    if (!supabase || !profile) return;
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };
    if (action === 'check') { updates.status = 'checked'; updates.checked_by = profile.id; updates.checked_by_name = profile.full_name; updates.checked_at = now; }
    if (action === 'approve') { updates.status = 'approved'; updates.approved_by = profile.id; updates.approved_by_name = profile.full_name; updates.approved_at = now; }
    if (action === 'pay') { updates.status = 'paid'; updates.paid_by = profile.id; updates.paid_by_name = profile.full_name; updates.paid_at = now; }
    if (action === 'reject') { updates.status = 'rejected'; updates.approved_by = profile.id; updates.approved_by_name = profile.full_name; updates.approved_at = now; }
    const { error: updateError } = await supabase.from('approval_requests').update(updates).eq('id', request.id);
    if (updateError) { setError('We could not update that request.'); return; }
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, ...updates } as ApprovalRequest : item));
    if (selectedRequest?.id === request.id) setSelectedRequest({ ...request, ...updates } as ApprovalRequest);
    setNotice(`${request.request_number} marked as ${statusLabel(updates.status as Status).toLowerCase()}.`);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const createRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.requesterName.trim() || !form.description.trim()) {
      setError('Add a subject, your name, and a description before submitting.');
      return;
    }
    setSaving(true);
    setError('');
    const requestNumber = `ALS-${new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date()).toUpperCase()}-${159 + requests.length + 1}`;
    const payload = {
      request_number: requestNumber, request_type: form.requestType, title: form.title.trim(),
      description: form.description.trim(), amount: Number(form.amount) || 0, currency: 'GHC',
      requester: form.requesterName.trim(), department: form.department, recipient: form.recipient.trim(),
      from_party: form.department, urgency: form.urgency, status: 'pending' as Status,
      requested_by: profile?.id ?? null, requested_by_name: form.requesterName.trim(),
    };
    if (supabase) {
      const { data, error: insertError } = await supabase.from('approval_requests').insert(payload).select().maybeSingle();
      if (insertError) { setError('We could not save the request.'); setSaving(false); return; }
      if (data) setRequests((current) => [data as ApprovalRequest, ...current]);
    } else {
      setRequests((current) => [{ ...payload, id: `local-${Date.now()}`, requested_by: null, checked_by: null, checked_by_name: null, checked_at: null, approved_by: null, approved_by_name: null, approved_at: null, paid_by: null, paid_by_name: null, paid_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as ApprovalRequest, ...current]);
    }
    setForm(initialForm);
    setShowNewRequest(false);
    setSaving(false);
    setNotice(`${requestNumber} submitted for approval.`);
    window.setTimeout(() => setNotice(''), 2800);
  };

  if (authLoading) {
    return <div className="auth-loading"><Sparkles size={28} className="spin" /><p>Loading ALSALE workspace...</p></div>;
  }

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src="/photo_2026-09-23_14-50-00.jpg" alt="ALSALE" className="auth-logo" />
          <p className="auth-tagline">Payment Voucher &amp; Memorandum Approval System</p>
          <div className="auth-tabs">
            <button className={authView === 'login' ? 'selected' : ''} onClick={() => { setAuthView('login'); setAuthError(''); }}>Sign in</button>
            <button className={authView === 'signup' ? 'selected' : ''} onClick={() => { setAuthView('signup'); setAuthError(''); }}>Create account</button>
          </div>
          <form onSubmit={handleAuth} className="auth-form">
            {authView === 'signup' && (
              <>
                <label>Full name<input value={authForm.fullName} onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} placeholder="Your full name" required /></label>
                <label>Role
                  <select value={authForm.role} onChange={(e) => setAuthForm({ ...authForm, role: e.target.value as Role })}>
                    {roleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </label>
              </>
            )}
            <label>Email<input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@alsale.com" required /></label>
            <label>Password<input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 6 characters" required minLength={6} /></label>
            {authError && <p className="form-error">{authError}</p>}
            <button type="submit" className="primary-button auth-submit" disabled={authBusy}>
              {authBusy ? 'Please wait...' : authView === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="auth-hint">
            {authView === 'login'
              ? 'Don\'t have an account? Switch to "Create account" to set up your role.'
              : 'The accountant has full access. Other roles can check, approve, or mark paid based on their position.'}
          </p>
        </div>
      </div>
    );
  }

  const initials = (profile?.full_name ?? 'User').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const firstName = (profile?.full_name ?? 'User').split(' ')[0];
  const role = profile?.role ?? 'staff';

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <img src="/photo_2026-09-23_14-50-00.jpg" alt="ALSALE" className="company-logo" />
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          <button className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => { setActiveView('overview'); setShowMobileNav(false); }}><LayoutDashboard size={18} /> Overview</button>
          <button className={`nav-item ${activeView === 'requests' ? 'active' : ''}`} onClick={() => { setActiveView('requests'); setShowMobileNav(false); }}><ClipboardCheck size={18} /> All requests <span className="nav-count">{requests.length}</span></button>
          <button className="nav-item" onClick={() => setShowNewRequest(true)}><Plus size={18} /> New request</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><ShieldCheck size={17} /><div><strong>{roleLabels[role]}</strong><span>{canPay(role) ? 'Full access to everything' : 'Approvals based on your role'}</span></div></div>
          <button className="nav-item" onClick={handleSignOut}><LogOut size={18} /> Sign out</button>
          <div className="profile"><div className="avatar">{initials}</div><div><strong>{profile?.full_name ?? 'User'}</strong><span>{roleLabels[role]}</span></div></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb"><span>ALSALE</span><span>/</span><strong>{activeView === 'overview' ? 'Overview' : 'All requests'}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button>
            <div className="topbar-user"><div className="avatar small">{initials}</div><span>{firstName}</span><ChevronDown size={15} /></div>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <p className="eyebrow">Wednesday, 23 September 2026</p>
              <h1>{activeView === 'overview' ? `Welcome back, ${firstName}` : 'All requests'}</h1>
              <p className="heading-copy">{activeView === 'overview' ? `You are signed in as ${roleLabels[role]}. Here is what needs your attention.` : 'Review and manage every payment voucher and memorandum.'}</p>
            </div>
            <button className="primary-button" onClick={() => setShowNewRequest(true)}><Plus size={18} /> New request</button>
          </section>

          {activeView === 'overview' ? (
            <>
              <section className="metric-grid">
                <div className="metric-card accent-blue"><div className="metric-top"><span>Awaiting check</span><span className="metric-icon"><Clock3 size={18} /></span></div><strong>{pendingCount}</strong><small>New requests needing review</small></div>
                <div className="metric-card accent-green"><div className="metric-top"><span>Checked, awaiting MD</span><span className="metric-icon"><Check size={18} /></span></div><strong>{checkedCount}</strong><small>Ready for approval</small></div>
                <div className="metric-card accent-sand"><div className="metric-top"><span>Approved value</span><span className="metric-icon"><FileText size={18} /></span></div><strong>{formatMoney(approvedAmount)}</strong><small><span className="trend neutral">{formatMoney(totalThisMonth)}</span> total</small></div>
              </section>

              <section className="workspace-grid">
                <div className="panel recent-panel">
                  <div className="panel-header"><div><h2>Recent requests</h2><p>Latest activity in the workspace</p></div><button className="text-button" onClick={() => setActiveView('requests')}>View all <ArrowUpRight size={16} /></button></div>
                  <RequestTable requests={filteredRequests.slice(0, 5)} onOpen={setSelectedRequest} />
                </div>
                <div className="panel quick-panel">
                  <div className="panel-header"><div><h2>Start something new</h2><p>Create a request in a few steps.</p></div></div>
                  <button className="quick-action" onClick={() => { setForm({ ...initialForm, requestType: 'payment_voucher', requesterName: profile?.full_name ?? '' }); setShowNewRequest(true); }}>
                    <span className="quick-icon blue"><WalletCards size={19} /></span><span><strong>Payment voucher</strong><small>Request a payment or cash release</small></span><ArrowUpRight size={17} />
                  </button>
                  <button className="quick-action" onClick={() => { setForm({ ...initialForm, requestType: 'memorandum', requesterName: profile?.full_name ?? '' }); setShowNewRequest(true); }}>
                    <span className="quick-icon green"><FileText size={19} /></span><span><strong>Memorandum</strong><small>Send a request for management approval</small></span><ArrowUpRight size={17} />
                  </button>
                  <div className="approval-chain">
                    <span className="chain-title">Approval chain</span>
                    <div className="chain-step"><span className="chain-num">1</span> Auditor checks</div>
                    <div className="chain-step"><span className="chain-num">2</span> MD / GM approves</div>
                    <div className="chain-step"><span className="chain-num">3</span> Accountant pays</div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="panel requests-page">
              <div className="list-toolbar">
                <div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..." /></div>
                <div className="filter-tabs">{(['all', 'pending', 'checked', 'approved', 'paid', 'rejected'] as const).map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : statusLabel(item)}</button>)}</div>
              </div>
              <RequestTable requests={filteredRequests} onOpen={setSelectedRequest} emptyMessage="No requests match your search." />
            </section>
          )}
        </div>
      </main>

      {showMobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setShowMobileNav(false)} />}
      {notice && <div className="toast"><Check size={17} /> {notice}</div>}
      {error && <div className="toast error-toast"><X size={17} /> {error}</div>}

      {selectedRequest && (
        <div className="modal-backdrop">
          <div className="request-modal detail-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{selectedRequest.request_number} · {selectedRequest.request_type === 'memorandum' ? 'Memorandum' : 'Payment voucher'}</p>
                <h2>{selectedRequest.title}</h2>
                <p>{selectedRequest.description}</p>
              </div>
              <button className="icon-button" onClick={() => setSelectedRequest(null)} aria-label="Close"><X size={19} /></button>
            </div>
            <div className="detail-status">
              <span className={`status-pill ${selectedRequest.status}`}>{statusLabel(selectedRequest.status)}</span>
              <span>Submitted {formatDate(selectedRequest.created_at)}</span>
              <span>Requested by <strong>{selectedRequest.requested_by_name}</strong></span>
            </div>
            <div className="detail-grid">
              <div><span>Department</span><strong>{selectedRequest.department}</strong></div>
              <div><span>Send through to</span><strong>{selectedRequest.recipient || 'Not specified'}</strong></div>
              <div><span>Amount</span><strong>{formatMoney(selectedRequest.amount)}</strong></div>
              <div><span>Urgency</span><strong>{selectedRequest.urgency.charAt(0).toUpperCase() + selectedRequest.urgency.slice(1)}</strong></div>
            </div>

            <div className="approval-trail">
              <span className="chain-title">Approval trail</span>
              <div className={`trail-step ${selectedRequest.checked_at ? 'done' : ''}`}>
                <span className="trail-icon">{selectedRequest.checked_at ? <Check size={14} /> : <Clock3 size={14} />}</span>
                <div><strong>Checked by Auditor</strong>{selectedRequest.checked_by_name ? <span>{selectedRequest.checked_by_name} · {formatDate(selectedRequest.checked_at!)}</span> : <span className="muted">Awaiting check</span>}</div>
              </div>
              <div className={`trail-step ${selectedRequest.approved_at ? 'done' : selectedRequest.status === 'rejected' ? 'rejected' : ''}`}>
                <span className="trail-icon">{selectedRequest.approved_at ? <Check size={14} /> : <Clock3 size={14} />}</span>
                <div><strong>{selectedRequest.status === 'rejected' ? 'Rejected' : 'Approved by MD / GM'}</strong>{selectedRequest.approved_by_name ? <span>{selectedRequest.approved_by_name} · {formatDate(selectedRequest.approved_at!)}</span> : <span className="muted">Awaiting approval</span>}</div>
              </div>
              <div className={`trail-step ${selectedRequest.paid_at ? 'done' : ''}`}>
                <span className="trail-icon">{selectedRequest.paid_at ? <Check size={14} /> : <Clock3 size={14} />}</span>
                <div><strong>Paid by Accountant</strong>{selectedRequest.paid_by_name ? <span>{selectedRequest.paid_by_name} · {formatDate(selectedRequest.paid_at!)}</span> : <span className="muted">Awaiting payment</span>}</div>
              </div>
            </div>

            <div className="detail-actions">
              <button className="secondary-button" onClick={() => setSelectedRequest(null)}>Close</button>
              {selectedRequest.status === 'pending' && canCheck(role) && <button className="secondary-button approve-button" onClick={() => void advanceStatus(selectedRequest, 'check')}><Check size={15} /> Mark as checked</button>}
              {selectedRequest.status === 'checked' && canApprove(role) && <button className="secondary-button approve-button" onClick={() => void advanceStatus(selectedRequest, 'approve')}><Check size={15} /> Approve</button>}
              {(selectedRequest.status === 'pending' || selectedRequest.status === 'checked') && canReject(role) && <button className="secondary-button reject-button" onClick={() => void advanceStatus(selectedRequest, 'reject')}><X size={15} /> Reject</button>}
              {selectedRequest.status === 'approved' && canPay(role) && <button className="secondary-button approve-button" onClick={() => void advanceStatus(selectedRequest, 'pay')}><Check size={15} /> Mark as paid</button>}
              <button className="primary-button" onClick={() => window.print()}><Printer size={16} /> Print {selectedRequest.request_type === 'memorandum' ? 'memorandum' : 'PV'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="print-sheet">
          <div className="print-header"><img src="/photo_2026-09-23_14-50-00.jpg" alt="ALSALE" /><div><strong>{selectedRequest.request_type === 'memorandum' ? 'MEMORANDUM' : 'PAYMENT VOUCHER'}</strong><span>{selectedRequest.request_number}</span></div></div>
          <div className="print-title">{selectedRequest.title}</div>
          <div className="print-meta">
            <div><span>Requested by</span><strong>{selectedRequest.requested_by_name}</strong></div>
            <div><span>Department</span><strong>{selectedRequest.department}</strong></div>
            <div><span>Date</span><strong>{formatDate(selectedRequest.created_at)}</strong></div>
            <div><span>Amount</span><strong>{formatMoney(selectedRequest.amount)}</strong></div>
          </div>
          <div className="print-section"><span>Details / Purpose</span><p>{selectedRequest.description}</p></div>
          <div className="print-routing">
            <div><span>From</span><strong>{selectedRequest.from_party || selectedRequest.department}</strong></div>
            <div><span>Through</span><strong>{selectedRequest.recipient || '____________________'}</strong></div>
            <div><span>Urgency</span><strong>{selectedRequest.urgency.toUpperCase()}</strong></div>
          </div>
          <div className="print-signatures">
            <div>Prepared by: {selectedRequest.requested_by_name}<div className="signature-line" />Signature / Date</div>
            <div>Checked by: {selectedRequest.checked_by_name ?? '____________'}<div className="signature-line" />Signature / Date</div>
            <div>Approved by: {selectedRequest.approved_by_name ?? '____________'}<div className="signature-line" />Signature / Date</div>
          </div>
          {selectedRequest.paid_by_name && <div className="print-paid">Paid by {selectedRequest.paid_by_name} on {formatDate(selectedRequest.paid_at!)}</div>}
          <div className="print-footer">ALSALE · Banking Machines | Elevators | ACP · Official internal record</div>
        </div>
      )}

      {showNewRequest && (
        <div className="modal-backdrop">
          <div className="request-modal">
            <div className="modal-header">
              <div><p className="eyebrow">New submission</p><h2>Create a request</h2><p>Capture the details your approver needs.</p></div>
              <button className="icon-button" onClick={() => setShowNewRequest(false)} aria-label="Close"><X size={19} /></button>
            </div>
            <form onSubmit={createRequest}>
              <div className="type-switch">
                <button type="button" className={form.requestType === 'payment_voucher' ? 'selected' : ''} onClick={() => setForm({ ...form, requestType: 'payment_voucher' })}><WalletCards size={17} /> Payment voucher</button>
                <button type="button" className={form.requestType === 'memorandum' ? 'selected' : ''} onClick={() => setForm({ ...form, requestType: 'memorandum' })}><FileText size={17} /> Memorandum</button>
              </div>
              <div className="form-grid">
                <label className="full">Subject<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Payment for servicing of machines" /></label>
                <label>Your name<input value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} placeholder="So we know who is requesting this" /></label>
                <label>Amount <span>(GHC)</span><input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
                <label>Department<select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option>General Management</option><option>Accounts</option><option>Administration</option><option>Operations</option><option>People &amp; Culture</option></select></label>
                <label>Send through to<input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="e.g. Managing Director" /></label>
                <label className="full">Details<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain what this request is for..." /></label>
                <label className="full">Urgency<select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}><option value="normal">Normal — within 3 working days</option><option value="urgent">Urgent — needs attention today</option><option value="emergency">Emergency — immediate attention</option></select></label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setShowNewRequest(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Submitting...' : 'Submit for approval'} <ArrowUpRight size={16} /></button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestTable({ requests, onOpen, emptyMessage = 'No requests yet.' }: { requests: ApprovalRequest[]; onOpen: (request: ApprovalRequest) => void; emptyMessage?: string }) {
  if (!requests.length) return <div className="empty-state"><FileText size={24} /><strong>{emptyMessage}</strong><span>Try a different search or create a new request.</span></div>;
  return (
    <div className="table-wrap"><table><thead><tr><th>Request</th><th>Requested by</th><th>Amount</th><th>Status</th><th>Date</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
      {requests.map((request) => (
        <tr key={request.id}>
          <td><button className="request-cell request-cell-button" onClick={() => onOpen(request)}><span className={`request-type ${request.request_type === 'memorandum' ? 'memo' : 'voucher'}`}>{request.request_type === 'memorandum' ? <FileText size={15} /> : <WalletCards size={15} />}</span><span><strong>{request.title}</strong><small>{request.request_number} · {request.request_type === 'memorandum' ? 'Memorandum' : 'Payment voucher'}</small></span></button></td>
          <td><span className="person-name">{request.requested_by_name}</span><small className="department">{request.department}</small></td>
          <td><strong className="amount">{formatMoney(request.amount)}</strong></td>
          <td><span className={`status-pill ${request.status}`}>{statusLabel(request.status)}</span></td>
          <td className="date-cell">{formatDate(request.created_at)}</td>
          <td><button className="row-menu" aria-label={`Open ${request.request_number}`} onClick={() => onOpen(request)}><ArrowUpRight size={16} /></button></td>
        </tr>
      ))}
    </tbody></table></div>
  );
}

export default App;
