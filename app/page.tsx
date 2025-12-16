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
      alert('Please upload at least one file');
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
      alert('An error occurred during processing');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CSV Merger Tool</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload CSV/TSV files, configure merge operations, and download split results
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Output Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Header Format
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
                  All output files will be split into 2 million rows each
                </p>
              </div>
            </div>

            <button
              onClick={handleMerge}
              disabled={status === 'processing' || files.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'processing' ? 'Processing...' : 'Merge and Download'}
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
