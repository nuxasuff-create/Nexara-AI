import { Menu, User } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  user: FirebaseUser;
}

export default function TopBar({ title, onMenuClick, user }: TopBarProps) {
  return (
    <div className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 bg-[var(--glass-bg)] backdrop-blur-2xl border-b border-[var(--glass-border)] transition-colors duration-500">
      <div className="flex items-center gap-3 relative z-10 w-full overflow-hidden">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-[var(--text)] hover:bg-[var(--hover)] hover:text-primary hover:shadow-sm rounded-[12px] transition-all duration-300 md:hidden active:scale-95 flex-shrink-0"
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-3 font-display font-semibold text-[22px] tracking-tight truncate flex-1 min-w-0 pr-4">
          <img src="/logo.png" alt="Nexara AI" className="h-8 w-8 object-cover rounded-xl md:hidden drop-shadow-md border border-[var(--glass-border)]" />
          <span className="truncate bg-clip-text text-transparent bg-gradient-to-br from-[var(--text)] to-[var(--text-muted)]">{title}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 relative z-10">
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
    </div>
  );
}
