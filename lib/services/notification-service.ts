import { db } from "@/lib/db";

export async function getPrimaryNotificationChannel() {
  return db.notificationChannel.findFirst({
    where: {
      type: "EMAIL",
      isEnabled: true,
    },
    include: {
      logs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
      rules: true,
    },
  });
}

export async function getNotificationSummary() {
  const channel = await getPrimaryNotificationChannel();

  return {
    target: channel?.target ?? process.env.ALERT_EMAIL_TO ?? "kimcomplete8888@gmail.com",
    latestLog: channel?.logs[0] ?? null,
    rulesEnabled: channel?.rules.filter((rule) => rule.isEnabled).length ?? 0,
  };
}
