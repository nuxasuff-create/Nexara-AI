import { Moon, Sun, Globe, LogOut, ChevronRight, User, Shield, Bell, X, ArrowLeft, Camera, Lock, Eye, Volume2, Mail as MailIcon, Smartphone, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut, updateProfile, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { languages, Language } from '../lib/i18n';
import React, { useState, useEffect } from 'react';

interface SettingsScreenProps {
  toggleTheme: () => void;
  isDark: boolean;
  onOpenOnboarding?: () => void;
}

type SettingsTab = 'main' | 'profile' | 'privacy' | 'notifications' | 'memory';

export default function SettingsScreen({ toggleTheme, isDark, onOpenOnboarding }: SettingsScreenProps) {
  const { language, setLanguage, t } = useLanguage();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('main');

  // Profile State
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState(auth.currentUser?.photoURL || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Privacy State
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [dataVisible, setDataVisible] = useState(false);

  // Notifications State
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Memory State
  const [memoryText, setMemoryText] = useState('');
  const [isUpdatingMemory, setIsUpdatingMemory] = useState(false);

  useEffect(() => {
    const fetchMemory = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setMemoryText(userDoc.data().memory || '');
          }
        } catch (error) {
          console.error("Error fetching memory:", error);
        }
      }
    };
    fetchMemory();
  }, []);

  const handleUpdateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setIsUpdatingMemory(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        memory: memoryText
      });
      showToast(language === 'bn' ? "মেমরি আপডেট করা হয়েছে!" : "Memory updated successfully!");
    } catch (error) {
      console.error("Error updating memory:", error);
      showToast(language === 'bn' ? "মেমরি আপডেট করতে সমস্যা হয়েছে।" : "Failed to update memory.");
    } finally {
      setIsUpdatingMemory(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setIsUpdatingProfile(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName,
        photoURL: photoURL
      });
      showToast(language === 'bn' ? "প্রোফাইল আপডেট করা হয়েছে!" : "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast(language === 'bn' ? "প্রোফাইল আপডেট করতে সমস্যা হয়েছে।" : "Failed to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newPassword) return;

    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      showToast(language === 'bn' ? "পাসওয়ার্ড পরিবর্তন করা হয়েছে!" : "Password updated successfully!");
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        showToast(language === 'bn' ? "নিরাপত্তার জন্য আবার লগ ইন করুন।" : "Please re-authenticate to change password.");
      } else {
        showToast(language === 'bn' ? "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।" : "Failed to update password.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const renderMainSettings = () => (
    <motion.div
      key="main"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Account Section */}
      <section>
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 px-2">{t.account}</h2>
        <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-[2rem] border border-[var(--glass-border)] shadow-[var(--shadow-premium)] overflow-hidden">
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center justify-between p-5 px-6 border-b border-[var(--glass-border)] hover:bg-[var(--hover)] transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <User size={22} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text)]">{t.profile}</p>
                <p className="text-sm text-[var(--text-muted)]">{t.managePersonalInfo}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors group-hover:translate-x-1" />
          </div>
          <div 
            onClick={() => setActiveTab('privacy')}
            className="flex items-center justify-between p-5 px-6 border-b border-[var(--glass-border)] hover:bg-[var(--hover)] transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                <Shield size={22} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text)]">{t.privacySecurity}</p>
                <p className="text-sm text-[var(--text-muted)]">{t.controlData}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors group-hover:translate-x-1" />
          </div>
          <div 
            onClick={() => setActiveTab('notifications')}
            className="flex items-center justify-between p-5 px-6 border-b border-[var(--glass-border)] hover:bg-[var(--hover)] transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                <Bell size={22} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text)]">{t.notifications}</p>
                <p className="text-sm text-[var(--text-muted)]">{t.manageAlerts}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors group-hover:translate-x-1" />
          </div>
          <div 
            onClick={() => setActiveTab('memory')}
            className="flex items-center justify-between p-5 px-6 hover:bg-[var(--hover)] transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all shadow-sm">
                <Brain size={22} />
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">{language === 'bn' ? 'মেমরি (Memory)' : 'Memory & Personalization'}</p>
                <p className="text-xs text-[var(--text-muted)]">{language === 'bn' ? 'এআই-কে আপনার সম্পর্কে জানান' : 'Tell AI about yourself'}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--text-muted)]" />
          </div>
        </div>
      </section>

      {/* App Preferences */}
      <section>
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 px-2">{t.preferences}</h2>
        <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-[2rem] border border-[var(--glass-border)] shadow-[var(--shadow-premium)] overflow-hidden">
          <div className="flex items-center justify-between p-5 px-6 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                {isDark ? <Moon size={22} /> : <Sun size={22} />}
              </div>
              <div>
                <p className="font-semibold text-[var(--text)]">{t.appearance}</p>
                <p className="text-sm text-[var(--text-muted)]">{t.darkMode}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-14 h-7 rounded-full p-1 transition-colors ${isDark ? 'bg-primary' : 'bg-[var(--border)]'} relative focus:outline-none focus:ring-2 focus:ring-primary/20`}
            >
              <motion.div
                layout
                className="w-5 h-5 bg-white rounded-full shadow-sm"
                animate={{ x: isDark ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between p-5 px-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Globe size={22} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text)]">{t.language}</p>
                <p className="text-sm text-[var(--text-muted)]">{t.selectLanguage}</p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary block p-2 outline-none transition-all shadow-sm cursor-pointer"
            >
              {Object.entries(languages).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Logout */}
      <section className="pt-4 pb-8">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 rounded-2xl font-medium transition-all duration-300 border border-red-500/20 hover:border-transparent hover:shadow-lg hover:shadow-red-500/30 active:scale-[0.98]"
        >
          <LogOut size={20} />
          {t.logout}
        </button>
      </section>
    </motion.div>
  );

  const renderProfileSettings = () => (
    <motion.div
      key="profile"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('main')}
          className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--hover)] transition-colors active:scale-95 shadow-sm"
        >
          <ArrowLeft size={20} className="text-[var(--text)]" />
        </button>
        <h2 className="text-2xl font-display font-bold text-[var(--text)] tracking-tight">{t.profile}</h2>
      </div>

      <form onSubmit={handleUpdateProfile} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 md:p-8 space-y-8 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="w-28 h-28 rounded-[2rem] bg-[var(--bg)] border-2 border-[var(--border)] overflow-hidden flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-105">
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={48} className="text-[var(--text-muted)]" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-white rounded-xl border-4 border-[var(--card)] shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12">
              <Camera size={18} />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
              {language === 'bn' ? 'নাম' : 'Display Name'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              placeholder={language === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your name'}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              {language === 'bn' ? 'প্রোফাইল ছবির URL' : 'Profile Photo URL'}
            </label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              {language === 'bn' ? 'ইমেইল (পরিবর্তনযোগ্য নয়)' : 'Email (Read-only)'}
            </label>
            <input
              type="email"
              value={auth.currentUser?.email || ''}
              disabled
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] rounded-xl px-4 py-3 opacity-70 cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isUpdatingProfile}
          className="w-full bg-primary text-white font-medium py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isUpdatingProfile ? (language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (language === 'bn' ? 'সেভ করুন' : 'Save Changes')}
        </button>
      </form>
    </motion.div>
  );

  const renderPrivacySettings = () => (
    <motion.div
      key="privacy"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('main')}
          className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--bg)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--text)]" />
        </button>
        <h2 className="text-2xl font-display font-bold text-[var(--text)] tracking-tight">{t.privacySecurity}</h2>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleUpdatePassword} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
          <h3 className="text-lg font-display font-semibold text-[var(--text)] flex items-center gap-2">
            <Lock size={18} className="text-blue-500" />
            {language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            {language === 'bn' ? 'আপনার অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে নতুন পাসওয়ার্ড দিন।' : 'Enter a new password to secure your account.'}
          </p>
          
          <div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={language === 'bn' ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New Password (min 6 chars)'}
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword || newPassword.length < 6}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] font-medium py-3 rounded-xl hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 transition-colors disabled:opacity-50"
          >
            {isUpdatingPassword ? (language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (language === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password')}
          </button>
        </form>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                <Smartphone size={20} />
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">{language === 'bn' ? 'টু-ফ্যাক্টর অথেন্টিকেশন (2FA)' : 'Two-Factor Authentication'}</p>
                <p className="text-xs text-[var(--text-muted)]">{language === 'bn' ? 'অতিরিক্ত নিরাপত্তা যোগ করুন' : 'Add an extra layer of security'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setTwoFactorEnabled(!twoFactorEnabled);
                showToast(language === 'bn' ? (!twoFactorEnabled ? "2FA চালু হয়েছে" : "2FA বন্ধ হয়েছে") : (!twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"));
              }}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'} relative`}
            >
              <motion.div
                layout
                className="w-4 h-4 bg-white rounded-full shadow-sm"
                animate={{ x: twoFactorEnabled ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Eye size={20} />
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">{language === 'bn' ? 'পাবলিক ডাটা ভিজিবিলিটি' : 'Public Data Visibility'}</p>
                <p className="text-xs text-[var(--text-muted)]">{language === 'bn' ? 'অন্যরা আপনার তথ্য দেখতে পারবে কি না' : 'Allow others to see your info'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setDataVisible(!dataVisible);
                showToast(language === 'bn' ? (!dataVisible ? "ডাটা এখন পাবলিক" : "ডাটা এখন প্রাইভেট") : (!dataVisible ? "Data is now public" : "Data is now private"));
              }}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${dataVisible ? 'bg-purple-500' : 'bg-gray-300'} relative`}
            >
              <motion.div
                layout
                className="w-4 h-4 bg-white rounded-full shadow-sm"
                animate={{ x: dataVisible ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderNotificationSettings = () => (
    <motion.div
      key="notifications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('main')}
          className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--bg)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--text)]" />
        </button>
        <h2 className="text-xl font-bold text-[var(--text)]">{t.notifications}</h2>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">{language === 'bn' ? 'পুশ নোটিফিকেশন' : 'Push Notifications'}</p>
              <p className="text-xs text-[var(--text-muted)]">{language === 'bn' ? 'অ্যাপের ভেতর অ্যালার্ট পান' : 'Receive alerts within the app'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPushEnabled(!pushEnabled);
              showToast(language === 'bn' ? (!pushEnabled ? "পুশ নোটিফিকেশন চালু" : "পুশ নোটিফিকেশন বন্ধ") : (!pushEnabled ? "Push enabled" : "Push disabled"));
            }}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${pushEnabled ? 'bg-amber-500' : 'bg-gray-300'} relative`}
          >
            <motion.div
              layout
              className="w-4 h-4 bg-white rounded-full shadow-sm"
              animate={{ x: pushEnabled ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <MailIcon size={20} />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">{language === 'bn' ? 'ইমেইল অ্যালার্ট' : 'Email Alerts'}</p>
              <p className="text-xs text-[var(--text-muted)]">{language === 'bn' ? 'গুরুত্বপূর্ণ আপডেটের ইমেইল পান' : 'Receive emails for important updates'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEmailAlertsEnabled(!emailAlertsEnabled);
              showToast(language === 'bn' ? (!emailAlertsEnabled ? "ইমেইল অ্যালার্ট চালু" : "ইমেইল অ্যালার্ট বন্ধ") : (!emailAlertsEnabled ? "Email alerts enabled" : "Email alerts disabled"));
            }}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${emailAlertsEnabled ? 'bg-blue-500' : 'bg-gray-300'} relative`}
          >
            <motion.div
              layout
              className="w-4 h-4 bg-white rounded-full shadow-sm"
              animate={{ x: emailAlertsEnabled ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Volume2 size={20} />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">{language === 'bn' ? 'অ্যাপ সাউন্ড' : 'App Sounds'}</p>
              <p className="text-xs text-[var(--text-muted)]">{language === 'bn' ? 'মেসেজ আসলে সাউন্ড হবে' : 'Play sounds for new messages'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              showToast(language === 'bn' ? (!soundEnabled ? "সাউন্ড চালু" : "সাউন্ড বন্ধ") : (!soundEnabled ? "Sounds enabled" : "Sounds disabled"));
            }}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-rose-500' : 'bg-gray-300'} relative`}
          >
            <motion.div
              layout
              className="w-4 h-4 bg-white rounded-full shadow-sm"
              animate={{ x: soundEnabled ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderMemorySettings = () => (
    <motion.div
      key="memory"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('main')}
          className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--bg)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--text)]" />
        </button>
        <h2 className="text-xl font-bold text-[var(--text)]">{language === 'bn' ? 'মেমরি (Memory)' : 'Memory & Personalization'}</h2>
      </div>

      <form onSubmit={handleUpdateMemory} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <Brain size={20} />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">{language === 'bn' ? 'এআই-কে আপনার সম্পর্কে জানান' : 'Tell AI about yourself'}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {language === 'bn' 
                  ? 'আপনার নাম, পছন্দ, অপছন্দ, পরীক্ষার তারিখ বা এআই কেমন আচরণ করবে তা এখানে লিখে রাখুন। এআই এগুলো মনে রাখবে।' 
                  : 'Write down your name, likes, dislikes, exam dates, or how AI should behave. AI will remember this.'}
              </p>
            </div>
          </div>
          
          <textarea
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value)}
            rows={8}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder={language === 'bn' 
              ? 'যেমন: আমার নাম প্রীতম। আমার সামনে এইচএসসি পরীক্ষা। আমি ছোট উত্তর পছন্দ করি। আমাকে তুমি করে বলবে...' 
              : 'Example: My name is Pretom. I have exams coming up. I prefer short answers...'}
          />
        </div>

        <button
          type="submit"
          disabled={isUpdatingMemory}
          className="w-full bg-primary text-white font-medium py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isUpdatingMemory ? (language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (language === 'bn' ? 'সেভ করুন' : 'Save Memory')}
        </button>

        {onOpenOnboarding && (
          <div className="pt-4 border-t border-[var(--border)] text-center">
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-semibold transition-all"
            >
              {language === 'bn' ? '⚙️ পুনরায় AI সেটআপ উইজার্ড চালু করুন' : '⚙️ Re-run AI Setup Wizard'}
            </button>
          </div>
        )}
      </form>
    </motion.div>
  );

  return (
    <div className="p-6 md:p-12 h-full overflow-y-auto relative z-10 w-full">
      <div className="max-w-3xl mx-auto pt-4 md:pt-10">
        {activeTab === 'main' && (
          <motion.h1 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl sm:text-6xl font-display font-semibold text-[var(--text)] mb-10 tracking-tight"
          >
            {t.settings}
          </motion.h1>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'main' && renderMainSettings()}
          {activeTab === 'profile' && renderProfileSettings()}
          {activeTab === 'privacy' && renderPrivacySettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'memory' && renderMemorySettings()}
        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-full px-6 py-3 flex items-center gap-3 z-50"
          >
            <span className="text-[var(--text)] text-sm font-medium">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
