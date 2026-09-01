import React, { useState } from 'react';
import { 
  FileCode, 
  Eye, 
  Download, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Archive, 
  Code2, 
  FileText, 
  Terminal, 
  FileSpreadsheet, 
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ArtifactProject, ArtifactFile } from '../types/artifact';
import { downloadFile, downloadProjectAsZip } from '../lib/fileExporter';

interface FileArtifactCardProps {
  project: ArtifactProject;
  onOpenPreview: (project: ArtifactProject, fileId?: string) => void;
}

/**
 * Returns distinct badge styling & icon per language type
 */
function getLanguageBadgeInfo(language: string, extension: string) {
  const ext = (extension || language).toLowerCase();
  switch (ext) {
    case 'jsx':
    case 'tsx':
    case 'react':
    case 'js':
    case 'ts':
    case 'javascript':
    case 'typescript':
      return {
        label: ext.toUpperCase(),
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        accent: 'text-cyan-400',
        icon: <Code2 className="w-4 h-4 text-cyan-400" />
      };
    case 'py':
    case 'python':
      return {
        label: 'PYTHON',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        accent: 'text-amber-400',
        icon: <Terminal className="w-4 h-4 text-amber-400" />
      };
    case 'html':
    case 'htm':
      return {
        label: 'HTML5',
        bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        accent: 'text-orange-400',
        icon: <FileCode className="w-4 h-4 text-orange-400" />
      };
    case 'css':
    case 'scss':
      return {
        label: 'CSS3',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        accent: 'text-blue-400',
        icon: <FileCode className="w-4 h-4 text-blue-400" />
      };
    case 'json':
      return {
        label: 'JSON',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        accent: 'text-emerald-400',
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
      };
    case 'md':
    case 'markdown':
      return {
        label: 'MARKDOWN',
        bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        accent: 'text-purple-400',
        icon: <FileText className="w-4 h-4 text-purple-400" />
      };
    case 'sql':
      return {
        label: 'SQL',
        bg: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
        accent: 'text-pink-400',
        icon: <Layers className="w-4 h-4 text-pink-400" />
      };
    default:
      return {
        label: ext.toUpperCase() || 'CODE',
        bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        accent: 'text-indigo-400',
        icon: <FileCode className="w-4 h-4 text-indigo-400" />
      };
  }
}

export const FileArtifactCard: React.FC<FileArtifactCardProps> = ({ project, onOpenPreview }) => {
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const primaryFile = project.files[0];
  const badge = getLanguageBadgeInfo(primaryFile.language, primaryFile.extension);

  const handleCopy = (e: React.MouseEvent, file: ArtifactFile) => {
    e.stopPropagation();
    navigator.clipboard.writeText(file.content);
    setCopiedFileId(file.id);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  const handleDownload = (e: React.MouseEvent, file: ArtifactFile) => {
    e.stopPropagation();
    downloadFile(file.filename, file.content);
  };

  const handleDownloadZip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZipping(true);
    try {
      await downloadProjectAsZip(project);
    } catch (err) {
      console.error('Failed to download zip archive:', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Preview snippet (first 3 lines)
  const previewLines = primaryFile.content.split('\n').slice(0, 3).join('\n');

  return (
    <div className="my-3 w-full max-w-2xl rounded-2xl bg-zinc-900/90 border border-zinc-700/60 shadow-xl overflow-hidden backdrop-blur-md font-sans group">
      {/* Top Header Row */}
      <div 
        onClick={() => onOpenPreview(project, primaryFile.id)}
        className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/80"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            {project.hasMultipleFiles ? <Archive className="w-5 h-5 text-indigo-400" /> : badge.icon}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-100 truncate tracking-tight">
                {project.hasMultipleFiles ? `${project.files.length} Files Bundle` : primaryFile.filename}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                {project.hasMultipleFiles ? 'ZIP ARCHIVE' : badge.label}
              </span>
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {project.hasMultipleFiles 
                ? `${project.files.map(f => f.filename).join(', ')} • ${project.totalSizeFormatted}`
                : `${primaryFile.sizeFormatted} • Interactive Artifact`}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview(project, primaryFile.id);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Code</span>
          </button>

          {project.hasMultipleFiles ? (
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
              title="Download full project as .ZIP"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isZipping ? 'Zipping...' : '.ZIP'}</span>
            </button>
          ) : (
            <button
              onClick={(e) => handleDownload(e, primaryFile)}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={(e) => handleCopy(e, primaryFile)}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all"
            title="Copy Code"
          >
            {copiedFileId === primaryFile.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCodePreview(!showCodePreview);
            }}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
            title="Toggle Quick Preview Snippet"
          >
            {showCodePreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Multi-File Tab List (If Multi-File Project) */}
      {project.hasMultipleFiles && (
        <div className="px-3.5 py-2 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {project.files.map((file) => (
            <button
              key={file.id}
              onClick={() => onOpenPreview(project, file.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 whitespace-nowrap transition-all"
            >
              <FileCode className="w-3 h-3 text-indigo-400" />
              <span>{file.filename}</span>
              <span className="text-[10px] text-zinc-500">({file.sizeFormatted})</span>
            </button>
          ))}
        </div>
      )}

      {/* Collapsible 3-line Code Snippet */}
      <AnimatePresence>
        {showCodePreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-zinc-950/90 border-t border-zinc-800/80"
          >
            <pre className="p-3 text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto select-none opacity-80">
              {previewLines}
              {primaryFile.content.split('\n').length > 3 && '\n...'}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
