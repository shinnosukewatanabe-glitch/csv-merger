import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import archiver from 'archiver';
import { Readable } from 'stream';
import { IdColumnType, Operation } from '@/types';

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
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const configStr = formData.get('config') as string;
    const config: MergeConfigData = JSON.parse(configStr);

    // Parse all CSV files
    const filesData = await Promise.all(
      files.map(async (file, index) => {
        const text = await file.text();
        const fileConfig = config.files[index];

        return new Promise<{ id: string; ids: Set<string>; config: FileConfig }>(
          (resolve, reject) => {
            Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const ids = new Set<string>();

                // Extract IDs - try both 'uuid' and 'id_type:uuid' columns
                results.data.forEach((row: any) => {
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

                resolve({
                  id: fileConfig.id,
                  ids,
                  config: fileConfig,
                });
              },
              error: (error: Error) => reject(error),
            });
          }
        );
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

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="merged_output.zip"',
        'X-Result-Info': JSON.stringify({ totalRows, fileCount }),
      },
    });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json(
      { error: 'Failed to process files' },
      { status: 500 }
    );
  }
}
