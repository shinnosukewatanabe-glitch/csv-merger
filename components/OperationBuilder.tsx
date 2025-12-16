'use client';

import { FileInfo, Operation } from '@/types';

type Props = {
  files: FileInfo[];
  operations: Operation[];
  onOperationsChange: (operations: Operation[]) => void;
};

export default function OperationBuilder({ files, operations, onOperationsChange }: Props) {
  const addOperation = (type: 'OR' | 'AND') => {
    const newOp: Operation = {
      type,
      fileIds: [],
    };
    onOperationsChange([...operations, newOp]);
  };

  const removeOperation = (index: number) => {
    onOperationsChange(operations.filter((_, i) => i !== index));
  };

  const updateOperation = (index: number, fileIds: string[]) => {
    const updated = [...operations];
    updated[index] = { ...updated[index], fileIds };
    onOperationsChange(updated);
  };

  const toggleFile = (opIndex: number, fileId: string) => {
    const operation = operations[opIndex];
    const fileIds = operation.fileIds.includes(fileId)
      ? operation.fileIds.filter((id) => id !== fileId)
      : [...operation.fileIds, fileId];
    updateOperation(opIndex, fileIds);
  };

  if (files.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">結合操作</h2>
        <p className="text-sm text-gray-500">結合操作を設定するには、まずファイルをアップロードしてください</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">結合操作</h2>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => addOperation('OR')}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
        >
          + ORグループ
        </button>
        <button
          onClick={() => addOperation('AND')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + ANDグループ
        </button>
      </div>

      {operations.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
          <p className="mb-2">操作が設定されていません。ORまたはANDグループを追加してください。</p>
          <p className="text-xs">
            <strong>OR:</strong> 選択したファイルのいずれかにあるIDを含める（和集合）
            <br />
            <strong>AND:</strong> 選択したすべてのファイルに共通するIDのみを含める（積集合）
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {operations.map((operation, opIndex) => (
            <div
              key={opIndex}
              className={`p-4 rounded-lg border-2 ${
                operation.type === 'OR' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      operation.type === 'OR'
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {operation.type}
                  </span>
                  <span className="text-xs text-gray-600">
                    {operation.type === 'OR' ? '選択ファイルの和集合' : '選択ファイルの積集合'}
                  </span>
                </div>
                <button
                  onClick={() => removeOperation(opIndex)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  削除
                </button>
              </div>

              <div className="space-y-2">
                {files.map((file) => (
                  <label
                    key={file.id}
                    className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={operation.fileIds.includes(file.id)}
                      onChange={() => toggleFile(opIndex, file.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      ({file.idColumn})
                    </span>
                  </label>
                ))}
              </div>

              {operation.fileIds.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    選択中: {operation.fileIds.length}件のファイル
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">結合ロジックのプレビュー:</p>
            <p className="text-sm text-gray-600 font-mono">
              {operations.length === 0
                ? '操作が定義されていません'
                : operations.map((op, i) => (
                    <span key={i}>
                      {i > 0 && ' → '}
                      {op.type}(
                      {op.fileIds
                        .map((id) => files.find((f) => f.id === id)?.name || '不明')
                        .join(', ') || 'ファイルが選択されていません'}
                      )
                    </span>
                  ))}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              操作は順番に実行されます。各操作は前の結果に適用されます。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
