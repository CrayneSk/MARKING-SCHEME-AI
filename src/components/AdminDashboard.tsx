import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import { UserProfile, PlanType } from '../types';
import {
  Users,
  Shield,
  Activity,
  CreditCard,
  Search,
  CheckCircle2,
  RefreshCw,
  Award,
  AlertTriangle,
  Mail,
  Calendar,
  Layers,
  Smartphone,
  MessageCircle,
  ExternalLink,
  Zap,
  Crown
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Tabs: 'all' | 'flow' | 'full' | 'focus'
  const [activeTab, setActiveTab] = useState<'all' | 'flow' | 'full' | 'focus'>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const loadedUsers: UserProfile[] = [];
      userSnapshot.forEach((d) => {
        loadedUsers.push(d.data() as UserProfile);
      });
      setUsersList(loadedUsers);
    } catch (err: any) {
      console.error('Admin data fetch error:', err);
      setStatusMessage('Error loading user accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdatePlan = async (userUid: string, newPlan: PlanType) => {
    try {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        plan: newPlan,
        generationsUsed: 0,
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setStatusMessage(`User successfully activated on ${newPlan} plan.`);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === userUid ? { ...u, plan: newPlan, generationsUsed: 0 } : u))
      );
    } catch (err: any) {
      console.error('Update error:', err);
      setStatusMessage('Failed to update plan: ' + err.message);
    }
  };

  const handleResetUsage = async (userUid: string) => {
    try {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        generationsUsed: 0,
      });
      setStatusMessage(`User generation count reset to 0.`);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === userUid ? { ...u, generationsUsed: 0 } : u))
      );
    } catch (err: any) {
      setStatusMessage('Failed to reset usage: ' + err.message);
    }
  };

  // Separate subscribers counts
  const flowSubscribersList = usersList.filter((u) => u.plan === 'Flow');
  const fullSubscribersList = usersList.filter((u) => u.plan === 'Full');
  const focusUsersList = usersList.filter((u) => !u.plan || u.plan === 'Focus');

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.uid && u.uid.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'flow') return u.plan === 'Flow';
    if (activeTab === 'full') return u.plan === 'Full';
    if (activeTab === 'focus') return !u.plan || u.plan === 'Focus';
    return true; // 'all'
  });

  const totalGenerations = usersList.reduce((acc, u) => acc + (u.generationsUsed || 0), 0);

  return (
    <div
      id="admin-dashboard-container"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-6xl bg-[#0F172A] text-slate-100 rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-[#0E1729] to-slate-950 p-6 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display tracking-tight text-white">
                  Marking Scheme Generator • Administrator Command
                </h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-light">
                Monitoring Zimbabwean teachers, emails, system usage, and EcoCash activations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="admin-refresh-data"
              onClick={fetchAdminData}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              id="admin-modal-close"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl font-light p-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Metrics Banner with Explicit Separation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          <div className="bg-[#0B1222] p-3.5 rounded-xl border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>All Teachers</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-display text-white">{usersList.length}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Total profiles</span>
          </div>

          <div
            onClick={() => setActiveTab('flow')}
            className={`bg-[#0B1222] p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'flow' ? 'border-blue-500 shadow-sm shadow-blue-500/30' : 'border-slate-800 hover:border-blue-700/50'
            }`}
          >
            <div className="flex items-center justify-between text-blue-400 text-xs mb-1 font-semibold">
              <span>Flow Subscribers</span>
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold font-display text-blue-300">{flowSubscribersList.length}</p>
            <span className="text-[11px] text-blue-400/80 mt-0.5 block font-mono">$1.66 / mo tier</span>
          </div>

          <div
            onClick={() => setActiveTab('full')}
            className={`bg-[#0B1222] p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'full' ? 'border-amber-500 shadow-sm shadow-amber-500/30' : 'border-slate-800 hover:border-amber-700/50'
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 text-xs mb-1 font-semibold">
              <span>Full Subscribers</span>
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-display text-amber-300">{fullSubscribersList.length}</p>
            <span className="text-[11px] text-amber-400/80 mt-0.5 block font-mono">$5.33 / mo tier (Max)</span>
          </div>

          <div className="bg-[#0B1222] p-3.5 rounded-xl border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Exam Schemes</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-display text-white">{totalGenerations}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Total evaluations</span>
          </div>

          <div className="bg-[#0B1222] p-3.5 rounded-xl border border-slate-800 shadow-xs col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>EcoCash Receiver</span>
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-mono font-bold text-emerald-400 truncate">0788849965</p>
            <span className="text-[10px] text-slate-400 mt-0.5 block truncate">CRAIN TINOMUDA SAKALA</span>
          </div>
        </div>

        {/* Alert */}
        {statusMessage && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-amber-400 font-bold hover:underline text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Subscriber Tab Navigation & Search */}
        <div className="p-4 bg-[#0B1222] border-b border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
          {/* Explicit Tabs to separate Flow and Full subscribers */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              id="admin-tab-all"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Teachers ({usersList.length})
            </button>

            <button
              type="button"
              id="admin-tab-flow"
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'flow'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-blue-300 hover:bg-blue-950/50 border border-blue-900/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Flow Subscribers ({flowSubscribersList.length})
            </button>

            <button
              type="button"
              id="admin-tab-full"
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'full'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-amber-300 hover:bg-amber-950/50 border border-amber-900/50'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Full Subscribers ({fullSubscribersList.length})
            </button>

            <button
              type="button"
              id="admin-tab-focus"
              onClick={() => setActiveTab('focus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'focus'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Free Focus ({focusUsersList.length})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              id="admin-search-teachers"
              type="text"
              placeholder="Search teacher emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 outline-none focus:border-amber-400 font-mono"
            />
          </div>
        </div>

        {/* Users Table with Explicit Emails Displayed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-400" />
              <p className="text-xs font-medium">Fetching teacher accounts...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No teacher accounts found in this view.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Teacher Email (Direct)</th>
                    <th className="py-3 px-4">Package Plan</th>
                    <th className="py-3 px-4">Usage & Quotas</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#0B1222]">
                  {filteredUsers.map((u) => {
                    const isPaid = u.plan === 'Flow' || u.plan === 'Full';
                    const quotaUsed = u.generationsUsed || 0;
                    const freeLimit = u.freeGenerationsLimit || 1;

                    return (
                      <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                        {/* Direct visible email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-500/20">
                              {(u.displayName || u.email || 'T')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="font-mono text-amber-200">{u.email}</span>
                              </p>
                              <p className="text-slate-500 text-[11px]">{u.displayName || 'Zimbabwean Educator'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              u.plan === 'Full'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : u.plan === 'Flow'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {u.plan === 'Full' && <Crown className="w-3 h-3 text-amber-400" />}
                            {u.plan === 'Flow' && <Zap className="w-3 h-3 text-blue-400" />}
                            {u.plan || 'Focus'}
                            {u.billingCycle && ` (${u.billingCycle})`}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isPaid ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Unlimited ({quotaUsed} made)
                            </span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 font-mono">
                                <span className={`${quotaUsed >= freeLimit ? 'text-rose-400' : 'text-slate-300'}`}>
                                  {quotaUsed} / {freeLimit} free used
                                </span>
                                {quotaUsed >= freeLimit && (
                                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                                    Capped
                                  </span>
                                )}
                              </div>
                              <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${quotaUsed >= freeLimit ? 'bg-rose-500' : 'bg-amber-400'}`}
                                  style={{ width: `${Math.min(100, (quotaUsed / freeLimit) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {u.role || 'teacher'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {u.plan !== 'Full' && (
                              <button
                                id={`grant-full-${u.uid}`}
                                onClick={() => handleUpdatePlan(u.uid, 'Full')}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] uppercase tracking-wider transition-colors"
                                title="Activate Full Plan"
                              >
                                Activate Full
                              </button>
                            )}
                            {u.plan !== 'Flow' && (
                              <button
                                id={`grant-flow-${u.uid}`}
                                onClick={() => handleUpdatePlan(u.uid, 'Flow')}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold transition-colors"
                                title="Activate Flow Plan"
                              >
                                Activate Flow
                              </button>
                            )}
                            <button
                              id={`reset-quota-${u.uid}`}
                              onClick={() => handleResetUsage(u.uid)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700 transition-colors"
                              title="Reset Quota"
                            >
                              Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Official Examination Assessment System</span>
          <span className="font-medium text-slate-400 font-display">Administrator Management</span>
        </div>

      </div>
    </div>
  );
};
