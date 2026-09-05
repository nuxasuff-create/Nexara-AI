import { Menu, User, BookOpen, Minimize2, Sparkles } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  user: FirebaseUser;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export default function TopBar({ title, onMenuClick, user, isFocusMode = false, onToggleFocusMode }: TopBarProps) {
  const { language } = useLanguage();

  return (
    <header className={`h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-all duration-300 ${
      isFocusMode 
        ? 'bg-[var(--glass-bg)]/80 backdrop-blur-xl border-b border-primary/20 shadow-lg shadow-primary/5' 
        : 'bg-[var(--glass-bg)] backdrop-blur-md border-b border-[var(--glass-border)]'
    }`}>
      <div className="flex items-center gap-3 relative z-10 w-full overflow-hidden">
        {!isFocusMode && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-[var(--text)] hover:bg-[var(--hover)] hover:text-primary hover:shadow-sm rounded-[12px] transition-all duration-300 md:hidden active:scale-95 flex-shrink-0"
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
        )}
        
        <div className="flex items-center gap-3 font-display font-semibold text-[20px] sm:text-[22px] tracking-tight truncate flex-1 min-w-0 pr-4">
          <img src="/logo.png" alt="Nexara AI" className="h-8 w-8 object-cover rounded-xl drop-shadow-md border border-[var(--glass-border)] flex-shrink-0" />
          <span className="truncate bg-clip-text text-transparent bg-gradient-to-br from-[var(--text)] to-[var(--text-muted)]">
            {isFocusMode ? (language === 'bn' ? 'ফোকাস মোড (Focus Mode)' : 'Focus Mode') : title}
          </span>
          {isFocusMode && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/30 uppercase tracking-wider">
              <Sparkles size={12} className="animate-pulse" />
              {language === 'bn' ? 'রিডিং মোড' : 'Reading Mode'}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 relative z-10 flex-shrink-0">
        {onToggleFocusMode && (
          <button
            onClick={onToggleFocusMode}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 active:scale-95 shadow-sm ${
              isFocusMode
                ? 'bg-primary text-white border-primary hover:bg-primary/90 shadow-primary/20'
                : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--glass-border)] hover:bg-[var(--hover)] hover:border-primary/30'
            }`}
            title={isFocusMode ? (language === 'bn' ? 'ফোকাস মোড বন্ধ করুন (Esc)' : 'Exit Focus Mode (Esc)') : (language === 'bn' ? 'ফোকাস / রিডিং মোড' : 'Focus / Reading Mode')}
          >
            {isFocusMode ? (
              <>
                <Minimize2 size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">{language === 'bn' ? 'ফোকাস ত্যাগ করুন' : 'Exit Focus'}</span>
              </>
            ) : (
              <>
                <BookOpen size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">{language === 'bn' ? 'ফোকাস মোড' : 'Focus Mode'}</span>
              </>
            )}
          </button>
        )}

        <button className="relative w-10 h-10 rounded-full overflow-hidden shadow-sm border border-[var(--glass-border)] hover:border-primary/50 hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/20 hover:scale-105 active:scale-95 group/profile flex-shrink-0">
          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/profile:opacity-100 transition-opacity z-10 pointer-events-none" />
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-full h-full object-cover relative z-0"
              referrerPolicy="no-referrer"
            />
          ) : (
             <div className="w-full h-full bg-gradient-to-br from-indigo-500 hover:from-indigo-400 to-purple-500 hover:to-purple-400 flex items-center justify-center text-white relative z-0 shadow-inner">
               <User size={18} strokeWidth={2.5} />
             </div>
          )}
        </button>
      </div>
    </header>
  );
}
