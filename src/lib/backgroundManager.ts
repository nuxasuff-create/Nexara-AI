/**
 * Background Processing & Notification Manager for Nexara AI
 * Handles:
 * 1. Web Notification permissions & triggering on completion when tab is hidden.
 * 2. Background document title indicator ("⚡ Nexara AI is typing...").
 * 3. Web Audio API chime sound notification when response generation finishes in background.
 * 4. Tab visibility state management to prevent throttling during streaming.
 */

let originalTitle: string = typeof document !== 'undefined' ? document.title || 'Nexara AI' : 'Nexara AI';
let isGeneratingActive: boolean = false;
let visibilityListenerAdded: boolean = false;
let activeNotification: Notification | null = null;

// Initialize original title on module load
if (typeof document !== 'undefined') {
  if (document.title && !document.title.includes('⚡')) {
    originalTitle = document.title;
  }
}

/**
 * Request Web Notification permissions from the user.
 * Should be called upon initial user interaction (e.g., sending a message).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('[BackgroundManager] Error requesting notification permission:', e);
    }
  }
  
  return false;
}

/**
 * Play a subtle dual-tone completion chime using Web Audio API.
 * Synthesized locally so no external asset files are required.
 */
export function playCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // First Tone: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second Tone: B5 (987.77 Hz) - harmonic chime interval
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.14);
    gain2.gain.setValueAtTime(0.1, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn('[BackgroundManager] Audio chime error:', err);
  }
}

/**
 * Start background generation tracking:
 * Updates document.title and attaches visibility listener.
 */
export function startBackgroundGeneration(initialStatus?: string) {
  isGeneratingActive = true;

  if (typeof document !== 'undefined') {
    if (document.title && !document.title.includes('⚡')) {
      originalTitle = document.title;
    }

    const titleText = initialStatus 
      ? `⚡ ${initialStatus}` 
      : '⚡ Nexara AI is typing...';

    document.title = titleText;

    if (!visibilityListenerAdded) {
      visibilityListenerAdded = true;
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  }
}

/**
 * Update the background tab status message (e.g., "⚡ Searching web...")
 */
export function updateBackgroundStatus(statusMessage?: string) {
  if (!isGeneratingActive || typeof document === 'undefined') return;

  if (statusMessage) {
    document.title = `⚡ ${statusMessage}`;
  } else {
    document.title = '⚡ Nexara AI is typing...';
  }
}

/**
 * Handler for document visibility changes
 */
function handleVisibilityChange() {
  if (typeof document === 'undefined') return;

  if (document.visibilityState === 'hidden' && isGeneratingActive) {
    document.title = '⚡ Nexara AI is typing...';
  } else if (document.visibilityState === 'visible' && !isGeneratingActive) {
    document.title = originalTitle || 'Nexara AI';
  }
}

/**
 * Call when background AI response generation completes.
 * Triggers notification, audio chime (if tab is hidden), and restores document title.
 */
export function finishBackgroundGeneration(previewText?: string) {
  isGeneratingActive = false;

  if (typeof document !== 'undefined') {
    document.title = originalTitle || 'Nexara AI';
  }

  const isHidden = typeof document !== 'undefined' && document.hidden;

  if (isHidden) {
    // Play completion chime when tab is minimized / inactive
    playCompletionChime();

    // Trigger Browser Push Notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (activeNotification) {
          activeNotification.close();
        }

        const cleanPreview = previewText 
          ? (previewText.length > 90 ? previewText.substring(0, 90) + '...' : previewText)
          : 'Your response is ready!';

        const notif = new Notification('Nexara AI', {
          body: cleanPreview,
          icon: '/favicon.ico',
          tag: 'nexara-ai-response',
          renotify: true,
          requireInteraction: false
        } as any);

        notif.onclick = () => {
          if (typeof window !== 'undefined') {
            window.focus();
          }
          notif.close();
        };

        activeNotification = notif;
      } catch (err) {
        console.warn('[BackgroundManager] Push notification failed:', err);
      }
    }
  }
}
