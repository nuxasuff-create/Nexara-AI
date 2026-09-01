import JSZip from 'jszip';
import { ArtifactFile, ArtifactProject } from '../types/artifact';

/**
 * Format raw byte length into human-readable string (e.g. 1.2 KB, 450 B)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Infer file extension from language if not explicitly provided in filename
 */
export function inferExtension(filename: string, language: string): string {
  if (filename.includes('.')) {
    return filename.split('.').pop()?.toLowerCase() || 'txt';
  }
  
  const langLower = (language || '').toLowerCase();
  switch (langLower) {
    case 'javascript':
    case 'js':
      return 'js';
    case 'typescript':
    case 'ts':
      return 'ts';
    case 'jsx':
    case 'react':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'python':
    case 'py':
      return 'py';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'markdown':
    case 'md':
      return 'md';
    case 'csharp':
    case 'cs':
      return 'cs';
    case 'cpp':
    case 'c++':
    case 'c':
      return 'cpp';
    case 'sql':
      return 'sql';
    case 'bash':
    case 'sh':
    case 'shell':
      return 'sh';
    default:
      return 'txt';
  }
}

/**
 * Ensure filename has an appropriate extension
 */
export function ensureFilenameWithExtension(filename: string, language: string): string {
  if (filename.includes('.')) return filename;
  const ext = inferExtension(filename, language);
  return `${filename}.${ext}`;
}

/**
 * Trigger browser file download via Blob URL
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Package multiple files into a zip file in the background without blocking UI
 */
export async function downloadProjectAsZip(project: ArtifactProject) {
  const zip = new JSZip();

  project.files.forEach((file) => {
    // Keep directory paths if filename contains slashes (e.g., src/App.tsx)
    zip.file(file.filename, file.content);
  });

  // Generate README.md if not present
  if (!project.files.some(f => f.filename.toLowerCase() === 'readme.md')) {
    zip.file('README.md', `# ${project.title}\n\nGenerated with Nexara AI.\n\nFiles included:\n` + 
      project.files.map(f => `- ${f.filename} (${f.sizeFormatted})`).join('\n')
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = `${project.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_project.zip`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export message or documentation as Markdown (.md) file
 */
export function exportAsMarkdown(title: string, markdownText: string) {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'nexara_ai_export';
  downloadFile(`${cleanTitle}.md`, markdownText, 'text/markdown');
}
