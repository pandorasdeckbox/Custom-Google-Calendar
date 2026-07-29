"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useEffect, useState, type CSSProperties } from "react";

import communityLogo from "@/app/img/community.png";
import dragonBallLogo from "@/app/img/dragon-ball.png";
import gundamLogo from "@/app/img/gundam.png";
import lorcanaLogo from "@/app/img/lorcana.png";
import magicLogo from "@/app/img/magic.png";
import onePieceLogo from "@/app/img/one-piece.png";
import pokemonLogo from "@/app/img/pokemon.png";
import riftboundLogo from "@/app/img/riftbound.png";

import {
  CATEGORY_STYLES,
  getCalendarEventTime,
  normalizeCalendarDescription,
  type CalendarCategory,
  type CalendarEvent,
  type CalendarFeed,
  type CalendarGridCell,
} from "@/lib/calendar";

type CalendarEmbedProps = {
  feed: CalendarFeed;
  embedded: boolean;
  basePath: string;
};

type CarouselDirection = "previous" | "next";

const EMBED_SCROLL_REQUEST_MESSAGE_TYPE = "custom-google-calendar:scroll-request";

const CATEGORY_LOGOS: Partial<Record<CalendarCategory, StaticImageData>> = {
  magic: magicLogo,
  pokemon: pokemonLogo,
  lorcana: lorcanaLogo,
  "one-piece": onePieceLogo,
  "dragon-ball": dragonBallLogo,
  gundam: gundamLogo,
  riftbound: riftboundLogo,
  other: communityLogo,
};

function buildMonthHref(basePath: string, monthKey: string) {
  return `${basePath}?month=${monthKey}`;
}

function getCarouselKey(monthKey: string, dateKey: string) {
  return `${monthKey}:${dateKey}`;
}

function getCategoryLogo(category: CalendarCategory) {
  return CATEGORY_LOGOS[category] ?? null;
}

function formatEventPrice(amount: number) {
  const minimumFractionDigits = Number.isInteger(amount) ? 0 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getRegistrationHelperText(event: CalendarEvent) {
  if (event.category === "magic" && event.registrationCode) {
    return "Scan to open Magic Companion on your phone.";
  }

  return "Scan to open the event sign-in page on your phone.";
}

function formatDayHeading(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsUtc(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIcsDate(dateKey: string) {
  return dateKey.replace(/-/g, "");
}

function getEventDownloadName(event: CalendarEvent) {
  const normalizedTitle = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "calendar-event";

  return `${normalizedTitle}-${event.startDayKey}.ics`;
}

function buildEventIcs(event: CalendarEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Custom Google Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.id)}`,
    `DTSTAMP:${formatIcsUtc(new Date().toISOString())}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.startDayKey)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(addDaysToDateKey(event.endDayKey, 1))}`);
  } else {
    lines.push(`DTSTART:${formatIcsUtc(event.startsAt)}`);
    lines.push(`DTEND:${formatIcsUtc(event.endsAt)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(normalizeCalendarDescription(event.description))}`);
  }

  if (event.link) {
    lines.push(`URL:${escapeIcsText(event.link)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}

function getEventDownloadHref(event: CalendarEvent) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildEventIcs(event))}`;
}

function cellMatchesCategory(cell: CalendarGridCell, category: CalendarCategory | null) {
  if (!category) return true;
  return cell.events.some((event) => event.category === category);
}

function eventMatchesCategory(event: CalendarEvent, category: CalendarCategory | null) {
  if (!category) return true;
  return event.category === category;
}

function getTileSubtitle(event: CalendarEvent | null, isCurrentMonth: boolean, timeZone: string) {
  if (!event) {
    return isCurrentMonth ? "Tap to view the day" : "Calendar spillover";
  }

  if (event.isClosed) {
    return null;
  }

  if (event.allDay) {
    return "All day";
  }

  const eventTime = getCalendarEventTime(event, timeZone);
  return `${eventTime.startsAt}`;
}

function getCellClassName(cell: CalendarGridCell) {
  const classes = ["calendar-cell"];

  if (!cell.primaryEvent) classes.push("is-empty");
  if (!cell.isCurrentMonth) classes.push("is-spillover");
  if (cell.isToday) classes.push("is-today");
  if (cell.isClosed) classes.push("is-closed");

  return classes.join(" ");
}

function getCellStyle(cell: CalendarGridCell): CSSProperties {
  const theme = cell.primaryEvent
    ? CATEGORY_STYLES[cell.primaryEvent.category]
    : CATEGORY_STYLES.other;
  const tileFill = getTileFill(cell);

  return {
    ["--tile-color" as string]: tileFill,
    ["--tile-accent" as string]: theme.accent,
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")}%`;
}

