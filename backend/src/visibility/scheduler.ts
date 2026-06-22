import { prisma } from '../lib/prisma.js';
import { PLAN_LIMITS, resolvePlan } from '../lib/plans.js';
import { startVisibilityRun } from './service.js';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function processDueSchedules(): Promise<void> {
  const now = new Date();
  const due = await prisma.visibilitySchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    include: { brand: { include: { user: true } } },
  });

  for (const schedule of due) {
    const plan = resolvePlan(schedule.brand.user.plan);
    if (!PLAN_LIMITS[plan].scheduling) continue;

    try {
      const runId = await startVisibilityRun(schedule.brandId, schedule.brand.userId);
      const run = await prisma.visibilityRun.findUnique({ where: { id: runId } });

      if (schedule.alertThreshold != null && run?.visibilityScore != null) {
        const prev = await prisma.visibilityRun.findFirst({
          where: {
            brandId: schedule.brandId,
            status: 'done',
            id: { not: runId },
          },
          orderBy: { startedAt: 'desc' },
        });
        if (
          prev?.visibilityScore != null &&
          run.visibilityScore < schedule.alertThreshold &&
          run.visibilityScore < prev.visibilityScore
        ) {
          console.warn(
            `[Alert] Brand ${schedule.brand.name} visibility dropped to ${run.visibilityScore}% (threshold ${schedule.alertThreshold}%)`,
          );
          // Transactional email hook — wire to SmartMail when available
        }
      }

      const nextRunAt =
        schedule.frequency === 'daily' ? addDays(now, 1) : addDays(now, 7);

      await prisma.visibilitySchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt },
      });
    } catch (err) {
      console.error('[Scheduler] Failed for schedule', schedule.id, err);
    }
  }
}

export async function upsertSchedule(
  brandId: string,
  userId: string,
  data: { frequency: 'daily' | 'weekly'; enabled: boolean; alertThreshold?: number },
) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId } });
  if (!brand) throw new Error('Brand not found');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!PLAN_LIMITS[resolvePlan(user?.plan)].scheduling) {
    throw new Error('Scheduling requires a Pro or Agency plan');
  }

  const nextRunAt = data.enabled
    ? data.frequency === 'daily'
      ? addDays(new Date(), 1)
      : addDays(new Date(), 7)
    : null;

  return prisma.visibilitySchedule.upsert({
    where: { brandId },
    create: {
      brandId,
      frequency: data.frequency,
      enabled: data.enabled,
      alertThreshold: data.alertThreshold,
      nextRunAt,
    },
    update: {
      frequency: data.frequency,
      enabled: data.enabled,
      alertThreshold: data.alertThreshold,
      nextRunAt,
    },
  });
}
