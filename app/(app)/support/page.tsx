import SupportRequestForm from '@/components/support/SupportRequestForm';

export default function SupportPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Contact support</h1>
      <p className="mt-1 text-sm text-gray-600">
        Send us a message and we&rsquo;ll follow up at your account email as soon as we can.
      </p>

      <div className="mt-6">
        <SupportRequestForm />
      </div>
    </div>
  );
}