function getCellDisplayCategories(cell: CalendarGridCell) {
  return Array.from(
    new Set(
      cell.events.flatMap((event) =>
        event.displayCategories.length > 0 ? event.displayCategories : [event.category],
      ),
    ),
  );
}

function getTileFill(cell: CalendarGridCell) {
  const displayCategories = getCellDisplayCategories(cell);

  if (displayCategories.length <= 1) {
    return cell.primaryEvent ? CATEGORY_STYLES[cell.primaryEvent.category].color : CATEGORY_STYLES.other.color;
  }

  const eventColors = displayCategories.map((category) => CATEGORY_STYLES[category].color);
  const step = 100 / eventColors.length;
  const blendWidth = Math.min(18, step * 0.6);
  const gradientStops: string[] = [`${eventColors[0]} 0%`];

  eventColors.forEach((color, index) => {
    const segmentEnd = (index + 1) * step;

    if (index === eventColors.length - 1) {
      gradientStops.push(`${color} 100%`);
      return;
    }

    const transitionStart = segmentEnd - blendWidth / 2;
    const transitionEnd = segmentEnd + blendWidth / 2;
    const nextColor = eventColors[index + 1];

    gradientStops.push(`${color} ${formatPercent(transitionStart)}`);
    gradientStops.push(`${nextColor} ${formatPercent(transitionEnd)}`);
  });

  return `linear-gradient(102deg, ${gradientStops.join(", ")})`;
}

