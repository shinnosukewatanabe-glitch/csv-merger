'use client';

import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import OperationBuilder from '@/components/OperationBuilder';
import ProcessingPanel from '@/components/ProcessingPanel';
import { FileInfo, Operation, IdColumnType, ProcessingStatus } from '@/types';

export default function Home() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [outputHeader, setOutputHeader] = useState<IdColumnType>('id_type:uuid');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ totalRows: number; fileCount: number } | null>(null);

  const handleMerge = async () => {
    if (files.length === 0) {
      alert('少なくとも1つのファイルをアップロードしてください');
      return;
    }

    setStatus('processing');
    setDownloadUrl(null);
    setResult(null);

    try {
      const formData = new FormData();

      files.forEach((fileInfo) => {
        formData.append('files', fileInfo.file);
      });

      const config = {
        files: files.map(f => ({ id: f.id, name: f.name, idColumn: f.idColumn })),
        operations,
        outputHeader,
      };

      formData.append('config', JSON.stringify(config));

      const response = await fetch('/api/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Merge failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const resultHeader = response.headers.get('X-Result-Info');
      if (resultHeader) {
        const resultInfo = JSON.parse(resultHeader);
        setResult(resultInfo);
      }

      setDownloadUrl(url);
      setStatus('completed');
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      alert('処理中にエラーが発生しました');
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
