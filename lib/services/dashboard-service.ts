import { getNotificationSummary } from "@/lib/services/notification-service";
import { getCurrentWeeklyQuota } from "@/lib/services/quota-service";
import type { DashboardSummary } from "@/lib/types/dashboard";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const quota = await getCurrentWeeklyQuota();
  const notification = await getNotificationSummary();

  return {
    week: quota?.isoWeek ?? "unassigned",
    draftTarget: quota?.targetDrafts ?? 8,
    draftActual: quota?.stats?.draftCount ?? 0,
    reviewTarget: quota?.targetReviews ?? 6,
    reviewActual: quota?.stats?.reviewCount ?? 0,
    publishTarget: quota?.targetPublishes ?? 5,
    publishActual: quota?.stats?.publishedCount ?? 0,
    missingDrafts: quota?.stats?.missingDrafts ?? 0,
    missingPublishes: quota?.stats?.missingPublishes ?? 0,
    alertsOpen: quota?.alerts.length ?? 0,
    lastNotificationStatus: notification.latestLog?.status ?? "PENDING",
  };
}
