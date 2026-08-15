'use client';

import { useState } from 'react';
import Link from 'next/link';
import StepIndicator, { type WizardStep } from './StepIndicator';
import UploadStep from './UploadStep';
import MapStep from './MapStep';
import ReviewStep from './ReviewStep';
import DoneStep from './DoneStep';
import { TEAM_IMPORT_FIELDS, REQUIRED_TEAM_IMPORT_FIELDS, suggestTeamMapping } from '@/lib/import/team-fields';
import { importTeamAction } from '@/lib/actions/import-team';
import type { ImportResult } from '@/lib/import/shared';

export default function TeamImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleParsed(parsedHeaders: string[], parsedRows: Record<string, string>[]) {
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setMapping(suggestTeamMapping(parsedHeaders));
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
          fields={TEAM_IMPORT_FIELDS}
          requiredFields={REQUIRED_TEAM_IMPORT_FIELDS}
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
          requiredFields={REQUIRED_TEAM_IMPORT_FIELDS}
          rows={rows}
          mapping={mapping}
          duplicateNote="Rows with an email that already has an account, an existing pending invitation, or a duplicate within this same file are skipped. Role defaults to Fundraiser if left blank or not recognized."
          importAction={importTeamAction}
          onBack={() => setStep('map')}
          onDone={handleImportDone}
        />
      )}

      {step === 'done' && result && (
        <DoneStep
          result={result}
          itemLabel="invitation"
          nextStepNote={
            <>
              Each invited teammate gets an email to set up their own password. You can also see
              and manage everyone&rsquo;s status from{' '}
              <Link href="/settings" className="font-semibold text-evergreen">
                Settings → Team
              </Link>
              .
            </>
          }
          onImportAnother={handleReset}
        />
      )}
    </div>
  );
}
