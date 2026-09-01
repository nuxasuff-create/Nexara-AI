import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let isPermissionError = false;
      let errorMessage = "An unexpected error occurred.";
      let rawError = "";
      try {
        if (this.state.error?.message) {
          rawError = this.state.error.message;
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions'))) {
            isPermissionError = true;
            errorMessage = "Firestore Security Rules are blocking access.";
          } else {
            errorMessage = parsed.error || errorMessage;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
        rawError = this.state.error?.message || "";
        if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
          isPermissionError = true;
          errorMessage = "Firestore Security Rules are blocking access.";
        }
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 text-center overflow-y-auto">
          <div className="max-w-2xl w-full bg-[var(--card)] border border-red-500/20 rounded-3xl p-8 shadow-2xl my-8">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-[var(--text-muted)] mb-6">{errorMessage}</p>
            {!isPermissionError && rawError && (
              <div className="text-left bg-[var(--bg)] p-6 rounded-xl border border-[var(--border)] mb-6 overflow-x-auto">
                <pre className="text-xs bg-black/50 p-4 rounded-lg text-red-400 overflow-x-auto whitespace-pre-wrap">
                  {rawError}
                </pre>
              </div>
            )}
            
            {isPermissionError && (
              <div className="text-left bg-[var(--bg)] p-6 rounded-xl border border-[var(--border)] mb-6 overflow-x-auto">
                <h3 className="font-semibold text-lg mb-2 text-red-400">Action Required: Update Firestore Rules</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Please go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Firebase Console</a>, navigate to <strong>Firestore Database &gt; Rules</strong>, and paste the following code:
                </p>
                <pre className="text-xs bg-black/50 p-4 rounded-lg text-green-400 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }
    function isAdmin() {
      return isAuthenticated() && (
        request.auth.token.email == 'ashtosh.biswas.2026@gmail.com' ||
        (exists(/databases/$(database)/documents/settings/admins) &&
         request.auth.token.email in get(/databases/$(database)/documents/settings/admins).data.emails)
      );
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
      match /chats/{chatId} {
        allow read, write: if isOwner(userId) || isAdmin();
        match /messages/{messageId} {
          allow read, write: if isOwner(userId) || isAdmin();
        }
      }
    }
    
    match /settings/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}`}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              I have updated the rules, Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
