import { ArtifactFile, ArtifactProject } from '../types/artifact';
import { formatFileSize, ensureFilenameWithExtension, inferExtension } from './fileExporter';

/**
 * Extracts structured code files / artifacts from message text.
 * Handles single code blocks as well as multi-file code blocks.
 */
export function extractArtifactsFromText(text: string, messageId: string = 'msg'): ArtifactProject | null {
  if (!text || typeof text !== 'string') return null;

  // Regex to match code blocks: ```language [optional header/filename]
  const codeBlockRegex = /```([a-zA-Z0-9_+#-]*)\s*([^\n]*)\n([\s\S]*?)```/g;
  const matches = Array.from(text.matchAll(codeBlockRegex));

  if (matches.length === 0) return null;

  const files: ArtifactFile[] = [];
  let fileIndex = 1;

  for (const match of matches) {
    const rawLang = match[1]?.trim() || '';
    const headerLine = match[2]?.trim() || '';
    const content = match[3]?.replace(/\s+$/, '') || '';

    // Ignore tiny 1-line shell commands or trivial snippets (e.g., `npm install`)
    if (content.length < 15 && !content.includes('\n')) {
      continue;
    }

    // Try to detect filename from headerLine or top comments inside content
    let filename = '';

    // 1. Check header line (e.g., ```tsx filename="App.tsx" or ```python script.py)
    const filenameMatch = headerLine.match(/(?:filename=|title=)?["']?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)["']?/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }

    // 2. Check top comment inside content (e.g. // App.tsx or # script.py or <!-- index.html -->)
    if (!filename) {
      const topLines = content.split('\n').slice(0, 3);
      for (const line of topLines) {
        const commentMatch = line.match(/(?:\/\/|#|<!--|\/\*)\s*(?:filename:\s*|File:\s*)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/i);
        if (commentMatch) {
          filename = commentMatch[1];
          break;
        }
      }
    }

    // 3. Normalize language name
    let language = rawLang.toLowerCase();
    if (language === 'react' || language === 'jsx') language = 'jsx';
    if (language === 'ts' || language === 'tsx') language = 'tsx';
    if (language === 'js' || language === 'javascript') language = 'javascript';
    if (language === 'py') language = 'python';
    if (language === 'cs') language = 'csharp';
    if (language === 'sh') language = 'bash';

    // 4. Fallback default filename if none detected
    if (!filename) {
      const ext = inferExtension('', language || 'code');
      filename = `code_artifact_${fileIndex}.${ext}`;
    } else {
      filename = ensureFilenameWithExtension(filename, language);
    }

    const sizeBytes = new Blob([content]).size;
    const fileId = `${messageId}_file_${fileIndex}`;

    files.push({
      id: fileId,
      filename,
      language: language || inferExtension(filename, ''),
      content,
      sizeBytes,
      sizeFormatted: formatFileSize(sizeBytes),
      extension: inferExtension(filename, language)
    });

    fileIndex++;
  }

  if (files.length === 0) return null;

  const totalBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const mainTitle = files.length === 1 
    ? files[0].filename 
    : `${files[0].filename} + ${files.length - 1} more file${files.length > 2 ? 's' : ''}`;

  return {
    id: `project_${messageId}`,
    title: mainTitle,
    files,
    totalSizeFormatted: formatFileSize(totalBytes),
    hasMultipleFiles: files.length > 1
  };
}
