import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, X, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { t, language } = useLanguage();

  // Close modal on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const features = [
    language === 'bn' ? "আনলিমিটেড এআই চ্যাট" : "Unlimited AI Chats",
    language === 'bn' ? "উন্নত মডেল অ্যাক্সেস (GPT-4, Claude 3)" : "Advanced Models (GPT-4, Claude 3.5)",
    language === 'bn' ? "দ্রুত রেসপন্স টাইম" : "Priority Response Time",
    language === 'bn' ? "ছবি তৈরি (আনলিমিটেড)" : "Unlimited Image Generation",
    language === 'bn' ? "কোনো বিজ্ঞাপন নেই" : "Ad-Free Experience",
    language === 'bn' ? "নতুন ফিচারের আগাম অ্যাক্সেস" : "Beta Feature Access"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--bg)]/80 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg relative z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-40 animate-pulse mix-blend-screen" />
            
            <div className="bg-[var(--card)] border border-white/10 dark:border-white/5 rounded-[2rem] p-1 relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10" />
              
              <div className="bg-[var(--card)]/80 backdrop-blur-3xl rounded-[1.8rem] p-8 sm:p-10 relative">
                <button 
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors backdrop-blur-md z-20"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-8 pt-2">
                  <motion.div 
                    initial={{ rotate: -10, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.6 }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] mb-6 shadow-lg shadow-purple-500/30"
                  >
                    <div className="w-full h-full bg-[var(--card)] rounded-[22px] flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-transparent bg-clip-text" style={{ stroke: "url(#gradient)" }} />
                      <svg width="0" height="0">
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop stopColor="#6366f1" offset="0%" />
                          <stop stopColor="#d946ef" offset="100%" />
                        </linearGradient>
                      </svg>
                    </div>
                  </motion.div>
                  
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-semibold mb-4 border border-purple-500/20">
                    <Zap size={14} className="fill-current" />
                    <span>{language === 'bn' ? 'নেক্সারা এআই প্রো' : 'Nexara AI Pro'}</span>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl font-display font-bold text-[var(--text)] mb-3 tracking-tight">
                    {t.upgradePro}
                  </h2>
                  <p className="text-[var(--text-muted)] text-base">
                    {language === 'bn' ? 'সীমাহীন এআই শক্তি দিয়ে আপনার চিন্তাকে বাস্তবে রূপ দিন।' : 'Unleash the full potential of AI with priority access and limitless creation.'}
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {features.map((feature, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20">
                        <Check size={16} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-[var(--text)] font-medium leading-tight">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      console.log("Pro plan selected");
                      onClose();
                    }}
                    className="group relative w-full p-[2px] rounded-2xl overflow-hidden shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-full h-full bg-[var(--card)]/20 backdrop-blur-sm rounded-[14px] px-6 py-4 flex items-center justify-between">
                      <span className="text-white font-bold text-lg tracking-wide">
                         {language === 'bn' ? 'আপগ্রেড করুন' : 'Upgrade Now'}
                      </span>
                      <span className="text-white/90 font-medium">
                         {language === 'bn' ? '$১৫ / মাস' : '$15 / mo'}
                      </span>
                    </div>
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 font-medium transition-colors"
                  >
                    {language === 'bn' ? 'পরে দেখবো' : 'Maybe Later'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
