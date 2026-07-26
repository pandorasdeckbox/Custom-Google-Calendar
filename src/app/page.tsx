import { CalendarEmbed } from "@/components/calendar-embed";
import { getCalendarFeed } from "@/lib/calendar";

export const revalidate = 300;

type SearchParamsShape =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

async function getMonthParam(searchParams: SearchParamsShape) {
  const resolved = searchParams instanceof Promise ? await searchParams : searchParams;
  const month = resolved?.month;
  return Array.isArray(month) ? month[0] : month;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const month = await getMonthParam(searchParams);
  const feed = await getCalendarFeed(month);

  return (
    <main className="embed-page">
      <CalendarEmbed feed={feed} embedded basePath="/" />
    </main>
  );
}
