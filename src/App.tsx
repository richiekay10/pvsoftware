import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  CheckCircle2,
  Fuel,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Paperclip,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  WalletCards,
  X,
  Zap,
  Droplets,
  BarChart3,
} from 'lucide-react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import SignaturePad from '@/SignaturePad';

type RequestType = 'payment_voucher' | 'memorandum';
type Status = 'pending' | 'checked' | 'accountant_checked' | 'approved' | 'rejected' | 'paid';
type Urgency = 'normal' | 'urgent' | 'emergency';
type Role = 'accountant' | 'md' | 'auditor' | 'general_manager' | 'madam_charity' | 'staff';
type PVCategory = 'general' | 'fuel' | 'electricity' | 'water' | 'rent' | 'transport' | 'maintenance' | 'supplies' | 'other';

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
  pv_category: PVCategory;
  attachment_url: string | null;
  memo_to: string | null;
  memo_from: string | null;
  memo_cc: string | null;
  memo_reference: string | null;
  requested_by: string | null;
  requested_by_name: string;
  checked_by: string | null;
  checked_by_name: string | null;
  checked_at: string | null;
  accountant_checked_by: string | null;
  accountant_checked_name: string | null;
  accountant_checked_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_by_name: string | null;
  paid_at: string | null;
  checked_signature: string | null;
  accountant_checked_signature: string | null;
  approved_signature: string | null;
  paid_signature: string | null;
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
  pvCategory: PVCategory;
  attachmentFile: File | null;
  memoTo: string;
  memoFrom: string;
  memoCc: string;
  memoReference: string;
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

const departments = ['Elevator Department', 'IT Department', 'Sales Department', 'Aftersales Department', 'General Management'];

const pvCategoryOptions: { value: PVCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'electricity', label: 'Electricity Bill' },
  { value: 'water', label: 'Water Bill' },
  { value: 'rent', label: 'Rent' },
  { value: 'transport', label: 'Transport' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];

const pvCategoryIcons: Record<PVCategory, typeof Fuel> = {
  general: FileText,
  fuel: Fuel,
  electricity: Zap,
  water: Droplets,
  rent: FileText,
  transport: FileText,
  maintenance: FileText,
  supplies: FileText,
  other: FileText,
};

const initialForm: RequestForm = {
  requestType: 'payment_voucher', title: '', description: '', amount: '', requesterName: '',
  department: 'Elevator Department', recipient: '', urgency: 'normal', pvCategory: 'general',
  attachmentFile: null, memoTo: '', memoFrom: '', memoCc: '', memoReference: '',
};

const SMALL_AMOUNT_THRESHOLD = 500;

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(amount).replace('GHS', 'GHC');
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(date));
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(Number(y), Number(m) - 1));
}

function statusLabel(status: Status) {
  const labels: Record<Status, string> = { pending: 'Pending', checked: 'Auditor Checked', accountant_checked: 'Accountant Checked', approved: 'Approved', rejected: 'Rejected', paid: 'Paid' };
  return labels[status];
}

function canCheck(role: Role) { return role === 'auditor'; }
function canAccountantCheck(role: Role) { return role === 'accountant'; }
function canApprove(role: Role) { return role === 'md' || role === 'general_manager'; }
function canPay(role: Role) { return role === 'accountant'; }
function canReject(role: Role) { return role === 'md' || role === 'accountant' || role === 'auditor'; }

function getApprovalLabel(request: ApprovalRequest): string {
  if (request.amount <= SMALL_AMOUNT_THRESHOLD) return 'Approved by General Manager';
  return 'Approved by MD (Final)';
}

