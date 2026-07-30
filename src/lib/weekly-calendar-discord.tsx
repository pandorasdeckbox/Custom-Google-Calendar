import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  CATEGORY_STYLES,
  getCalendarEventTime,
  type CalendarCategory,
  type CalendarEvent,
  type CalendarFeed,
  type CalendarGridCell,
} from "@/lib/calendar";

const IMAGE_WIDTH = 1600;
const IMAGE_TOP_PADDING = 28;
const IMAGE_BOTTOM_PADDING = 28;
const TITLE_HEIGHT = 82;
const TITLE_TO_WEEKDAY_GAP = 16;
const WEEKDAY_HEIGHT = 52;
const WEEKDAY_TO_CARD_GAP = 18;
const WHITE_HEADER_HEIGHT = 136;
const CARD_SIDE_PADDING = 20;
const BODY_EDGE_PADDING = 14;
const EVENT_STACK_GAP = 12;
const SINGLE_DAY_MIN_CARD_HEIGHT = 392;
const STACKED_EVENT_CARD_FRAME_HEIGHT = 128;
const STACKED_EVENT_CARD_TITLE_LINE_HEIGHT = 32;
const STACKED_EVENT_OUTER_PADDING = CARD_SIDE_PADDING;

const IMAGE_CATEGORY_COLORS: Record<
  CalendarCategory,
  { color: string; accent: string }
> = {
  magic: { color: "#E0218A", accent: "#d5c2ff" },
  pokemon: { color: "#d91512", accent: "#ffd6b8" },
  lorcana: { color: "#881bee", accent: "#d8c6ff" },
  "one-piece": { color: "#3c60e8", accent: "#c8cbff" },
  "dragon-ball": { color: "#d99600", accent: "#ffe7a6" },
  gundam: { color: "#2c9f63", accent: "#c9f0d9" },
  marvel: { color: "#8e4c18", accent: "#f2d0ab" },
  riftbound: { color: "#FF8000", accent: "#ffe0b4" },
  "board-games": { color: "#2f8460", accent: "#bcead1" },
  "flesh-and-blood": { color: "#7f1d1d", accent: "#efb0b0" },
  other: { color: "#7f736c", accent: "#ddd2cb" },
};

type LoadedImageFonts = {
  berkshire: Buffer;
  bree: Buffer;
  month: Buffer;
  sora: Buffer;
  soraBold: Buffer;
};

let loadedImageFontsPromise: Promise<LoadedImageFonts> | null = null;

function loadImageFonts() {
  if (!loadedImageFontsPromise) {
    loadedImageFontsPromise = Promise.all([
      readFile(
        join(
          process.cwd(),
          "node_modules/@fontsource/berkshire-swash/files/berkshire-swash-latin-400-normal.woff",
        ),
      ),
      readFile(
        join(
          process.cwd(),
          "node_modules/@fontsource/bree-serif/files/bree-serif-latin-400-normal.woff",
        ),
      ),
      readFile(join(process.cwd(), "src/app/fonts/morally-serif.otf")),
      readFile(
        join(process.cwd(), "node_modules/@fontsource/sora/files/sora-latin-400-normal.woff"),
      ),
      readFile(
        join(process.cwd(), "node_modules/@fontsource/sora/files/sora-latin-700-normal.woff"),
      ),
    ]).then(([berkshire, bree, month, sora, soraBold]) => ({
      berkshire,
      bree,
      month,
      sora,
      soraBold,
    }));
  }

  return loadedImageFontsPromise;
}

function getWeeklyCells(feed: CalendarFeed) {
  return feed.month.weeks[0]?.cells || [];
}

