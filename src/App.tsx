import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatScreen from './screens/ChatScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/AdminScreen';
import UpgradeModal from './components/UpgradeModal';
import { Plus, AlertCircle, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useLanguage } from './context/LanguageContext';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('chat');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState<'Basick' | 'pro' | 'Band'>('Basick');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              email: currentUser.email,
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              status: 'Basick',
              createdAt: new Date()
            }, { merge: true });
          }
        } catch (error) {
          console.error("Firestore user fetch error (rules may not be configured):", error);
        }
        
        // Listen to user status changes
        const unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserStatus(snap.data().status || 'Basick');
          }
        }, (error) => {
          console.error("Firestore user listen error:", error);
        });

        // Check if admin
        const adminsRef = doc(db, 'settings', 'admins');
        const unsubAdmins = onSnapshot(adminsRef, (snap) => {
          if (snap.exists()) {
            const emails = snap.data().emails || [];
            setIsAdmin(emails.includes(currentUser.email));
          } else {
            // If settings/admins doesn't exist, the default is the specific email
            setIsAdmin(currentUser.email === 'ashtosh.biswas.2026@gmail.com');
          }
        }, (error) => {
          // Fallback to default admin check if permission denied
          console.warn("Could not read admins list, falling back to default admin.", error);
          setIsAdmin(currentUser.email === 'ashtosh.biswas.2026@gmail.com');
        });

        setLoading(false);
        return () => {
          unsubUser();
          unsubAdmins();
        };
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Global Keyboard Shortcuts (Cmd/Ctrl + K, Esc)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K => Open new chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCurrentChatId(null);
        setInitialPrompt('');
        setCurrentScreen('chat');
        setTimeout(() => {
          document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
        }, 100);
      }

      // Esc => Close modals and sidebar
      if (e.key === 'Escape') {
        if (isUpgradeModalOpen) {
          setIsUpgradeModalOpen(false);
        }
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isUpgradeModalOpen, isSidebarOpen]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleToolClick = (toolId: string) => {
    let prompt = '';
    switch (toolId) {
      case 'code':
        prompt = t.promptCode;
        break;
      case 'writer':
        prompt = t.promptWriter;
        break;
      case 'summarize':
        prompt = t.promptSummarize;
        break;
      case 'brainstorm':
        prompt = t.promptBrainstorm;
        break;
      case 'translate':
        prompt = language === 'bn' ? 'নিচের লেখাটি অনুবাদ এবং ব্যাকরণ সংশোধন করুন: ' : 'Translate and polish the following text: ';
        break;
      case 'data':
        prompt = language === 'bn' ? 'নিচের ডেটা বা সমস্যাটি বিশ্লেষণ করুন: ' : 'Analyze the following data or problem: ';
        break;
      case 'chat':
      default:
        prompt = '';
        break;
    }
    // Always start a fresh new chat session when a tool feature is selected
    setCurrentChatId(null);
    setInitialPrompt(prompt);
    setCurrentScreen('chat');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (userStatus === 'Band') {
    if (user.email === 'ashtosh.biswas.2026@gmail.com') {
      updateDoc(doc(db, 'users', user.uid), { status: 'Basick' });
    }
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] p-4">
        <div className="max-w-md w-full bg-[var(--card)] border border-red-500/20 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-3 tracking-tight">Account Banned</h1>
          <p className="text-[var(--text-muted)] mb-8">Your account has been restricted from accessing this application. Please contact support for more information.</p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] font-medium hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen onToolClick={handleToolClick} onUpgradeClick={() => setIsUpgradeModalOpen(true)} userStatus={userStatus} />;
      case 'settings':
        return <SettingsScreen toggleTheme={toggleTheme} isDark={isDark} />;
      case 'admin':
        return <AdminScreen />;
      case 'chat':
      default:
        return <ChatScreen 
                 initialPrompt={initialPrompt} 
                 clearInitialPrompt={() => setInitialPrompt('')} 
                 currentChatId={currentChatId}
                 setCurrentChatId={setCurrentChatId}
                 setCurrentScreen={setCurrentScreen}
               />;
    }
  };

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'dashboard':
        return t.aiTools;
      case 'settings':
        return t.settings;
      case 'admin':
        return 'Admin Panel';
      case 'chat':
      default:
        return t.novaAiChat;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[var(--bg)] text-[var(--text)] overflow-hidden font-sans relative selection:bg-primary/30">
      
      {/* Immersive Atmospheric Background (Only visible in Dark Mode) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-100 transition-opacity duration-1000">
        {isDark ? (
          <>
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
          </>
        ) : (
          <>
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
          </>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentScreen={currentScreen}
        setCurrentScreen={(screen) => {
          setCurrentScreen(screen);
          if (screen === 'admin' && window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
        }}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        user={user}
        onUpgradeClick={() => setIsUpgradeModalOpen(true)}
        isAdmin={isAdmin}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar
          title={getScreenTitle()}
          onMenuClick={() => setIsSidebarOpen(true)}
          user={user}
        />
        
        <main className="flex-1 relative overflow-hidden bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.25, type: 'spring', damping: 25 }}
              className="w-full h-full absolute top-0 left-0"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </div>
  );
}