export function CalendarEmbed({ feed, embedded, basePath }: CalendarEmbedProps) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CalendarCategory | null>(null);
  const [activeEventIndices, setActiveEventIndices] = useState<Record<string, number>>({});
  const [carouselHintMonthKey, setCarouselHintMonthKey] = useState<string | null>(null);
  const categories = Array.from(new Set(feed.events.map((event) => event.category)));
  const columnCount = String(feed.month.columns.length);
  const cells = feed.month.weeks.flatMap((week) => week.cells);
  const selectedCell =
    selectedDayId?.startsWith(`${feed.month.key}:`)
      ? cells.find((cell) => `${feed.month.key}:${cell.dateKey}` === selectedDayId) || null
      : null;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCarouselHintMonthKey(feed.month.key);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feed.month.key]);

  useEffect(() => {
    if (!selectedCell) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedDayId(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedCell]);

  useEffect(() => {
    if (!embedded || !selectedCell || window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        type: EMBED_SCROLL_REQUEST_MESSAGE_TYPE,
      },
      "*",
    );
  }, [embedded, selectedCell]);

  function getActiveEventIndex(cell: CalendarGridCell) {
    const carouselKey = getCarouselKey(feed.month.key, cell.key);
    const currentIndex = activeEventIndices[carouselKey] ?? 0;
    const lastIndex = Math.max(cell.events.length - 1, 0);

    return Math.min(currentIndex, lastIndex);
  }

  function moveCarousel(cell: CalendarGridCell, direction: CarouselDirection) {
    const currentIndex = getActiveEventIndex(cell);
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const boundedIndex = Math.max(0, Math.min(nextIndex, cell.events.length - 1));

    if (boundedIndex === currentIndex) {
      return;
    }

    const carouselKey = getCarouselKey(feed.month.key, cell.key);

    setCarouselHintMonthKey(null);
    setActiveEventIndices((current) => ({
      ...current,
      [carouselKey]: boundedIndex,
    }));
  }

  return (
    <>
      <section
        className={`calendar-shell ${embedded ? "embedded" : "preview"}`}
        style={{ ["--calendar-columns" as string]: columnCount }}
      >
        <div className="legend-strip calendar-key" aria-label="Event categories">
          {categories.map((category) => (
            <button
              aria-label={`Toggle ${CATEGORY_STYLES[category].label} filter`}
              aria-pressed={selectedCategory === category}
              className={`legend-pill ${
                selectedCategory === category
                  ? "is-active"
                  : selectedCategory
                    ? "is-dimmed"
                    : ""
              }`}
              key={category}
              onClick={() => {
                setSelectedCategory((current) => (current === category ? null : category));
              }}
              type="button"
            >
              <span
                className="legend-dot"
                style={{ ["--legend-color" as string]: CATEGORY_STYLES[category].color }}
              />
              {CATEGORY_STYLES[category].label}
            </button>
          ))}
        </div>

        <header className="calendar-banner">
          <div className="calendar-toolbar">
            <Link
              aria-label={`Previous month: ${feed.month.previousKey}`}
              className="month-nav-link month-arrow-link"
              href={buildMonthHref(basePath, feed.month.previousKey)}
            >
              <span aria-hidden="true">&larr;</span>
            </Link>

            <div className="month-hero">
              <h1>{feed.month.label}</h1>
            </div>

            <Link
              aria-label={`Next month: ${feed.month.nextKey}`}
              className="month-nav-link month-arrow-link"
              href={buildMonthHref(basePath, feed.month.nextKey)}
            >
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </header>

        <div className="weekday-strip">
          {feed.month.columns.map((column) => (
            <div className="weekday-chip" key={column.weekday}>
              <span>{column.shortLabel}</span>
            </div>
          ))}
        </div>

        <div className="month-grid">
          {feed.month.weeks.map((week) => (
            <div className="calendar-row" key={week.key}>
              {week.cells.map((cell) => {
                const activeEventIndex = getActiveEventIndex(cell);
                const activeEvent = cell.events[activeEventIndex] ?? cell.primaryEvent;
                const theme = activeEvent
                  ? CATEGORY_STYLES[activeEvent.category]
                  : CATEGORY_STYLES.other;
                const matchesSelectedCategory = cellMatchesCategory(cell, selectedCategory);
                const hasMultipleEvents = cell.events.length > 1;
                const canMovePrevious = activeEventIndex > 0;
                const canMoveNext = activeEventIndex < cell.events.length - 1;
                const carouselPosition = hasMultipleEvents
                  ? canMovePrevious
                    ? canMoveNext
                      ? "middle"
                      : "end"
                    : "start"
                  : undefined;
                const showHint =
                  hasMultipleEvents &&
                  activeEventIndex === 0 &&
                  carouselHintMonthKey === feed.month.key;

                return (
                  <article
                    className={`${getCellClassName(cell)}${matchesSelectedCategory ? "" : " is-dimmed"}`}
                    data-has-carousel={hasMultipleEvents ? "true" : "false"}
                    data-carousel-position={carouselPosition}
                    data-show-carousel-hint={showHint ? "true" : "false"}
                    key={cell.key}
                    style={getCellStyle(cell)}
                  >
                    <button
                      aria-haspopup="dialog"
                      className="tile-button"
                      onClick={(event) => {
                        event.currentTarget.blur();
                        setSelectedDayId(`${feed.month.key}:${cell.dateKey}`);
                      }}
                      type="button"
                    >
                      <div className="tile-date-row">
                        <span className="tile-day-number">{cell.dayNumber}</span>
                        <span className={`tile-mark${activeEvent && getCategoryLogo(activeEvent.category) ? " has-logo" : ""}`}>
                          {activeEvent ? (
                            getCategoryLogo(activeEvent.category) ? (
                              <Image
                                alt={`${theme.label} logo`}
                                className="tile-mark-image"
                                sizes="44px"
                                src={getCategoryLogo(activeEvent.category)!}
                              />
                            ) : (
                              theme.shortLabel
                            )
                          ) : (
                            "OPEN"
                          )}
                        </span>
                      </div>

                      {activeEvent?.price && activeEvent.price > 0 ? (
                        <span aria-label={`Paid event: ${formatEventPrice(activeEvent.price)}`} className="tile-price-indicator">
                          $
                        </span>
                      ) : null}

                      <div className="tile-content tile-carousel-viewport compact-tile-content">
                        <div
                          className="tile-carousel-slider"
                          style={{
                            ["--tile-carousel-index" as string]: String(activeEventIndex),
                            ["--tile-carousel-count" as string]: String(Math.max(cell.events.length, 1)),
                          }}
                        >
                          <div className="tile-carousel-track">
                            {(cell.events.length > 0 ? cell.events : [null]).map((event, index) => {
                              const eventTheme = event ? CATEGORY_STYLES[event.category] : CATEGORY_STYLES.other;
                              const eventSubtitle = getTileSubtitle(event, cell.isCurrentMonth, feed.timeZone);
                              const isTimedEvent = Boolean(event && !event.isClosed && !event.allDay);

                              return (
                                <div
                                  aria-hidden={index === activeEventIndex ? undefined : true}
                                  className="tile-content tile-carousel-panel"
                                  key={event?.id ?? `${cell.key}-empty`}
                                >
                                  <span className="tile-category compact-category">
                                    {event
                                      ? event.isClosed
                                        ? "Store Update"
                                        : eventTheme.label
                                      : cell.isCurrentMonth
                                        ? "Open Slot"
                                        : "Next Window"}
                                  </span>

                                  <h2 className={isTimedEvent ? "has-prominent-time" : undefined}>
                                    {event
                                      ? event.title
                                      : cell.isCurrentMonth
                                        ? "No Featured Event"
                                        : "Next Month"}
                                  </h2>

                                  {eventSubtitle ? (
                                    <p className={isTimedEvent ? "tile-time-subtitle" : undefined}>
                                      {isTimedEvent ? (
                                        <>
                                          <svg
                                            aria-hidden="true"
                                            className="tile-time-icon"
                                            viewBox="0 0 24 24"
                                            width="12"
                                            height="12"
                                          >
                                            <circle cx="12" cy="12" r="8.5" />
                                            <path d="M12 7.8v4.7l3.15 2.2" />
                                          </svg>
                                          <span>{eventSubtitle}</span>
                                        </>
                                      ) : (
                                        eventSubtitle
                                      )}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {cell.overflowCount > 0 ? (
                        <div className="tile-overflow compact-overflow">
                          +{cell.overflowCount} more
                        </div>
                      ) : null}
                    </button>

                    {hasMultipleEvents ? (
                      <>
                        <button
                          aria-label={`Show previous event for ${cell.dateKey}`}
                          className="tile-carousel-arrow tile-carousel-arrow-left"
                          disabled={!canMovePrevious}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveCarousel(cell, "previous");
                          }}
                          type="button"
                        >
                          <span aria-hidden="true">‹</span>
                        </button>

                        <button
                          aria-label={`Show next event for ${cell.dateKey}`}
                          className="tile-carousel-arrow tile-carousel-arrow-right"
                          disabled={!canMoveNext}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveCarousel(cell, "next");
                          }}
                          type="button"
                        >
                          <span aria-hidden="true">›</span>
                        </button>
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {selectedCell ? (
        <div
          aria-hidden="true"
          className="day-modal-backdrop"
          data-embedded-modal={embedded ? "true" : undefined}
          onClick={() => setSelectedDayId(null)}
        >
          <section
            aria-label={formatDayHeading(selectedCell.dateKey)}
            aria-modal="true"
            className="day-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="day-modal-header">
              <div>
                <p className="day-modal-kicker">{formatDayHeading(selectedCell.dateKey)}</p>
                <h2>{selectedCell.events.length === 0 ? "No Scheduled Events" : "Day Schedule"}</h2>
              </div>
              <button
                aria-label="Close day details"
                className="day-modal-close"
                onClick={() => setSelectedDayId(null)}
                type="button"
              >
                ×
              </button>
            </div>

            {selectedCell.events.length === 0 ? (
              <div className="day-modal-empty">
                <p>This date does not currently have events scheduled in Google Calendar.</p>
              </div>
            ) : (
              <div className="day-modal-list">
                {selectedCell.events.map((event) => {
                  const theme = CATEGORY_STYLES[event.category];
                  const eventTime = getCalendarEventTime(event, feed.timeZone);
                  const downloadHref = getEventDownloadHref(event);
                  const matchesSelectedCategory = eventMatchesCategory(event, selectedCategory);
                  const hasExplicitPrice = event.price !== null;

                  return (
                    <article
                      className={`day-modal-event${matchesSelectedCategory ? "" : " is-dimmed"}`}
                      key={event.id}
                      style={{ ["--modal-accent" as string]: theme.color }}
                    >
                      <div className="day-modal-event-top">
                        <span className="day-modal-category">{theme.label}</span>

                        <div className="day-modal-actions">
                          {hasExplicitPrice ? (
                            <span className="day-modal-badge">
                              {event.price && event.price > 0 ? formatEventPrice(event.price) : "Free"}
                            </span>
                          ) : null}

                          {event.capacity ? (
                            <span className="day-modal-badge">{event.capacity} seats</span>
                          ) : null}

                          <a
                            aria-label={`Download ${event.title} as iCal`}
                            className="day-modal-download"
                            download={getEventDownloadName(event)}
                            href={downloadHref}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 3.99a1 1 0 0 1-1.4 0l-4-3.99a1 1 0 0 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
                            </svg>
                            <span>iCal</span>
                          </a>
                        </div>
                      </div>

                      <h3>{event.title}</h3>

                      <div className="day-modal-meta">
                        <span className="day-modal-time">
                          {event.allDay
                            ? event.isClosed
                              ? "Closed"
                              : "All day"
                            : `${eventTime.startsAt} - ${eventTime.endsAt}`}
                        </span>
                      </div>

                      {(event.ticketsUrl || (event.registrationUrl && event.category !== "magic")) ? (
                        <div className="day-modal-link-row">
                          {event.registrationUrl && event.category !== "magic" ? (
                            <a
                              className="day-modal-action-link"
                              href={event.registrationUrl}
                              rel="noreferrer"
                              target="_top"
                            >
                              Open Sign-In
                            </a>
                          ) : null}

                          {event.ticketsUrl ? (
                            <a
                              className="day-modal-action-link is-primary"
                              href={event.ticketsUrl}
                              rel="noreferrer"
                              target="_top"
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24">
                                <path d="M4.5 8.25A2.25 2.25 0 0 1 6.75 6h10.5a2.25 2.25 0 0 1 2.25 2.25v1.6a2 2 0 0 0 0 4.3v1.6A2.25 2.25 0 0 1 17.25 18H6.75a2.25 2.25 0 0 1-2.25-2.25v-1.6a2 2 0 0 0 0-4.3v-1.6Z" />
                                <path d="M12 8.6v1.4" />
                                <path d="M12 11.3v1.4" />
                                <path d="M12 14v1.4" />
                              </svg>
                              <span>Buy Ticket</span>
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      {event.description ? (
                        <p className="day-modal-description">{normalizeCalendarDescription(event.description)}</p>
                      ) : null}

                      {event.registrationUrl ? (
                        <div className="day-modal-registration">
                          <div className="day-modal-registration-qr" aria-hidden="true">
                            <QRCode
                              bgColor="transparent"
                              fgColor="#f8efe1"
                              size={124}
                              value={event.registrationUrl}
                            />
                          </div>

                          <div className="day-modal-registration-copy">
                            <p className="day-modal-registration-title">Scan to sign in</p>
                            <p className="day-modal-registration-text">{getRegistrationHelperText(event)}</p>
                            {event.category === "magic" && event.registrationCode ? (
                              <p className="day-modal-code-note">Code: {event.registrationCode}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}