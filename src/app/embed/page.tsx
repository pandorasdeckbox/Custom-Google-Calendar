import { CalendarEmbed } from "@/components/calendar-embed";
import { EmbedHeightReporter } from "@/components/embed-height-reporter";
import { getCalendarFeed } from "@/lib/calendar";

export const revalidate = 300;

async function getMonthParam(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  const resolved = searchParams ? await searchParams : undefined;
  const month = resolved?.month;
  return Array.isArray(month) ? month[0] : month;
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const month = await getMonthParam(searchParams);
  const feed = await getCalendarFeed(month);

  return (
    <main className="embed-page">
      <EmbedHeightReporter />
      <CalendarEmbed feed={feed} embedded basePath="/embed" />
    </main>
  );
}