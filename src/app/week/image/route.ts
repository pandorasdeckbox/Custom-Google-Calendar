import { getCalendarFeed } from "@/lib/calendar";
import { buildWeeklyCalendarImageResponse } from "@/lib/weekly-calendar-discord";

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed = await getCalendarFeed({
    viewMode: "week",
    weekKey: searchParams.get("week") || undefined,
  });

  return await buildWeeklyCalendarImageResponse(feed);
}
