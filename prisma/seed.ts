import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  Category,
  Country,
  NotificationChannelType,
  NotificationEvent,
  PostStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const channel = await prisma.notificationChannel.upsert({
    where: {
      type_target: {
        type: NotificationChannelType.EMAIL,
        target: "kimcomplete8888@gmail.com",
      },
    },
    update: {
      isEnabled: true,
    },
    create: {
      type: NotificationChannelType.EMAIL,
      target: "kimcomplete8888@gmail.com",
      isEnabled: true,
    },
  });

  const events = [
    NotificationEvent.WEEKLY_DRAFT_SHORTFALL,
    NotificationEvent.WEEKLY_APPROVAL_SHORTFALL,
    NotificationEvent.WEEKLY_PUBLISH_SHORTFALL,
    NotificationEvent.PUBLISH_FAILURE,
    NotificationEvent.WEEKLY_SUMMARY,
  ];

  for (const event of events) {
    await prisma.notificationRule.upsert({
      where: {
        channelId_event: {
          channelId: channel.id,
          event,
        },
      },
      update: {
        isEnabled: true,
      },
      create: {
        channelId: channel.id,
        event,
        isEnabled: true,
        sendImmediately: event !== NotificationEvent.WEEKLY_SUMMARY,
        weeklyDigestIsoDay: event === NotificationEvent.WEEKLY_SUMMARY ? 7 : null,
        dailyDigestHour: event === NotificationEvent.WEEKLY_SUMMARY ? 21 : null,
      },
    });
  }

  const quota = await prisma.weeklyQuota.upsert({
    where: { isoWeek: "2026-W11" },
    update: {},
    create: {
      isoWeek: "2026-W11",
      startDate: new Date("2026-03-09T00:00:00+09:00"),
      endDate: new Date("2026-03-15T23:59:59+09:00"),
      targetDrafts: 8,
      targetReviews: 6,
      targetPublishes: 5,
      targetPages: 0,
    },
  });

  const post = await prisma.post.upsert({
    where: {
      slug: "best-free-ai-tools-for-busy-office-workers-in-2026",
    },
    update: {},
    create: {
      title: "Best Free AI Tools for Busy Office Workers in 2026",
      slug: "best-free-ai-tools-for-busy-office-workers-in-2026",
      category: Category.AI_PRODUCTIVITY,
      status: PostStatus.REVIEW,
      targetCountry: Country.US,
      assignedWeek: 11,
      wordCount: 1240,
      faqCount: 4,
      internalLinkCount: 2,
      hasRealExample: true,
    },
  });

  await prisma.weeklyStat.upsert({
    where: {
      weeklyQuotaId: quota.id,
    },
    update: {
      draftCount: 3,
      reviewCount: 2,
      approvedCount: 1,
      publishedCount: 1,
      missingDrafts: 5,
      missingPublishes: 4,
      categoryBreakdown: JSON.stringify({
        AI_PRODUCTIVITY: 2,
        MONEY_SAVING: 1,
      }),
    },
    create: {
      weeklyQuotaId: quota.id,
      draftCount: 3,
      reviewCount: 2,
      approvedCount: 1,
      publishedCount: 1,
      missingDrafts: 5,
      missingPublishes: 4,
      categoryBreakdown: JSON.stringify({
        AI_PRODUCTIVITY: 2,
        MONEY_SAVING: 1,
      }),
    },
  });

  await prisma.alert.create({
    data: {
      type: AlertType.WEEKLY_PUBLISH_SHORTFALL,
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.OPEN,
      message: "Weekly publish target is behind by 4 posts.",
      weeklyQuotaId: quota.id,
      postId: post.id,
    },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
