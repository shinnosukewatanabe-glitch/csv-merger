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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Merge Operations</h2>
        <p className="text-sm text-gray-500">Upload files first to configure merge operations</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Merge Operations</h2>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => addOperation('OR')}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
        >
          + OR Group
        </button>
        <button
          onClick={() => addOperation('AND')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + AND Group
        </button>
      </div>

      {operations.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
          <p className="mb-2">No operations configured. Add OR or AND groups to start.</p>
          <p className="text-xs">
            <strong>OR:</strong> Include IDs from any selected file
            <br />
            <strong>AND:</strong> Include only IDs present in all selected files
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
                    {operation.type === 'OR' ? 'Union of selected files' : 'Intersection of selected files'}
                  </span>
                </div>
                <button
                  onClick={() => removeOperation(opIndex)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
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
                    Selected: {operation.fileIds.length} file(s)
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Merge Logic Preview:</p>
            <p className="text-sm text-gray-600 font-mono">
              {operations.length === 0
                ? 'No operations defined'
                : operations.map((op, i) => (
                    <span key={i}>
                      {i > 0 && ' THEN '}
                      {op.type}(
                      {op.fileIds
                        .map((id) => files.find((f) => f.id === id)?.name || 'Unknown')
                        .join(', ') || 'no files selected'}
                      )
                    </span>
                  ))}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Operations are executed sequentially. Each operation applies to the previous result.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
