import { NextResponse } from "next/server";
import { getPrimaryNotificationChannel } from "@/lib/services/notification-service";

export async function GET() {
  const channel = await getPrimaryNotificationChannel();

  return NextResponse.json({
    data: channel,
    error: null,
    meta: {
      recipient: channel?.target ?? process.env.ALERT_EMAIL_TO ?? "kimcomplete8888@gmail.com",
    },
  });
}
