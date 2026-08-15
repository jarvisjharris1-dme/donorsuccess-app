import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import ChatInterface from '@/components/insights/ChatInterface';

export default async function InsightsPage() {
  const session = await auth();
  if (!permissions.canEditDonors(session!.user.role as Role)) {
    redirect('/dashboard');
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900">Jarvis</h1>
      <p className="mt-1 text-sm text-gray-600">
        Your donor data, answered in plain language — every response is grounded in your
        organization&rsquo;s real, current numbers.
      </p>
      <div className="mt-6">
        <ChatInterface />
      </div>
    </div>
  );
}
