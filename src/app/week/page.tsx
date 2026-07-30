import { CalendarEmbed } from "@/components/calendar-embed";
import { EmbedHeightReporter } from "@/components/embed-height-reporter";
import { getCalendarFeed } from "@/lib/calendar";

export const revalidate = 300;

async function getWeekParam(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  const resolved = searchParams ? await searchParams : undefined;
  const week = resolved?.week;
  return Array.isArray(week) ? week[0] : week;
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const week = await getWeekParam(searchParams);
  const feed = await getCalendarFeed({
    viewMode: "week",
    weekKey: week,
  });

  return (
    <main className="embed-page" data-embed-height-root>
      <EmbedHeightReporter />
      <CalendarEmbed feed={feed} embedded basePath="/week" />
    </main>
  );
}
