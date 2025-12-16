'use client';

import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import OperationBuilder from '@/components/OperationBuilder';
import ProcessingPanel from '@/components/ProcessingPanel';
import { FileInfo, Operation, IdColumnType, ProcessingStatus } from '@/types';
import { processCSVFiles } from '@/lib/csvProcessor';

export default function Home() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [outputHeader, setOutputHeader] = useState<IdColumnType>('id_type:uuid');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ totalRows: number; fileCount: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const handleMerge = async () => {
    if (files.length === 0) {
      alert('少なくとも1つのファイルをアップロードしてください');
      return;
    }

    setStatus('processing');
    setDownloadUrl(null);
    setResult(null);
    setErrorMessage(null);
    setProgressMessage('処理を開始しています...');

    try {
      // Process files on client side
      const result = await processCSVFiles(
        files,
        operations,
        outputHeader,
        (message, _progress) => {
          setProgressMessage(message);
        }
      );

      // Create download URL
      const url = URL.createObjectURL(result.blob);

      setResult({ totalRows: result.totalRows, fileCount: result.fileCount });
      setDownloadUrl(url);
      setStatus('completed');
      setProgressMessage('');
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      const errorMsg = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setErrorMessage(errorMsg);
      setProgressMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CSV結合・分割ツール</h1>
          <p className="mt-2 text-sm text-gray-600">
            CSV/TSVファイルをアップロードし、結合条件を設定して、分割されたファイルをダウンロードできます
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>✨ クライアント側処理:</strong> すべての処理はブラウザ上で行われます。ファイルはサーバーにアップロードされないため、
              大きなファイルでも安全に処理できます。
            </p>
            {files.length > 0 && (
              <p className="text-xs text-blue-700 mt-2">
                📊 アップロード済み: {files.reduce((sum, f) => sum + f.file.size, 0) / 1024 / 1024 | 0} MB
                {files.reduce((sum, f) => sum + f.file.size, 0) > 500 * 1024 * 1024 && (
                  <span className="text-orange-700 font-semibold"> (大容量ファイル: メモリ不足に注意)</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FileUploader files={files} onFilesChange={setFiles} />

            <OperationBuilder
              files={files}
              operations={operations}
              onOperationsChange={setOperations}
            />

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">出力設定</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出力ヘッダー形式
                </label>
                <select
                  value={outputHeader}
                  onChange={(e) => setOutputHeader(e.target.value as IdColumnType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="uuid">uuid</option>
                  <option value="id_type:uuid">id_type:uuid</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  すべての出力ファイルは200万行ごとに分割されます
                </p>
              </div>
            </div>

            <button
              onClick={handleMerge}
              disabled={status === 'processing' || files.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'processing' ? '処理中...' : '結合してダウンロード'}
            </button>
          </div>

          <div>
            <ProcessingPanel
              status={status}
              downloadUrl={downloadUrl}
              result={result}
              errorMessage={errorMessage}
              progressMessage={progressMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
