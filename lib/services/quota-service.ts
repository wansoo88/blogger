import { db } from "@/lib/db";

export async function getCurrentWeeklyQuota() {
  return db.weeklyQuota.findFirst({
    orderBy: {
      startDate: "desc",
    },
    include: {
      stats: true,
      alerts: {
        where: {
          status: "OPEN",
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function getWeeklyAssignments(isoWeek: string) {
  return db.weeklyQuota.findUnique({
    where: { isoWeek },
    include: {
      assignments: {
        include: {
          post: true,
          keyword: true,
        },
        orderBy: {
          dueDate: "asc",
        },
      },
    },
  });
}
