import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import archiver from 'archiver';
import { Readable } from 'stream';
import { IdColumnType, Operation } from '@/types';

// Route segment config for Vercel
export const maxDuration = 60; // Maximum execution time in seconds (requires Pro plan for >10s)
export const dynamic = 'force-dynamic'; // Disable static optimization

const ROWS_PER_FILE = 2_000_000;

interface FileConfig {
  id: string;
  name: string;
  idColumn: IdColumnType;
}

interface MergeConfigData {
  files: FileConfig[];
  operations: Operation[];
  outputHeader: IdColumnType;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Merge API] Request started');

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const configStr = formData.get('config') as string;

    console.log(`[Merge API] Files received: ${files.length}`);
    console.log(`[Merge API] Total size: ${files.reduce((acc, f) => acc + f.size, 0)} bytes`);

    if (!configStr) {
      throw new Error('設定情報が見つかりません');
    }

    if (files.length === 0) {
      throw new Error('ファイルがアップロードされていません');
    }

    const config: MergeConfigData = JSON.parse(configStr);

    if (config.files.length !== files.length) {
      throw new Error(`ファイル数が一致しません (設定: ${config.files.length}, アップロード: ${files.length})`);
    }

    console.log('[Merge API] Starting file parsing...');

    // Parse all CSV files
    const filesData = await Promise.all(
      files.map(async (file, index) => {
        try {
          const text = await file.text();
          const fileConfig = config.files[index];

          if (!text || text.trim().length === 0) {
            throw new Error(`ファイル "${fileConfig.name}" が空です`);
          }

          return new Promise<{ id: string; ids: Set<string>; config: FileConfig }>(
            (resolve, reject) => {
              Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                  try {
                    if (!results.data || results.data.length === 0) {
                      throw new Error(`ファイル "${fileConfig.name}" にデータが見つかりません`);
                    }

                    const ids = new Set<string>();

                    // Extract IDs - try both 'uuid' and 'id_type:uuid' columns
                    results.data.forEach((row: any, rowIndex: number) => {
                      // Try the specified column first
                      let id = row[fileConfig.idColumn];

                      // If not found, try the other column type
                      if (!id) {
                        const altColumn = fileConfig.idColumn === 'uuid' ? 'id_type:uuid' : 'uuid';
                        id = row[altColumn];
                      }

                      if (id && id.trim()) {
                        ids.add(id.trim());
                      }
                    });

                    if (ids.size === 0) {
                      const availableColumns = results.data[0] ? Object.keys(results.data[0]).join(', ') : 'なし';
                      throw new Error(
                        `ファイル "${fileConfig.name}" から有効なIDが見つかりませんでした。\n` +
                        `指定されたカラム: "${fileConfig.idColumn}"\n` +
                        `利用可能なカラム: ${availableColumns}`
                      );
                    }

                    resolve({
                      id: fileConfig.id,
                      ids,
                      config: fileConfig,
                    });
                  } catch (error) {
                    reject(error);
                  }
                },
                error: (error: Error) => {
                  reject(new Error(`ファイル "${fileConfig.name}" のパースに失敗しました: ${error.message}`));
                },
              });
            }
          );
        } catch (error) {
          throw new Error(
            `ファイル "${config.files[index].name}" の読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
          );
        }
      })
    );

    // Create a map for quick lookup
    const filesMap = new Map(filesData.map((f) => [f.id, f]));

    // Execute operations sequentially
    let resultIds: Set<string> = new Set();

    for (let i = 0; i < config.operations.length; i++) {
      const operation = config.operations[i];

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

    // If no operations defined, merge all files with OR
    if (config.operations.length === 0) {
      resultIds = new Set();
      filesData.forEach(({ ids }) => {
        ids.forEach((id) => resultIds.add(id));
      });
    }

    // Convert to array and split into chunks
    const allIds = Array.from(resultIds);
    const totalRows = allIds.length;
    const fileCount = Math.ceil(totalRows / ROWS_PER_FILE);

    console.log(`[Merge API] Processing complete. Total IDs: ${totalRows}, Files to generate: ${fileCount}`);
    console.log('[Merge API] Creating ZIP archive...');

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk) => chunks.push(chunk));

    // Split and add files to archive
    for (let i = 0; i < fileCount; i++) {
      const start = i * ROWS_PER_FILE;
      const end = Math.min(start + ROWS_PER_FILE, totalRows);
      const chunkIds = allIds.slice(start, end);

      // Create CSV content with header
      const csvContent = [
        config.outputHeader, // header
        ...chunkIds, // IDs
      ].join('\n');

      const fileName = fileCount === 1 ? 'output.csv' : `output_${i + 1}.csv`;
      archive.append(csvContent, { name: fileName });
    }

    await archive.finalize();

    // Combine all chunks
    const zipBuffer = Buffer.concat(chunks);

    const elapsedTime = Date.now() - startTime;
    console.log(`[Merge API] Request completed in ${elapsedTime}ms. ZIP size: ${zipBuffer.length} bytes`);

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="merged_output.zip"',
        'X-Result-Info': JSON.stringify({ totalRows, fileCount }),
      },
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[Merge API] Error after ${elapsedTime}ms:`, error);

    let errorMessage = 'ファイルの処理に失敗しました';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      console.error('[Merge API] Error details:', errorMessage);
      console.error('[Merge API] Stack trace:', errorDetails);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        elapsedTime: `${elapsedTime}ms`
      },
      { status: 500 }
    );
  }
}
