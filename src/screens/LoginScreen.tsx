import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, signInAnonymously, GoogleAuthProvider } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, googleProvider } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { languages, Language } from '../lib/i18n';
import { Mail, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export default function LoginScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsLoading(true);
      
      // For PWABuilder (TWA) or standalone PWA, signInWithRedirect is often much safer than popup
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          await signInWithCredential(auth, credential);
        }
      } else if (isStandalone || isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error("Login failed", error);
      if (error instanceof FirebaseError && error.code === 'auth/unauthorized-domain') {
        setError(
          language === 'bn'
            ? 'এই ডোমেইনটি ফায়ারবেসে অনুমোদিত নয়। অনুগ্রহ করে "Test Login" ব্যবহার করুন অথবা ইমেইল দিয়ে সাইন ইন করুন।'
            : 'This preview domain is not listed in Firebase Authorized Domains (auth/unauthorized-domain). Please click "Test Login" or use Email & Password below.'
        );
      } else if (error instanceof FirebaseError) {
        setError(getErrorMessage(error.code));
      } else {
        setError(t.errorDefault);
      }
      setIsLoading(false); // Only set here, redirect navigation will cancel the spinner anyway
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return t.errorInvalidEmail;
      case 'auth/user-not-found':
        return t.errorUserNotFound;
      case 'auth/wrong-password':
        return t.errorWrongPassword;
      case 'auth/invalid-credential':
        return t.errorInvalidCredential;
      case 'auth/email-already-in-use':
        return t.errorEmailInUse;
      case 'auth/weak-password':
        return t.errorWeakPassword;
      case 'auth/unauthorized-domain':
        return language === 'bn'
          ? 'ফায়ারবেস অনুমোদিত ডোমেইন নয়। অনুগ্রহ করে "Test Login" বা ইমেইল সাইন ইন ব্যবহার করুন।'
          : 'Domain not authorized in Firebase Console. Please click "Test Login" or use Email Sign-in.';
      default:
        return t.errorDefault;
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signInWithEmailAndPassword({ email, password });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Email sign in failed", error);
      if (error instanceof FirebaseError) {
        setError(getErrorMessage(error.code));
      } else {
        setError(t.errorDefault);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.createUserWithEmailAndPassword({ email, password });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Email sign up failed", error);
      if (error instanceof FirebaseError) {
        setError(getErrorMessage(error.code));
      } else {
        setError(t.errorDefault);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    setError('');
    const testEmail = 'test@nexara.com';
    const testPassword = 'testpassword123';
    try {
      console.log('Attempting sign in with test credentials...');
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signInWithEmailAndPassword({ email: testEmail, password: testPassword });
      } else {
        await signInWithEmailAndPassword(auth, testEmail, testPassword);
      }
      console.log('Sign in successful!');
    } catch (error) {
      console.log('Sign in failed, attempting to create account...', error);
      try {
        if (Capacitor.isNativePlatform()) {
          await FirebaseAuthentication.createUserWithEmailAndPassword({ email: testEmail, password: testPassword });
        } else {
          await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        }
        console.log('Account created successfully!');
      } catch (createError) {
        console.log('Test account creation failed, attempting anonymous sign in...', createError);
        try {
          await signInAnonymously(auth);
          console.log('Signed in anonymously!');
        } catch (anonError) {
          console.error('Anonymous sign in failed', anonError);
          if (anonError instanceof FirebaseError) {
            setError(getErrorMessage(anonError.code) + ' (' + anonError.code + ')');
          } else if (anonError instanceof Error) {
            setError(anonError.message);
          } else {
            setError(t.errorDefault);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center bg-[var(--bg)] text-[var(--text)] overflow-hidden p-4 font-sans">
      {/* Modern ambient background */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <div 
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] animate-pulse mix-blend-screen dark:mix-blend-lighten" 
          style={{ animationDuration: '10s' }} 
        />
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[120px] animate-pulse mix-blend-screen dark:mix-blend-lighten" 
          style={{ animationDuration: '12s', animationDelay: '1s' }} 
        />
        {/* Subtle dot pattern grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
      </div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="bg-[var(--glass-bg)] backdrop-blur-3xl border border-[var(--glass-border)] rounded-[2.5rem] shadow-[var(--shadow-premium)] p-8 sm:p-10 relative overflow-hidden group/card text-center">
          
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"></div>
          
          {/* Animated subtle glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/0 via-purple-500/5 to-pink-500/0 opacity-0 group-[.group/card]:hover:opacity-100 transition-opacity duration-1000 blur-xl pointer-events-none" />

          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8 relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
              className="relative group mb-6"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-[20px] transition-colors duration-500" />
              <div className="relative w-24 h-24 bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-xl rounded-3xl flex items-center justify-center p-2 overflow-hidden">
                <img src="/logo.png" alt="Nexara AI" className="w-full h-full object-cover rounded-2xl drop-shadow-md" />
              </div>
            </motion.div>
            <h1 className="text-4xl font-display font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[var(--text)] to-[var(--text-muted)]">Nexara AI</h1>
            <p className="text-[var(--text-muted)] text-[15px] font-medium tracking-wide">{t.loginToContinue}</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden relative z-10"
              >
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[14px] flex items-start gap-3 text-red-500/90 backdrop-blur-sm shadow-inner text-left">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-[13px] font-medium leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-4 mb-6 relative z-10 text-left" onSubmit={handleEmailSignIn}>
            <div className="space-y-3">
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within/input:text-indigo-500 transition-colors duration-300">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.email}
                  required
                  className="w-full bg-[var(--bg)]/50 backdrop-blur-md border border-[var(--glass-border)] focus:border-indigo-500/50 text-[var(--text)] rounded-[14px] py-3.5 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-[var(--text-muted)] text-[15px] font-medium shadow-inner"
                />
              </div>

              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within/input:text-indigo-500 transition-colors duration-300">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.password}
                  required
                  minLength={6}
                  className="w-full bg-[var(--bg)]/50 backdrop-blur-md border border-[var(--glass-border)] focus:border-indigo-500/50 text-[var(--text)] rounded-[14px] py-3.5 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-[var(--text-muted)] text-[15px] font-medium shadow-inner"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="flex-1 w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3.5 rounded-[14px] hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm flex items-center justify-center gap-2 group/btn border border-white/10"
              >
                {t.signInEmail} <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button
                type="button"
                onClick={handleEmailSignUp}
                disabled={isLoading || !email || !password}
                className="flex-1 w-full sm:w-auto bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] text-[var(--text)] font-semibold py-3.5 rounded-[14px] hover:bg-[var(--hover)] hover:border-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:shadow-sm"
              >
                {t.signUpEmail}
              </button>
            </div>
          </form>

          <div className="flex items-center gap-4 mb-6 relative z-10 w-full">
            <div className="flex-1 h-px bg-[var(--border)] relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--text-muted)] to-transparent opacity-20" />
            </div>
            <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest px-2 mix-blend-difference">{t.or}</span>
            <div className="flex-1 h-px bg-[var(--border)] relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--text-muted)] to-transparent opacity-20" />
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full relative overflow-hidden flex items-center justify-center gap-3 px-6 py-3.5 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[14px] hover:bg-[var(--hover)] hover:border-indigo-500/30 hover:shadow-md transition-all active:scale-[0.98] mb-4 group/google"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover/google:opacity-100 transform translate-x-[-100%] group-hover/google:translate-x-[100%] transition-all duration-700"></div>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover/google:scale-110 transition-transform" />
            <span className="font-semibold text-[15px] text-[var(--text)]">{t.signInGoogle}</span>
          </button>

          <button
            onClick={handleTestLogin}
            disabled={isLoading}
            type="button"
            className="w-full relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--bg)] backdrop-blur-md border border-indigo-500/20 rounded-[14px] hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:shadow-md transition-all active:scale-[0.98] group/test disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={18} className="text-indigo-500 group-hover/test:text-indigo-400 group-hover/test:scale-110 transition-transform" />
            <span className="font-semibold text-[15px] text-indigo-500 group-hover/test:text-indigo-400">Test Login</span>
          </button>
        </div>

        {/* Floating Language Selection Bottom */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex flex-col items-center justify-center"
        >
          <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
            {Object.entries(languages).map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLanguage(code as Language)}
                className={`px-3.5 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${
                  language === code 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105 border border-primary' 
                    : 'bg-[var(--card)]/50 backdrop-blur-md border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
