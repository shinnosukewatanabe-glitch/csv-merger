'use client';

import { useRef } from 'react';
import { FileInfo, IdColumnType } from '@/types';

type Props = {
  files: FileInfo[];
  onFilesChange: (files: FileInfo[]) => void;
};

export default function FileUploader({ files, onFilesChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const selectedFiles = Array.from(fileList);

    // Check file size limit (4MB per file for Vercel)
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes
    const oversizedFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join('\n');
      alert(
        `以下のファイルはサイズが大きすぎます（最大4MB）:\n\n${fileNames}\n\n` +
        `Vercelの制限により、現在は小さいファイルのみアップロード可能です。\n` +
        `大きなファイルの処理については、今後のアップデートで対応予定です。`
      );
      return;
    }

    const newFiles: FileInfo[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      idColumn: 'id_type:uuid', // default
    }));

    onFilesChange([...files, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = e.dataTransfer.files;
    processFiles(droppedFiles);
  };

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleIdColumnChange = (id: string, idColumn: IdColumnType) => {
    onFilesChange(
      files.map((f) => (f.id === id ? { ...f, idColumn } : f))
    );
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">ファイルアップロード</h2>

      <div className="mb-4">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">クリックしてアップロード</span> またはドラッグ&ドロップ
            </p>
            <p className="text-xs text-gray-500">CSVまたはTSVファイル（最大4MB）</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.tsv"
            multiple
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">アップロード済みファイル ({files.length}件)</h3>
          {files.map((fileInfo) => (
            <div
              key={fileInfo.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileInfo.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={fileInfo.idColumn}
                  onChange={(e) =>
                    handleIdColumnChange(fileInfo.id, e.target.value as IdColumnType)
                  }
                  className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="uuid">uuid</option>
                  <option value="id_type:uuid">id_type:uuid</option>
                </select>

                <button
                  onClick={() => handleRemoveFile(fileInfo.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
