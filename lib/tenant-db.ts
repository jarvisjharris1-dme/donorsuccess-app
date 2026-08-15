import { prisma } from './db';

/**
 * Every model in this set carries an `organizationId` column. Any query
 * against one of these models issued through the client returned by
 * `forOrg()` automatically gets that organizationId merged into its
 * `where` (reads/updates/deletes) or `data` (creates).
 *
 * This means a feature (donors, gifts, campaigns, ...) can be built
 * against `forOrg(session.user.organizationId)` and it is *structurally*
 * impossible to leak another tenant's rows through a forgotten `where`
 * clause — the isolation lives in the data-access layer, not in each
 * route handler's discipline.
 *
 * `prisma` (the unscoped client from ./db) should only be used for
 * operations that are inherently cross-tenant or pre-tenant: looking up
 * a User by email during login, creating a brand new Organization during
 * signup, etc. Everything else should go through `forOrg`.
 */
const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Invitation',
  'Donor',
  'Gift',
  'Campaign',
  'Interaction',
  'Opportunity',
  'Task',
  'HealthScoreSnapshot',
  'AuditLog',
  'DonorSuccessPlan',
  'PlanMilestone',
  'CrmConnection',
  'EmailTemplate',
  'DonorContact',
  'DonorAffiliation',
  'WealthEngineConnection',
  'SequenceTemplate',
  'SequenceTemplateStep',
  'DonorSequenceEnrollment',
  'DonorSequenceStepLog',
  'GrantOpportunity',
  'GrantRequirement',
  'Grant',
  'GrantMilestone',
  'GrantDocument',
  'GrantComment',
  'GrantBudgetLine',
  'GrantExpense',
  'GrantReminderLog',
  'PlanComment',
  'PlanTemplate',
  'PlanTemplateMilestone',
  'ExecutiveBriefingSnapshot',
  'Board',
  'Committee',
  'BoardTerm',
  'BoardCommitment',
  'BoardIntroduction',
  'CommitteeMembership',
  'BoardMeeting',
  'BoardMeetingAttendance',
  'BoardMeetingDocument',
  'HiddenNavItem',
  'VolunteerHours',
  'ChatSession',
  'ChatMessage',
]);

const READ_OR_DELETE_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'delete',
  'deleteMany',
  'update',
  'updateMany',
  'upsert',
]);

export function forOrg(organizationId: string) {
  if (!organizationId) {
    throw new Error('forOrg() requires a non-empty organizationId');
  }

  return prisma.$extends({
    name: 'tenant-scoped',
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          if (READ_OR_DELETE_OPS.has(operation)) {
            args.where = { ...(args.where as object | undefined), organizationId };
          }

          if (operation === 'create') {
            args.data = { ...(args.data as object), organizationId };
          }

          if (operation === 'createMany' && Array.isArray(args.data)) {
            args.data = (args.data as Record<string, unknown>[]).map((row) => ({
              ...row,
              organizationId,
            }));
          }

          if (operation === 'upsert') {
            args.create = { ...(args.create as object), organizationId };
          }

          return query(args);
        },
      },
    },
  });
}

export type ScopedPrisma = ReturnType<typeof forOrg>;
