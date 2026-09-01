import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, Bot, User as UserIcon, Volume2, Square, X, Sparkles, FileText, Search, Image as ImageIcon, History, Plus, Copy, Check, Download, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useLanguage } from '../context/LanguageContext';
import { StatusIndicator } from '../components/StatusIndicator';
import { 
  requestNotificationPermission, 
  startBackgroundGeneration, 
  updateBackgroundStatus, 
  finishBackgroundGeneration 
} from '../lib/backgroundManager';
import { extractArtifactsFromText } from '../lib/artifactExtractor';
import { FileArtifactCard } from '../components/FileArtifactCard';
import { CodePreviewDrawer } from '../components/CodePreviewDrawer';
import { exportAsMarkdown } from '../lib/fileExporter';
import { ArtifactProject, DrawerState } from '../types/artifact';
import { useSmoothStream } from '../hooks/useSmoothStream';

export function parseFrontendError(err: any): string {
  if (!err) return "An unknown error occurred.";
  
  let msg = "";
  if (typeof err === "string") {
    const trimmed = err.trim();
    if (trimmed === "[object Object]") return "An unexpected error occurred.";
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseFrontendError(parsed);
      } catch {
        msg = trimmed;
      }
    } else {
      msg = trimmed;
    }
  } else if (typeof err === "object") {
    if (err.error) {
      return parseFrontendError(err.error);
    }
    if (typeof err.message === "string" && err.message && err.message !== "[object Object]") {
      msg = err.message;
    } else if (typeof err.message === "object" && err.message) {
      return parseFrontendError(err.message);
    } else if (typeof err.detail === "string") {
      msg = err.detail;
    } else if (typeof err.msg === "string") {
      msg = err.msg;
    } else {
      try {
        const jsonStr = JSON.stringify(err);
        if (jsonStr && jsonStr !== "{}" && jsonStr !== "[object Object]") {
          msg = jsonStr;
        }
      } catch {
        // Fall through
      }
    }
  }

  if (!msg) {
    const str = String(err);
    msg = str !== "[object Object]" ? str : "An unexpected error occurred.";
  }

  const lower = msg.toLowerCase();
  if (lower.includes("free-models-per-day") || (lower.includes("429") && lower.includes("rate limit"))) {
    return "The default OpenRouter daily free quota has been reached. Please add your own OpenRouter API Key in Settings (⚙️) to continue seamlessly.";
  }

  return msg;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  image?: string;
}

interface ChatScreenProps {
  initialPrompt?: string;
  clearInitialPrompt?: () => void;
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  setCurrentScreen: (screen: string) => void;
}

