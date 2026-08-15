'use client';

import { useState } from 'react';
import Link from 'next/link';
import StepIndicator, { type WizardStep } from './StepIndicator';
import UploadStep from './UploadStep';
import MapStep from './MapStep';
import ReviewStep from './ReviewStep';
import DoneStep from './DoneStep';
import { GIFT_IMPORT_FIELDS, REQUIRED_GIFT_IMPORT_FIELDS, suggestGiftMapping } from '@/lib/import/gift-fields';
import { importGiftsAction } from '@/lib/actions/import-gifts';
import type { ImportResult } from '@/lib/import/shared';

export default function GiftImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleParsed(parsedHeaders: string[], parsedRows: Record<string, string>[]) {
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setMapping(suggestGiftMapping(parsedHeaders));
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
          fields={GIFT_IMPORT_FIELDS}
          requiredFields={REQUIRED_GIFT_IMPORT_FIELDS}
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
          requiredFields={REQUIRED_GIFT_IMPORT_FIELDS}
          rows={rows}
          mapping={mapping}
          duplicateNote="Gifts are matched to existing donors by email — a row whose email doesn't match any donor in your organization is skipped. There's no duplicate-gift detection, so avoid running the same file twice; re-importing it will double-count those gifts."
          importAction={importGiftsAction}
          onBack={() => setStep('map')}
          onDone={handleImportDone}
        />
      )}

      {step === 'done' && result && (
        <DoneStep
          result={result}
          itemLabel="gift"
          nextStepNote={
            <>
              Lifetime giving totals are already updated on each donor. Health score and
              retention risk badges aren&rsquo;t, though — head to{' '}
              <Link href="/settings" className="font-semibold text-evergreen">
                Settings
              </Link>{' '}
              and click <strong>Recalculate all donor scores</strong> to bring those current too.
            </>
          }
          onImportAnother={handleReset}
        />
      )}
    </div>
  );
}