function formatCellHeading(dateKey: string, weekdayLabel: string) {
  return `${weekdayLabel} ${new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00.000Z`))}`;
}

function formatEventLine(event: CalendarEvent, timeZone: string) {
  if (event.isClosed) {
    return "Closed";
  }

  if (event.allDay) {
    return event.title;
  }

  const eventTime = getCalendarEventTime(event, timeZone);
  return `${eventTime.startsAt} ${event.title}`;
}

function getDaySummaryLines(cell: CalendarGridCell, weekdayLabel: string, timeZone: string) {
  const heading = formatCellHeading(cell.dateKey, weekdayLabel);

  if (cell.events.length === 0) {
    return [`**${heading}**`, "- No featured events"];
  }

  return [
    `**${heading}**`,
    ...cell.events.map((event) => `- ${formatEventLine(event, timeZone)}`),
  ];
}

function formatDayNumber(dateKey: string) {
  return String(Number.parseInt(dateKey.slice(8, 10), 10));
}

function getImageCardAccent(cell: CalendarGridCell) {
  const activeEvent = cell.primaryEvent;
  if (!activeEvent) return IMAGE_CATEGORY_COLORS.other.color;
  return IMAGE_CATEGORY_COLORS[activeEvent.category].color;
}

function getImageCardBorder(cell: CalendarGridCell) {
  const activeEvent = cell.primaryEvent;
  if (!activeEvent) return "rgba(19, 13, 13, 0.56)";
  return IMAGE_CATEGORY_COLORS[activeEvent.category].accent;
}

function getImageEventMeta(event: CalendarEvent, timeZone: string) {
  if (event.isClosed) {
    return null;
  }

  if (event.allDay) {
    return "All day";
  }

  return getCalendarEventTime(event, timeZone).startsAt;
}

function getEventCategoryLabel(event: CalendarEvent | null) {
  if (!event) {
    return "Open Slot";
  }

  if (event.isClosed) {
    return "Store Update";
  }

  return CATEGORY_STYLES[event.category].label;
}

function getCardBodyBackground(cell: CalendarGridCell) {
  if (cell.isClosed) {
    return "repeating-linear-gradient(-45deg, rgba(229, 229, 226, 0.96) 0 12px, rgba(255, 255, 255, 0.98) 12px 24px)";
  }

  if (!cell.primaryEvent) {
    return "linear-gradient(180deg, rgba(84, 74, 67, 0.32), rgba(64, 56, 51, 0.82))";
  }

  return getImageCardAccent(cell);
}

function getCardBodyTextColor(cell: CalendarGridCell) {
  if (cell.isClosed) {
    return "#4e3f39";
  }

  return "#fffaf2";
}

function getCardTitleColor(cell: CalendarGridCell) {
  if (cell.isClosed) {
    return "#c31c13";
  }

  return "#fffaf2";
}

function getCardSubtitleColor(cell: CalendarGridCell) {
  if (cell.isClosed) {
    return "#4e3f39";
  }

  return "rgba(255, 247, 239, 0.92)";
}

function hasPaidEntry(event: CalendarEvent | null) {
  return Boolean(event?.price && event.price > 0);
}

function getFullCalendarUrl() {
  return "https://pandorasdeckbox.com/pages/events";
}

function countWrappedTitleLines(title: string, maxCharsPerLine: number) {
  const words = title.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 1;
  }

  let lineCount = 1;
  let currentLineLength = 0;

  for (const word of words) {
    const wordLength = word.length;

    if (wordLength > maxCharsPerLine) {
      if (currentLineLength > 0) {
        lineCount += 1;
        currentLineLength = 0;
      }

      lineCount += Math.ceil(wordLength / maxCharsPerLine) - 1;
      currentLineLength = wordLength % maxCharsPerLine;

      if (currentLineLength === 0) {
        currentLineLength = maxCharsPerLine;
      }

      continue;
    }

    const nextLength = currentLineLength === 0 ? wordLength : currentLineLength + 1 + wordLength;

    if (nextLength > maxCharsPerLine) {
      lineCount += 1;
      currentLineLength = wordLength;
      continue;
    }

    currentLineLength = nextLength;
  }

  return lineCount;
}

function estimateStackedEventCardHeight(event: CalendarEvent | null) {
  const title = event?.title || "No Featured Event";
  const maxCharsPerLine = hasPaidEntry(event) ? 16 : 18;
  const titleLines = countWrappedTitleLines(title, maxCharsPerLine);

  return STACKED_EVENT_CARD_FRAME_HEIGHT + titleLines * STACKED_EVENT_CARD_TITLE_LINE_HEIGHT;
}

function getVisibleDayStackHeight(cell: CalendarGridCell) {
  const visibleEvents = cell.events.length > 0 ? cell.events : [null];

  if (visibleEvents.length <= 1) {
    return 0;
  }

  return visibleEvents.reduce((total, event, index) => {
    const nextTotal = total + estimateStackedEventCardHeight(event);
    return index === 0 ? nextTotal : nextTotal + EVENT_STACK_GAP;
  }, 0);
}

export function buildWeeklyDiscordMessage(feed: CalendarFeed) {
  const cells = getWeeklyCells(feed);
  const lines = [
    `## ${feed.brandName} Weekly Event Board`,
    `### ${feed.month.label}`,
    `Full calendar: <${getFullCalendarUrl()}>`,
    "",
    ...cells.flatMap((cell, index) =>
      getDaySummaryLines(
        cell,
        feed.month.columns[index]?.shortLabel || "Day",
        feed.timeZone,
      ),
    ),
  ];

  return lines.join("\n");
}

