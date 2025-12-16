import Papa from 'papaparse';
import JSZip from 'jszip';
import { FileInfo, Operation, IdColumnType } from '@/types';

const ROWS_PER_FILE = 2_000_000;

interface ParsedFileData {
  id: string;
  ids: Set<string>;
  name: string;
}

/**
 * Parse a single CSV file and extract IDs
 */
async function parseCSVFile(fileInfo: FileInfo): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;

      if (!text || text.trim().length === 0) {
        reject(new Error(`ファイル "${fileInfo.name}" が空です`));
        return;
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (!results.data || results.data.length === 0) {
              throw new Error(`ファイル "${fileInfo.name}" にデータが見つかりません`);
            }

            const ids = new Set<string>();

            // Extract IDs - try both 'uuid' and 'id_type:uuid' columns
            results.data.forEach((row: any) => {
              // Try the specified column first
              let id = row[fileInfo.idColumn];

              // If not found, try the other column type
              if (!id) {
                const altColumn = fileInfo.idColumn === 'uuid' ? 'id_type:uuid' : 'uuid';
                id = row[altColumn];
              }

              if (id && typeof id === 'string' && id.trim()) {
                ids.add(id.trim());
              }
            });

            if (ids.size === 0) {
              const availableColumns = results.data[0]
                ? Object.keys(results.data[0]).join(', ')
                : 'なし';
              throw new Error(
                `ファイル "${fileInfo.name}" から有効なIDが見つかりませんでした。\n` +
                `指定されたカラム: "${fileInfo.idColumn}"\n` +
                `利用可能なカラム: ${availableColumns}`
              );
            }

            resolve({
              id: fileInfo.id,
              ids,
              name: fileInfo.name,
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(new Error(`ファイル "${fileInfo.name}" のパースに失敗しました: ${error.message}`));
        },
      });
    };

    reader.onerror = () => {
      reject(new Error(`ファイル "${fileInfo.name}" の読み込みに失敗しました`));
    };

    reader.readAsText(fileInfo.file);
  });
}

export interface ProcessResult {
  blob: Blob;
  totalRows: number;
  fileCount: number;
}

/**
 * Process CSV files and generate merged output
 */
export async function processCSVFiles(
  files: FileInfo[],
  operations: Operation[],
  outputHeader: IdColumnType,
  onProgress?: (message: string, progress: number) => void
): Promise<ProcessResult> {
  try {
    // Parse all CSV files
    onProgress?.('ファイルを読み込んでいます...', 10);
    const filesData = await Promise.all(
      files.map((fileInfo, index) => {
        onProgress?.(`ファイル ${index + 1}/${files.length} を解析中...`, 10 + (index / files.length) * 40);
        return parseCSVFile(fileInfo);
      })
    );

    onProgress?.('IDを結合しています...', 50);

    // Create a map for quick lookup
    const filesMap = new Map(filesData.map((f) => [f.id, f]));

    // Execute operations sequentially
    let resultIds: Set<string> = new Set();

    if (operations.length === 0) {
      // If no operations defined, merge all files with OR
      filesData.forEach(({ ids }) => {
        ids.forEach((id) => resultIds.add(id));
      });
    } else {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];

        if (operation.fileIds.length === 0) {
          continue;
        }

        // Get all IDs for files in this operation
        const operationIdSets = operation.fileIds
          .map((fileId) => filesMap.get(fileId)?.ids)
          .filter((ids): ids is Set<string> => ids !== undefined);

        if (operationIdSets.length === 0) {
          continue;
        }

        let operationResult: Set<string>;

        if (operation.type === 'OR') {
          // Union: combine all IDs
          operationResult = new Set<string>();
          operationIdSets.forEach((idSet) => {
            idSet.forEach((id) => operationResult.add(id));
          });
        } else {
          // AND: intersection of all IDs
          operationResult = new Set(operationIdSets[0]);
          for (let j = 1; j < operationIdSets.length; j++) {
            operationResult = new Set(
              [...operationResult].filter((id) => operationIdSets[j].has(id))
            );
          }
        }

        // If this is the first operation, use the result directly
        // Otherwise, apply the operation to the previous result
        if (i === 0) {
          resultIds = operationResult;
        } else {
          // Subsequent operations always use AND with previous result
          resultIds = new Set([...resultIds].filter((id) => operationResult.has(id)));
        }
      }
    }

    onProgress?.('ZIPファイルを生成しています...', 70);

    // Convert to array and split into chunks
    const allIds = Array.from(resultIds);
    const totalRows = allIds.length;
    const fileCount = Math.ceil(totalRows / ROWS_PER_FILE);

    // Create ZIP archive
    const zip = new JSZip();

    // Split and add files to archive
    for (let i = 0; i < fileCount; i++) {
      const start = i * ROWS_PER_FILE;
      const end = Math.min(start + ROWS_PER_FILE, totalRows);
      const chunkIds = allIds.slice(start, end);

      // Create CSV content with header
      const csvContent = [
        outputHeader, // header
        ...chunkIds, // IDs
      ].join('\n');

      const fileName = fileCount === 1 ? 'output.csv' : `output_${i + 1}.csv`;
      zip.file(fileName, csvContent);

      onProgress?.(`ファイル ${i + 1}/${fileCount} を追加中...`, 70 + (i / fileCount) * 20);
    }

    onProgress?.('ZIPファイルを圧縮しています...', 90);

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    onProgress?.('完了！', 100);

    return {
      blob: zipBlob,
      totalRows,
      fileCount,
    };
  } catch (error) {
    throw error;
  }
}
