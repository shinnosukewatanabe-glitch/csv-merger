export type IdColumnType = 'uuid' | 'id_type:uuid';

export type FileInfo = {
  id: string;
  file: File;
  name: string;
  idColumn: IdColumnType;
  rowCount?: number;
};

export type OperationType = 'OR' | 'AND';

export type Operation = {
  type: OperationType;
  fileIds: string[];
};

export type MergeConfig = {
  files: FileInfo[];
  operations: Operation[];
  outputHeader: IdColumnType;
};

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export type MergeResult = {
  totalRows: number;
  fileCount: number;
  downloadUrl: string;
};