export function buildWeeklyImageFilename(feed: CalendarFeed) {
  return `calendar-week-${feed.month.key}.png`;
}

export async function buildWeeklyCalendarImageResponse(feed: CalendarFeed) {
  const cells = getWeeklyCells(feed);
  const fonts = await loadImageFonts();
  const tallestMultiEventStackHeight = Math.max(0, ...cells.map(getVisibleDayStackHeight));
  const requiredBodyHeight = STACKED_EVENT_OUTER_PADDING * 2 + tallestMultiEventStackHeight;
  const sharedCardHeight = Math.max(
    SINGLE_DAY_MIN_CARD_HEIGHT,
    WHITE_HEADER_HEIGHT + requiredBodyHeight,
  );
  const cardHeaderHeight = WHITE_HEADER_HEIGHT;
  const imageHeight =
    IMAGE_TOP_PADDING +
    TITLE_HEIGHT +
    TITLE_TO_WEEKDAY_GAP +
    WEEKDAY_HEIGHT +
    WEEKDAY_TO_CARD_GAP +
    sharedCardHeight +
    IMAGE_BOTTOM_PADDING;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(180deg, #151111 0%, #080707 54%, #000000 100%)",
          color: "#f8efe1",
          fontFamily: "Sora",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 18% 14%, rgba(255, 157, 54, 0.16), transparent 20%), radial-gradient(circle at 86% 10%, rgba(103, 73, 255, 0.18), transparent 18%), radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 24%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.3,
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2) 0 1px, transparent 1px), radial-gradient(circle at 70% 35%, rgba(255, 255, 255, 0.16) 0 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px)",
            backgroundSize: "12px 12px, 14px 14px, 18px 18px",
          }}
        />

        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            padding: `${IMAGE_TOP_PADDING}px 48px ${IMAGE_BOTTOM_PADDING}px`,
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Morally Serif",
                fontSize: 82,
                lineHeight: 0.9,
                color: "#fff8f0",
                textShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
              }}
            >
              {feed.month.label}
            </div>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              marginBottom: 14,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            {feed.month.columns.map((column) => (
              <div
                key={column.weekday}
                style={{
                  width: 340,
                  display: "flex",
                  justifyContent: "center",
                  fontFamily: "Bree Serif",
                  fontSize: 52,
                  lineHeight: 1,
                  color: "#fff8f0",
                  letterSpacing: "0.03em",
                }}
              >
                {column.shortLabel}
              </div>
            ))}
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginTop: 4,
            }}
          >
            {cells.map((cell, index) => {
              const bodyTextColor = getCardBodyTextColor(cell);
              const cardTitleColor = getCardTitleColor(cell);
              const cardSubtitleColor = getCardSubtitleColor(cell);
              const dayLabel = feed.month.columns[index]?.shortLabel || "Day";
              const visibleEvents = cell.events.length > 0 ? cell.events : [null];
              const usesStackedCards = visibleEvents.length > 1;

              return (
                <div
                  key={cell.key}
                  style={{
                    width: 360,
                    height: sharedCardHeight,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    borderRadius: 28,
                    overflow: "hidden",
                    border: `1px solid ${getImageCardBorder(cell)}`,
                    background: `linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0 ${cardHeaderHeight}px, rgba(249, 245, 239, 0.98) ${cardHeaderHeight}px 100%)`,
                    boxShadow: cell.isToday
                      ? "0 22px 56px rgba(0, 0, 0, 0.35)"
                      : "0 16px 40px rgba(0, 0, 0, 0.28)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      background: "linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 30%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: cardHeaderHeight,
                      bottom: 0,
                      display: "flex",
                      background: getCardBodyBackground(cell),
                    }}
                  />

                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      display: "flex",
                      padding: CARD_SIDE_PADDING,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            fontFamily: "Morally Serif",
                            fontSize: 72,
                            lineHeight: 0.82,
                            color: "#180f0f",
                          }}
                        >
                          {formatDayNumber(cell.dateKey)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            marginTop: 8,
                            fontFamily: "Sora",
                            fontSize: 14,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "rgba(24, 15, 15, 0.56)",
                          }}
                        >
                          {dayLabel}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: CARD_SIDE_PADDING,
                      right: CARD_SIDE_PADDING,
                      top:
                        cardHeaderHeight +
                        (usesStackedCards ? STACKED_EVENT_OUTER_PADDING : BODY_EDGE_PADDING),
                      bottom: usesStackedCards ? STACKED_EVENT_OUTER_PADDING : BODY_EDGE_PADDING,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      color: bodyTextColor,
                      gap: EVENT_STACK_GAP,
                    }}
                  >
                      {visibleEvents.map((event, eventIndex) => {
                        const categoryLabel = getEventCategoryLabel(event);
                        const eventIsClosed = Boolean(event?.isClosed);
                        const eventHasCard = visibleEvents.length > 1;
                        const hasPaidBadge = hasPaidEntry(event);
                        const eventMeta = event ? getImageEventMeta(event, feed.timeZone) : "Open window";
                        const detailMaxWidth = eventHasCard
                          ? hasPaidBadge
                            ? 224
                            : 268
                          : 316;
                        const pillMaxWidth = eventHasCard
                          ? hasPaidBadge
                            ? 196
                            : 240
                          : 300;

                        return (
                          <div
                            key={event?.id ?? `${cell.key}-empty-${eventIndex}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "flex-start",
                              position: "relative",
                              ...(eventHasCard
                                ? { minHeight: estimateStackedEventCardHeight(event) }
                                : {}),
                              padding: eventHasCard ? "14px 16px 14px" : "0px",
                              borderRadius: eventHasCard ? 20 : 0,
                              background: eventHasCard
                                ? eventIsClosed
                                  ? "rgba(248, 246, 242, 0.82)"
                                  : "rgba(17, 12, 12, 0.14)"
                                : "transparent",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                width: "100%",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  alignSelf: "flex-start",
                                  maxWidth: pillMaxWidth,
                                  padding: "6px 12px",
                                  borderRadius: 999,
                                  border: eventIsClosed
                                    ? "1px solid rgba(78, 63, 57, 0.22)"
                                    : "1px solid rgba(255, 255, 255, 0.16)",
                                  background: eventIsClosed
                                    ? "rgba(248, 246, 242, 0.96)"
                                    : "rgba(255, 255, 255, 0.16)",
                                  color: eventIsClosed ? "#4e3f39" : "#fff8f1",
                                  fontFamily: "Sora",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                }}
                              >
                                {categoryLabel}
                              </div>

                              {hasPaidBadge ? (
                                <div
                                  style={{
                                    width: 34,
                                    minWidth: 34,
                                    height: 34,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: 999,
                                    background: "#ffffff",
                                    color: "#111111",
                                    boxShadow: "0 12px 22px rgba(0, 0, 0, 0.18)",
                                    fontFamily: "Bree Serif",
                                    fontSize: 20,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                  }}
                                >
                                  $
                                </div>
                              ) : null}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                marginTop: 12,
                                maxWidth: detailMaxWidth,
                                fontFamily: "Bree Serif",
                                fontSize: eventIsClosed
                                  ? 52
                                  : event && !event.allDay
                                    ? 30
                                    : 32,
                                lineHeight: eventIsClosed ? 0.9 : 0.94,
                                color: eventIsClosed ? "#c31c13" : cardTitleColor,
                                textShadow: eventIsClosed ? "none" : "0 6px 18px rgba(0, 0, 0, 0.24)",
                              }}
                            >
                              {event ? event.title : "No Featured Event"}
                            </div>

                            {eventMeta ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  marginTop: 12,
                                  fontFamily: "Morally Serif",
                                  fontSize: 32,
                                  lineHeight: 0.88,
                                  color: cardSubtitleColor,
                                }}
                              >
                                {eventMeta}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    {
      width: IMAGE_WIDTH,
      height: imageHeight,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      },
      fonts: [
        {
          name: "Berkshire Swash",
          data: fonts.berkshire,
          style: "normal",
          weight: 400,
        },
        {
          name: "Bree Serif",
          data: fonts.bree,
          style: "normal",
          weight: 400,
        },
        {
          name: "Morally Serif",
          data: fonts.month,
          style: "normal",
          weight: 400,
        },
        {
          name: "Sora",
          data: fonts.sora,
          style: "normal",
          weight: 400,
        },
        {
          name: "Sora",
          data: fonts.soraBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
