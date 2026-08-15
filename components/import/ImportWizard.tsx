'use client';

import { useState } from 'react';
import StepIndicator, { type WizardStep } from './StepIndicator';
import UploadStep from './UploadStep';
import MapStep from './MapStep';
import ReviewStep from './ReviewStep';
import DoneStep from './DoneStep';
import {
  DONOR_IMPORT_FIELDS,
  REQUIRED_DONOR_IMPORT_FIELDS,
  IDENTITY_PATHS,
  suggestDonorMapping,
} from '@/lib/import/donor-fields';
import { importDonorsAction } from '@/lib/actions/import';
import type { ImportResult } from '@/lib/import/shared';
import Link from 'next/link';

export default function ImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleParsed(parsedHeaders: string[], parsedRows: Record<string, string>[]) {
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setMapping(suggestDonorMapping(parsedHeaders));
    setStep('map');
  }

  function handleMappingChange(fieldKey: string, header: string | null) {
    setMapping((prev) => ({ ...prev, [fieldKey]: header }));
  }

  function handleImportDone(importResult: ImportResult) {
    setResult(importResult);
    setStep('done');
  }

  function handleReset() {
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setStep('upload');
  }

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator current={step} />

      {step === 'upload' && <UploadStep onParsed={handleParsed} />}

      {step === 'map' && (
        <MapStep
          fields={DONOR_IMPORT_FIELDS}
          requiredFields={REQUIRED_DONOR_IMPORT_FIELDS}
          identityPaths={IDENTITY_PATHS}
          identityNote="Map either First name + Last name (for individual donors) or Organization name (for companies/foundations) — at least one is required. If your file has both individuals and organizations mixed together, map all three columns; each row only needs to fill in the one that applies to it."
          headers={headers}
          rows={rows}
          mapping={mapping}
          onChange={handleMappingChange}
          onBack={handleReset}
          onContinue={() => setStep('review')}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          requiredFields={REQUIRED_DONOR_IMPORT_FIELDS}
          identityPaths={IDENTITY_PATHS}
          rows={rows}
          mapping={mapping}
          duplicateNote="Donors with an email matching one already in your organization will also be skipped, to avoid duplicates."
          importAction={importDonorsAction}
          onBack={() => setStep('map')}
          onDone={handleImportDone}
        />
      )}

      {step === 'done' && result && (
        <DoneStep
          result={result}
          itemLabel="donor"
          nextStepNote={
            <>
              Health scores for imported donors haven&rsquo;t been computed yet — head to{' '}
              <Link href="/settings" className="font-semibold text-evergreen">
                Settings
              </Link>{' '}
              and click <strong>Recalculate all donor scores</strong> to bring them current.
            </>
          }
          onImportAnother={handleReset}
        />
      )}
    </div>
  );
}
