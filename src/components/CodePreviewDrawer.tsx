import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Code2, 
  FileCode, 
  Eye, 
  Archive, 
  FileText, 
  Terminal, 
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { ArtifactProject, ArtifactFile } from '../types/artifact';
import { downloadFile, downloadProjectAsZip } from '../lib/fileExporter';

interface CodePreviewDrawerProps {
  isOpen: boolean;
  project: ArtifactProject | null;
  initialFileId?: string | null;
  onClose: () => void;
}

export const CodePreviewDrawer: React.FC<CodePreviewDrawerProps> = ({
  isOpen,
  project,
  initialFileId,
  onClose
}) => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Set active file whenever project or initialFileId changes
  useEffect(() => {
    if (project && project.files.length > 0) {
      if (initialFileId && project.files.some(f => f.id === initialFileId)) {
        setActiveFileId(initialFileId);
      } else {
        setActiveFileId(project.files[0].id);
      }
    }
    setViewMode('code');
  }, [project, initialFileId]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !project || project.files.length === 0) return null;

  const activeFile: ArtifactFile = project.files.find(f => f.id === activeFileId) || project.files[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    showToast(`Copied ${activeFile.filename} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadFile(activeFile.filename, activeFile.content);
    showToast(`Downloaded ${activeFile.filename}`);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadProjectAsZip(project);
      showToast(`Downloaded project archive (.ZIP)`);
    } catch (err) {
      console.error('Failed to download zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const canPreviewLive = ['html', 'htm', 'svg', 'md', 'markdown'].includes(activeFile.extension);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-black/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-0"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative z-10 h-full bg-zinc-950 text-zinc-100 flex flex-col border-l border-zinc-800 shadow-2xl transition-all duration-300 ${
              isFullscreen ? 'w-full' : 'w-full md:w-[700px] lg:w-[850px]'
            }`}
          >
            {/* Top Toolbar Header */}
            <div className="flex flex-col border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 py-3 gap-3">
              <div className="flex items-center justify-between gap-4">
                {/* File Title & Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-100 truncate tracking-tight">
                        {activeFile.filename}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700">
                        {activeFile.language.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {activeFile.sizeFormatted} • {activeFile.content.split('\n').length} lines
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* View Mode Toggle (Code vs Live Preview) */}
                  {canPreviewLive && (
                    <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 mr-2">
                      <button
                        onClick={() => setViewMode('code')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                          viewMode === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Code</span>
                      </button>
                      <button
                        onClick={() => setViewMode('preview')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                          viewMode === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </div>
                  )}

                  {/* Copy Code */}
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-all active:scale-95"
                    title="Copy code to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {/* Download File */}
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-all active:scale-95"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  {/* Download Zip (if multi-file) */}
                  {project.hasMultipleFiles && (
                    <button
                      onClick={handleDownloadZip}
                      disabled={isZipping}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                      title="Download all project files as .ZIP"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isZipping ? 'Zipping...' : '.ZIP'}</span>
                    </button>
                  )}

                  {/* Fullscreen Toggle */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all ml-1"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Close Drawer Button */}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all ml-1"
                    title="Close Drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Multi-File Tabs Bar */}
              {project.hasMultipleFiles && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-zinc-800/80 pt-2">
                  {project.files.map((file) => {
                    const isActive = file.id === activeFile.id;
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          setActiveFileId(file.id);
                          setViewMode('code');
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                          isActive
                            ? 'bg-zinc-800 text-indigo-400 border-indigo-500/50 shadow-sm font-semibold'
                            : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                        <span>{file.filename}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Code Viewer Body */}
            <div className="flex-1 overflow-auto bg-zinc-950 p-4 relative font-mono">
              {viewMode === 'code' ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-800/80 shadow-inner bg-[#1e1e1e]">
                  <SyntaxHighlighter
                    language={activeFile.language || 'javascript'}
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    customStyle={{
                      margin: 0,
                      padding: '1.25rem',
                      fontSize: '0.85rem',
                      lineHeight: '1.6',
                      backgroundColor: 'transparent',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                    }}
                    lineNumberStyle={{
                      minWidth: '2.5rem',
                      paddingRight: '1rem',
                      color: '#52525b',
                      textAlign: 'right',
                      userSelect: 'none'
                    }}
                  >
                    {activeFile.content}
                  </SyntaxHighlighter>
                </div>
              ) : (
                /* Live Render Preview Tab (For HTML or Markdown) */
                <div className="h-full w-full bg-zinc-900 rounded-xl border border-zinc-800 p-6 overflow-auto text-zinc-200 font-sans">
                  {['html', 'htm', 'svg'].includes(activeFile.extension) ? (
                    <iframe
                      srcDoc={activeFile.content}
                      title="HTML Preview"
                      className="w-full h-full min-h-[500px] border-0 bg-white rounded-lg shadow-md"
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <div className="markdown-body max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeFile.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Status Footer Bar */}
            <div className="border-t border-zinc-800 bg-zinc-900/80 px-4 py-2 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nexara AI Artifact Engine</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{project.files.length} file{project.files.length > 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{activeFile.sizeFormatted}</span>
              </div>
            </div>

            {/* Floating Toast Notification */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 pointer-events-none"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{toastMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
