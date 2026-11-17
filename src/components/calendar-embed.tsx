"use client";

import Link from "next/link";
import QRCode from "react-qr-code";
import { useEffect, useState, type CSSProperties } from "react";

import {
  CATEGORY_STYLES,
  getCalendarEventTime,
  normalizeCalendarDescription,
  type CalendarCategory,
  type CalendarEvent,
  type CalendarFeed,
  type CalendarGridCell,
  type CalendarPlaySpace,
} from "@/lib/calendar";

type CalendarEmbedProps = {
  feed: CalendarFeed;
  embedded: boolean;
  basePath: string;
};

const EMBED_SCROLL_REQUEST_MESSAGE_TYPE = "custom-google-calendar:scroll-request";
const STORE_ADDRESS = "Pandora's Deck Box, 195 Whiting St R1, Hingham, MA 02043, USA";

function isStoreAddress(location: string) {
  return location.replace(/\s+/g, " ").trim().toLowerCase() === STORE_ADDRESS.toLowerCase();
}

function buildCalendarHref(
  basePath: string,
  queryParamKey: "month" | "week",
  viewKey: string,
) {
  return `${basePath}?${queryParamKey}=${viewKey}`;
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
  const [showPastDays, setShowPastDays] = useState(true);
  const [hasPastDaysPreference, setHasPastDaysPreference] = useState(false);
  const [explainedToggleMonthKey, setExplainedToggleMonthKey] = useState<string | null>(null);
  const categories = Array.from(new Set(feed.events.map((event) => event.category)));
  const columnCount = String(feed.month.columns.length);
  const cells = feed.month.weeks.flatMap((week) => week.cells);
  const selectedCell =
    selectedDayId?.startsWith(`${feed.month.key}:`)
      ? cells.find((cell) => `${feed.month.key}:${cell.dateKey}` === selectedDayId) || null
      : null;
  const selectedDayEvents = selectedCell?.events ?? [];
  const previousLabel = feed.viewMode === "week" ? "Previous week" : "Previous month";
  const nextLabel = feed.viewMode === "week" ? "Next week" : "Next month";
  const todayDateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: feed.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const viewedMonthKey = feed.month.anchorDateKey.slice(0, 7);
  const currentMonthKey = todayDateKey.slice(0, 7);
  const isPastMonth = viewedMonthKey < currentMonthKey;
  const isFutureMonth = viewedMonthKey > currentMonthKey;
  const isCurrentMonth = viewedMonthKey === currentMonthKey;
  const isToggleLocked = !isCurrentMonth;
  const effectiveShowPastDays = isPastMonth ? true : isFutureMonth ? false : showPastDays;

  function getEventsInPlaySpace(playSpace: CalendarPlaySpace | null) {
    return selectedDayEvents
      .filter((event) => event.playSpace === playSpace)
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  }

  const bothSpaceEvents = getEventsInPlaySpace("both");
  const spaceAEvents = getEventsInPlaySpace("space_a");
  const spaceBEvents = getEventsInPlaySpace("space_b");
  const unassignedEvents = getEventsInPlaySpace(null);
  const showSpaceA = bothSpaceEvents.length === 0 || spaceAEvents.length > 0;
  const showSpaceB = bothSpaceEvents.length === 0 || spaceBEvents.length > 0;

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

  useEffect(() => {
    const cookieName = "calendar_show_past_days";
    const query = window.matchMedia("(max-width: 900px)");

    const readCookieValue = () => {
      const entries = document.cookie
        .split(";")
        .map((segment) => segment.trim())
        .filter(Boolean);
      const value = entries.find((entry) => entry.startsWith(`${cookieName}=`));

      return value ? value.slice(cookieName.length + 1) : null;
    };

    const frameId = window.requestAnimationFrame(() => {
      const cookieValue = readCookieValue();
      if (cookieValue === "1" || cookieValue === "0") {
        setShowPastDays(cookieValue === "1");
        setHasPastDaysPreference(true);
      } else {
        setShowPastDays(query.matches);
      }
    });

    const onBreakpointChange = (event: MediaQueryListEvent) => {
      setShowPastDays((current) => (hasPastDaysPreference ? current : event.matches));
    };

    query.addEventListener("change", onBreakpointChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      query.removeEventListener("change", onBreakpointChange);
    };
  }, [hasPastDaysPreference]);

  function updateShowPastDays(value: boolean) {
    setShowPastDays(value);
    setHasPastDaysPreference(true);

    const maxAgeInSeconds = 60 * 60 * 24 * 365;
    document.cookie = `calendar_show_past_days=${value ? "1" : "0"}; path=/; max-age=${maxAgeInSeconds}; samesite=lax`;
  }

  function handlePastDaysToggleClick() {
    if (isToggleLocked) {
      setExplainedToggleMonthKey((current) => (current === feed.month.key ? null : feed.month.key));
      return;
    }

    updateShowPastDays(!effectiveShowPastDays);
  }

  const showPastDaysExplanation = explainedToggleMonthKey === feed.month.key;

  function shouldHidePastDate(cell: CalendarGridCell) {
    if (effectiveShowPastDays || !cell.isCurrentMonth) {
      return false;
    }

    if (viewedMonthKey !== currentMonthKey) {
      return false;
    }

    return cell.dateKey < todayDateKey;
  }

  const visibleWeeks = feed.month.weeks.filter((week) =>
    week.cells.some((cell) => cell.isCurrentMonth && !shouldHidePastDate(cell)),
  );
  const isPastDaysEmpty = isCurrentMonth && !effectiveShowPastDays && visibleWeeks.length === 0;

  function renderDayEvents(events: CalendarEvent[], emptyMessage: string) {
    if (events.length === 0) {
      return <p className="day-modal-room-empty">{emptyMessage}</p>;
    }

    return events.map((event) => {
      const theme = CATEGORY_STYLES[event.category];
      const eventTime = getCalendarEventTime(event, feed.timeZone);
      const downloadHref = getEventDownloadHref(event);
      const matchesSelectedCategory = eventMatchesCategory(event, selectedCategory);
      const hasExplicitPrice = event.price !== null;
      const showLocation = Boolean(event.location && !isStoreAddress(event.location));

      return (
        <article
          className={`day-modal-event${matchesSelectedCategory ? "" : " is-dimmed"}`}
          key={event.id}
          style={{ ["--modal-accent" as string]: theme.color }}
        >
          <div className="day-modal-event-top">
            <span className="day-modal-category">{theme.label}</span>

            {event.playSpace === "both" ? (
              <span className="day-modal-room-badge">BOTH PLAY SPACES · 24 PLAYERS</span>
            ) : event.playSpace === null ? (
              <span className="day-modal-room-badge">UNASSIGNED</span>
            ) : null}

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

          {showLocation ? <p className="day-modal-location">{event.location}</p> : null}

          {event.ticketsUrl || (event.registrationUrl && event.category !== "magic") ? (
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
            <p className="day-modal-description">
              {normalizeCalendarDescription(event.description)}
            </p>
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
    });
  }

  return (
    <>
      <section
        className={`calendar-shell ${embedded ? "embedded" : "preview"}`}
        style={{ ["--calendar-columns" as string]: columnCount }}
      >
        <div className="calendar-controls">
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

          <div className="past-days-toggle-wrap">
            <button
              aria-checked={effectiveShowPastDays}
              aria-describedby={showPastDaysExplanation ? "past-days-toggle-note" : undefined}
              aria-disabled={isToggleLocked}
              aria-label="Show past days"
              className={`past-days-toggle${isToggleLocked ? " is-disabled" : ""}`}
              data-checked={effectiveShowPastDays ? "true" : "false"}
              onClick={handlePastDaysToggleClick}
              role="switch"
              type="button"
            >
              <span aria-hidden="true" className="past-days-toggle-slider">
                <span className="past-days-toggle-thumb" />
              </span>
              <span className="past-days-toggle-text">Show past days</span>
            </button>

            {isToggleLocked && showPastDaysExplanation ? (
              <p className="past-days-toggle-note" id="past-days-toggle-note">
                {isPastMonth
                  ? "Past-day hiding is disabled for previous months."
                  : "Past-day hiding only applies to the current month."}
              </p>
            ) : null}
          </div>
        </div>

        <header className="calendar-banner">
          <div className="calendar-toolbar">
            <Link
              aria-label={`${previousLabel}: ${feed.month.previousKey}`}
              className="month-nav-link month-arrow-link"
              href={buildCalendarHref(basePath, feed.month.queryParamKey, feed.month.previousKey)}
            >
              <span aria-hidden="true">&larr;</span>
            </Link>

            <div className="month-hero">
              <h1>{feed.month.label}</h1>
            </div>

            <Link
              aria-label={`${nextLabel}: ${feed.month.nextKey}`}
              className="month-nav-link month-arrow-link"
              href={buildCalendarHref(basePath, feed.month.queryParamKey, feed.month.nextKey)}
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
          {isPastDaysEmpty ? (
            <div aria-live="polite" className="past-days-empty-state" role="status">
              <span>Previous days are hidden</span>
              <span aria-hidden="true" className="past-days-empty-arrow">
                &#8599;
              </span>
            </div>
          ) : (
            visibleWeeks.map((week) => (
              <div className="calendar-row" key={week.key}>
                {week.cells.map((cell) => {
                if (!cell.isCurrentMonth) {
                  return <div aria-hidden="true" className="calendar-gap-cell" key={cell.key} />;
                }

                if (shouldHidePastDate(cell)) {
                  return <div aria-hidden="true" className="calendar-gap-cell calendar-hidden-cell" key={cell.key} />;
                }

                const matchesSelectedCategory = cellMatchesCategory(cell, selectedCategory);
                const isSelected = selectedCell?.dateKey === cell.dateKey;
                const hasEvents = cell.events.length > 0;

                return (
                  <article
                    className={`${getCellClassName(cell)}${matchesSelectedCategory ? "" : " is-dimmed"}${isSelected ? " is-selected" : ""}`}
                    key={cell.key}
                    onClick={
                      hasEvents
                        ? () => setSelectedDayId(`${feed.month.key}:${cell.dateKey}`)
                        : undefined
                    }
                    style={getCellStyle(cell)}
                  >
                    <button
                      aria-expanded={isSelected}
                      aria-haspopup="dialog"
                      aria-label={`View ${formatDayHeading(cell.dateKey)} schedule`}
                      className="tile-button"
                      onClick={(event) => {
                        event.currentTarget.blur();
                      }}
                      type="button"
                    >
                      <div className="tile-date-row">
                        <span className="tile-day-number">{cell.dayNumber}</span>
                      </div>

                      <div className="month-event-list">
                        {cell.events.map((event) => {
                          const eventTheme = CATEGORY_STYLES[event.category];
                          const eventTime = getCalendarEventTime(event, feed.timeZone);
                          const timeLabel = event.isClosed
                            ? "Closed"
                            : event.allDay
                              ? "All day"
                              : eventTime.startsAt;

                          return (
                            <span
                              className={`month-event-indicator${eventMatchesCategory(event, selectedCategory) ? "" : " is-dimmed"}`}
                              key={event.id}
                              style={{ ["--month-event-color" as string]: eventTheme.color }}
                            >
                              <span className="month-event-category">{eventTheme.label}</span>
                              <span className="month-event-time">{timeLabel}</span>
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  </article>
                );
                })}
              </div>
            ))
          )}
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

            {selectedDayEvents.length === 0 ? (
              <div className="day-modal-empty">
                <p>This date does not currently have events scheduled in Google Calendar.</p>
              </div>
            ) : (
              <div className="day-modal-schedule">
                {bothSpaceEvents.length > 0 ? (
                  <section
                    aria-label="Events using both play spaces"
                    className="day-modal-space day-modal-space-wide"
                  >
                    <header className="day-modal-space-header">
                      <div>
                        <h3>BOTH PLAY SPACES</h3>
                        <p>Shared capacity · 24 players</p>
                      </div>
                    </header>
                    <div className="day-modal-space-events">
                      {renderDayEvents(bothSpaceEvents, "No events scheduled in both spaces.")}
                    </div>
                  </section>
                ) : null}

                {showSpaceA ? (
                  <section aria-label="Play Space A events" className="day-modal-space">
                    <header className="day-modal-space-header">
                      <div>
                          <h3>PLAY SPACE A</h3>
                          <p>Main Play Space · 16 Players</p>
                      </div>
                    </header>
                    <div className="day-modal-space-events">
                      {renderDayEvents(spaceAEvents, "No events scheduled in Space A.")}
                    </div>
                  </section>
                ) : null}

                {showSpaceB ? (
                  <section aria-label="Play Space B events" className="day-modal-space">
                    <header className="day-modal-space-header">
                      <div>
                          <h3>PLAY SPACE B</h3>
                          <p>Secondary Play Space · 8 Players</p>
                      </div>
                    </header>
                    <div className="day-modal-space-events">
                      {renderDayEvents(spaceBEvents, "No events scheduled in Space B.")}
                    </div>
                  </section>
                ) : null}

                {unassignedEvents.length > 0 ? (
                  <section
                    aria-label="Events without a play space assignment"
                    className="day-modal-space day-modal-space-wide"
                  >
                    <header className="day-modal-space-header">
                      <div>
                        <h3>UNASSIGNED</h3>
                        <p>Room not specified in Google Calendar</p>
                      </div>
                    </header>
                    <div className="day-modal-space-events">
                      {renderDayEvents(unassignedEvents, "No unassigned events.")}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}