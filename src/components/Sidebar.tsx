import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, LayoutDashboard, Settings, Sparkles, X, Plus, MessageCircle, Pencil, Trash2, Check, Shield, History, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Chat {
  id: string;
  title: string;
  updatedAt: Date;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  user: FirebaseUser;
  onUpgradeClick?: () => void;
  isAdmin?: boolean;
  isFocusMode?: boolean;
}

export default function Sidebar({ isOpen, onClose, currentScreen, setCurrentScreen, currentChatId, setCurrentChatId, user, onUpgradeClick, isAdmin, isFocusMode = false }: SidebarProps) {
  const { t } = useLanguage();
  const [chats, setChats] = useState<Chat[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, `users/${user.uid}/chats`), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        chatList.push({
          id: doc.id,
          title: data.title || 'New Chat',
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
        });
      });
      setChats(chatList);
    }, (error) => {
      console.error("Firestore error loading chats:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingChatId]);

  const menuItems = [
    { id: 'dashboard', label: t.aiTools, icon: <LayoutDashboard size={20} /> },
    { id: 'settings', label: t.settings, icon: <Settings size={20} /> },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: <Shield size={20} /> });
  }

  const handleNewChat = () => {
    setCurrentChatId(null);
    setCurrentScreen('chat');
    if (window.innerWidth < 768) onClose();
  };

  const handleChatClick = (chatId: string) => {
    if (editingChatId === chatId) return;
    setCurrentChatId(chatId);
    setCurrentScreen('chat');
    if (window.innerWidth < 768) onClose();
  };

  const startEditing = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const saveEdit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (editingChatId && editTitle.trim()) {
      try {
        await updateDoc(doc(db, `users/${user.uid}/chats`, editingChatId), {
          title: editTitle.trim()
        });
      } catch (error) {
        console.error("Error updating chat title:", error);
      }
    }
    setEditingChatId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  const confirmDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChatToDelete(chatId);
  };

  const executeDelete = async () => {
    if (!chatToDelete) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/chats`, chatToDelete));
      if (currentChatId === chatToDelete) {
        setCurrentChatId(null);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
    setChatToDelete(null);
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 md:w-[280px] bg-[var(--sidebar)]/95 backdrop-blur-3xl border-r border-[var(--glass-border)] transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0 shadow-2xl shadow-black/20' : '-translate-x-full'
        } ${isFocusMode ? 'md:-translate-x-full md:fixed' : 'md:translate-x-0 md:static'}`}
      >
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Subtle dynamic background gradient inside sidebar */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-[60px] pointer-events-none -z-10" />

          {/* Main Logo Header */}
          <div className="p-5 flex items-center justify-between border-b border-[var(--glass-border)] md:border-none relative">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Nexara AI" className="w-8 h-8 object-cover rounded-xl drop-shadow-md border border-[var(--glass-border)]" />
              <span className="font-display font-semibold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--text)] to-[var(--text-muted)]">Nexara AI</span>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-[var(--text-muted)] hover:text-primary rounded-[10px] hover:bg-[var(--hover)] transition-all active:scale-95">
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Header Action */}
          <div className="px-5 pb-3">
            <button
              onClick={() => {
                setCurrentChatId(null);
                setCurrentScreen('chat');
                if (window.innerWidth < 768) onClose();
              }}
              className="group relative w-full flex items-center justify-between gap-2 px-4 py-3 bg-[var(--card)] hover:bg-transparent rounded-xl transition-all duration-300 cursor-pointer shadow-sm shadow-primary/5 active:scale-[0.98] border border-[var(--glass-border)] hover:border-primary/50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-center gap-2.5 font-medium text-[var(--text)] relative z-10 group-hover:text-primary transition-colors">
                <Sparkles size={16} strokeWidth={2.5} className="group-hover:animate-pulse" />
                <span className="text-sm font-semibold tracking-tight">{t.newChat || 'New Chat'}</span>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--text-muted)] font-mono border border-[var(--glass-border)]">⌘K</kbd>
                <Plus size={18} strokeWidth={2.5} className="text-primary" />
              </div>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-5 mb-2">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentScreen(item.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group w-full relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-sm font-medium overflow-hidden ${
                    currentScreen === item.id
                      ? 'text-primary bg-primary/10 shadow-sm border border-primary/20'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] border border-transparent'
                  }`}
                >
                  {currentScreen === item.id && (
                    <motion.div layoutId="active-nav-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-gradient-to-b from-indigo-500 to-primary rounded-r-lg shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  )}
                  {currentScreen === item.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50 pointer-events-none" />
                  )}
                  <div className={`relative z-10 flex items-center gap-3 w-full transition-transform duration-300 ${currentScreen !== item.id && 'group-hover:translate-x-1'}`}>
                    <div className={`${currentScreen === item.id ? 'text-primary' : 'opacity-70 group-hover:opacity-100'}`}>
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-1 mt-2">
              <div className="px-3 text-[11px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-3 opacity-70 flex items-center gap-2">
                <History size={12} />
                {t.history}
              </div>

              <div className="px-3 mb-3">
                <div className="relative group/search">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within/search:text-primary transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search history..."
                    className="w-full bg-[var(--hover)] text-[var(--text)] text-sm rounded-xl pl-9 pr-3 py-2 border border-transparent focus:border-primary/30 focus:bg-[var(--card)] focus:outline-none focus:shadow-sm focus:shadow-primary/5 transition-all placeholder:text-[var(--text-muted)]/70"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat.id)}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 text-sm cursor-pointer ${
                      currentScreen === 'chat' && currentChatId === chat.id
                        ? 'bg-[var(--hover)] text-[var(--text)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={() => saveEdit()}
                          className="flex-1 min-w-0 bg-transparent border-b border-primary focus:outline-none text-[var(--text)] py-0 h-6 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate text-left text-sm">{chat.title}</span>
                      )}
                    </div>
                    
                    {editingChatId === chat.id ? (
                      <button
                        onClick={(e) => saveEdit(e)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors ml-1"
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <button
                          onClick={(e) => startEditing(e, chat)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => confirmDelete(e, chat.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Footer */}
          <footer className="p-4 border-t border-[var(--glass-border)] bg-[var(--sidebar)]/50 backdrop-blur-md">
            <div className="relative overflow-hidden rounded-[14px] p-4 border border-[var(--glass-border)] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 cursor-pointer hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 group" onClick={onUpgradeClick}>
              {/* Animated glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000 -skew-x-12" />
              
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
                <Sparkles size={48} className="text-primary" />
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-300">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-[var(--text)] text-sm font-bold tracking-tight">Upgrade to Pro</div>
                  <div className="text-primary/80 text-[11px] font-bold uppercase tracking-wider mt-0.5">Unlock Next-Gen AI</div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {chatToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl p-6 max-w-xs w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[40px] rounded-full pointer-events-none -mr-16 -mt-16" />
              
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4 relative z-10 mx-auto">
                 <Trash2 size={24} />
              </div>
              
              <h3 className="text-xl font-display font-bold text-[var(--text)] mb-2 text-center relative z-10">Delete Chat?</h3>
              <p className="text-[var(--text-muted)] mb-6 text-sm text-center relative z-10">
                Are you sure? This conversation will be lost forever in the digital void.
              </p>
              <div className="flex flex-col gap-2 relative z-10">
                <button
                  onClick={executeDelete}
                  className="w-full py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-[0.98]"
                >
                  Yes, delete it
                </button>
                <button
                  onClick={() => setChatToDelete(null)}
                  className="w-full py-3 rounded-xl font-semibold text-[var(--text)] hover:bg-[var(--hover)] transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