const MessageItem = React.memo(({ msg, isCurrentlySpeaking, copiedId, scrollToBottom, toggleSpeech, handleCopy, onOpenPreview }: {
  msg: Message,
  isCurrentlySpeaking: boolean,
  copiedId: string | null,
  scrollToBottom: () => void,
  toggleSpeech: (text: string, id: string) => void,
  handleCopy: (text: string, id: string) => void,
  onOpenPreview?: (project: ArtifactProject, fileId?: string) => void
}) => {
  const [isAnimating, setIsAnimating] = useState(() => {
    if (msg.sender === 'ai') {
      if (!msg.timestamp) return true;
      const now = Date.now();
      const msgTime = (msg.timestamp as any)?.toMillis ? (msg.timestamp as any).toMillis() : (typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp as any).getTime());
      if (msgTime && now - msgTime < 2000) return true;
    }
    return false;
  });

  const smoothText = useSmoothStream(msg.text, isAnimating);

  useEffect(() => {
    if (isAnimating) {
      scrollToBottom();
      if (smoothText === msg.text) {
        setIsAnimating(false);
      }
    }
  }, [smoothText, msg.text, isAnimating, scrollToBottom]);

  // Extract structured file artifacts (code files / project bundles)
  const artifactProject = React.useMemo(() => {
    if (msg.sender === 'ai' && msg.text) {
      return extractArtifactsFromText(msg.text, msg.id);
    }
    return null;
  }, [msg.sender, msg.text, msg.id]);

  const formattedTime = msg.timestamp ? new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format((msg.timestamp as any)?.toDate ? (msg.timestamp as any).toDate() : new Date(msg.timestamp as any)) : '';

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group/wrapper`}
    >
      <div className={`flex gap-3 w-full ${msg.sender === 'user' ? 'justify-end max-w-[85%]' : 'max-w-full items-start'}`}>
        {/* Avatar */}
        {msg.sender === 'ai' && (
          <div className="flex-shrink-0 w-9 h-9 rounded-[12px] flex items-center justify-center overflow-hidden bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-sm mt-1 z-10 transition-transform hover:scale-105">
            <img src="/logo.png" alt="AI" className="w-full h-full object-cover rounded-[10px]" />
          </div>
        )}
        
        {/* Message Content */}
        <div className={`flex flex-col gap-1.5 min-w-0 group relative ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
          <div
            className={`relative px-5 py-4 border ${
              msg.sender === 'user'
                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 text-white border-transparent rounded-[24px] rounded-tr-[6px] shadow-[0_8px_24px_rgba(99,102,241,0.25)]'
                : 'bg-[var(--glass-bg)] backdrop-blur-2xl text-[var(--text)] border-[var(--glass-border)] rounded-[24px] rounded-tl-[6px] shadow-sm'
            }`}
          >
            {msg.image && (
              <div className="mb-4 rounded-[14px] overflow-hidden max-w-sm border border-white/20 shadow-lg relative group-hover:shadow-xl transition-all">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
                <img src={msg.image} alt="Uploaded" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" onLoad={scrollToBottom} />
              </div>
            )}
            {msg.sender === 'user' ? (
              <p className="leading-relaxed whitespace-pre-wrap break-words text-[15px] font-medium">{msg.text}</p>
            ) : (
              <div className="markdown-body leading-relaxed max-w-none text-[var(--text)] break-words text-[15px]">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a({ node, children, href, ...props }: any) {
                      return (
                        <a 
                          {...props} 
                          href={href}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary underline font-semibold hover:opacity-80 transition-opacity break-all inline-flex items-center gap-1"
                        >
                          {children}
                        </a>
                      );
                    },
                    img(props) {
                      return <img {...props} className="max-w-full h-auto rounded-xl my-4 shadow-md border border-[var(--border)]" loading="lazy" />;
                    },
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      const isDark = document.documentElement.className.includes('dark')
                      return !inline && match ? (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="my-3 overflow-hidden rounded-xl shadow-md border border-[var(--border)]"
                        >
                          <SyntaxHighlighter
                            {...props}
                            children={String(children).replace(/\n$/, '')}
                            style={isDark ? vscDarkPlus : vs as any}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, padding: '0.85rem', fontSize: '0.825rem' }}
                          />
                        </motion.div>
                      ) : (
                        <code {...props} className={`${className} bg-[var(--text)]/10 text-primary font-mono font-bold px-1.5 py-0.5 rounded-md`}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {isAnimating ? smoothText : msg.text}
                </ReactMarkdown>

                {/* Glowing cyan/emerald pill cursor while streaming/animating */}
                {isAnimating && (
                  <span className="nexara-glowing-cursor" title="Nexara AI is typing..." />
                )}

                {/* Inline Dynamic File Artifact Card */}
                {artifactProject && onOpenPreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <FileArtifactCard 
                      project={artifactProject} 
                      onOpenPreview={onOpenPreview} 
                    />
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover/wrapper:opacity-100 transition-opacity duration-300 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-[10px] text-[var(--text-muted)] font-medium px-1">
              {formattedTime}
            </span>
            
            <div className={`flex items-center gap-1 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
               {/* TTS button for all messages */}
               <button
                 onClick={() => toggleSpeech(msg.text, msg.id)}
                 className={`p-1 rounded-[6px] transition-colors ${isCurrentlySpeaking ? 'text-primary bg-primary/10' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'}`}
                 title={isCurrentlySpeaking ? "Stop reading" : "Read aloud"}
               >
                 {isCurrentlySpeaking ? <Square size={12} className="fill-current" /> : <Volume2 size={12} />}
               </button>
              <button
                onClick={() => handleCopy(msg.text, msg.id)}
                className="p-1 rounded-[6px] transition-colors text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                title="Copy to clipboard"
              >
                {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
              {msg.sender === 'ai' && (
                <button
                  onClick={() => exportAsMarkdown(`nexara_response_${msg.id.substring(0, 6)}`, msg.text)}
                  className="p-1 rounded-[6px] transition-colors text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                  title="Export message as Markdown"
                >
                  <Download size={12} />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
});

export default function ChatScreen({ initialPrompt, clearInitialPrompt, currentChatId, setCurrentChatId, setCurrentScreen }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusTool, setStatusTool] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMemory, setUserMemory] = useState<string>('');
  const [voiceCommands, setVoiceCommands] = useState<string[]>([]);
  const [showVoiceCommands, setShowVoiceCommands] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    project: null,
    activeFileId: null
  });

  const handleOpenPreview = (project: ArtifactProject, fileId?: string) => {
    setDrawerState({
      isOpen: true,
      project,
      activeFileId: fileId || project.files[0]?.id || null
    });
  };
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const baseInputRef = useRef<string>('');

  useEffect(() => {
    // Focus the input when chat screen is opened
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Keyboard Shortcuts (Cmd/Ctrl + K, Cmd/Ctrl + /, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K => Open new chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCurrentChatId(null);
        setMessages([]);
        setInput('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
        return;
      }

      // Cmd/Ctrl + / => Focus Search Bar or Prompt Input
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        } else if (inputRef.current) {
          inputRef.current.focus();
        }
        return;
      }

      // Esc => Close active drawers or modals
      if (e.key === 'Escape') {
        if (drawerState.isOpen) {
          setDrawerState({ isOpen: false, project: null, activeFileId: null });
        } else if (showSummaryModal) {
          setShowSummaryModal(false);
        } else if (showVoiceCommands) {
          setShowVoiceCommands(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerState.isOpen, showSummaryModal, showVoiceCommands, setCurrentChatId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const userId = auth.currentUser?.uid;
  const { language, t } = useLanguage();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const smoothStreamingText = useSmoothStream(streamingText, isTyping);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isNearBottom) {
      setUserHasScrolled(false);
      setShowScrollBottomBtn(false);
    } else {
      setUserHasScrolled(true);
      setShowScrollBottomBtn(true);
    }
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (userHasScrolled && !force) return;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [userHasScrolled]);

  useEffect(() => {
    if (!userHasScrolled) {
      scrollToBottom();
    }
  }, [messages, isTyping, smoothStreamingText, scrollToBottom, userHasScrolled]);

  useEffect(() => {
    if (userId) {
      const fetchMemory = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setUserMemory(userDoc.data().memory || '');
          }
        } catch (error) {
          console.error("Error fetching memory:", error);
        }
      };
      fetchMemory();
    }
  }, [userId]);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      if (clearInitialPrompt) {
        clearInitialPrompt();
      }
    }
  }, [initialPrompt, clearInitialPrompt]);

  useEffect(() => {
    // Pre-load voices for browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const latestPropsRef = useRef({
    setCurrentScreen,
    setCurrentChatId,
    handleSend: (text?: string, systemPromptOverride?: string, temperature?: number) => {},
    isSpeaking
  });

  useEffect(() => {
    latestPropsRef.current = {
      setCurrentScreen,
      setCurrentChatId,
      handleSend,
      isSpeaking
    };
  });

  // Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }
    
    setIsSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // continuous false is most reliable across desktop and mobile
    recognition.interimResults = true;
    
    const langMap: Record<string, string> = {
      en: 'en-US', bn: 'bn-BD', zh: 'zh-CN', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR'
    };
    
    // Support English and Bengali dynamically based on app language or browser settings
    const browserLang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    const activeLang = langMap[language] || (browserLang.startsWith('bn') ? 'bn-BD' : 'en-US');
    recognition.lang = activeLang;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        const transcriptText = finalTranscript.trim();
        
        setVoiceCommands(prev => {
          const newHistory = [transcriptText, ...prev.filter(t => t.toLowerCase() !== transcriptText.toLowerCase())].slice(0, 10);
          return newHistory;
        });

        const lowerTranscript = transcriptText.toLowerCase();
        
        // Voice Commands
        if (lowerTranscript === 'send message' || lowerTranscript === 'send' || lowerTranscript === 'মেসেজ পাঠান' || lowerTranscript === 'পাঠান') {
          latestPropsRef.current.handleSend(baseInputRef.current);
          return;
        } else if (lowerTranscript === 'start new chat' || lowerTranscript === 'new chat' || lowerTranscript === 'নতুন চ্যাট' || lowerTranscript === 'নতুন চ্যাট শুরু করুন') {
          latestPropsRef.current.setCurrentChatId(null);
          setInput('');
          baseInputRef.current = '';
          return;
        } else if (lowerTranscript === 'go to settings' || lowerTranscript === 'open settings' || lowerTranscript === 'সেটিংসে যান' || lowerTranscript === 'সেটিংস খুলুন') {
          latestPropsRef.current.setCurrentScreen('settings');
          return;
        } else if (lowerTranscript === 'go to dashboard' || lowerTranscript === 'open dashboard' || lowerTranscript === 'ড্যাশবোর্ডে যান' || lowerTranscript === 'ড্যাশবোর্ড খুলুন') {
          latestPropsRef.current.setCurrentScreen('dashboard');
          return;
        } else if (lowerTranscript === 'stop reading' || lowerTranscript === 'stop playback' || lowerTranscript === 'পড়া বন্ধ করুন' || lowerTranscript === 'থামুন') {
          window.speechSynthesis.cancel();
          if (currentSourceRef.current) {
            currentSourceRef.current.stop();
            currentSourceRef.current.disconnect();
            currentSourceRef.current = null;
          }
          setIsSpeaking(null);
          return;
        }

        baseInputRef.current = (baseInputRef.current + ' ' + finalTranscript).trim();
        setInput(baseInputRef.current);
      } else if (interimTranscript) {
        setInput((baseInputRef.current + ' ' + interimTranscript).trim());
      }

      // Auto-resize textarea live as user speaks
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert(language === 'bn' ? "মাইক্রোফোন অ্যাক্সেস বন্ধ রয়েছে। ব্রাউজার সেটিংসে গিয়ে মাইক্রোফোন পারমিশন এলাউ করুন।" : "Microphone access was denied. Please allow microphone permissions in your browser settings.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
          currentSourceRef.current.disconnect();
        } catch (e) {}
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
      window.speechSynthesis.cancel();
    };
  }, [language]);

  const toggleListening = () => {
    if (!isSpeechSupported) {
      alert(language === 'bn' ? "আপনার ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয়। অনুগ্রহ করে গুগল ক্রোম ব্যবহার করুন।" : "Speech recognition is not supported in this browser. Please try using Google Chrome or another modern browser.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          setIsListening(true);
          baseInputRef.current = input;
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Could not start speech recognition:", e);
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              try { 
                recognitionRef.current.start(); 
              } catch(err) { 
                setIsListening(false); 
              }
            }, 100);
          } catch(err) {
            setIsListening(false);
          }
        }
      }
    }
  };

  const playPcmAudio = async (base64Audio: string, messageId: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Stop current
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      }

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // The audio is 16-bit PCM, 24000 Hz, mono.
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        setIsSpeaking(null);
        currentSourceRef.current = null;
      };

      currentSourceRef.current = source;
      setIsSpeaking(messageId);
      source.start(0);
      
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsSpeaking(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSpeech = async (text: string, messageId: string) => {
    if (isSpeaking === messageId) {
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
        currentSourceRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    setIsSpeaking(messageId); // Loading state

    try {
      // Fetch active API key
      let activeApiKey = '';
      try {
        const apikeysRef = doc(db, 'settings', 'apikeys');
        const apikeysSnap = await getDoc(apikeysRef);
        if (apikeysSnap.exists()) {
          const keys = apikeysSnap.data().keys || [];
          if (keys.length > 0) activeApiKey = keys[0];
        }
      } catch (e) {
        console.warn("Could not read API keys from Firestore", e);
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, apiKey: activeApiKey, language })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch TTS: ' + response.statusText);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from API");
      }
      const data = await response.json();
      if (data.audio) {
        await playPcmAudio(data.audio, messageId);
      } else {
        throw new Error('No audio returned');
      }
    } catch (error) {
      // Silently fall back to browser TTS
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langMap: Record<string, string> = {
          en: 'en-US', bn: 'bn-BD', zh: 'zh-CN', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR'
        };
        utterance.lang = langMap[language] || 'en-US';
        
        // Try to find a clear male voice
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const langVoices = voices.filter(v => v.lang.startsWith(utterance.lang.split('-')[0]));
          const maleVoice = langVoices.find(v => 
            v.name.toLowerCase().includes('male') || 
            v.name.toLowerCase().includes('guy') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('mark')
          );
          if (maleVoice) {
            utterance.voice = maleVoice;
          } else if (langVoices.length > 0) {
            utterance.voice = langVoices[0];
          }
        }
        
        utterance.rate = 0.95; // Slightly slower for clarity
        utterance.pitch = 0.9; // Slightly lower pitch for a more masculine tone
        
        utterance.onstart = () => setIsSpeaking(messageId);
        utterance.onend = () => setIsSpeaking(null);
        utterance.onerror = () => setIsSpeaking(null);

        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(null);
        alert("Text-to-speech is not supported in your browser.");
      }
    }
  };

  useEffect(() => {
    if (!userId) return;
    if (!currentChatId) {
      setMessages([]);
      return;
    }
    
    const path = `users/${userId}/chats/${currentChatId}/messages`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          text: data.text,
          sender: data.sender,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          image: data.image,
        });
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Firestore LIST error (rules may not be configured):", error);
    });

    return () => unsubscribe();
  }, [userId, currentChatId]);

  const handleSummarizeChat = async () => {
    if (messages.length === 0 || !userId) return;
    setIsSummarizing(true);
    try {
      const conversation = messages.map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n\n');
      const prompt = `Please provide a concise and comprehensive summary of the following conversation:\n\n${conversation}`;

      // Fetch active API key
      let activeApiKey = '';
      try {
        const apikeysRef = doc(db, 'settings', 'apikeys');
        const apikeysSnap = await getDoc(apikeysRef);
        if (apikeysSnap.exists()) {
          const keys = apikeysSnap.data().keys || [];
          if (keys.length > 0) activeApiKey = keys[0];
        }
      } catch (e) {
        console.warn("Could not read API keys from Firestore", e);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          language,
          apiKey: activeApiKey,
          memory: '' // No memory needed for summary
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(parseFrontendError(errorData) || `Failed to fetch summary (Status: ${response.status})`);
        } else {
          const textError = await response.text().catch(() => "");
          console.error("Non-JSON Error Response:", textError);
          throw new Error(`Failed to fetch summary (Status: ${response.status}). The server returned an invalid response.`);
        }
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text().catch(() => "");
        console.error("Non-JSON Success Response:", textResponse);
        throw new Error("Received non-JSON response from API");
      }
      const data = await response.json();
      setSummaryText(data.reply);
      setShowSummaryModal(true);
    } catch (error: any) {
      console.error("Error summarizing chat:", error);
      const errMsg = parseFrontendError(error);
      alert(errMsg || (language === 'bn' ? "সারসংক্ষেপ তৈরি করতে সমস্যা হয়েছে।" : "Failed to summarize chat. Please try again."));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      alert(language === 'bn' ? 'সাপোর্টেড ফরম্যাট: JPG, PNG, WEBP.' : 'Unsupported image format. Please upload JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'bn' ? 'ছবির সাইজ ১০ এমবি এর বেশি হতে পারবে না।' : 'The image is too large. Maximum file size is 10 MB.');
      return;
    }
    setSelectedImageName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setSelectedImage(compressedDataUrl);
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (textOverride?: string, systemPromptOverride?: string, temperature?: number) => {
    const text = textOverride || input;
    if (!text.trim() && !selectedImage) return;
    if (!userId) return;

    let usedVoice = false;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      usedVoice = true;
    }

    const currentImage = selectedImage;
    setInput('');
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }
    setSelectedImage(null);
    setSelectedImageName(null);
    baseInputRef.current = '';
    setIsTyping(true);
    const initialStatusText = language === 'bn' ? 'নেক্সারা এআই ভাবছে...' : 'Nexara AI is thinking...';
    setStatusMessage(initialStatusText);
    setStatusTool('thinking');
    setStreamingText('');

    // Trigger notification permission & background tab processing
    requestNotificationPermission();
    startBackgroundGeneration(initialStatusText);

    let chatId = currentChatId;
    try {
      if (!chatId) {
        // Create new chat
        const chatRef = await addDoc(collection(db, `users/${userId}/chats`), {
          title: text ? text.substring(0, 30) + (text.length > 30 ? '...' : '') : 'Image Chat',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        chatId = chatRef.id;
        setCurrentChatId(chatId);
      } else {
        // Update existing chat updatedAt
        await updateDoc(doc(db, `users/${userId}/chats`, chatId), {
          updatedAt: serverTimestamp()
        });
      }

      const path = `users/${userId}/chats/${chatId}/messages`;
      
      // Save user message
      const userMessageData: any = {
        text: text,
        sender: 'user',
        timestamp: serverTimestamp()
      };
      if (currentImage) {
        userMessageData.image = currentImage;
      }
      await addDoc(collection(db, path), userMessageData);

      // Prepare messages for Groq
      const groqMessages = messages.map(m => {
        if (m.image && m.sender === 'user') {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.text || ' ' },
              { type: 'image_url', image_url: { url: m.image } }
            ]
          };
        }
        return {
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        };
      });
      
      if (currentImage) {
        groqMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: text || ' ' },
            { type: 'image_url', image_url: { url: currentImage } }
          ]
        });
      } else {
        groqMessages.push({ role: 'user', content: text });
      }

      // Fetch active API key from Firestore
      let activeApiKey = '';
      try {
        const apikeysRef = doc(db, 'settings', 'apikeys');
        const apikeysSnap = await getDoc(apikeysRef);
        if (apikeysSnap.exists()) {
          const keys = apikeysSnap.data().keys || [];
          if (keys.length > 0) {
            activeApiKey = keys[0];
          }
        }
      } catch (keyError) {
        console.warn("Could not read API keys from Firestore, falling back to environment variable.", keyError);
      }

      // Fetch from AI backend with streaming support
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json'
        },
        body: JSON.stringify({ 
          messages: groqMessages, 
          language, 
          apiKey: activeApiKey, 
          memory: userMemory,
          systemPromptOverride,
          temperature,
          stream: true
        })
      });

      if (!response.ok) {
        if (response.status === 413) {
           const sizeErrMsg = language === 'bn' ? "ছবির সাইজ অনেক বড়। দয়া করে ছোট সাইজের ছবি আপলোড করুন।" : "The image is too large. Please upload a smaller image.";
           throw new Error(sizeErrMsg);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json().catch(() => ({}));
          const cleanMsg = parseFrontendError(errorData) || `Failed to fetch AI response (Status: ${response.status})`;
          throw new Error(cleanMsg);
        } else {
          const textError = await response.text().catch(() => "");
          console.error("Non-JSON Error Response:", textError);
          throw new Error(`Failed to fetch AI response (Status: ${response.status}). The server returned an invalid response.`);
        }
      }
      
      const contentType = response.headers.get("content-type");
      let replyText = "";
      let generatedImage = null;

      if (contentType && contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.error) {
                throw new Error(parseFrontendError(data.error));
              }
              if (data.status) {
                setStatusMessage(data.status);
                updateBackgroundStatus(data.status);
                if (data.tool) {
                  setStatusTool(data.tool);
                }
              }
              if (data.chunk) {
                replyText += data.chunk;
                setStreamingText(replyText);
                
                // Real-time dynamic action state fallback
                if (replyText.includes('```') || replyText.includes('filename=')) {
                  const codeStatus = language === 'bn' ? 'কোড তৈরি করা হচ্ছে...' : 'Writing code...';
                  setStatusMessage(codeStatus);
                  setStatusTool('code_gen');
                  updateBackgroundStatus(codeStatus);
                } else if (replyText.trim().length > 0 && (!data.tool || data.tool === 'thinking')) {
                  const writingStatus = language === 'bn' ? 'উত্তর লেখা হচ্ছে...' : 'Writing response...';
                  setStatusMessage(writingStatus);
                  setStatusTool('writing');
                  updateBackgroundStatus(writingStatus);
                }
              }
              if (data.reply) {
                replyText = data.reply;
                setStreamingText(replyText);
              }
            } catch (e: any) {
              if (e.message && !e.message.includes("Unexpected token")) {
                throw e;
              }
            }
          }
        }
      } else if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        replyText = data.reply || "Sorry, I couldn't generate a response.";
        generatedImage = data.image || null;
      } else {
        const textResponse = await response.text().catch(() => "");
        console.error("Non-JSON Success Response:", textResponse);
        throw new Error("Received non-JSON response from API");
      }

      if (!replyText.trim()) {
        replyText = "Sorry, I couldn't generate a response.";
      }

      // Save normal AI response
      const aiResponseData: any = {
        text: replyText,
        sender: 'ai',
        timestamp: serverTimestamp()
      };
      
      if (generatedImage) {
        aiResponseData.image = generatedImage;
      }

      const aiDocRef = await addDoc(collection(db, path), aiResponseData);

      setIsTyping(false);
      setStatusMessage('');
      setStatusTool('');
      setStreamingText('');
      finishBackgroundGeneration(replyText);

      if (usedVoice) {
        toggleSpeech(replyText, aiDocRef.id);
      }
      
      scrollToBottom();

      } catch (error: any) {
      setIsTyping(false);
      setStatusMessage('');
      setStatusTool('');
      setStreamingText('');
      finishBackgroundGeneration();
      
      const cleanErrorMsg = parseFrontendError(error);
      
      // Check if it's an API error (not a firestore permissions error)
      if (!cleanErrorMsg.includes("permission-denied") && !cleanErrorMsg.includes("Missing or insufficient permissions")) {
        // Create an AI error bubble to display the issue
        if (chatId && userId) {
          try {
            await addDoc(collection(db, `users/${userId}/chats/${chatId}/messages`), {
              text: `⚠️ **Error:** ${cleanErrorMsg}`,
              sender: 'ai',
              timestamp: serverTimestamp()
            });
            scrollToBottom();
          } catch(e) {
            console.error("Failed to write error message to chat", e);
          }
        }
        return;
      }
      
      console.error("Firestore message write error (rules may not be configured):", error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      {/* Chat Area */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-6 md:px-8">
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col min-h-full text-center pb-12 pt-4">
            <div className="m-auto flex flex-col items-center justify-center w-full max-w-3xl">
              <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8, type: "spring", bounce: 0.4 }}
              className="relative w-32 h-32 mb-8"
            >
              {/* Pulsing ring background */}
              <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full animate-pulse z-0" />
              
              <div className="relative z-10 w-full h-full rounded-[2.5rem] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-2xl flex items-center justify-center mx-auto transform rotate-[-2deg] hover:rotate-3 transition-transform duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-10" />
                <img src="/logo.png" alt="Nexara AI" className="w-full h-full object-cover rounded-[2.5rem] drop-shadow-2xl" />
              </div>
            </motion.div>
            <motion.h2 
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl sm:text-6xl font-display font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            >
              {language === 'bn' ? 'আমি নেক্সারা এআই' : 'I am Nexara AI'}
            </motion.h2>
            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-lg text-[var(--text-muted)] font-medium max-w-lg mb-12"
            >
              {language === 'bn' ? 'কীভাবে আপনাকে আজকে সাহায্য করতে পারি?' : 'How can I assist you in your creative journey today?'}
            </motion.p>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4"
            >
              {[
                { 
                  icon: <Sparkles size={18}/>, 
                  en: "Generate a creative story", 
                  bn: "একটি সৃজনশীল গল্প তৈরি করুন",
                  sysPrompt: "Generate a unique, unpredictable, and highly creative short story. Randomly choose a genre (e.g., Sci-Fi, Mystery, Cyberpunk, Fantasy, or Time Travel) and invent compelling characters. Ensure it is not generic.",
                  temp: 0.85
                },
                { 
                  icon: <FileText size={18}/>, 
                  en: "Summarize a long article", 
                  bn: "একটি দীর্ঘ নিবন্ধ সারসংক্ষেপ করুন",
                  sysPrompt: "The user wants to summarize a long article. Please provide a clear, concise article summary framework or analyze an interesting topic, and invite the user to share their own article or text for you to summarize.",
                  temp: 0.7
                },
                { 
                  icon: <Search size={18}/>, 
                  en: "Find recent news about AI", 
                  bn: "এআই সম্পর্কে সাম্প্রতিক সংবাদ খুঁজুন",
                  sysPrompt: "Act as an AI news reporter. Share 3 to 5 key recent developments, breakthroughs, or insights in Artificial Intelligence. Format this in a clean, bulleted news summary format.",
                  temp: 0.75
                },
                { 
                  icon: <ImageIcon size={18}/>, 
                  en: "Write code to fetch an image", 
                  bn: "একটি চিত্র আনার জন্য কোড লিখুন",
                  sysPrompt: "Generate modern, clean, production-ready code (using JavaScript, Python, or React) to fetch and display a random image. You may use Unsplash, Pexels, or the standard Fetch API. Explain how the code works.",
                  temp: 0.7
                }
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    handleSend(language === 'bn' ? prompt.bn : prompt.en, prompt.sysPrompt, prompt.temp);
                  }}
                  className="flex items-center gap-3 p-4 bg-[var(--glass-bg)] hover:bg-[var(--hover)] border border-[var(--border)] rounded-2xl text-left transition-all hover:scale-[1.02] hover:shadow-md"
                >
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                    {prompt.icon}
                  </div>
                  <span className="text-[14px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text)]">
                    {language === 'bn' ? prompt.bn : prompt.en}
                  </span>
                </button>
              ))}
            </motion.div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <div className="relative w-full sm:w-auto flex-1 max-w-md">
                <div className="absolute inset-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={16} className="text-[var(--text-muted)]" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'bn' ? 'মেসেজ খুঁজুন...' : 'Search messages...'}
                  className="w-full pl-11 pr-12 py-2.5 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[14px] text-sm font-medium text-[var(--text)] focus:outline-none focus:ring-4 focus:ring-primary/10 hover:border-[var(--text-muted)]/30 transition-all shadow-inner"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--card)] border border-[var(--glass-border)] rounded-md shadow-sm">
                    ⌘/
                  </kbd>
                </div>
              </div>
              <button
                onClick={handleSummarizeChat}
                disabled={isSummarizing}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--card)]/80 backdrop-blur-md border border-[var(--border)] rounded-[14px] text-sm font-semibold text-[var(--text)] hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 disabled:opacity-50 whitespace-nowrap w-full sm:w-auto active:scale-[0.97]"
              >
                {isSummarizing ? (
                  <Sparkles size={16} className="animate-pulse" />
                ) : (
                  <FileText size={16} className="opacity-70 group-hover:opacity-100" />
                )}
                {isSummarizing ? (language === 'bn' ? 'সারসংক্ষেপ তৈরি হচ্ছে...' : 'Summarizing...') : (language === 'bn' ? 'চ্যাটের সারসংক্ষেপ' : 'Summarize Chat')}
              </button>
            </div>
            
            {filteredMessages.length === 0 && searchQuery ? (
              <div className="text-center text-[var(--text-muted)] py-10 font-medium bg-[var(--card)]/50 rounded-2xl border border-[var(--border)] mt-8">
                {language === 'bn' ? 'কোনো মেসেজ পাওয়া যায়নি' : 'No messages found'}
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <MessageItem 
                  key={msg.id} 
                  msg={msg} 
                  isCurrentlySpeaking={isSpeaking === msg.id} 
                  copiedId={copiedId} 
                  scrollToBottom={scrollToBottom} 
                  toggleSpeech={toggleSpeech} 
                  handleCopy={handleCopy} 
                  onOpenPreview={handleOpenPreview}
                />
              ))
            )}
          </div>
        )}
        
        {/* Typing & Dynamic Status Indicator */}
        {isTyping && (
          <div className="max-w-3xl mx-auto px-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start pt-4 mb-4"
            >
              <div className="flex w-full items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-[12px] flex items-center justify-center overflow-hidden bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-sm mt-1 z-10 transition-transform">
                  <img src="/logo.png" alt="AI Typing" className="w-full h-full object-cover rounded-[10px] animate-pulse" />
                </div>
                <div className="flex-1 max-w-[85%] sm:max-w-[88%] bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-[24px] rounded-tl-[6px] px-5 py-4 shadow-sm flex flex-col relative mt-1 text-[var(--text)]">
                  {smoothStreamingText ? (
                    <div className="markdown-body text-sm leading-relaxed mb-3">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a({ node, children, href, ...props }: any) {
                            return (
                              <a 
                                {...props} 
                                href={href}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary underline font-semibold hover:opacity-80 transition-opacity break-all inline-flex items-center gap-1"
                              >
                                {children}
                              </a>
                            );
                          },
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isDark = document.documentElement.className.includes('dark');
                            return !inline && match ? (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className="my-3 overflow-hidden rounded-xl shadow-md border border-[var(--border)]"
                              >
                                <SyntaxHighlighter
                                  style={isDark ? vscDarkPlus : (vs as any)}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ margin: 0, padding: '0.85rem', fontSize: '0.825rem' }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </motion.div>
                            ) : (
                              <code className="bg-indigo-500/10 text-primary font-mono font-semibold px-1.5 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {smoothStreamingText}
                      </ReactMarkdown>
                      <span className="nexara-glowing-cursor" title="Nexara AI is typing..." />
                    </div>
                  ) : null}

                  <div className="mt-0.5">
                    <StatusIndicator 
                      statusMessage={statusMessage || (language === 'bn' ? 'নেক্সারা এআই ভাবছে...' : 'Nexara AI is thinking...')} 
                      tool={statusTool} 
                      isStreaming={!!streamingText} 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Floating Scroll to Bottom Button */}
        <AnimatePresence>
          {showScrollBottomBtn && (
            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => {
                setUserHasScrolled(false);
                setShowScrollBottomBtn(false);
                scrollToBottom(true);
              }}
              className="fixed bottom-28 right-6 sm:right-10 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-[0_8px_20px_rgba(99,102,241,0.35)] border border-white/20 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
            >
              <ArrowDown size={14} className="animate-bounce" />
              <span>{language === 'bn' ? 'নিচে যান' : 'Scroll to bottom'}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Dummy div to scroll to, with extra margin so the last item isn't blocked by the chat input bar */}
        <div ref={messagesEndRef} className="h-32 md:h-48 shrink-0 w-full" />
      </div>

      {/* Input Area */}
      <div className="w-full px-4 pb-6 pt-2 shrink-0 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/80 to-transparent pointer-events-none z-20">
        <div className="w-full max-w-3xl mx-auto relative flex flex-col bg-[var(--card)]/90 backdrop-blur-3xl border border-[var(--glass-border)] rounded-[2rem] shadow-2xl shadow-primary/5 transition-all overflow-visible p-1.5 pointer-events-auto group focus-within:shadow-primary/10 focus-within:border-primary/20">
          <div className="absolute inset-0 rounded-[2rem] border border-white/20 dark:border-white/5 pointer-events-none" />
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Image Preview */}
          {selectedImage && (
            <div className="flex flex-col p-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-[12px] overflow-hidden border border-[var(--border)] shadow-md flex-shrink-0">
                      <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium text-[var(--text)] truncate">{selectedImageName || 'image.jpg'}</span>
                        <div className="flex gap-3 mt-1.5">
                            <button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold text-primary hover:underline">Replace</button>
                            <button onClick={() => { setSelectedImage(null); setSelectedImageName(null); }} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {[
                        { icon: '🔍', text: language === 'bn' ? 'বিশ্লেষণ করুন' : 'Analyze Image', prompt: language === 'bn' ? 'এই ছবিটা বিশ্লেষণ করুন এবং বিস্তারিত বলুন।' : 'Analyze this image in detail and tell me what you see.' },
                        { icon: '📝', text: language === 'bn' ? 'টেক্সট এক্সট্রাক্ট' : 'Extract Text', prompt: language === 'bn' ? 'এই ছবি থেকে সমস্ত টেক্সট এক্সট্রাক্ট করুন।' : 'Extract all the readable text from this image.' },
                        { icon: '📄', text: language === 'bn' ? 'ডকুমেন্ট পড়ুন' : 'Read Document', prompt: language === 'bn' ? 'এই ডকুমেন্টের কন্টেন্ট পড়ুন এবং সারসংক্ষেপ করুন।' : 'Read and summarize the content of this document.' },
                        { icon: '🖼️', text: language === 'bn' ? 'বর্ণনা করুন' : 'Describe Image', prompt: language === 'bn' ? 'এই ছবির একটি বিস্তারিত বর্ণনা দিন।' : 'Provide a detailed, vivid description of this image.' },
                        { icon: '🔎', text: language === 'bn' ? 'অবজেক্ট খুঁজুন' : 'Identify Objects', prompt: language === 'bn' ? 'এই ছবির মূল অবজেক্ট বা বিষয়গুলো চিহ্নিত করুন।' : 'Identify and list the main objects or subjects in this image.' },
                        { icon: '📊', text: language === 'bn' ? 'চার্ট বিশ্লেষণ' : 'Analyze Chart', prompt: language === 'bn' ? 'এই চার্ট বা গ্রাফটি বিশ্লেষণ করে মূল তথ্যগুলো বুঝিয়ে বলুন।' : 'Analyze this chart or graph and explain the key data points.' },
                        { icon: '💻', text: language === 'bn' ? 'স্ক্রিনশট বিশ্লেষণ' : 'Analyze Screenshot', prompt: language === 'bn' ? 'এই স্ক্রিনশটটি বিশ্লেষণ করুন এবং এর ইন্টারফেস সম্পর্কে বলুন।' : 'Analyze this screenshot and explain the interface or content shown.' },
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(action.prompt)}
                            className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--glass-bg)] text-xs font-medium text-[var(--text)] border border-[var(--glass-border)] shadow-sm hover:bg-[var(--hover)] hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <span>{action.icon}</span>
                            <span>{action.text}</span>
                        </button>
                    ))}
                </div>
            </div>
          )}

          <div className="flex items-center w-full min-h-[48px]">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 ml-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-all rounded-full z-10"
              title="Upload Image"
            >
              <Plus size={24} strokeWidth={1.5} />
            </button>
            
            <div className="relative">
              {/* Active Listening Soundwave Badge */}
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                    className="absolute -top-11 left-1/2 -translate-x-1/2 bg-red-500/10 dark:bg-red-950/50 border border-red-500/30 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 shadow-lg z-30 pointer-events-none"
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-4 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-2 bg-red-500 rounded-full animate-bounce" />
                    </div>
                    <span className="text-[11px] font-semibold text-red-500 whitespace-nowrap">
                      {language === 'bn' ? 'শুনছি...' : 'Listening...'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={toggleListening}
                disabled={!isSpeechSupported}
                className={`p-2 transition-all rounded-full z-10 relative flex items-center justify-center ${
                  !isSpeechSupported
                    ? 'text-[var(--text-muted)]/40 cursor-not-allowed opacity-50'
                    : isListening 
                      ? 'text-red-500 bg-red-500/10 ring-2 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                }`}
                title={
                  !isSpeechSupported
                    ? (language === 'bn' ? "এই ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয়" : "Speech recognition not supported in this browser")
                    : isListening 
                      ? (language === 'bn' ? "শুনছি... (থামাতে আবার ক্লিক করুন)" : "Listening... (click to stop)")
                      : (language === 'bn' ? "ভয়েস ইনপুট শুরু করুন" : "Start voice input")
                }
              >
                {isListening && (
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
                )}
                {isListening ? (
                  <Square size={18} className="fill-current text-red-500" />
                ) : (
                  <Mic size={20} strokeWidth={1.5} />
                )}
              </button>
              
              {/* Voice Command History Popover */}
              <AnimatePresence>
                {showVoiceCommands && voiceCommands.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-4 md:-left-8 left-0 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg)]">
                      <h4 className="text-sm font-medium text-[var(--text)] flex items-center gap-1.5"><History size={14}/> Voice History</h4>
                      <button onClick={() => setShowVoiceCommands(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {voiceCommands.map((cmd, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInput(cmd);
                            baseInputRef.current = cmd;
                            setShowVoiceCommands(false);
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--hover)] border-b border-[var(--border)] last:border-0 transition-colors truncate"
                        >
                          "{cmd}"
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {voiceCommands.length > 0 && (
                 <button 
                   onClick={() => setShowVoiceCommands(!showVoiceCommands)}
                   className="absolute -top-3 -right-2 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-full p-0.5 shadow-sm z-20 transition-transform hover:scale-110"
                   title="Recent Voice Commands"
                 >
                   <History size={12} />
                 </button>
              )}
            </div>
            
            <div className="relative flex-1 flex flex-col justify-center min-w-0">
              <textarea
                ref={inputRef}
                value={input}
                maxLength={4000}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (isListening) {
                    baseInputRef.current = e.target.value;
                  }
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? (language === 'bn' ? 'শুনছি...' : 'Listening...') : (language === 'bn' ? 'মেসেজ লিখুন, বা ওয়েব এ কিছু খুঁজুন...' : 'Ask anything, or search the web...')}
                className={`w-full bg-transparent border-none text-[var(--text)] py-3.5 pl-3 pr-14 focus:outline-none focus:ring-0 placeholder-[var(--text-muted)] text-[15px] font-medium resize-none overflow-y-auto leading-relaxed transition-all duration-200`}
                style={{ maxHeight: '200px' }}
              />
              
              <div className="absolute right-0 bottom-3 flex items-center pr-3 pointer-events-none">
                <span className={`text-[10px] font-medium pointer-events-auto mr-1 ${input.length >= 4000 ? 'text-red-500' : 'text-[var(--text-muted)]/50'}`}>
                  {input.length}/4000
                </span>
                {input.length > 0 && (
                  <button 
                    onClick={() => {
                       setInput('');
                       baseInputRef.current = '';
                       if (inputRef.current) {
                          inputRef.current.style.height = 'auto';
                          inputRef.current.focus();
                       }
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1 pointer-events-auto rounded-full hover:bg-[var(--hover)]"
                    title="Clear input"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {isListening && (
              <button
                onClick={() => {
                  if (recognitionRef.current) {
                    recognitionRef.current.stop();
                  }
                  setIsListening(false);
                  setInput('');
                  baseInputRef.current = '';
                  if (inputRef.current) {
                    inputRef.current.style.height = 'auto';
                  }
                }}
                className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors z-10"
                title="Cancel voice input"
              >
                <X size={20} />
              </button>
            )}

            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !selectedImage) || isTyping}
              className={`p-2.5 mr-1.5 rounded-[12px] flex items-center justify-center transition-all z-10 ${
                (!input.trim() && !selectedImage) || isTyping
                  ? 'bg-[var(--hover)] text-[var(--text-muted)]'
                  : 'bg-primary text-white hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95'
              }`}
            >
              <Send size={18} className={(!input.trim() && !selectedImage) || isTyping ? '' : 'translate-x-[1px] translate-y-[-1px]'} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        
        {/* Helper footer */}
        <div className="flex justify-center mt-2 opacity-50 hover:opacity-100 transition-opacity pb-2">
           <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-bold mix-blend-difference">{language === 'bn' ? 'নেক্সারা এআই ভুল করতে পারে। গুরুত্বপূর্ণ তথ্য যাচাই করুন।' : 'Nexara AI can make mistakes. Verify important info.'}</span>
        </div>
      </div>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-[2rem] p-6 max-w-lg w-full shadow-2xl max-h-[80vh] flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[50px] rounded-full pointer-events-none -mr-20 -mt-20" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <FileText size={20} />
                    </div>
                <h3 className="text-xl font-display font-semibold text-[var(--text)]">
                  {language === 'bn' ? 'চ্যাটের সারসংক্ষেপ' : 'Chat Summary'}
                </h3>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-2 text-[var(--text-muted)] hover:text-primary hover:bg-[var(--hover)] rounded-full transition-all active:scale-95"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
              
              <div className="overflow-y-auto pr-2 custom-scrollbar text-[var(--text)] text-[15px] leading-relaxed whitespace-pre-wrap relative z-10 font-medium opacity-90 p-4 bg-[var(--card)]/50 rounded-2xl border border-[var(--border)]">
                {summaryText}
              </div>
              
              <div className="mt-6 flex justify-end relative z-10">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] text-sm"
                >
                  {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Claude Artifacts / ChatGPT Canvas Style Code Preview Drawer */}
      <CodePreviewDrawer 
        isOpen={drawerState.isOpen}
        project={drawerState.project}
        initialFileId={drawerState.activeFileId}
        onClose={() => setDrawerState({ isOpen: false, project: null, activeFileId: null })}
      />
    </div>
  );
}
