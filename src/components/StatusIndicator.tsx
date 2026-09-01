import React from 'react';
import { Globe, Sparkles, Code, Edit3, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface StatusIndicatorProps {
  statusMessage?: string;
  tool?: string;
  isStreaming?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  statusMessage = "Nexara AI is thinking...",
  tool,
  isStreaming = false
}) => {
  const msgLower = statusMessage.toLowerCase();
  
  const isWebSearch = tool === 'web_search' || msgLower.includes("search") || msgLower.includes("google") || msgLower.includes("web") || msgLower.includes("খোঁজা") || msgLower.includes("অনুসন্ধান");
  const isCodeGen = tool === 'code_gen' || msgLower.includes("code") || msgLower.includes("artifact") || msgLower.includes("file") || msgLower.includes("কোড") || msgLower.includes("ফাইল");
  const isWriting = tool === 'writing' || msgLower.includes("writing") || msgLower.includes("response") || msgLower.includes("synthesiz") || msgLower.includes("উত্তর");

  let theme = {
    border: "border-indigo-500/30 dark:border-indigo-500/20",
    shadow: "shadow-[0_4px_20px_rgba(99,102,241,0.18)]",
    shimmer: "via-indigo-500/10",
    text: "text-zinc-200",
    barColor: "bg-indigo-400 shadow-[0_0_4px_rgba(129,140,248,0.7)]"
  };

  if (isWebSearch) {
    theme = {
      border: "border-cyan-500/40 dark:border-cyan-500/30",
      shadow: "shadow-[0_4px_20px_rgba(34,211,238,0.2)]",
      shimmer: "via-cyan-500/15",
      text: "text-cyan-100",
      barColor: "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]"
    };
  } else if (isCodeGen) {
    theme = {
      border: "border-emerald-500/40 dark:border-emerald-500/30",
      shadow: "shadow-[0_4px_20px_rgba(52,211,153,0.2)]",
      shimmer: "via-emerald-500/15",
      text: "text-emerald-100",
      barColor: "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
    };
  } else if (isWriting) {
    theme = {
      border: "border-purple-500/40 dark:border-purple-500/30",
      shadow: "shadow-[0_4px_20px_rgba(168,85,247,0.2)]",
      shimmer: "via-purple-500/15",
      text: "text-purple-100",
      barColor: "bg-amber-300 shadow-[0_0_4px_rgba(252,211,77,0.8)]"
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`relative inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/95 dark:bg-zinc-950/95 border ${theme.border} ${theme.shadow} backdrop-blur-xl text-xs font-medium my-1.5 overflow-hidden group select-none transition-colors duration-300`}
    >
      {/* Animated Subtle Shimmer Background Line */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r from-transparent ${theme.shimmer} to-transparent pointer-events-none`}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
      />

      {/* Dynamic Animated Icon Orb */}
      <div className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
        <AnimatePresence mode="wait">
          {isWebSearch ? (
            <motion.div
              key="web-search"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <motion.span
                className="absolute inset-0 rounded-full border border-cyan-400/60"
                animate={{ scale: [0.9, 1.8], opacity: [0.8, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
              />
              <Globe className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            </motion.div>
          ) : isCodeGen ? (
            <motion.div
              key="code-gen"
              initial={{ scale: 0, scaleX: 0 }}
              animate={{ scale: 1, scaleX: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <motion.span
                className="absolute inset-0 rounded-full bg-emerald-500/20"
                animate={{ scale: [0.9, 1.5, 0.9], opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
              <Code className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </motion.div>
          ) : isWriting ? (
            <motion.div
              key="writing"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.8)]" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="thinking"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <motion.span
                className="absolute w-4 h-4 rounded-full bg-indigo-500/30"
                animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              />
              <motion.span
                className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_8px_rgba(99,102,241,0.9)]"
                animate={{ scale: [0.9, 1.15, 0.9] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animated Text Switcher with AnimatePresence */}
      <div className="relative overflow-hidden h-4 flex items-center min-w-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={statusMessage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`truncate font-medium tracking-tight text-xs font-sans whitespace-nowrap ${theme.text}`}
          >
            {statusMessage}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* AI Waveform Bars Animation */}
      <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
        {[0, 150, 300].map((delay, index) => (
          <motion.span
            key={index}
            className={`w-0.5 rounded-full ${theme.barColor}`}
            animate={{ height: ['4px', '12px', '4px'] }}
            transition={{
              repeat: Infinity,
              duration: 0.9,
              ease: 'easeInOut',
              delay: delay / 1000,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

