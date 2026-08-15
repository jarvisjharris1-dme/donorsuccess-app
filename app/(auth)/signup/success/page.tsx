import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import BrandPanel from '@/components/auth/BrandPanel';

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-12 lg:bg-white">
        <div className="w-full max-w-[440px] fade-up text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 size={28} className="text-success" />
          </div>
          <h1 className="mt-5 text-[26px] font-extrabold text-gray-900">Payment received</h1>
          <p className="mt-2 text-[15px] text-gray-600">
            We&rsquo;re setting up your organization now — you&rsquo;ll get an email in the next few
            minutes with a link to set your password and log in.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Nothing yet? Check your spam folder, or{' '}
            <a href="mailto:support@donorsuccess.com" className="font-semibold text-evergreen">
              reach out
            </a>{' '}
            if it&rsquo;s been more than 15 minutes.
          </p>
          <Link
            href="https://www.donorsuccess.com"
            className="mt-8 inline-block text-[13.5px] font-semibold text-gray-600 hover:text-gray-900"
          >
            Back to donorsuccess.com
          </Link>
        </div>
      </div>
    </div>
  );
}
