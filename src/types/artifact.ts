export interface ArtifactFile {
  id: string;
  filename: string;
  language: string;
  content: string;
  sizeBytes: number;
  sizeFormatted: string;
  extension: string;
}

export interface ArtifactProject {
  id: string;
  title: string;
  files: ArtifactFile[];
  totalSizeFormatted: string;
  hasMultipleFiles: boolean;
}

export interface DrawerState {
  isOpen: boolean;
  project: ArtifactProject | null;
  activeFileId: string | null;
}
