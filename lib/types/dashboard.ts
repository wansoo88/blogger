export type DashboardSummary = {
  week: string;
  draftTarget: number;
  draftActual: number;
  reviewTarget: number;
  reviewActual: number;
  publishTarget: number;
  publishActual: number;
  missingDrafts: number;
  missingPublishes: number;
  alertsOpen: number;
  lastNotificationStatus: string;
};
