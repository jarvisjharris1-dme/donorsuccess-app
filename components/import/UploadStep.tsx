'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText } from 'lucide-react';

export default function UploadStep({
  onParsed,
}: {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields ?? [];
          if (headers.length === 0) {
            setError('Could not find any columns in that file. Make sure the first row has headers.');
            return;
          }
          if (results.data.length === 0) {
            setError('That file has headers but no data rows.');
            return;
          }
          onParsed(headers, results.data);
        },
        error: (err: Error) => {
          setError(`Could not read that file: ${err.message}`);
        },
      });
    },
    [onParsed],
  );

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-16 text-center transition-colors ${
          isDragging ? 'border-evergreen bg-evergreen/5' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-evergreen/10">
          {fileName ? (
            <FileText size={22} className="text-evergreen" />
          ) : (
            <Upload size={22} className="text-evergreen" />
          )}
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-900">
          {fileName ?? 'Drop a CSV file here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          The first row should be column headers (e.g. &ldquo;First Name&rdquo;,
          &ldquo;Email&rdquo;...)
        </p>
      </label>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
