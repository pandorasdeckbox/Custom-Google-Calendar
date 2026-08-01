import { getCalendarFeed } from "@/lib/calendar";
import { buildMonthlyCalendarImageResponse } from "@/lib/weekly-calendar-discord";

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed = await getCalendarFeed({
    viewMode: "month",
    monthKey: searchParams.get("month") || undefined,
  });

  return await buildMonthlyCalendarImageResponse(feed);
}