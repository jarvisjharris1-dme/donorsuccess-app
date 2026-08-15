'use client';

import { useState } from 'react';
import Link from 'next/link';
import StepIndicator, { type WizardStep } from './StepIndicator';
import UploadStep from './UploadStep';
import MapStep from './MapStep';
import ReviewStep from './ReviewStep';
import DoneStep from './DoneStep';
import { GRANT_IMPORT_FIELDS, REQUIRED_GRANT_IMPORT_FIELDS, suggestGrantMapping } from '@/lib/import/grant-fields';
import { importGrantsAction } from '@/lib/actions/import-grants';
import type { ImportResult } from '@/lib/import/shared';

export default function GrantImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleParsed(parsedHeaders: string[], parsedRows: Record<string, string>[]) {
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setMapping(suggestGrantMapping(parsedHeaders));
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
          fields={GRANT_IMPORT_FIELDS}
          requiredFields={REQUIRED_GRANT_IMPORT_FIELDS}
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
          requiredFields={REQUIRED_GRANT_IMPORT_FIELDS}
          rows={rows}
          mapping={mapping}
          duplicateNote="Grants are matched to existing funders by organization name — a row whose funder doesn't match an Organization, Foundation, or Corporation donor already in your system is skipped. Add the funder as a donor first if it isn't there yet. This only imports the pre-award pipeline; converting an awarded grant into a tracked grant with a compliance plan is a separate step you do afterward for each one."
          importAction={importGrantsAction}
          onBack={() => setStep('map')}
          onDone={handleImportDone}
        />
      )}

      {step === 'done' && result && (
        <DoneStep
          result={result}
          itemLabel="grant opportunity"
          nextStepNote={
            <>
              Every imported row starts as a pre-award opportunity, defaulting to whoever ran this
              import as the grant writer if no matching writer email was found. Head to{' '}
              <Link href="/grants" className="font-semibold text-evergreen">
                Grant opportunities
              </Link>{' '}
              to reassign writers, add requirements, or convert an already-awarded one into a
              tracked grant with a compliance plan.
            </>
          }
          onImportAnother={handleReset}
        />
      )}
    </div>
  );
}
