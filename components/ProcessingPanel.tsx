'use client';

import { ProcessingStatus } from '@/types';

type Props = {
  status: ProcessingStatus;
  downloadUrl: string | null;
  result: { totalRows: number; fileCount: number } | null;
  errorMessage: string | null;
  progressMessage?: string;
};

export default function ProcessingPanel({ status, downloadUrl, result, errorMessage, progressMessage }: Props) {
  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'merged_output.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">処理ステータス</h2>

      <div className="space-y-4">
        {status === 'idle' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500">ファイル処理の準備完了</p>
            <p className="text-xs text-gray-400 mt-2">
              ファイルをアップロードして操作を設定してください
            </p>
          </div>
        )}

        {status === 'processing' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">ファイルを処理中...</p>
            {progressMessage && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                {progressMessage}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              大きなファイルの場合は数分かかることがあります
            </p>
          </div>
        )}

        {status === 'completed' && result && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-4">処理が完了しました！</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">合計行数</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result.totalRows.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">出力ファイル数</p>
                  <p className="text-lg font-semibold text-gray-900">{result.fileCount}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              ZIPファイルをダウンロード
            </button>

            <p className="text-xs text-gray-500 mt-3">
              ファイルは{(2_000_000).toLocaleString()}行ごとに分割されています
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-3">処理に失敗しました</p>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
                <p className="text-xs font-semibold text-red-800 mb-2">エラー詳細:</p>
                <p className="text-xs text-red-700 whitespace-pre-wrap break-words font-mono">
                  {errorMessage}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500">
              ファイルを確認してもう一度お試しください
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">使い方</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>1. IDカラムを含むCSV/TSVファイルをアップロード</li>
          <li>2. 各ファイルのIDカラムタイプを選択</li>
          <li>3. 結合操作を設定（OR/AND）</li>
          <li>4. 出力ヘッダー形式を選択</li>
          <li>5. 「結合してダウンロード」をクリック</li>
        </ul>
      </div>
    </div>
  );
}
