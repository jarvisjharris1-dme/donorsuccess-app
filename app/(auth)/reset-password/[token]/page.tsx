import { prisma } from '@/lib/db';
import BrandPanel from '@/components/auth/BrandPanel';
import ResetPasswordForm from './ResetPasswordForm';

export default async function ResetPasswordPage({ params }: { params: { token: string } }) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token: params.token },
  });

  const isValid = !!verificationToken && verificationToken.expires > new Date();

  return (
    <div className="flex min-h-screen">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-12 lg:bg-white">
        <div className="w-full max-w-[400px] fade-up">
          {isValid ? (
            <>
              <h1 className="text-[28px] font-extrabold text-gray-900">Set a new password</h1>
              <p className="mt-1.5 text-[15px] text-gray-600">
                Choose a new password for {verificationToken.identifier}.
              </p>
              <div className="mt-8">
                <ResetPasswordForm token={params.token} />
              </div>
            </>
          ) : (
            <div className="text-center">
              <h1 className="text-[24px] font-extrabold text-gray-900">
                This link is invalid or has expired
              </h1>
              <p className="mt-2 text-[15px] text-gray-600">
                Password reset links expire after an hour. Ask your organization&rsquo;s Admin for a
                new one, or request one yourself from the login page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
