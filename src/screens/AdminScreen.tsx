import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Users, Key, Plus, Trash2, Check, X, Search, Activity, UserCog, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  status: 'Basick' | 'pro' | 'Band';
  createdAt: any;
  photoURL?: string;
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'apikeys'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: UserData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        userList.push({
          id: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          status: data.status || 'Basick',
          createdAt: data.createdAt,
          photoURL: data.photoURL || ''
        });
      });
      setUsers(userList);
    }, (error) => {
      console.error("Firestore error loading users in AdminScreen:", error);
    });
    return () => unsubscribe();
  }, []);

  // Fetch settings (admins and apikeys)
  useEffect(() => {
    const adminsRef = doc(db, 'settings', 'admins');
    const apikeysRef = doc(db, 'settings', 'apikeys');

    const unsubAdmins = onSnapshot(adminsRef, (docSnap) => {
      if (docSnap.exists()) {
        setAdmins(docSnap.data().emails || []);
      } else {
        // Initialize if not exists
        setDoc(adminsRef, { emails: ['ashtosh.biswas.2026@gmail.com'] }).catch((error) => {
          console.error("Firestore error writing admins initialize in AdminScreen:", error);
        });
      }
    }, (error) => {
      console.error("Firestore error loading admins in AdminScreen:", error);
    });

    const unsubApiKeys = onSnapshot(apikeysRef, (docSnap) => {
      if (docSnap.exists()) {
        setApiKeys(docSnap.data().keys || []);
      } else {
        setDoc(apikeysRef, { keys: [] }).catch((error) => {
          console.error("Firestore error writing apikeys initialize in AdminScreen:", error);
        });
      }
    }, (error) => {
      console.error("Firestore error loading apikeys in AdminScreen:", error);
    });

    return () => {
      unsubAdmins();
      unsubApiKeys();
    };
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || admins.some(email => email.trim().toLowerCase() === newAdminEmail.trim().toLowerCase())) return;
    
    try {
      const updatedAdmins = [...admins, newAdminEmail.trim().toLowerCase()];
      await updateDoc(doc(db, 'settings', 'admins'), {
        emails: updatedAdmins
      });
      setNewAdminEmail('');
    } catch (error) {
      console.error("Error adding admin:", error);
    }
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    if (emailToRemove === 'ashtosh.biswas.2026@gmail.com' || emailToRemove === 'ashtosh.biswas.2026@gmail.com'.trim().toLowerCase()) return; // Protect super admin
    try {
      const updatedAdmins = admins.filter(email => email.trim().toLowerCase() !== emailToRemove.trim().toLowerCase());
      await updateDoc(doc(db, 'settings', 'admins'), {
        emails: updatedAdmins
      });
    } catch (error) {
      console.error("Error removing admin:", error);
    }
  };

  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim() || apiKeys.some(key => key.trim() === newApiKey.trim())) return;
    
    try {
      const updatedKeys = [...apiKeys, newApiKey.trim()];
      await updateDoc(doc(db, 'settings', 'apikeys'), {
        keys: updatedKeys
      });
      setNewApiKey('');
    } catch (error) {
      console.error("Error adding API key:", error);
    }
  };

  const handleRemoveApiKey = async (keyToRemove: string) => {
    try {
      const updatedKeys = apiKeys.filter(key => key !== keyToRemove);
      await updateDoc(doc(db, 'settings', 'apikeys'), {
        keys: updatedKeys
      });
    } catch (error) {
      console.error("Error removing API key:", error);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pro Users', value: users.filter(u => u.status === 'pro').length, icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Admins', value: admins.length, icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'API Keys', value: apiKeys.length, icon: Key, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] p-4 md:p-8 overflow-y-auto relative z-10 w-full mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          {/* Decorative blurred blob */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-[80px] -z-10 pointer-events-none" />
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <UserCog size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-[var(--text)] tracking-tight">Admin Console</h1>
              <p className="text-[var(--text-muted)] mt-1.5 text-lg font-light">Centralized security and user management</p>
            </div>
          </div>
        </div>

        {/* Stats Grid - Bento Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, index) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              className="relative overflow-hidden bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[24px] p-6 shadow-sm hover:shadow-[var(--shadow-premium)] hover:-translate-y-1 transition-all duration-300"
            >
              {/* Subtle background glow */}
              <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full blur-[40px] opacity-20 ${stat.bg.replace('/10', '')}`} />
              
              <div className="flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center ${stat.bg} ${stat.color} border border-current/10 shadow-sm`}>
                  <stat.icon size={26} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-[var(--text)] tracking-tight mt-0.5">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[32px] shadow-[var(--shadow-premium)] overflow-hidden flex flex-col min-h-[600px] relative"
        >
          {/* Subtle noise texture or gradient could go here */}
          
          {/* Tabs */}
          <div className="flex gap-2 p-3 border-b border-[var(--border)] bg-[var(--bg)]/30 overflow-x-auto hide-scrollbar">
            {[
              { id: 'users', label: 'User Directory', icon: Users },
              { id: 'admins', label: 'Access Control', icon: Shield },
              { id: 'apikeys', label: 'Integrations', icon: Database },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3.5 rounded-[18px] font-medium transition-all duration-300 flex items-center gap-3 whitespace-nowrap relative ${
                  activeTab === tab.id 
                    ? 'text-primary border border-primary/20 shadow-sm' 
                    : 'text-[var(--text-muted)] hover:bg-[var(--card)] hover:text-[var(--text)] border border-transparent'
                }`}
              >
                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeAdminTab" 
                    className="absolute inset-0 bg-primary/10 backdrop-blur-md rounded-[18px] -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-8 flex-1 overflow-x-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2">
                      <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Registered Users</h2>
                      <div className="relative max-w-sm w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input 
                          type="text" 
                          placeholder="Search by name or email..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-[var(--bg)]/50 backdrop-blur-sm border border-[var(--glass-border)] rounded-[18px] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="border border-[var(--glass-border)] rounded-[24px] overflow-hidden bg-[var(--bg)]/30 backdrop-blur-md shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--card)]/50">
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase">User Identity</th>
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase">Status Tier</th>
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase">Joined Date</th>
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase text-right">Access Controls</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map(user => (
                              <tr key={user.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card)]/80 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0 shadow-sm border border-primary/10 group-hover:scale-105 transition-transform">
                                      {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        (user.displayName || user.email).charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-[var(--text)] font-semibold text-base">{user.displayName || 'Unnamed User'}</p>
                                      <p className="text-[var(--text-muted)] text-sm opacity-80">{user.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border tracking-wide uppercase shadow-sm ${
                                    user.status === 'pro' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5' :
                                    user.status === 'Band' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/5' :
                                    'bg-gray-500/10 text-[var(--text-muted)] border-gray-500/20 shadow-gray-500/5'
                                  }`}>
                                    {user.status === 'Band' ? 'Restricted' : user.status === 'pro' ? 'Pro Tier' : 'Basic'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-[var(--text-muted)] font-medium text-sm">
                                  {user.createdAt?.toDate ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(user.createdAt.toDate())) : 'Unknown'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <select
                                    value={user.status}
                                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                    className="bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text)] text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer hover:bg-[var(--card)] transition-all shadow-sm pr-8 relative"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                                  >
                                    <option value="Basick">Set Basic</option>
                                    <option value="pro">Upgrade Pro</option>
                                    <option value="Band">Revoke Access</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-16 text-center">
                                  <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                    <div className="w-20 h-20 bg-[var(--bg)] rounded-full flex items-center justify-center mb-5 border border-[var(--border)] shadow-sm">
                                      <Users size={32} className="opacity-40" />
                                    </div>
                                    <p className="text-xl font-semibold text-[var(--text)]">No identities matches</p>
                                    <p className="text-sm mt-2 opacity-80 max-w-sm mx-auto">We couldn't find any user profiles matching your search criteria. Please try another query.</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admins Tab */}
                {activeTab === 'admins' && (
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-[var(--bg)]/50 backdrop-blur-sm border border-[var(--glass-border)] rounded-[24px] p-8 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] -z-10" />
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-inner flex items-center justify-center text-primary border border-primary/20">
                          <Shield size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Add Administrator</h2>
                          <p className="text-sm text-[var(--text-muted)] mt-1 opacity-80">Grant admin panel access to a user via their email address.</p>
                        </div>
                      </div>
                      
                      <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-4 mt-8">
                        <div className="relative flex-1 group">
                          <input
                            type="email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            placeholder="Enter Google account email..."
                            required
                            className="w-full bg-[var(--card)]/80 backdrop-blur-sm border border-[var(--border)] text-[var(--text)] rounded-[16px] pl-5 pr-4 py-4 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner group-hover:border-[var(--text-muted)]/30"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!newAdminEmail.trim()}
                          className="bg-primary text-white px-8 py-4 rounded-[16px] font-semibold tracking-wide hover:bg-primary-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <Plus size={20} strokeWidth={2.5} />
                          Secure Access
                        </button>
                      </form>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text)] mb-4 px-2">Authorized Administrators</h3>
                      <div className="border border-[var(--glass-border)] rounded-[24px] overflow-hidden bg-[var(--bg)]/30 backdrop-blur-md shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--card)]/50">
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase">Admin Identity</th>
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase w-32 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admins.map(email => (
                              <tr key={email} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card)]/80 transition-colors group">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm shadow-sm border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                      {email.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[var(--text)] font-medium text-base">{email}</span>
                                    {email === 'ashtosh.biswas.2026@gmail.com' && (
                                      <span className="ml-3 text-[10px] uppercase tracking-widest bg-gradient-to-r from-primary to-purple-500 text-white px-3 py-1 rounded-full font-bold shadow-md shadow-primary/20">Super Admin</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  {email !== 'ashtosh.biswas.2026@gmail.com' ? (
                                    <button
                                      onClick={() => handleRemoveAdmin(email)}
                                      className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-[12px] transition-colors inline-flex border border-transparent hover:border-red-500/20 group-hover:shadow-sm"
                                      title="Revoke Secure Access"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  ) : (
                                    <span className="text-xs font-medium text-[var(--text-muted)] opacity-70 italic px-4">Protected</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Keys Tab */}
                {activeTab === 'apikeys' && (
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-[var(--bg)]/50 backdrop-blur-sm border border-[var(--glass-border)] rounded-[24px] p-8 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[60px] -z-10" />
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/10 shadow-inner flex items-center justify-center text-orange-500 border border-orange-500/20">
                          <Key size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">System Integrations</h2>
                          <p className="text-sm text-[var(--text-muted)] mt-1 opacity-80">Add your platform API keys. The system routes through the first available active key.</p>
                        </div>
                      </div>
                      
                      <form onSubmit={handleAddApiKey} className="flex flex-col sm:flex-row gap-4 mt-8">
                        <div className="relative flex-1 group">
                          <input
                            type="text"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder="e.g. gsk_..."
                            required
                            className="w-full bg-[var(--card)]/80 backdrop-blur-sm border border-[var(--border)] text-[var(--text)] rounded-[16px] pl-5 pr-4 py-4 focus:outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all font-mono shadow-inner group-hover:border-[var(--text-muted)]/30"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!newApiKey.trim()}
                          className="bg-orange-500 text-white px-8 py-4 rounded-[16px] font-semibold tracking-wide hover:bg-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <Plus size={20} strokeWidth={2.5} />
                          Integrate
                        </button>
                      </form>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text)] mb-4 px-2">Configured Cloud Keys</h3>
                      <div className="border border-[var(--glass-border)] rounded-[24px] overflow-hidden bg-[var(--bg)]/30 backdrop-blur-md shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--card)]/50">
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase">Key Hash Signature</th>
                              <th className="px-6 py-5 font-semibold text-[var(--text-muted)] text-sm tracking-wide uppercase w-32 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apiKeys.map((key, index) => (
                              <tr key={index} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card)]/80 transition-colors group">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-4">
                                    <code className="bg-[var(--bg)] shadow-inner border border-[var(--border)] px-4 py-2 rounded-xl text-[var(--text)] text-sm font-mono tracking-wider font-medium">
                                      {key.substring(0, 8)}<span className="opacity-40">••••••••••••</span>{key.substring(key.length - 4)}
                                    </code>
                                    {index === 0 && (
                                      <span className="text-[10px] uppercase tracking-widest bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse relative">
                                          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
                                        </span>
                                        Active
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <button
                                    onClick={() => handleRemoveApiKey(key)}
                                    className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-[12px] transition-colors inline-flex border border-transparent hover:border-red-500/20 group-hover:shadow-sm"
                                    title="Revoke System Key"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {apiKeys.length === 0 && (
                              <tr>
                                <td colSpan={2} className="p-12 text-center">
                                  <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                    <Key size={48} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No API keys saved</p>
                                    <p className="text-sm mt-1">The app is currently using the default environment key.</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
