import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Briefcase, Target, Sparkles, Code, PenTool, BookOpen, MessageSquare, 
  Zap, Smile, Check, ChevronRight, ChevronLeft, X, ArrowRight, Lightbulb, Mail, Rocket
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: (selectedPrompt?: string) => void;
  initialDisplayName?: string;
  initialEmail?: string;
}

export default function OnboardingModal({ 
  isOpen, 
  onClose, 
  initialDisplayName = '', 
  initialEmail = '' 
}: OnboardingModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Default display name inferred from user or email
  const defaultName = initialDisplayName || (initialEmail ? initialEmail.split('@')[0] : '');

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    displayName: defaultName,
    role: 'Developer',
    customRole: '',
    primaryGoal: 'Coding & Technical Help',
    tonePreference: 'Concise & Direct'
  });

  if (!isOpen) return null;

  const rolesList = [
    { id: 'Developer', labelBn: '💻 ডেভেলপার / কোডার', labelEn: '💻 Developer / Coder' },
    { id: 'Student', labelBn: '🎓 ছাত্র / শিক্ষার্থী', labelEn: '🎓 Student / Learner' },
    { id: 'Writer', labelBn: '✍️ লেখক / কনটেন্ট ক্রিয়েটর', labelEn: '✍️ Writer / Content Creator' },
    { id: 'Business Owner', labelBn: '💼 ব্যবসায়ী / উদ্যোক্তা', labelEn: '💼 Business Owner / Entrepreneur' },
    { id: 'Designer', labelBn: '🎨 ডিজাইনার / শিল্পী', labelEn: '🎨 Designer / Artist' },
    { id: 'Other', labelBn: '🛠️ অন্যান্য', labelEn: '🛠️ Other' },
  ];

  const goalsList = [
    {
      id: 'Coding & Technical Help',
      icon: Code,
      titleBn: 'Coding & Technical Help',
      descBn: 'কোডিং, ডিবাগিং এবং টেকনিক্যাল সমস্যার সহজ সমাধান',
      titleEn: 'Coding & Technical Help',
      descEn: 'Code snippets, debugging, and technical problem solving'
    },
    {
      id: 'Content Writing & Brainstorming',
      icon: PenTool,
      titleBn: 'Content Writing & Brainstorming',
      descBn: 'আর্টিকেল, ড্রাফট, আইডিয়া তৈরি ও রাইটার্স ব্লক দূরীকরণ',
      titleEn: 'Content Writing & Brainstorming',
      descEn: 'Writing articles, drafting emails, and generating creative ideas'
    },
    {
      id: 'Study & Research',
      icon: BookOpen,
      titleBn: 'Study & Research',
      descBn: 'জটিল বিষয় সহজে শেখা, নোট তৈরি ও গভীর গবেষণা',
      titleEn: 'Study & Research',
      descEn: 'Understanding complex topics, study notes, and research'
    },
    {
      id: 'General Daily Assistant',
      icon: MessageSquare,
      titleBn: 'General Daily Assistant',
      descBn: 'দৈনন্দিন কাজ, পরামর্শ, পরিকল্পনা ও সাধারণ দিকনির্দেশনা',
      titleEn: 'General Daily Assistant',
      descEn: 'Daily productivity, advice, planning, and general Q&A'
    }
  ];

  const tonesList = [
    {
      id: 'Concise & Direct',
      icon: Zap,
      titleBn: 'Concise & Direct',
      badgeBn: 'ডেভেলপার ও টেকনিক্যাল কাজের জন্য সেরা',
      descBn: 'কম কথায় স্পষ্ট, সরাসরি পয়েন্ট-টু-পয়েন্ট উত্তর ও কোড ব্লক।',
      titleEn: 'Concise & Direct',
      badgeEn: 'Best for Developers',
      descEn: 'Short, point-to-point answers without fluff or extra intro.'
    },
    {
      id: 'Detailed & Explanatory',
      icon: BookOpen,
      titleBn: 'Detailed & Explanatory',
      badgeBn: 'শেখা ও গবেষণার জন্য সেরা',
      descBn: 'সহজ ভাষায় উদাহরণসহ বিস্তারিত ও পুঙ্খানুপুঙ্খ ব্যাখ্যা।',
      titleEn: 'Detailed & Explanatory',
      badgeEn: 'Best for Learning',
      descEn: 'In-depth explanations with step-by-step guidance and examples.'
    },
    {
      id: 'Creative & Friendly',
      icon: Smile,
      titleBn: 'Creative & Friendly',
      badgeBn: 'ব্রেনস্টর্মিং ও আইডিয়েশনের জন্য সেরা',
      descBn: 'বন্ধুত্বসুলভ, উৎসাহব্যঞ্জক ও সৃজনশীল উপায়ে কথা বলা।',
      titleEn: 'Creative & Friendly',
      badgeEn: 'Best for Brainstorming',
      descEn: 'Warm, conversational, creative, and highly encouraging tone.'
    }
  ];

  const quickStartPrompts = [
    {
      id: 'debug',
      icon: Code,
      promptBn: 'আমার একটি কোডের সমস্যা ডিবাগ এবং ফিক্স করতে সাহায্য করুন',
      promptEn: 'Help me debug a code snippet',
      descBn: 'কোড ডিবাগিং',
      descEn: 'Code Debugging'
    },
    {
      id: 'explain',
      icon: Lightbulb,
      promptBn: 'একটি জটিল প্রযুক্তি বা বিষয় খুব সহজে বুঝিয়ে বলুন',
      promptEn: 'Explain a complex topic easily',
      descBn: 'সহজ ব্যাখ্যা',
      descEn: 'Easy Explanation'
    },
    {
      id: 'email',
      icon: Mail,
      promptBn: 'একটি প্রফেশনাল ইমেইলের সুন্দর ড্রাফট তৈরি করে দিন',
      promptEn: 'Write a quick email draft',
      descBn: 'ইমেইল ড্রাফটিং',
      descEn: 'Email Draft'
    },
    {
      id: 'ideas',
      icon: Rocket,
      promptBn: 'আমার নতুন প্রজেক্টের জন্য কিছু ক্রিয়েটিভ আইডিয়া দিন',
      promptEn: 'Brainstorm creative ideas for my project',
      descBn: 'আইডিয়া জেনারেশন',
      descEn: 'Brainstorming'
    }
  ];

  const savePreferences = async (selectedPrompt?: string) => {
    setIsSaving(true);
    const userId = auth.currentUser?.uid;
    const finalRole = formData.role === 'Other' && formData.customRole ? formData.customRole : formData.role;
    const finalDisplayName = formData.displayName.trim() || defaultName || 'User';

    if (userId) {
      try {
        // Build readable memory persona string
        const formattedMemory = `User Profile Context:\n- Name to call user: ${finalDisplayName}\n- Role/Profession: ${finalRole}\n- Primary Goal: ${formData.primaryGoal}\n- Preferred Tone: ${formData.tonePreference}\n\nCRITICAL INSTRUCTION: Always address the user politely by name (${finalDisplayName}) when appropriate, tailor explanations to their role as a ${finalRole}, and use a ${formData.tonePreference} communication style.`;

        await updateDoc(doc(db, 'users', userId), {
          displayName: finalDisplayName,
          role: finalRole,
          primaryGoal: formData.primaryGoal,
          tonePreference: formData.tonePreference,
          memory: formattedMemory,
          onboardingCompleted: true,
          updatedAt: new Date()
        });

        if (auth.currentUser && (!auth.currentUser.displayName || auth.currentUser.displayName !== finalDisplayName)) {
          await updateProfile(auth.currentUser, {
            displayName: finalDisplayName
          });
        }
      } catch (err) {
        console.error("Error saving onboarding preferences:", err);
      }
    }

    setIsSaving(false);
    onClose(selectedPrompt);
  };

  const handleSkip = async () => {
    await savePreferences();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto relative"
      >
        {/* Header Bar with Progress & Skip */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {step}
            </div>
            <div>
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {isBn ? `ধাপ ${step} / ৪` : `Step ${step} of 4`}
              </span>
              <div className="w-28 h-1.5 bg-[var(--border)] rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
          >
            <span>{isBn ? 'পরে করব (Skip)' : 'Skip for now'}</span>
            <X size={14} />
          </button>
        </div>

        {/* Step Body */}
        <div className="p-6 md:p-8 flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                    <User size={14} />
                    <span>{isBn ? 'ধাপ ১: ইউজারের পরিচয়' : 'Step 1: Basic Info'}</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-[var(--text)]">
                    {isBn ? 'Nexara AI-তে আপনাকে স্বাগতম!' : 'Welcome to Nexara AI!'}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {isBn 
                      ? 'AI আপনাকে কীভাবে চিনবে এবং আপনার কাজের ধরন অনুযায়ী সহায়তা করবে তা নির্বাচন করুন।'
                      : 'Help AI personalize its assistance according to your name and background.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Display Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                      {isBn ? 'AI আপনাকে কী নামে ডাকবে? (Display Name)' : 'What should AI call you? (Display Name)'}
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input 
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder={isBn ? 'আপনার নাম লিখুন...' : 'Enter your preferred name...'}
                        className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-sm text-[var(--text)] focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                      {isBn ? 'আপনার পেশা বা ক্ষেত্র নির্বাচন করুন (Role / Profession):' : 'Select your Role / Profession:'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {rolesList.map((r) => {
                        const isSelected = formData.role === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, role: r.id })}
                            className={`p-3 rounded-2xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-[var(--text-muted)]'
                            }`}
                          >
                            <span>{isBn ? r.labelBn : r.labelEn}</span>
                            {isSelected && <Check size={14} className="text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {formData.role === 'Other' && (
                      <input 
                        type="text"
                        value={formData.customRole}
                        onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                        placeholder={isBn ? 'আপনার পেশা নির্দিষ্ট করে লিখুন...' : 'Specify your profession...'}
                        className="w-full mt-2 px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-primary"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                    <Target size={14} />
                    <span>{isBn ? 'ধাপ ২: ব্যবহারের উদ্দেশ্য' : 'Step 2: Primary Goal'}</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-[var(--text)]">
                    {isBn ? 'আপনার প্রধান উদ্দেশ্য কী?' : 'What is your primary goal?'}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {isBn 
                      ? 'আপনি মূলত কীসের জন্য Nexara AI চ্যাটবটটি বেশি ব্যবহার করবেন?'
                      : 'Choose how you plan to use Nexara AI most frequently.'}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {goalsList.map((g) => {
                    const Icon = g.icon;
                    const isSelected = formData.primaryGoal === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, primaryGoal: g.id })}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-[var(--text)] shadow-md ring-1 ring-primary/30' 
                            : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${isSelected ? 'bg-primary text-white' : 'bg-[var(--border)]/50 text-[var(--text)]'}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-[var(--text)]'}`}>
                              {isBn ? g.titleBn : g.titleEn}
                            </h3>
                            {isSelected && <Check size={16} className="text-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {isBn ? g.descBn : g.descEn}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                    <Sparkles size={14} />
                    <span>{isBn ? 'ধাপ ৩: AI-এর আচরণ নির্বাচন' : 'Step 3: Persona / Tone'}</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-[var(--text)]">
                    {isBn ? 'AI কীভাবে উত্তর দেবে?' : 'How should AI respond to you?'}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {isBn 
                      ? 'আপনার পছন্দ অনুযায়ী AI-এর কথা বলার ধরন ও উত্তর দেওয়ার স্টাইল নির্বাচন করুন:'
                      : 'Choose your preferred AI communication style and tone.'}
                  </p>
                </div>

                <div className="space-y-3">
                  {tonesList.map((t) => {
                    const Icon = t.icon;
                    const isSelected = formData.tonePreference === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, tonePreference: t.id })}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                          isSelected 
                            ? 'bg-primary/10 border-primary shadow-md ring-1 ring-primary/30' 
                            : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${isSelected ? 'bg-primary text-white' : 'bg-[var(--border)]/50 text-[var(--text)]'}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-[var(--text)]'}`}>
                              {isBn ? t.titleBn : t.titleEn}
                            </h3>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                              {isBn ? t.badgeBn : t.badgeEn}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {isBn ? t.descBn : t.descEn}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium mb-3">
                    <Check size={14} />
                    <span>{isBn ? 'ধাপ ৪: প্রথম প্রম্পটের সাজেশন' : 'Step 4: Welcome & Quick Start'}</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-[var(--text)]">
                    {isBn ? 'আপনার পছন্দ সেভ হয়েছে!' : 'Setup Completed!'}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {isBn 
                      ? 'নিচে যেকোনো একটি কার্ডে ক্লিক করে সরাসরি কাজ শুরু করুন:'
                      : 'Click any template prompt card below to jump straight into chat:'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickStartPrompts.map((p) => {
                    const Icon = p.icon;
                    const text = isBn ? p.promptBn : p.promptEn;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => savePreferences(text)}
                        className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-primary hover:bg-primary/5 text-left transition-all group flex flex-col justify-between h-28"
                      >
                        <div className="flex items-center justify-between text-[var(--text-muted)] group-hover:text-primary">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--border)]/50 group-hover:bg-primary/10">
                            {isBn ? p.descBn : p.descEn}
                          </span>
                          <Icon size={16} />
                        </div>
                        <p className="text-xs font-medium text-[var(--text)] group-hover:text-primary line-clamp-2">
                          "{text}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Controls */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/40">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>{isBn ? 'পেছনে' : 'Back'}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => savePreferences()}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25"
            >
              <span>{isSaving ? (isBn ? 'সেভ হচ্ছে...' : 'Saving...') : (isBn ? 'চ্যাট শুরু করুন' : 'Start Chatting')}</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