function App() {
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '', role: 'staff' as Role });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'requests' | 'approved-pvs' | 'reports'>('overview');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [form, setForm] = useState<RequestForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [seenRequestIds, setSeenRequestIds] = useState<Set<string>>(new Set());
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<{ request: ApprovalRequest; action: 'check' | 'accountant_check' | 'approve' | 'pay' } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwForm, setChangePwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changePwError, setChangePwError] = useState('');
  const [changePwBusy, setChangePwBusy] = useState(false);
  const [changePwSuccess, setChangePwSuccess] = useState('');
  const [printSelection, setPrintSelection] = useState<Set<string>>(new Set());
  const [showPrintMode, setShowPrintMode] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'this-month' | 'last-month' | 'all'>('this-month');
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('alsale-theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('alsale-theme', next);
  };

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session as { user: { id: string; email: string } } | null);
      if (!data.session) setAuthLoading(false);
    }).catch(() => { if (mounted) setAuthLoading(false); });
    supabase.auth.onAuthStateChange((_event, sessionState) => {
      (async () => {
        setSession(sessionState as { user: { id: string; email: string } } | null);
        if (!sessionState) { setProfile(null); setAuthLoading(false); return; }
        const { data: profileData } = await supabase!.from('profiles').select('*').eq('id', sessionState.user.id).maybeSingle();
        if (!mounted) return;
        setProfile(profileData as Profile | null);
        setAuthLoading(false);
      })();
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    const loadRequests = async () => {
      const { data } = await supabase!.from('approval_requests').select('*').order('created_at', { ascending: false });
      if (data) {
        const loaded = data as ApprovalRequest[];
        setRequests(loaded);
        setSeenRequestIds((prev) => {
          if (prev.size === 0) return new Set(loaded.map((r) => r.id));
          return prev;
        });
      }
    };
    void loadRequests();
    const channel = supabase!.channel('approval_requests_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'approval_requests' }, (payload) => {
        const newReq = payload.new as ApprovalRequest;
        setRequests((current) => [newReq, ...current.filter((r) => r.id !== newReq.id)]);
        setNewRequestIds((current) => new Set(current).add(newReq.id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'approval_requests' }, (payload) => {
        const updated = payload.new as ApprovalRequest;
        setRequests((current) => current.map((r) => r.id === updated.id ? updated : r));
      })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [session]);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError('');
    if (authView === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: authForm.email.trim(), password: authForm.password });
      if (signUpError) { setAuthError(signUpError.message); setAuthBusy(false); return; }
      if (data.user) {
        await supabase.from('profiles').insert({ id: data.user.id, full_name: authForm.fullName.trim(), role: authForm.role });
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password });
      if (signInError) { setAuthError(signInError.message); setAuthBusy(false); return; }
    }
    setAuthBusy(false);
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
    setRequests([]);
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setChangePwError('');
    setChangePwSuccess('');
    if (changePwForm.newPassword.length < 6) { setChangePwError('New password must be at least 6 characters.'); return; }
    if (changePwForm.newPassword !== changePwForm.confirmPassword) { setChangePwError('New password and confirmation do not match.'); return; }
    setChangePwBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: session!.user.email, password: changePwForm.oldPassword });
    if (signInError) { setChangePwError('Your current password is incorrect.'); setChangePwBusy(false); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password: changePwForm.newPassword });
    if (updateError) { setChangePwError(updateError.message); setChangePwBusy(false); return; }
    setChangePwBusy(false);
    setChangePwSuccess('Password changed successfully.');
    setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    window.setTimeout(() => { setChangePwSuccess(''); setShowChangePw(false); }, 2000);
  };

  const filteredRequests = useMemo(() => requests.filter((request) => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const query = search.toLowerCase();
    const matchesSearch = !query || `${request.request_number} ${request.title} ${request.requested_by_name} ${request.department}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  }), [filter, requests, search]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const checkedCount = requests.filter((r) => r.status === 'checked').length;
  const accountantCheckedCount = requests.filter((r) => r.status === 'accountant_checked').length;
  const approvedPVs = useMemo(() => requests.filter((r) => r.request_type === 'payment_voucher' && (r.status === 'approved' || r.status === 'paid')), [requests]);
  const notificationList = useMemo(() => requests.filter((r) => newRequestIds.has(r.id)).slice(0, 8), [requests, newRequestIds]);
  const unseenCount = notificationList.length;

  // Reports data
  const reportRequests = useMemo(() => {
    if (reportPeriod === 'all') return requests.filter((r) => r.request_type === 'payment_voucher');
    const now = new Date();
    const targetMonth = reportPeriod === 'this-month' ? now.getMonth() : now.getMonth() - 1;
    const targetYear = now.getFullYear();
    const adjustedDate = new Date(targetYear, targetMonth, 1);
    const key = `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}`;
    return requests.filter((r) => r.request_type === 'payment_voucher' && monthKey(r.created_at) === key);
  }, [requests, reportPeriod]);

  const deptStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const r of reportRequests) {
      const entry = map.get(r.department) ?? { count: 0, total: 0 };
      entry.count++;
      entry.total += r.amount;
      map.set(r.department, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [reportRequests]);

  const categoryStats = useMemo(() => {
    const map = new Map<PVCategory, { count: number; total: number }>();
    for (const r of reportRequests) {
      const entry = map.get(r.pv_category) ?? { count: 0, total: 0 };
      entry.count++;
      entry.total += r.amount;
      map.set(r.pv_category, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [reportRequests]);

  const fuelMonthlyStats = useMemo(() => {
    const fuelReqs = requests.filter((r) => r.request_type === 'payment_voucher' && r.pv_category === 'fuel');
    const map = new Map<string, { count: number; total: number }>();
    for (const r of fuelReqs) {
      const key = monthKey(r.created_at);
      const entry = map.get(key) ?? { count: 0, total: 0 };
      entry.count++;
      entry.total += r.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [requests]);

  const maxDeptCount = Math.max(...deptStats.map((d) => d[1].count), 1);
  const maxCatCount = Math.max(...categoryStats.map((c) => c[1].count), 1);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const advanceStatus = async (request: ApprovalRequest, action: 'check' | 'accountant_check' | 'approve' | 'pay' | 'reject', signature?: string) => {
    if (!supabase || !profile) return;
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };
    if (action === 'check') { updates.status = 'checked'; updates.checked_by = profile.id; updates.checked_by_name = profile.full_name; updates.checked_at = now; if (signature) updates.checked_signature = signature; }
    if (action === 'accountant_check') { updates.status = 'accountant_checked'; updates.accountant_checked_by = profile.id; updates.accountant_checked_name = profile.full_name; updates.accountant_checked_at = now; if (signature) updates.accountant_checked_signature = signature; }
    if (action === 'approve') { updates.status = 'approved'; updates.approved_by = profile.id; updates.approved_by_name = profile.full_name; updates.approved_at = now; if (signature) updates.approved_signature = signature; }
    if (action === 'pay') { updates.status = 'paid'; updates.paid_by = profile.id; updates.paid_by_name = profile.full_name; updates.paid_at = now; if (signature) updates.paid_signature = signature; }
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
    const isMemo = form.requestType === 'memorandum';
    if (!form.title.trim() || !form.requesterName.trim() || !form.description.trim()) {
      setError('Add a subject, your name, and details before submitting.');
      return;
    }
    if (isMemo && !form.memoTo.trim()) {
      setError('Memorandum must have a recipient (To).');
      return;
    }
    setSaving(true);
    setError('');
    const requestNumber = `ALS-${new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date()).toUpperCase()}-${159 + requests.length + 1}`;

    let attachmentUrl: string | null = null;
    if (form.attachmentFile && supabase) {
      const fileExt = form.attachmentFile.name.split('.').pop() ?? 'file';
      const fileName = `${requestNumber}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('pv-attachments').upload(fileName, form.attachmentFile);
      if (uploadError) {
        setError('Could not upload the attachment. Please try again.');
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('pv-attachments').getPublicUrl(fileName);
      attachmentUrl = urlData.publicUrl;
    }

    const payload: Record<string, unknown> = {
      request_number: requestNumber,
      request_type: form.requestType,
      title: form.title.trim(),
      description: form.description.trim(),
      amount: Number(form.amount) || 0,
      currency: 'GHC',
      requester: form.requesterName.trim(),
      department: form.department,
      recipient: form.recipient.trim(),
      from_party: form.department,
      urgency: form.urgency,
      status: 'pending' as Status,
      requested_by: profile?.id ?? null,
      requested_by_name: form.requesterName.trim(),
      pv_category: isMemo ? 'general' : form.pvCategory,
      attachment_url: attachmentUrl,
    };

    if (isMemo) {
      payload.memo_to = form.memoTo.trim();
      payload.memo_from = form.memoFrom.trim() || form.requesterName.trim();
      payload.memo_cc = form.memoCc.trim() || null;
      payload.memo_reference = form.memoReference.trim() || null;
    }

    if (supabase) {
      const { data, error: insertError } = await supabase.from('approval_requests').insert(payload).select().maybeSingle();
      if (insertError) { setError('We could not save the request.'); setSaving(false); return; }
      if (data) setRequests((current) => [data as ApprovalRequest, ...current]);
    } else {
      const localReq: ApprovalRequest = {
        ...payload as Record<string, unknown>,
        id: `local-${Date.now()}`,
        requested_by: null, checked_by: null, checked_by_name: null, checked_at: null,
        accountant_checked_by: null, accountant_checked_name: null, accountant_checked_at: null,
        approved_by: null, approved_by_name: null, approved_at: null,
        paid_by: null, paid_by_name: null, paid_at: null,
        checked_signature: null, accountant_checked_signature: null, approved_signature: null, paid_signature: null,
        attachment_url: attachmentUrl,
        memo_to: isMemo ? form.memoTo.trim() : null,
        memo_from: isMemo ? form.memoFrom.trim() : null,
        memo_cc: isMemo ? form.memoCc.trim() || null : null,
        memo_reference: isMemo ? form.memoReference.trim() || null : null,
        pv_category: isMemo ? 'general' : form.pvCategory,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ApprovalRequest;
      setRequests((current) => [localReq, ...current]);
    }
    setForm(initialForm);
    setShowNewRequest(false);
    setSaving(false);
    setNotice(`${requestNumber} submitted for approval.`);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const canApproveRequest = (role: Role, request: ApprovalRequest): boolean => {
    if (!canApprove(role)) return false;
    if (request.status !== 'checked' && request.status !== 'accountant_checked') return false;
    if (request.amount <= SMALL_AMOUNT_THRESHOLD) return role === 'general_manager' || role === 'md';
    return role === 'md';
  };

  const printSelected = () => {
    if (printSelection.size === 0) return;
    setShowPrintMode(true);
    window.setTimeout(() => { window.print(); setShowPrintMode(false); }, 100);
  };

  const printSingle = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    window.setTimeout(() => { window.print(); }, 100);
  };

  const togglePrintSelection = (id: string) => {
    setPrintSelection((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const selectAllForPrint = () => {
    if (printSelection.size === approvedPVs.length) setPrintSelection(new Set());
    else setPrintSelection(new Set(approvedPVs.map((r) => r.id)));
  };

  const requestsToPrint = showPrintMode ? requests.filter((r) => printSelection.has(r.id)) : selectedRequest ? [selectedRequest] : [];

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
                <label>Role<select value={authForm.role} onChange={(e) => setAuthForm({ ...authForm, role: e.target.value as Role })}>{roleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
              </>
            )}
            <label>Email<input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@alsale.com" required /></label>
            <label>Password<input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 6 characters" required minLength={6} /></label>
            {authError && <p className="form-error">{authError}</p>}
            <button type="submit" className="primary-button auth-submit" disabled={authBusy}>{authBusy ? 'Please wait...' : authView === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          <p className="auth-hint">{authView === 'login' ? 'Don\'t have an account? Switch to "Create account" to set up your role.' : 'The accountant has full access. Other roles can check, approve, or mark paid based on their position.'}</p>
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
        <button className="brand-lockup" onClick={() => { setActiveView('overview'); setShowMobileNav(false); }} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}>
          <img src="/photo_2026-09-23_14-50-00.jpg" alt="ALSALE" className="company-logo" />
        </button>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          <button className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => { setActiveView('overview'); setShowMobileNav(false); }}><LayoutDashboard size={18} /> Overview</button>
          <button className={`nav-item ${activeView === 'requests' ? 'active' : ''}`} onClick={() => { setActiveView('requests'); setShowMobileNav(false); }}><ClipboardCheck size={18} /> All requests <span className="nav-count">{requests.length}</span></button>
          <button className={`nav-item ${activeView === 'approved-pvs' ? 'active' : ''}`} onClick={() => { setActiveView('approved-pvs'); setShowMobileNav(false); }}><CheckCircle2 size={18} /> Approved PVs <span className="nav-count">{approvedPVs.length}</span></button>
          <button className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => { setActiveView('reports'); setShowMobileNav(false); }}><BarChart3 size={18} /> Reports</button>
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
          <div className="breadcrumb"><span>ALSALE</span><span>/</span><strong>{activeView === 'overview' ? 'Overview' : activeView === 'approved-pvs' ? 'Approved PVs' : activeView === 'reports' ? 'Reports' : 'All requests'}</strong></div>
          <div className="topbar-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button>
            <div className="dropdown-anchor" ref={notifRef}>
              <button className={`icon-button notification ${showNotifications ? 'active' : ''}`} aria-label="Notifications" onClick={() => { setShowNotifications((v) => !v); setShowProfileMenu(false); }}><Bell size={19} />{unseenCount > 0 && <span className="notif-badge">{unseenCount}</span>}</button>
              {showNotifications && (
                <div className="dropdown-panel notif-panel">
                  <div className="dropdown-header"><strong>Notifications</strong>{unseenCount > 0 && <button className="text-button" onClick={() => { setNewRequestIds(new Set()); setSeenRequestIds(new Set(requests.map((r) => r.id))); }}>Mark all read</button>}</div>
                  {notificationList.length === 0 ? (
                    <div className="dropdown-empty"><CheckCircle2 size={20} /><span>You are all caught up</span></div>
                  ) : notificationList.map((req) => (
                    <button key={req.id} className="notif-item" onClick={() => { setSelectedRequest(req); setShowNotifications(false); setNewRequestIds((current) => { const next = new Set(current); next.delete(req.id); return next; }); }}>
                      <span className={`request-type ${req.request_type === 'memorandum' ? 'memo' : 'voucher'}`}>{req.request_type === 'memorandum' ? <FileText size={14} /> : <WalletCards size={14} />}</span>
                      <div><strong>{req.request_number}</strong><span>{req.title}</span><small>New request by {req.requested_by_name}</small></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="dropdown-anchor" ref={profileRef}>
              <button className={`topbar-user ${showProfileMenu ? 'active' : ''}`} onClick={() => { setShowProfileMenu((v) => !v); setShowNotifications(false); }}><div className="avatar small">{initials}</div><span>{firstName}</span><ChevronDown size={15} /></button>
              {showProfileMenu && (
                <div className="dropdown-panel profile-panel">
                  <div className="dropdown-profile-head"><div className="avatar">{initials}</div><div><strong>{profile?.full_name ?? 'User'}</strong><span>{roleLabels[role]}</span></div></div>
                  <button className="dropdown-link" onClick={() => { setActiveView('approved-pvs'); setShowProfileMenu(false); setShowMobileNav(false); }}><CheckCircle2 size={17} /> Approved PVs <span className="dropdown-count">{approvedPVs.length}</span></button>
                  <button className="dropdown-link" onClick={() => { setActiveView('reports'); setShowProfileMenu(false); setShowMobileNav(false); }}><BarChart3 size={17} /> Reports</button>
                  <button className="dropdown-link" onClick={() => { setActiveView('requests'); setShowProfileMenu(false); setShowMobileNav(false); }}><ClipboardCheck size={17} /> All requests <span className="dropdown-count">{requests.length}</span></button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-link" onClick={() => { setShowChangePw(true); setShowProfileMenu(false); }}><KeyRound size={17} /> Change password</button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-link danger" onClick={() => { void handleSignOut(); setShowProfileMenu(false); }}><LogOut size={17} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <p className="eyebrow">{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</p>
              <h1>{activeView === 'overview' ? `Welcome back, ${firstName}` : activeView === 'approved-pvs' ? 'Approved Payment Vouchers' : activeView === 'reports' ? 'Reports & Analytics' : 'All requests'}</h1>
              <p className="heading-copy">{activeView === 'overview' ? `You are signed in as ${roleLabels[role]}. Here is what needs your attention.` : activeView === 'approved-pvs' ? 'Payment vouchers that have been approved and are ready for payment. Select multiple to print them together.' : activeView === 'reports' ? 'Track PVs by department, category, and month — including fuel spending trends.' : 'Review and manage every payment voucher and memorandum.'}</p>
            </div>
            <button className="primary-button" onClick={() => setShowNewRequest(true)}><Plus size={18} /> New request</button>
          </section>

          {activeView === 'approved-pvs' ? (
            <>
              <div className="print-controls">
                <div className="print-controls-left">
                  <label className="pv-checkbox"><input type="checkbox" checked={printSelection.size === approvedPVs.length && approvedPVs.length > 0} onChange={selectAllForPrint} /><span className="pv-check-label">Select all ({approvedPVs.length})</span></label>
                  {printSelection.size > 0 && <span className="pv-check-label">{printSelection.size} selected</span>}
                </div>
                <div className="print-controls-right">
                  <button className="primary-button" onClick={printSelected} disabled={printSelection.size === 0}><Printer size={16} /> Print {printSelection.size > 0 ? `${printSelection.size} ` : ''}PV{printSelection.size !== 1 ? 's' : ''}</button>
                </div>
              </div>
              <section className="panel requests-page">
                <div className="panel-header"><div><h2>Approved Payment Vouchers</h2><p>Tick the checkboxes to select which PVs to print together</p></div></div>
                <PVTable requests={approvedPVs} onOpen={setSelectedRequest} printSelection={printSelection} onTogglePrint={togglePrintSelection} emptyMessage="No approved payment vouchers yet." />
              </section>
            </>
          ) : activeView === 'reports' ? (
            <>
              <div className="report-period-tabs">
                <button className={reportPeriod === 'this-month' ? 'selected' : ''} onClick={() => setReportPeriod('this-month')}>This month</button>
                <button className={reportPeriod === 'last-month' ? 'selected' : ''} onClick={() => setReportPeriod('last-month')}>Last month</button>
                <button className={reportPeriod === 'all' ? 'selected' : ''} onClick={() => setReportPeriod('all')}>All time</button>
              </div>

              <div className="reports-grid">
                <div className="report-panel">
                  <div className="report-panel-header"><h3>PVs by Department</h3><p>Total payment vouchers per department{reportPeriod !== 'all' ? ` — ${reportPeriod === 'this-month' ? 'this month' : 'last month'}` : ''}</p></div>
                  {deptStats.length === 0 ? <div className="report-empty">No payment vouchers in this period.</div> : deptStats.map(([dept, stats]) => (
                    <div className="report-row" key={dept}>
                      <div className="report-row-label">{dept}</div>
                      <div className="report-row-value">
                        <div className="report-bar"><div className="report-bar-fill" style={{ width: `${(stats.count / maxDeptCount) * 100}%` }} /></div>
                        <span className="report-row-count">{stats.count}</span>
                        <span className="report-row-amount">{formatMoney(stats.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="report-panel">
                  <div className="report-panel-header"><h3>PVs by Category</h3><p>Payment vouchers grouped by type (fuel, electricity, etc.)</p></div>
                  {categoryStats.length === 0 ? <div className="report-empty">No payment vouchers in this period.</div> : categoryStats.map(([cat, stats]) => {
                    const CatIcon = pvCategoryIcons[cat as PVCategory] ?? FileText;
                    return (
                      <div className="report-row" key={cat}>
                        <div className="report-row-label"><CatIcon size={15} /> {cat}</div>
                        <div className="report-row-value">
                          <div className="report-bar"><div className="report-bar-fill" style={{ width: `${(stats.count / maxCatCount) * 100}%` }} /></div>
                          <span className="report-row-count">{stats.count}</span>
                          <span className="report-row-amount">{formatMoney(stats.total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <section className="panel requests-page" style={{ marginBottom: 17 }}>
                <div className="panel-header"><div><h2>Fuel PVs — Monthly Breakdown</h2><p>Track fuel payment vouchers across all months</p></div></div>
                {fuelMonthlyStats.length === 0 ? (
                  <div className="empty-state"><Fuel size={24} /><strong>No fuel PVs yet</strong><span>Fuel payment vouchers will appear here once created.</span></div>
                ) : (
                  <div className="table-wrap"><table><thead><tr><th>Month</th><th>Fuel PVs</th><th>Total amount</th><th><span className="sr-only">View</span></th></tr></thead><tbody>
                    {fuelMonthlyStats.map(([key, stats]) => (
                      <tr key={key}>
                        <td><strong className="person-name">{monthLabel(key)}</strong></td>
                        <td><span className={`cat-badge fuel`}>{stats.count} fuel PV{stats.count !== 1 ? 's' : ''}</span></td>
                        <td><strong className="amount">{formatMoney(stats.total)}</strong></td>
                        <td className="date-cell">{stats.count} voucher{stats.count !== 1 ? 's' : ''}</td>
                      </tr>
                    ))}
                  </tbody></table></div>
                )}
              </section>

              <section className="panel requests-page">
                <div className="panel-header"><div><h2>All Fuel Payment Vouchers</h2><p>Every fuel PV ever submitted</p></div></div>
                <RequestTable requests={requests.filter((r) => r.request_type === 'payment_voucher' && r.pv_category === 'fuel')} onOpen={setSelectedRequest} emptyMessage="No fuel payment vouchers yet." />
              </section>
            </>
          ) : activeView === 'overview' ? (
            <>
              <section className="metric-grid">
                <div className="metric-card accent-blue"><div className="metric-top"><span>Awaiting auditor</span><span className="metric-icon"><Clock3 size={18} /></span></div><strong>{pendingCount}</strong><small>New requests needing audit check</small></div>
                <div className="metric-card accent-green"><div className="metric-top"><span>Awaiting accountant</span><span className="metric-icon"><Check size={18} /></span></div><strong>{checkedCount}</strong><small>Checked by auditor, awaiting accountant</small></div>
                <div className="metric-card accent-sand"><div className="metric-top"><span>Awaiting approval</span><span className="metric-icon"><FileText size={18} /></span></div><strong>{accountantCheckedCount}</strong><small>Ready for MD/GM approval</small></div>
              </section>

              <section className="workspace-grid">
                <div className="panel recent-panel">
                  <div className="panel-header"><div><h2>Recent requests</h2><p>Latest activity in the workspace</p></div><button className="text-button" onClick={() => setActiveView('requests')}>View all <ArrowUpRight size={16} /></button></div>
                  <RequestTable requests={filteredRequests.slice(0, 6)} onOpen={setSelectedRequest} />
                </div>
                <div className="panel quick-panel">
                  <div className="panel-header"><div><h2>Start something new</h2><p>Create a request in a few steps.</p></div></div>
                  <button className="quick-action" onClick={() => { setForm({ ...initialForm, requestType: 'payment_voucher', requesterName: profile?.full_name ?? '' }); setShowNewRequest(true); }}>
                    <span className="quick-icon blue"><WalletCards size={19} /></span><span><strong>Payment voucher</strong><small>Request a payment or cash release</small></span><ArrowUpRight size={17} />
                  </button>
                  <button className="quick-action" onClick={() => { setForm({ ...initialForm, requestType: 'memorandum', requesterName: profile?.full_name ?? '' }); setShowNewRequest(true); }}>
                    <span className="quick-icon green"><FileText size={19} /></span><span><strong>Memorandum</strong><small>Send a memo for management attention</small></span><ArrowUpRight size={17} />
                  </button>
                  <div className="approval-chain">
                    <span className="chain-title">Approval chain</span>
                    <div className="chain-step"><span className="chain-num">1</span> Auditor checks</div>
                    <div className="chain-step"><span className="chain-num">2</span> Accountant verifies</div>
                    <div className="chain-step"><span className="chain-num">3</span> MD approves (final) — or GM if ≤ GHC {SMALL_AMOUNT_THRESHOLD}</div>
                    <div className="chain-step"><span className="chain-num">4</span> Accountant pays</div>
                  </div>
                </div>
              </section>
            </>
          ) : activeView === 'requests' ? (
            <section className="panel requests-page">
              <div className="list-toolbar">
                <div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..." /></div>
                <div className="filter-tabs">{(['all', 'pending', 'checked', 'accountant_checked', 'approved', 'paid', 'rejected'] as const).map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : statusLabel(item)}</button>)}</div>
              </div>
              <RequestTable requests={filteredRequests} onOpen={setSelectedRequest} emptyMessage="No requests match your search." />
            </section>
          ) : null}
        </div>
      </main>

      {showMobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setShowMobileNav(false)} />}
      {notice && <div className="toast"><Check size={17} /> {notice}</div>}
      {error && <div className="toast error-toast"><X size={17} /> {error}</div>}

      {selectedRequest && !showPrintMode && (
        <div className="modal-backdrop">
          <div className="request-modal detail-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{selectedRequest.request_number} · {selectedRequest.request_type === 'memorandum' ? 'Memorandum' : 'Payment voucher'}{selectedRequest.request_type === 'payment_voucher' && selectedRequest.pv_category !== 'general' ? ` · ${selectedRequest.pv_category}` : ''}</p>
                <h2>{selectedRequest.title}</h2>
                <p>{selectedRequest.description}</p>
              </div>
              <button className="icon-button" onClick={() => setSelectedRequest(null)} aria-label="Close"><X size={19} /></button>
            </div>
            <div className="detail-status">
              <span className={`status-pill ${selectedRequest.status}`}>{statusLabel(selectedRequest.status)}</span>
              <span>Submitted {formatDateTime(selectedRequest.created_at)}</span>
              <span>Requested by <strong>{selectedRequest.requested_by_name}</strong></span>
              {selectedRequest.request_type === 'payment_voucher' && <span className={`cat-badge ${selectedRequest.pv_category}`}>{selectedRequest.pv_category}</span>}
              {selectedRequest.amount <= SMALL_AMOUNT_THRESHOLD && <span className="status-pill approved">GM can approve (≤ GHC {SMALL_AMOUNT_THRESHOLD})</span>}
            </div>

            {selectedRequest.request_type === 'memorandum' ? (
              <div className="detail-grid">
                <div><span>To</span><strong>{selectedRequest.memo_to ?? 'Not specified'}</strong></div>
                <div><span>From</span><strong>{selectedRequest.memo_from ?? selectedRequest.requested_by_name}</strong></div>
                <div><span>Reference</span><strong>{selectedRequest.memo_reference ?? 'Not specified'}</strong></div>
                <div><span>CC</span><strong>{selectedRequest.memo_cc ?? 'Not specified'}</strong></div>
              </div>
            ) : (
              <div className="detail-grid">
                <div><span>Department</span><strong>{selectedRequest.department}</strong></div>
                <div><span>Send through to</span><strong>{selectedRequest.recipient || 'Not specified'}</strong></div>
                <div><span>Amount</span><strong>{formatMoney(selectedRequest.amount)}</strong></div>
                <div><span>Urgency</span><strong>{selectedRequest.urgency.charAt(0).toUpperCase() + selectedRequest.urgency.slice(1)}</strong></div>
              </div>
            )}

            {selectedRequest.attachment_url && (
              <div className="detail-attachment">
                <span>Attached document</span>
                <a href={selectedRequest.attachment_url} target="_blank" rel="noopener noreferrer" className="attachment-link"><Paperclip size={15} /> View proforma / invoice / receipt</a>
              </div>
            )}

            <div className="approval-trail">
              <span className="chain-title">Approval trail</span>
              <div className={`trail-step ${selectedRequest.checked_at ? 'done' : ''}`}>
                <span className="trail-icon">{selectedRequest.checked_at ? <Check size={14} /> : <Clock3 size={14} />}</span>
                <div className="trail-content"><strong>Checked by Auditor</strong>{selectedRequest.checked_by_name ? <span>{selectedRequest.checked_by_name} · {formatDateTime(selectedRequest.checked_at!)}</span> : <span className="muted">Awaiting auditor check</span>}{selectedRequest.checked_signature && <img src={selectedRequest.checked_signature} alt="Auditor signature" className="trail-signature" />}</div>
              </div>
              <div className={`trail-step ${selectedRequest.accountant_checked_at ? 'done' : ''}`}>
                <span className="trail-icon">{selectedRequest.accountant_checked_at ? <Check size={14} /> : <Clock3 size={14} />}</span>
                <div className="trail-content"><strong>Verified by Accountant</strong>{selectedRequest.accountant_checked_name ? <span>{selectedRequest.accountant_checked_name} · {formatDateTime(selectedRequest.accountant_checked_at!)}</span> : <span className="muted">Awaiting accountant verification</span>}{selectedRequest.accountant_checked_signature && <img src={selectedRequest.accountant_checked_signature} alt="Accountant signature" className="trail-signature" />}</div>
              </div>
              <div className={`trail-step ${selectedRequest.approved_at ? 'done' : selectedRequest.status === 'rejected' ? 'rejected' : ''}`}>
                <span className="trail-icon">{selectedRequest.approved_at ? <Check size={14} /> : <Clock3 size={14} />}</span>
                <div className="trail-content"><strong>{selectedRequest.status === 'rejected' ? 'Rejected' : getApprovalLabel(selectedRequest)}</strong>{selectedRequest.approved_by_name ? <span>{selectedRequest.approved_by_name} · {formatDateTime(selectedRequest.approved_at!)}</span> : <span className="muted">{selectedRequest.amount <= SMALL_AMOUNT_THRESHOLD ? 'Awaiting GM or MD approval' : 'Awaiting MD final approval'}</span>}{selectedRequest.approved_signature && <img src={selectedRequest.approved_signature} alt="Approver signature" className="trail-signature" />}</div>
              </div>
              <div className={`trail-step ${selectedRequest.paid_at ? 'done' : ''}`}>
                <span className="trail-icon">{selectedRequest.paid_at ? <Check size={14} /> : <Clock3 size={14} />}</span>
                <div className="trail-content"><strong>Paid by Accountant</strong>{selectedRequest.paid_by_name ? <span>{selectedRequest.paid_by_name} · {formatDateTime(selectedRequest.paid_at!)}</span> : <span className="muted">Awaiting payment</span>}{selectedRequest.paid_signature && <img src={selectedRequest.paid_signature} alt="Accountant signature" className="trail-signature" />}</div>
              </div>
            </div>

            <div className="detail-actions">
              <button className="secondary-button" onClick={() => setSelectedRequest(null)}>Close</button>
              {selectedRequest.status === 'pending' && canCheck(role) && <button className="secondary-button approve-button" onClick={() => setPendingAction({ request: selectedRequest, action: 'check' })}><Check size={15} /> Mark as checked (Auditor)</button>}
              {selectedRequest.status === 'checked' && canAccountantCheck(role) && <button className="secondary-button approve-button" onClick={() => setPendingAction({ request: selectedRequest, action: 'accountant_check' })}><Check size={15} /> Verify (Accountant)</button>}
              {canApproveRequest(role, selectedRequest) && <button className="secondary-button approve-button" onClick={() => setPendingAction({ request: selectedRequest, action: 'approve' })}><Check size={15} /> {selectedRequest.amount <= SMALL_AMOUNT_THRESHOLD ? 'Approve (GM/MD)' : 'Approve (MD Final)'}</button>}
              {(selectedRequest.status === 'pending' || selectedRequest.status === 'checked' || selectedRequest.status === 'accountant_checked') && canReject(role) && <button className="secondary-button reject-button" onClick={() => void advanceStatus(selectedRequest, 'reject')}><X size={15} /> Reject</button>}
              {selectedRequest.status === 'approved' && canPay(role) && <button className="secondary-button approve-button" onClick={() => setPendingAction({ request: selectedRequest, action: 'pay' })}><Check size={15} /> Mark as paid</button>}
              <button className="primary-button" onClick={() => printSingle(selectedRequest)}><Printer size={16} /> Print {selectedRequest.request_type === 'memorandum' ? 'memorandum' : 'PV'}</button>
            </div>
          </div>
        </div>
      )}

      {requestsToPrint.length > 0 && requestsToPrint.map((req, idx) => (
        <div className="print-sheet" key={req.id}>
          <div className="print-header"><img src="/photo_2026-09-23_14-50-00.jpg" alt="ALSALE" /><div><strong>{req.request_type === 'memorandum' ? 'MEMORANDUM' : 'PAYMENT VOUCHER'}</strong><span>{req.request_number}</span></div></div>
          <div className="print-title">{req.title}</div>
          {req.request_type === 'memorandum' ? (
            <>
              <div className="print-meta">
                <div><span>To</span><strong>{req.memo_to ?? ''}</strong></div>
                <div><span>From</span><strong>{req.memo_from ?? req.requested_by_name}</strong></div>
                <div><span>Date</span><strong>{formatDateTime(req.created_at)}</strong></div>
                <div><span>Reference</span><strong>{req.memo_reference ?? ''}</strong></div>
              </div>
              {req.memo_cc && <div className="print-section"><span>CC</span><p>{req.memo_cc}</p></div>}
            </>
          ) : (
            <>
              <div className="print-meta">
                <div><span>Requested by</span><strong>{req.requested_by_name}</strong></div>
                <div><span>Department</span><strong>{req.department}</strong></div>
                <div><span>Date &amp; time</span><strong>{formatDateTime(req.created_at)}</strong></div>
                <div><span>Amount</span><strong>{formatMoney(req.amount)}</strong></div>
              </div>
              {req.pv_category !== 'general' && <div className="print-section"><span>Category</span><p style={{ textTransform: 'capitalize' }}>{req.pv_category}</p></div>}
            </>
          )}
          <div className="print-section"><span>Details / Purpose</span><p>{req.description}</p></div>
          {req.request_type === 'payment_voucher' && (
            <div className="print-routing">
              <div><span>From</span><strong>{req.from_party || req.department}</strong></div>
              <div><span>Through</span><strong>{req.recipient || '____________________'}</strong></div>
              <div><span>Urgency</span><strong>{req.urgency.toUpperCase()}</strong></div>
            </div>
          )}
          {req.attachment_url && <div className="print-section"><span>Attachment</span><p>{req.attachment_url}</p></div>}
          <div className="print-signatures">
            <div>Prepared by: {req.requested_by_name}<div className="signature-line" />Signature / Date</div>
            <div>Checked by: {req.checked_by_name ?? '____________'}<div className="signature-line" />Signature / Date{req.checked_signature && <img src={req.checked_signature} alt="Auditor signature" className="print-signature-img" />}</div>
            <div>Verified by: {req.accountant_checked_name ?? '____________'}<div className="signature-line" />Signature / Date{req.accountant_checked_signature && <img src={req.accountant_checked_signature} alt="Accountant signature" className="print-signature-img" />}</div>
            <div>Approved by: {req.approved_by_name ?? '____________'}<div className="signature-line" />Signature / Date{req.approved_signature && <img src={req.approved_signature} alt="Approver signature" className="print-signature-img" />}</div>
          </div>
          {req.paid_by_name && <div className="print-paid">Paid by {req.paid_by_name} on {formatDateTime(req.paid_at!)}</div>}
          <div className="print-footer">ALSALE · Banking Machines | Elevators | ACP · Official internal record</div>
          {idx < requestsToPrint.length - 1 && <div className="print-page-break" />}
        </div>
      ))}

      {pendingAction && (
        <SignaturePad
          label={`Sign to ${pendingAction.action === 'check' ? 'confirm auditor check' : pendingAction.action === 'accountant_check' ? 'confirm accountant verification' : pendingAction.action === 'approve' ? 'approve request' : 'confirm payment'}`}
          onSave={(dataUrl) => { const req = pendingAction.request; setPendingAction(null); void advanceStatus(req, pendingAction.action, dataUrl); }}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {showNewRequest && (
        <div className="modal-backdrop">
          <div className="request-modal">
            <div className="modal-header">
              <div><p className="eyebrow">New submission</p><h2>{form.requestType === 'memorandum' ? 'Create Memorandum' : 'Create Payment Voucher'}</h2><p>{form.requestType === 'memorandum' ? 'Send a formal memo for management attention.' : 'Request a payment or cash release.'}</p></div>
              <button className="icon-button" onClick={() => setShowNewRequest(false)} aria-label="Close"><X size={19} /></button>
            </div>
            <form onSubmit={createRequest}>
              <div className="type-switch">
                <button type="button" className={form.requestType === 'payment_voucher' ? 'selected' : ''} onClick={() => setForm({ ...form, requestType: 'payment_voucher' })}><WalletCards size={17} /> Payment voucher</button>
                <button type="button" className={form.requestType === 'memorandum' ? 'selected' : ''} onClick={() => setForm({ ...form, requestType: 'memorandum' })}><FileText size={17} /> Memorandum</button>
              </div>

              {form.requestType === 'memorandum' ? (
                <div className="memo-form-grid">
                  <label className="full">Subject<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Request for departmental review" /></label>
                  <div className="memo-two-col">
                    <label>To<input value={form.memoTo} onChange={(e) => setForm({ ...form, memoTo: e.target.value })} placeholder="e.g. Managing Director" required /></label>
                    <label>From<input value={form.memoFrom} onChange={(e) => setForm({ ...form, memoFrom: e.target.value })} placeholder="e.g. Elevator Department" /></label>
                  </div>
                  <div className="memo-two-col">
                    <label>Reference<input value={form.memoReference} onChange={(e) => setForm({ ...form, memoReference: e.target.value })} placeholder="e.g. ALS/MEMO/001" /></label>
                    <label>CC<input value={form.memoCc} onChange={(e) => setForm({ ...form, memoCc: e.target.value })} placeholder="e.g. General Manager" /></label>
                  </div>
                  <label>Your name<input value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} placeholder="So we know who is submitting this" /></label>
                  <label className="full">Message / Body<textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Write the memo content..." /></label>
                  <label className="full">Priority / Urgency<select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}><option value="normal">Normal — within 3 working days</option><option value="urgent">Urgent — needs attention today</option><option value="emergency">Emergency — immediate attention</option></select></label>
                </div>
              ) : (
                <>
                  <div className="form-grid">
                    <label className="full">Subject<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Payment for servicing of machines" /></label>
                    <label>Your name<input value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} placeholder="So we know who is requesting this" /></label>
                    <label>Amount <span>(GHC)</span><input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
                    <label>Department<select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>{departments.map((d) => <option key={d}>{d}</option>)}</select></label>
                    <label>Category<select value={form.pvCategory} onChange={(e) => setForm({ ...form, pvCategory: e.target.value as PVCategory })}>{pvCategoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
                    <label>Send through to<input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="e.g. Managing Director" /></label>
                    <label className="full">Details<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain what this request is for..." /></label>
                    <label className="full">Urgency<select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}><option value="normal">Normal — within 3 working days</option><option value="urgent">Urgent — needs attention today</option><option value="emergency">Emergency — immediate attention</option></select></label>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <label style={{ color: 'var(--form-label)', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8 }}>Attach proforma / invoice / receipt (optional)</label>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setForm({ ...form, attachmentFile: file });
                    }} />
                    {form.attachmentFile ? (
                      <div className="file-upload-area has-file" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip size={22} className="file-upload-icon" style={{ color: 'var(--success)' }} />
                        <span className="file-upload-name">{form.attachmentFile.name}</span>
                        <button type="button" className="file-upload-remove" onClick={(e) => { e.stopPropagation(); setForm({ ...form, attachmentFile: null }); if (fileInputRef.current) fileInputRef.current.value = ''; }}><X size={12} /> Remove</button>
                      </div>
                    ) : (
                      <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip size={22} className="file-upload-icon" />
                        <span className="file-upload-text">Click to upload a proforma, invoice, or receipt (image or PDF)</span>
                      </div>
                    )}
                  </div>

                  <div className="form-grid" style={{ marginTop: 12 }}>
                    <label className="full" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {Number(form.amount) > 0 && Number(form.amount) <= SMALL_AMOUNT_THRESHOLD
                        ? `Amount ≤ GHC ${SMALL_AMOUNT_THRESHOLD}: General Manager can approve after auditor + accountant check.`
                        : Number(form.amount) > SMALL_AMOUNT_THRESHOLD
                        ? `Amount > GHC ${SMALL_AMOUNT_THRESHOLD}: MD must give final approval after auditor + accountant check.`
                        : `Approval routing depends on the amount (threshold: GHC ${SMALL_AMOUNT_THRESHOLD}).`}
                    </label>
                  </div>
                </>
              )}

              {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
              <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setShowNewRequest(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Submitting...' : 'Submit for approval'} <ArrowUpRight size={16} /></button></div>
            </form>
          </div>
        </div>
      )}

      {showChangePw && (
        <div className="modal-backdrop">
          <div className="change-pw-modal">
            <div className="modal-header">
              <div><p className="eyebrow">Security</p><h2>Change password</h2><p>Enter your current password, then choose a new one.</p></div>
              <button className="icon-button" onClick={() => { setShowChangePw(false); setChangePwError(''); setChangePwSuccess(''); setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }} aria-label="Close"><X size={19} /></button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="change-pw-field"><label>Current password</label><input type="password" value={changePwForm.oldPassword} onChange={(e) => setChangePwForm({ ...changePwForm, oldPassword: e.target.value })} placeholder="Enter your current password" required /></div>
              <div className="change-pw-field"><label>New password</label><input type="password" value={changePwForm.newPassword} onChange={(e) => setChangePwForm({ ...changePwForm, newPassword: e.target.value })} placeholder="At least 6 characters" required minLength={6} /></div>
              <div className="change-pw-field"><label>Confirm new password</label><input type="password" value={changePwForm.confirmPassword} onChange={(e) => setChangePwForm({ ...changePwForm, confirmPassword: e.target.value })} placeholder="Re-enter your new password" required minLength={6} /></div>
              {changePwError && <p className="form-error">{changePwError}</p>}
              {changePwSuccess && <p className="form-error" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>{changePwSuccess}</p>}
              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={() => { setShowChangePw(false); setChangePwError(''); setChangePwSuccess(''); setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</button>
                <button type="submit" className="primary-button" disabled={changePwBusy}><KeyRound size={16} /> {changePwBusy ? 'Updating...' : 'Update password'}</button>
              </div>
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
          <td><button className="request-cell request-cell-button" onClick={() => onOpen(request)}><span className={`request-type ${request.request_type === 'memorandum' ? 'memo' : 'voucher'}`}>{request.request_type === 'memorandum' ? <FileText size={15} /> : <WalletCards size={15} />}</span><span><strong>{request.title}</strong><small>{request.request_number} · {request.request_type === 'memorandum' ? 'Memorandum' : 'Payment voucher'}{request.request_type === 'payment_voucher' && request.pv_category !== 'general' ? ` · ${request.pv_category}` : ''}{request.attachment_url ? ' · 📎' : ''}</small></span></button></td>
          <td><span className="person-name">{request.requested_by_name}</span><small className="department">{request.department}</small></td>
          <td><strong className="amount">{formatMoney(request.amount)}</strong></td>
          <td><span className={`status-pill ${request.status}`}>{statusLabel(request.status)}</span></td>
          <td className="date-cell">{formatDateTime(request.created_at)}</td>
          <td><button className="row-menu" aria-label={`Open ${request.request_number}`} onClick={() => onOpen(request)}><ArrowUpRight size={16} /></button></td>
        </tr>
      ))}
    </tbody></table></div>
  );
}

function PVTable({ requests, onOpen, printSelection, onTogglePrint, emptyMessage }: { requests: ApprovalRequest[]; onOpen: (request: ApprovalRequest) => void; printSelection: Set<string>; onTogglePrint: (id: string) => void; emptyMessage?: string }) {
  if (!requests.length) return <div className="empty-state"><FileText size={24} /><strong>{emptyMessage}</strong><span>Approved payment vouchers will appear here.</span></div>;
  return (
    <div className="table-wrap"><table><thead><tr><th style={{ width: 40 }}><span className="sr-only">Select</span></th><th>Request</th><th>Requested by</th><th>Amount</th><th>Category</th><th>Status</th><th>Date</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
      {requests.map((request) => (
        <tr key={request.id}>
          <td><input type="checkbox" checked={printSelection.has(request.id)} onChange={() => onTogglePrint(request.id)} /></td>
          <td><button className="request-cell request-cell-button" onClick={() => onOpen(request)}><span className={`request-type ${request.request_type === 'memorandum' ? 'memo' : 'voucher'}`}>{request.request_type === 'memorandum' ? <FileText size={15} /> : <WalletCards size={15} />}</span><span><strong>{request.title}</strong><small>{request.request_number}{request.attachment_url ? ' · 📎' : ''}</small></span></button></td>
          <td><span className="person-name">{request.requested_by_name}</span><small className="department">{request.department}</small></td>
          <td><strong className="amount">{formatMoney(request.amount)}</strong></td>
          <td><span className={`cat-badge ${request.pv_category}`}>{request.pv_category}</span></td>
          <td><span className={`status-pill ${request.status}`}>{statusLabel(request.status)}</span></td>
          <td className="date-cell">{formatDateTime(request.created_at)}</td>
          <td><button className="row-menu" aria-label={`Open ${request.request_number}`} onClick={() => onOpen(request)}><ArrowUpRight size={16} /></button></td>
        </tr>
      ))}
    </tbody></table></div>
  );
}

export default App;
