import { NextResponse } from "next/server";

import { getCalendarFeed } from "@/lib/calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawView = searchParams.get("view")?.trim().toLowerCase();
  const viewMode = rawView === "week" ? "week" : "month";
  const feed = await getCalendarFeed({
    monthKey: searchParams.get("month") || undefined,
    viewMode,
    weekKey: searchParams.get("week") || undefined,
  });
  const status = feed.status === "mock-error" ? 503 : 200;

  return NextResponse.json(feed, {
    status,
    headers: {
      "Cache-Control": "s-maxage=300, stale-while-revalidate=86400",
      "X-Calendar-Status": feed.status,
      "X-Calendar-Time-Zone": feed.timeZone,
    },
  });
}