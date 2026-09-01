import React, { useState } from 'react';
import { 
  Bot, 
  Code, 
  PenTool, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  Zap, 
  CheckCircle2, 
  Globe, 
  Layers, 
  Terminal, 
  BookOpen, 
  Lightbulb, 
  Languages, 
  BarChart3, 
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export interface DashboardScreenProps {
  onToolClick?: (toolId: string) => void;
  onUpgradeClick?: () => void;
  userStatus?: 'Basick' | 'pro' | 'Band';
}

export default function DashboardScreen({ 
  onToolClick, 
  onUpgradeClick, 
  userStatus = 'Basick' 
}: DashboardScreenProps) {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: language === 'bn' ? 'সকল টুলস' : 'All Tools', icon: <Layers size={16} /> },
    { id: 'core', label: language === 'bn' ? 'মূল এআই' : 'Core AI', icon: <Bot size={16} /> },
    { id: 'dev', label: language === 'bn' ? 'কোডিং ও টেক' : 'Coding & Dev', icon: <Terminal size={16} /> },
    { id: 'writing', label: language === 'bn' ? 'রাইটিং ও কন্টেন্ট' : 'Writing', icon: <PenTool size={16} /> },
    { id: 'productivity', label: language === 'bn' ? 'উৎপাদনশীলতা' : 'Productivity', icon: <BarChart3 size={16} /> },
  ];

  const tools = [
    {
      id: 'chat',
      category: 'core',
      title: language === 'bn' ? 'স্মার্ট চ্যাট এআই' : 'Smart Chat AI',
      description: language === 'bn' ? 'লাইভ ওয়েব সার্চ এবং ফাইল অ্যানালাইসিস সহ বহুমুখী এআই সহকারী।' : 'General purpose AI assistant with live web search and file reasoning.',
      icon: <Bot className="w-7 h-7" />,
      gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
      badge: { text: language === 'bn' ? '🔥 সবচেয়ে জনপ্রিয়' : '🔥 Most Popular', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
      features: language === 'bn' ? [
        'লাইভ গুগল ওয়েব সার্চ ইন্টিগ্রেশন',
        'মাল্টি-টার্ন রিয়েল-টাইম চ্যাট মেমোরি',
        'কোড ফাইল ও ডকুমেন্ট অ্যানালাইসিস'
      ] : [
        'Live Google Web Search integration',
        'Multi-turn real-time conversation context',
        'Code files & document analysis'
      ],
      tags: ['#WebSearch', '#GPT4', '#Realtime']
    },
    {
      id: 'code',
      category: 'dev',
      title: language === 'bn' ? 'কোড অ্যাসিস্ট্যান্ট' : 'Code Assistant',
      description: language === 'bn' ? 'দ্রুত কোড লিখুন, ডিবাগ করুন এবং আর্কিটেকচার রিফ্যাক্টর করুন।' : 'Write, debug, and optimize multi-language code at lightning speed.',
      icon: <Code className="w-7 h-7" />,
      gradient: 'from-indigo-600 via-purple-600 to-pink-500',
      badge: { text: language === 'bn' ? '⚡ দ্রুততম কোডিং' : '⚡ Developer Choice', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      features: language === 'bn' ? [
        'সিনট্যাক্স হাইলাইটিং ও প্রিভিউ জেনারেটর',
        'অটোমেটিক বাগ ডিটেকশন ও ফিক্সিং',
        'Python, JS, React, Go & C++ সাপোর্ট'
      ] : [
        'Syntax highlighting & preview rendering',
        'Automatic bug detection & fixing',
        'Supports JS, Python, React, Go & C++'
      ],
      tags: ['#Debugging', '#SyntaxHighlight', '#Refactor']
    },
    {
      id: 'writer',
      category: 'writing',
      title: language === 'bn' ? 'স্মার্ট রাইটার টুল' : 'Smart Writer Tool',
      description: language === 'bn' ? 'প্রফেশনাল ইমেইল, আর্টিকেল, ব্লগ ও সোশ্যাল কন্টেন্ট তৈরি করুন।' : 'Draft professional emails, articles, essays, and creative copy.',
      icon: <PenTool className="w-7 h-7" />,
      gradient: 'from-pink-600 via-rose-600 to-amber-500',
      badge: { text: language === 'bn' ? '✨ রাইটিং প্যাক' : '✨ Content Creator', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
      features: language === 'bn' ? [
        'কাস্টম টোন (ফরমাল, ক্যাজুয়াল, পারসুয়েসিভ)',
        'এসইও অপটিমাইজড আর্টিকেল জেনারেশন',
        'গ্রামার ও স্টাইল পলিশিং'
      ] : [
        'Custom tone (Formal, Casual, Persuasive)',
        'SEO optimized article generation',
        'Grammar & tone auto-polishing'
      ],
      tags: ['#Copywriting', '#SEO', '#Emails']
    },
    {
      id: 'summarize',
      category: 'productivity',
      title: language === 'bn' ? 'কন্টেন্ট সামারাইজার' : 'Content Summarizer',
      description: language === 'bn' ? 'দীর্ঘ ডকুমেন্ট বা পোস্টের মূল পয়েন্টগুলো সংক্ষেপে বের করুন।' : 'Condense long articles, PDFs, and reports into clean bullet points.',
      icon: <FileText className="w-7 h-7" />,
      gradient: 'from-amber-500 via-orange-600 to-red-500',
      badge: { text: language === 'bn' ? '🚀 সময় সাশ্রয়ী' : '🚀 Productivity Boost', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      features: language === 'bn' ? [
        'মূল বিষয়গুলোর বুলেট পয়েন্ট এক্সট্র্যাকশন',
        'এক্সিকিউটিভ সামারি জেনারেটর',
        'সহজ ও বোধগম্য সংক্ষেপণ'
      ] : [
        'Key takeaway bullet point extraction',
        'Executive summary generation',
        'Fast concise reading format'
      ],
      tags: ['#Summaries', '#FastRead', '#Insights']
    },
    {
      id: 'brainstorm',
      category: 'productivity',
      title: language === 'bn' ? 'আইডিয়া ব্রেনস্টর্মিং' : 'Idea Brainstormer',
      description: language === 'bn' ? 'নতুন বিজনেস কনসেপ্ট, প্রজেক্ট আইডিয়া ও ক্রিয়েটিভ প্ল্যান তৈরি করুন।' : 'Generate innovative business concepts, product features, & campaign ideas.',
      icon: <Sparkles className="w-7 h-7" />,
      gradient: 'from-emerald-500 via-teal-600 to-cyan-500',
      badge: { text: language === 'bn' ? '💡 ক্রিয়েটিভ জেনারেটর' : '💡 Innovation', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
      features: language === 'bn' ? [
        'মাইন্ড-ম্যাপ ও স্ট্রাকচার্ড আইডিয়েশন',
        'সমস্যা সমাধানের আধুনিক ফ্রেমওয়ার্ক',
        'স্টার্টআপ ও বিজনেস কনসেপ্ট ক্রিয়েশন'
      ] : [
        'Mind-mapping & structured ideation',
        'Modern problem-solving frameworks',
        'Startup & product concept creation'
      ],
      tags: ['#Ideation', '#Startups', '#Creative']
    },
    {
      id: 'translate',
      category: 'writing',
      title: language === 'bn' ? 'স্মার্ট অনুবাদক' : 'Smart Translator',
      description: language === 'bn' ? 'যেকোনো ভাষার মধ্যে প্রাকৃতিক ও নির্ভুল অনুবাদ তৈরি করুন।' : 'Translate text across languages with natural tone and context preservation.',
      icon: <Languages className="w-7 h-7" />,
      gradient: 'from-purple-600 via-violet-600 to-indigo-500',
      badge: { text: language === 'bn' ? '🌐 গ্লোবাল ল্যাঙ্গুয়েজ' : '🌐 Multi-lingual', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      features: language === 'bn' ? [
        'বাংলা, ইংরেজি, স্প্যানিশ সহ ১০০+ ভাষা',
        'ভাবানুবাদ ও লোকালাইজড টিউনিং',
        'প্রফেশনাল ডকুমেন্ট ট্রান্সলেশন'
      ] : [
        'Supports 100+ global languages',
        'Contextual & natural sentence flow',
        'Professional tone adjustment'
      ],
      tags: ['#Translation', '#Bengali', '#English']
    },
    {
      id: 'data',
      category: 'productivity',
      title: language === 'bn' ? 'ডেটা ও ম্যাথ অ্যানালাইজার' : 'Data & Math Analyzer',
      description: language === 'bn' ? 'জটিল গাণিতিক সমস্যা সমাধান এবং ডেটা অ্যানালিসিস।' : 'Solve complex math problems, evaluate datasets, and structure insights.',
      icon: <BarChart3 className="w-7 h-7" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      badge: { text: language === 'bn' ? '📊 অ্যানালিটিক্স' : '📊 Analytics', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
      features: language === 'bn' ? [
        'স্টেপ-বাই-স্টেপ গাণিতিক সমাধান',
        'টেবিল ডেটা রিপ্রেজেন্টেশন',
        'লজিক্যাল প্রবলেম সলভিং'
      ] : [
        'Step-by-step mathematical reasoning',
        'Tabular data representation',
        'Logical problem solving'
      ],
      tags: ['#Math', '#DataAnalysis', '#Logic']
    }
  ];

  const filteredTools = activeCategory === 'all' 
    ? tools 
    : tools.filter(t => t.category === activeCategory);

  const quickPrompts = [
    { title: language === 'bn' ? 'কোড ডিবাগ করুন' : 'Debug Code', promptId: 'code', text: language === 'bn' ? 'আমার React কম্পোনেন্টের মেমরি লিক ডিবাগ করুন।' : 'Help me debug a memory leak in my React component.' },
    { title: language === 'bn' ? 'আর্টিকেল সামারি' : 'Summarize PDF', promptId: 'summarize', text: language === 'bn' ? 'এই দীর্ঘ আর্টিকেলটির ৫টি প্রধান পয়েন্ট তৈরি করুন।' : 'Summarize the 5 main points of this lengthy article.' },
    { title: language === 'bn' ? 'ফরমাল ইমেইল' : 'Formal Email', promptId: 'writer', text: language === 'bn' ? 'ক্লায়েন্টকে পাঠানোর জন্য একটি পেশাদার কভার লেটার লিখুন।' : 'Draft a polite follow-up email to a enterprise client.' },
    { title: language === 'bn' ? 'স্টার্টআপ আইডিয়া' : 'Startup Ideas', promptId: 'brainstorm', text: language === 'bn' ? 'AI ভিত্তিক ৫টি নতুন মাইক্রো-সাস বিজনেস আইডিয়া দিন।' : 'Give me 5 AI-powered Micro-SaaS startup concepts.' }
  ];

  return (
    <div className="relative p-4 sm:p-6 md:p-8 lg:p-12 h-full overflow-y-auto overflow-x-hidden w-full scroll-smooth">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[600px] opacity-25 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-pink-500/40 blur-[130px] rounded-full mix-blend-screen animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 pt-2 sm:pt-6 pb-24">
        
        {/* Hero Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs sm:text-sm font-semibold text-[var(--text-muted)] mb-6 shadow-sm backdrop-blur-xl">
              <Sparkles size={16} className="text-indigo-400 animate-spin-slow" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                {language === 'bn' ? 'নেক্সারা এআই ফিচার স্যুট' : 'Nexara AI Feature Suite'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-[var(--text)] mb-4 leading-[1.08]">
              {language === 'bn' ? 'এআই এর ক্ষমতা দিয়ে' : 'Empower your work with'}{' '}
              <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 italic font-[Georgia]">
                {language === 'bn' ? 'গতি ও সৃজনশীলতা বৃদ্ধি করুন।' : 'next-gen AI tools.'}
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[var(--text-muted)] max-w-2xl font-normal leading-relaxed">
              {language === 'bn' 
                ? 'যেকোনো কাজ দ্রুত এবং নির্ভুলভাবে সম্পন্ন করার জন্য নিবেদিত স্মার্ট এআই টুলস ব্যবহার করুন।' 
                : 'Accelerate your workflow with specialized intelligent modules tuned for maximum performance.'}
            </p>

            {/* Quick Stats Pill Strip */}
            <div className="flex flex-wrap items-center gap-4 mt-6 text-xs sm:text-sm text-[var(--text-muted)] font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <Cpu size={14} className="text-indigo-400" />
                {language === 'bn' ? '৭+ বিশেষায়িত এআই ইঞ্জিন' : '7+ Dedicated AI Engines'}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <Globe size={14} className="text-cyan-400" />
                {language === 'bn' ? 'লাইভ সার্চ কানেক্টেড' : 'Live Search Enabled'}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <ShieldCheck size={14} className="text-emerald-400" />
                {language === 'bn' ? 'সুরক্ষিত ডেটা প্রসেসিং' : 'Enterprise Grade Security'}
              </span>
            </div>
          </motion.div>

          {userStatus === 'Basick' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.2, type: "spring" }}
              onClick={onUpgradeClick}
              className="group cursor-pointer p-[2px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/15 hover:shadow-purple-500/35 focus:outline-none shrink-0 active:scale-[0.98] transition-all duration-300 w-full lg:w-auto"
            >
              <div className="bg-[var(--card)]/90 backdrop-blur-md px-6 py-4 rounded-[14px] flex items-center justify-between gap-4 transition-colors group-hover:bg-transparent">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0">
                  <Zap size={20} className="fill-current" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text)] group-hover:text-white transition-colors text-left">
                    {language === 'bn' ? 'প্রো-তে আপগ্রেড করুন' : 'Upgrade to Pro'}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] group-hover:text-white/80 transition-colors text-left">
                    {language === 'bn' ? 'সব প্রিমিয়াম ফিচার আনলক করুন' : 'Unlock premium GPT-4 & tools'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-white transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Category Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                    : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] border border-[var(--glass-border)]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
                onClick={() => onToolClick && onToolClick(tool.id)}
                className="group cursor-pointer relative flex flex-col justify-between rounded-3xl bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] p-6 sm:p-7 shadow-[var(--shadow-premium)] hover:-translate-y-1.5 hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 overflow-hidden"
              >
                {/* Ambient glow effect inside card */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${tool.gradient} rounded-full blur-[70px] opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none`} />

                <div>
                  {/* Card Header: Icon & Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${tool.gradient} shadow-md group-hover:scale-105 group-hover:shadow-lg transition-transform duration-300`}>
                      {tool.icon}
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${tool.badge.color}`}>
                      {tool.badge.text}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-display font-bold text-[var(--text)] mb-2 group-hover:text-indigo-400 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mb-5">
                    {tool.description}
                  </p>

                  {/* Feature Highlights List */}
                  <div className="space-y-2 mb-6 pt-2 border-t border-[var(--glass-border)]">
                    {tool.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-xs text-[var(--text)] font-medium">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer: Tags & Action CTA */}
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {tool.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 rounded-md bg-[var(--text)]/5 text-[10px] font-mono text-[var(--text-muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)]">
                    <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                      {language === 'bn' ? 'টুল শুরু করুন' : 'Launch Tool'}
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </span>

                    <div className="w-8 h-8 rounded-full bg-[var(--hover)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-white group-hover:bg-indigo-600 transition-all shadow-sm">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Popular Quick Workflows Section */}
        <div className="mt-16 pt-10 border-t border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-[var(--text)] flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-400" />
                {language === 'bn' ? 'জনপ্রিয় ওয়ার্কফ্লো টেমপ্লেট' : 'Popular Starter Prompts'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                {language === 'bn' ? 'এক ক্লিকে আপনার কাজ শুরু করার জন্য প্রস্তুত প্রম্পট সমূহ' : 'One-click prompts to launch ready-to-use workflows instantly'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickPrompts.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onToolClick && onToolClick(item.promptId)}
                className="group cursor-pointer p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-indigo-500/30 hover:bg-[var(--hover)] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-400">{item.title}</span>
                  <Zap size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text)] line-clamp-2 leading-relaxed">
                  "{item.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
