import { NextResponse } from "next/server";
import { getCurrentWeeklyQuota } from "@/lib/services/quota-service";

export async function GET() {
  const quota = await getCurrentWeeklyQuota();

  return NextResponse.json({
    data: quota,
    error: null,
    meta: {
      source: "sqlite",
    },
  });
}
