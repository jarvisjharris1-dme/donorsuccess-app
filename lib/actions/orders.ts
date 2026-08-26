'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { createOrder, getOrder, updateOrder } from '@/lib/orders';
import { provisionOrder, sendOrderOwnerInvitation } from '@/lib/provisioning/provision-order';

async function requirePlatformAdmin() {
  const session = await auth();
  if (!session) redirect('/login');
  if (!session.user.isPlatformAdmin) redirect('/dashboard');
  return session;
}

const newOrderSchema = z.object({
  organizationName: z.string().trim().min(2),
  ownerName: z.string().trim().optional(),
  ownerEmail: z.string().trim().toLowerCase().email(),
  subscriptionTier: z.enum(['GROWTH', 'ENTERPRISE']),
  billingPeriod: z.enum(['monthly', 'annual']).optional(),
  arr: z.coerce.number().min(0).optional(),
  oneTime: z.coerce.number().min(0).optional(),
  quoteId: z.string().trim().optional(),
  turboSignDocumentId: z.string().trim().optional(),
  products: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type OrderActionState = { error?: string; success?: string; orderId?: string } | undefined;

export async function createSalesAssistedOrderAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  await requirePlatformAdmin();
  const parsed = newOrderSchema.safeParse({
    organizationName: formData.get('organizationName'),
    ownerName: formData.get('ownerName') || undefined,
    ownerEmail: formData.get('ownerEmail'),
    subscriptionTier: formData.get('subscriptionTier'),
    billingPeriod: formData.get('billingPeriod') || undefined,
    arr: formData.get('arr') || undefined,
    oneTime: formData.get('oneTime') || undefined,
    quoteId: formData.get('quoteId') || undefined,
    turboSignDocumentId: formData.get('turboSignDocumentId') || undefined,
    products: formData.get('products') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the order details.' };
  }

  try {
    const order = await createOrder({
      source: 'TURBODOCX',
      organizationName: parsed.data.organizationName,
      ownerName: parsed.data.ownerName || null,
      ownerEmail: parsed.data.ownerEmail,
      subscriptionTier: parsed.data.subscriptionTier,
      billingPeriod: parsed.data.billingPeriod || null,
      arrCents: parsed.data.arr == null ? null : Math.round(parsed.data.arr * 100),
      oneTimeCents: parsed.data.oneTime == null ? null : Math.round(parsed.data.oneTime * 100),
      quoteId: parsed.data.quoteId || null,
      turboSignDocumentId: parsed.data.turboSignDocumentId || null,
      products: parsed.data.products
        ? parsed.data.products.split(',').map((p) => p.trim()).filter(Boolean)
        : [],
      notes: parsed.data.notes || null,
    });
    revalidatePath('/admin/orders');
    return {
      success: parsed.data.turboSignDocumentId
        ? 'Order created and linked to TurboSign.'
        : 'Order created. TurboSign will auto-link it when the signature event arrives.',
      orderId: order.id,
    };
  } catch (err) {
    console.error('Create sales-assisted order failed:', err);
    const message = err instanceof Error && err.message.includes('unique')
      ? 'That TurboSign document is already linked to an order.'
      : 'Could not create the order.';
    return { error: message };
  }
}

export async function provisionOrderAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get('orderId') || '');
  const order = await getOrder(id);
  if (!order) throw new Error('Order not found.');
  if (!['SIGNED', 'FAILED'].includes(order.status)) {
    throw new Error('Order must be signed before provisioning.');
  }
  await provisionOrder(order);
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
}

export async function retryOwnerInvitationAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get('orderId') || '');
  const order = await getOrder(id);
  if (!order) throw new Error('Order not found.');
  if (!order.organizationId) throw new Error('Customer organization has not been provisioned yet.');
  await sendOrderOwnerInvitation(order);
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
}

export async function updateOrderStatusAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get('orderId') || '');
  const status = String(formData.get('status') || '') as
    | 'READY_FOR_KICKOFF'
    | 'IMPLEMENTATION'
    | 'FULFILLED';
  if (!['READY_FOR_KICKOFF', 'IMPLEMENTATION', 'FULFILLED'].includes(status)) {
    throw new Error('Invalid fulfillment status.');
  }
  await updateOrder(id, {
    status,
    onboardingStartedAt: status === 'IMPLEMENTATION' ? new Date() : undefined,
    fulfilledAt: status === 'FULFILLED' ? new Date() : undefined,
  });
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
}
