export type CalendarCategory =
  | "magic"
  | "pokemon"
  | "lorcana"
  | "one-piece"
  | "gundam"
  | "marvel"
  | "riftbound"
  | "board-games"
  | "flesh-and-blood"
  | "other";

type CalendarSource = {
  id: string;
  label?: string;
  category?: CalendarCategory;
};

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
  summary?: string;
  timeZone?: string;
};

type CalendarFeedStatus = "live" | "mock-no-config" | "mock-error";

type SourceFetchResult = {
  sourceId: string;
  label: string;
  category?: CalendarCategory;
  timeZone: string;
  events: CalendarEvent[];
};

export type CalendarEvent = {
  id: string;
  googleEventId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  startDayKey: string;
  endDayKey: string;
  allDay: boolean;
  isClosed: boolean;
  category: CalendarCategory;
  sourceId: string;
  sourceLabel: string;
  link: string;
};

export type CalendarGridColumn = {
  weekday: number;
  shortLabel: string;
  fullLabel: string;
};

export type CalendarGridCell = {
  key: string;
  dateKey: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  primaryEvent: CalendarEvent | null;
  overflowCount: number;
  isClosed: boolean;
};

export type CalendarGridWeek = {
  key: string;
  cells: CalendarGridCell[];
};

export type CalendarMonthView = {
  key: string;
  label: string;
  previousKey: string;
  nextKey: string;
  columns: CalendarGridColumn[];
  weeks: CalendarGridWeek[];
};

export type CalendarSourceSummary = {
  id: string;
  label: string;
  category?: CalendarCategory;
  timeZone: string;
  eventCount: number;
};

export type CalendarFeed = {
  brandName: string;
  title: string;
  subtitle: string;
  calendarUrl: string;
  isMockData: boolean;
  revalidateMinutes: number;
  events: CalendarEvent[];
  sourceMode: "google-api" | "mock";
  status: CalendarFeedStatus;
  statusMessage: string;
  hasLiveConfig: boolean;
  errors: string[];
  timeZone: string;
  generatedAt: string;
  month: CalendarMonthView;
  sources: CalendarSourceSummary[];
};

const CATEGORY_KEYWORDS: Record<CalendarCategory, string[]> = {
  magic: [
    "magic",
    "mtg",
    "commander",
    "draft",
    "modern",
    "standard",
    "pioneer",
    "sealed",
    "prerelease",
    "pauper",
  ],
  pokemon: ["pokemon", "pkmn", "league challenge", "gym leader"],
  lorcana: ["lorcana", "disney", "illumineer"],
  "one-piece": ["one piece", "op", "opcg", "st13", "starter deck"],
  gundam: ["gundam", "gundam card game", "gunpla"],
  marvel: ["marvel", "super heroes", "spider-man"],
  riftbound: ["riftbound", "vendetta", "pre-rift", "skirmish", "chaos"],
  "board-games": [
    "board game",
    "board-game",
    "catan",
    "ticket to ride",
    "dungeon",
    "rpg",
    "d&d",
  ],
  "flesh-and-blood": ["flesh and blood", "fab"],
  other: [],
};

const CLOSED_KEYWORDS = ["closed", "no events", "holiday closure", "store closed"];

const WEEKDAY_LABELS = [
  { shortLabel: "Sun", fullLabel: "Sunday" },
  { shortLabel: "Mon", fullLabel: "Monday" },
  { shortLabel: "Tue", fullLabel: "Tuesday" },
  { shortLabel: "Wed", fullLabel: "Wednesday" },
  { shortLabel: "Thu", fullLabel: "Thursday" },
  { shortLabel: "Fri", fullLabel: "Friday" },
  { shortLabel: "Sat", fullLabel: "Saturday" },
] as const;

const WEEKDAY_TOKENS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

export const CATEGORY_STYLES: Record<
  CalendarCategory,
  { label: string; shortLabel: string; color: string; accent: string }
> = {
  magic: {
    label: "Magic",
    shortLabel: "MTG",
    color: "var(--magic)",
    accent: "var(--magic-accent)",
  },
  pokemon: {
    label: "Pokemon",
    shortLabel: "PKM",
    color: "var(--pokemon)",
    accent: "var(--pokemon-accent)",
  },
  lorcana: {
    label: "Lorcana",
    shortLabel: "LRC",
    color: "var(--lorcana)",
    accent: "var(--lorcana-accent)",
  },
  "one-piece": {
    label: "One Piece",
    shortLabel: "OP",
    color: "var(--one-piece)",
    accent: "var(--one-piece-accent)",
  },
  gundam: {
    label: "Gundam",
    shortLabel: "GDM",
    color: "var(--gundam)",
    accent: "var(--gundam-accent)",
  },
  marvel: {
    label: "Marvel",
    shortLabel: "MVL",
    color: "var(--marvel)",
    accent: "var(--marvel-accent)",
  },
  riftbound: {
    label: "Riftbound",
    shortLabel: "RFT",
    color: "var(--riftbound)",
    accent: "var(--riftbound-accent)",
  },
  "board-games": {
    label: "Board Games",
    shortLabel: "BG",
    color: "var(--board-games)",
    accent: "var(--board-games-accent)",
  },
  "flesh-and-blood": {
    label: "Flesh & Blood",
    shortLabel: "FAB",
    color: "var(--flesh-and-blood)",
    accent: "var(--flesh-and-blood-accent)",
  },
  other: {
    label: "Community",
    shortLabel: "EVT",
    color: "var(--other)",
    accent: "var(--other-accent)",
  },
};

const FIVE_MINUTES = 5;
const DEFAULT_TIME_ZONE = "UTC";
const DEFAULT_DISPLAY_DAYS = [4, 5, 6, 0];
const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

function getBrandName() {
  return process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Pandora's Deck Box";
}

function getEmbedTitle() {
  return process.env.NEXT_PUBLIC_EMBED_TITLE?.trim() || "Monthly Event Calendar";
}

function getEmbedSubtitle() {
  return (
    process.env.NEXT_PUBLIC_EMBED_SUBTITLE?.trim() ||
    "A custom event grid sourced directly from Google Calendar."
  );
}

function getCalendarUrl() {
  return process.env.NEXT_PUBLIC_CALENDAR_URL?.trim() || "https://calendar.google.com";
}

function normalizeTimeZone(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return undefined;
  }
}

function getConfiguredTimeZone() {
  return normalizeTimeZone(process.env.CALENDAR_TIME_ZONE);
}

function isCalendarCategory(value: unknown): value is CalendarCategory {
  return typeof value === "string" && value in CATEGORY_STYLES;
}

function parseSourceJson(raw: string): CalendarSource[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const sources: CalendarSource[] = [];

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;

      const candidate = entry as Record<string, unknown>;
      const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const label =
        typeof candidate.label === "string" ? candidate.label.trim() : undefined;
      const category = isCalendarCategory(candidate.category)
        ? candidate.category
        : undefined;

      if (!id) continue;

      sources.push({ id, label, category });
    }

    return sources;
  } catch {
    return [];
  }
}

function getSources(): CalendarSource[] {
  const jsonSources = parseSourceJson(process.env.GOOGLE_CALENDAR_SOURCES_JSON || "");
  if (jsonSources.length > 0) return jsonSources;

  const single = process.env.GOOGLE_CALENDAR_ID?.trim();
  const multiple = (process.env.GOOGLE_CALENDAR_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (multiple.length > 0) {
    return multiple.map((id) => ({ id }));
  }

  if (single) {
    return [{ id: single }];
  }

  return [];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(combined: string, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return false;

  if (normalizedKeyword === "op") {
    return /(^|[^a-z0-9])op(?=$|[^a-z])/.test(combined);
  }

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegex(normalizedKeyword)}(?=$|[^a-z0-9])`,
  );

  return pattern.test(combined);
}

function inferCategory(...values: string[]): CalendarCategory {
  const combined = values.join(" ").toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    CalendarCategory,
    string[],
  ][]) {
    if (keywords.some((keyword) => matchesKeyword(combined, keyword))) {
      return category;
    }
  }

  return "other";
}

function inferClosed(...values: string[]) {
  const combined = values.join(" ").toLowerCase();
  return CLOSED_KEYWORDS.some((keyword) => combined.includes(keyword));
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
  };
}

function formatDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToUtcDate(dateKey: string, hour = 12) {
  const [year, month, day] = dateKey.split("-").map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
}

function formatDateKeyFromUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const value = dateKeyToUtcDate(dateKey);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateKeyFromUtcDate(value);
}

function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

function getWeekday(dateKey: string) {
  return dateKeyToUtcDate(dateKey).getUTCDay();
}

function getTodayDateKey(timeZone: string) {
  return formatDateKeyInTimeZone(new Date(), timeZone);
}

function isValidMonthKey(value: string | undefined): value is string {
  if (!value || !MONTH_KEY_PATTERN.test(value)) return false;
  const month = Number.parseInt(value.slice(5, 7), 10);
  return month >= 1 && month <= 12;
}

function getMonthKeyForDate(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}`;
}

function getMonthStartKey(monthKey: string) {
  return `${monthKey}-01`;
}

function getMonthEndKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map((value) => Number.parseInt(value, 10));
  return formatDateKeyFromUtcDate(new Date(Date.UTC(year, month, 0, 12, 0, 0, 0)));
}

function getResolvedMonthKey(monthKey: string | undefined, timeZone: string) {
  return isValidMonthKey(monthKey) ? monthKey : getMonthKeyForDate(new Date(), timeZone);
}

function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0, 0));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map((value) => Number.parseInt(value, 10));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0, 0)));
}

function sourceLabelFromId(sourceId: string) {
  return sourceId
    .replace(/@group\.calendar\.google\.com$/, "")
    .replace(/@gmail\.com$/, "")
    .replace(/[._-]+/g, " ")
    .trim();
}

function formatTimeRange(
  startsAt: string,
  endsAt: string,
  allDay: boolean,
  timeZone: string,
) {
  if (allDay) return { startsAt, endsAt };

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    startsAt: formatter.format(new Date(startsAt)),
    endsAt: formatter.format(new Date(endsAt)),
  };
}

function normalizeEvent(
  event: GoogleCalendarEvent,
  source: CalendarSource,
  sourceLabel: string,
  sourceTimeZone: string,
): CalendarEvent | null {
  if (!event.id || event.status === "cancelled") return null;

  const title = event.summary?.trim() || "Untitled Event";
  const description = event.description?.trim() || "";
  const location = event.location?.trim() || "";
  const allDay = Boolean(event.start?.date && !event.start?.dateTime);

  const rawStart = event.start?.dateTime || event.start?.date;
  const rawEnd = event.end?.dateTime || event.end?.date || rawStart;
  if (!rawStart || !rawEnd) return null;

  const startsAt = event.start?.dateTime
    ? new Date(event.start.dateTime).toISOString()
    : `${event.start?.date}T00:00:00.000Z`;

  const endsAt = event.end?.dateTime
    ? new Date(event.end.dateTime).toISOString()
    : `${addDays(event.end?.date || event.start?.date || rawStart, -1)}T23:59:59.999Z`;

  const startDayKey = allDay
    ? event.start?.date || formatDateKeyInTimeZone(new Date(), sourceTimeZone)
    : formatDateKeyInTimeZone(new Date(startsAt), sourceTimeZone);

  const endDayKey = allDay
    ? addDays(event.end?.date || startDayKey, -1)
    : formatDateKeyInTimeZone(new Date(endsAt), sourceTimeZone);

  const category =
    source.category || inferCategory(title, description, location, sourceLabel);

  return {
    id: `${source.id}:${event.id}`,
    googleEventId: event.id,
    title,
    description,
    location,
    startsAt,
    endsAt,
    startDayKey,
    endDayKey: compareDateKeys(endDayKey, startDayKey) >= 0 ? endDayKey : startDayKey,
    allDay,
    isClosed: inferClosed(title, description, location, sourceLabel),
    category,
    sourceId: source.id,
    sourceLabel,
    link: event.htmlLink || getCalendarUrl(),
  };
}

async function fetchSourceEvents(
  source: CalendarSource,
  apiKey: string,
  start: Date,
  end: Date,
): Promise<SourceFetchResult> {
  const params = new URLSearchParams({
    key: apiKey,
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: "200",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    source.id,
  )}/events?${params.toString()}`;
  const response = await fetch(url, {
    next: { revalidate: FIVE_MINUTES * 60 },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar returned ${response.status} for ${source.id}`);
  }

  const data = (await response.json()) as GoogleCalendarResponse;
  const timeZone =
    getConfiguredTimeZone() || normalizeTimeZone(data.timeZone) || DEFAULT_TIME_ZONE;
  const label = source.label || data.summary?.trim() || sourceLabelFromId(source.id) || "Google Calendar";

  const normalizedSource: CalendarSource = {
    ...source,
    label,
  };

  return {
    sourceId: source.id,
    label,
    category: source.category,
    timeZone,
    events: (data.items || [])
      .map((calendarEvent) =>
        normalizeEvent(calendarEvent, normalizedSource, label, timeZone),
      )
      .filter((calendarEvent): calendarEvent is CalendarEvent => Boolean(calendarEvent)),
  };
}

function buildMockEvents(timeZone: string): CalendarEvent[] {
  const baseMonthKey = getMonthKeyForDate(new Date(), timeZone);
  const monthStart = getMonthStartKey(baseMonthKey);

  const makeDateKey = (dayOffset: number) => addDays(monthStart, dayOffset);
  const makeTimedIso = (dateKey: string, hour: number, minute: number) => {
    const [year, month, day] = dateKey.split("-").map((value) => Number.parseInt(value, 10));
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0)).toISOString();
  };

  const createTimedEvent = (
    id: string,
    title: string,
    category: CalendarCategory,
    dateKey: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    description: string,
    location: string,
  ): CalendarEvent => ({
    id: `mock:${id}`,
    googleEventId: id,
    title,
    description,
    location,
    startsAt: makeTimedIso(dateKey, startHour, startMinute),
    endsAt: makeTimedIso(dateKey, endHour, endMinute),
    startDayKey: dateKey,
    endDayKey: dateKey,
    allDay: false,
    isClosed: false,
    category,
    sourceId: `mock-${category}`,
    sourceLabel: CATEGORY_STYLES[category].label,
    link: getCalendarUrl(),
  });

  const createAllDayEvent = (
    id: string,
    title: string,
    category: CalendarCategory,
    dateKey: string,
    description: string,
    location: string,
    isClosed = false,
  ): CalendarEvent => ({
    id: `mock:${id}`,
    googleEventId: id,
    title,
    description,
    location,
    startsAt: `${dateKey}T00:00:00.000Z`,
    endsAt: `${dateKey}T23:59:59.999Z`,
    startDayKey: dateKey,
    endDayKey: dateKey,
    allDay: true,
    isClosed,
    category,
    sourceId: `mock-${category}`,
    sourceLabel: CATEGORY_STYLES[category].label,
    link: getCalendarUrl(),
  });

  return [
    createTimedEvent(
      "magic-open-play",
      "Open Play",
      "magic",
      makeDateKey(1),
      18,
      30,
      22,
      0,
      "Riftbound and One Piece casual tables all evening.",
      "Pandora's Deck Box",
    ),
    createTimedEvent(
      "marvel-party",
      "Marvel Super Heroes Commander Party",
      "marvel",
      makeDateKey(2),
      18,
      0,
      21,
      0,
      "Special play kits, pods, and drop-in multiplayer rounds.",
      "Main event floor",
    ),
    createAllDayEvent(
      "holiday-closure",
      "Closed",
      "other",
      makeDateKey(3),
      "Holiday closure.",
      "Storewide",
      true,
    ),
    createAllDayEvent(
      "pokemon-prerelease",
      "Pokemon Prerelease",
      "pokemon",
      makeDateKey(4),
      "Build-and-battle flights with launch product.",
      "Pandora's Deck Box",
    ),
    createTimedEvent(
      "pauper-night",
      "Pauper",
      "magic",
      makeDateKey(8),
      18,
      30,
      22,
      0,
      "Weekly rounds with store credit payout.",
      "Pandora's Deck Box",
    ),
    createTimedEvent(
      "riftbound-skirmish",
      "Riftbound Skirmish",
      "riftbound",
      makeDateKey(10),
      18,
      0,
      21,
      0,
      "Casual skirmish pods and learn-to-play support.",
      "Feature table row",
    ),
    createAllDayEvent(
      "lorcana-prerelease",
      "Lorcana Prerelease",
      "lorcana",
      makeDateKey(16),
      "Attack of the Vine prerelease flights.",
      "Pandora's Deck Box",
    ),
    createTimedEvent(
      "regional-qualifier",
      "Regional Championship Qualifier",
      "magic",
      makeDateKey(17),
      11,
      0,
      19,
      0,
      "Competitive REL main event.",
      "Main event floor",
    ),
    createTimedEvent(
      "chaos-prerelease",
      "Chaos Prerelease Release",
      "riftbound",
      makeDateKey(24),
      18,
      0,
      22,
      0,
      "Launch-week showcase with promos and bundle add-ons.",
      "Pandora's Deck Box",
    ),
    createTimedEvent(
      "vendetta-pre-rift",
      "Riftbound Vendetta Pre-Rift",
      "riftbound",
      makeDateKey(29),
      18,
      0,
      21,
      0,
      "Preview event featuring deck clinics and prize promos.",
      "Pandora's Deck Box",
    ),
  ];
}

function parseDisplayDays(): CalendarGridColumn[] {
  const raw = process.env.CALENDAR_DISPLAY_DAYS?.trim();
  const tokens = raw ? raw.split(/[\s,]+/).filter(Boolean) : [];
  const weekdays = tokens
    .map((token) => {
      const normalized = token.toLowerCase();
      if (normalized in WEEKDAY_TOKENS) return WEEKDAY_TOKENS[normalized];

      const numeric = Number.parseInt(normalized, 10);
      return Number.isNaN(numeric) || numeric < 0 || numeric > 6 ? null : numeric;
    })
    .filter((value): value is number => value !== null);

  const unique = Array.from(new Set(weekdays));
  const finalWeekdays = unique.length > 0 ? unique : DEFAULT_DISPLAY_DAYS;

  return finalWeekdays.map((weekday) => ({
    weekday,
    shortLabel: WEEKDAY_LABELS[weekday].shortLabel,
    fullLabel: WEEKDAY_LABELS[weekday].fullLabel,
  }));
}

function getVisibleMonthRange(monthKey: string, columns: CalendarGridColumn[]) {
  const monthStart = getMonthStartKey(monthKey);
  const monthEnd = getMonthEndKey(monthKey);
  const columnWeekdays = columns.map((column) => column.weekday);
  const anchorWeekday = columns[0]?.weekday ?? DEFAULT_DISPLAY_DAYS[0];
  const finalWeekday = columns.at(-1)?.weekday ?? DEFAULT_DISPLAY_DAYS.at(-1) ?? 0;

  let firstVisibleInMonth = monthStart;
  while (!columnWeekdays.includes(getWeekday(firstVisibleInMonth))) {
    firstVisibleInMonth = addDays(firstVisibleInMonth, 1);
  }

  let firstVisible = firstVisibleInMonth;
  while (getWeekday(firstVisible) !== anchorWeekday) {
    firstVisible = addDays(firstVisible, -1);
  }

  let lastVisibleInMonth = monthEnd;
  while (!columnWeekdays.includes(getWeekday(lastVisibleInMonth))) {
    lastVisibleInMonth = addDays(lastVisibleInMonth, -1);
  }

  let lastVisible = lastVisibleInMonth;
  while (getWeekday(lastVisible) !== finalWeekday) {
    lastVisible = addDays(lastVisible, 1);
  }

  return {
    firstVisible,
    lastVisible,
  };
}

function buildEventIndex(events: CalendarEvent[]) {
  const index = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    let cursor = event.startDayKey;

    while (compareDateKeys(cursor, event.endDayKey) <= 0) {
      const bucket = index.get(cursor) || [];
      bucket.push(event);
      index.set(cursor, bucket);
      cursor = addDays(cursor, 1);
    }
  }

  for (const [dateKey, bucket] of index) {
    bucket.sort((left, right) => {
      if (left.isClosed !== right.isClosed) return left.isClosed ? -1 : 1;
      if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
      return Date.parse(left.startsAt) - Date.parse(right.startsAt);
    });
    index.set(dateKey, bucket);
  }

  return index;
}

function buildMonthView(
  events: CalendarEvent[],
  monthKey: string,
  timeZone: string,
  columns: CalendarGridColumn[],
): CalendarMonthView {
  const todayDateKey = getTodayDateKey(timeZone);
  const indexedEvents = buildEventIndex(events);
  const { firstVisible, lastVisible } = getVisibleMonthRange(monthKey, columns);
  const anchorWeekday = columns[0]?.weekday ?? DEFAULT_DISPLAY_DAYS[0];

  const weeks: CalendarGridWeek[] = [];
  const columnOffsets = columns.map((column) => (column.weekday - anchorWeekday + 7) % 7);

  for (
    let rowStart = firstVisible;
    compareDateKeys(rowStart, lastVisible) <= 0;
    rowStart = addDays(rowStart, 7)
  ) {
    const cells = columnOffsets.map((offset) => {
      const dateKey = addDays(rowStart, offset);
      const cellEvents = indexedEvents.get(dateKey) || [];
      const primaryEvent = cellEvents[0] || null;

      return {
        key: dateKey,
        dateKey,
        dayNumber: String(Number.parseInt(dateKey.slice(8, 10), 10)),
        isCurrentMonth: dateKey.startsWith(monthKey),
        isToday: dateKey === todayDateKey,
        events: cellEvents,
        primaryEvent,
        overflowCount: Math.max(cellEvents.length - 1, 0),
        isClosed: Boolean(primaryEvent?.isClosed),
      };
    });

    weeks.push({
      key: rowStart,
      cells,
    });
  }

  return {
    key: monthKey,
    label: formatMonthLabel(monthKey),
    previousKey: shiftMonthKey(monthKey, -1),
    nextKey: shiftMonthKey(monthKey, 1),
    columns,
    weeks,
  };
}

function buildFeed(
  events: CalendarEvent[],
  options: {
    status: CalendarFeedStatus;
    statusMessage: string;
    hasLiveConfig: boolean;
    errors: string[];
    timeZone: string;
    monthKey?: string;
    sources: CalendarSourceSummary[];
  },
): CalendarFeed {
  const monthKey = getResolvedMonthKey(options.monthKey, options.timeZone);

  return {
    brandName: getBrandName(),
    title: getEmbedTitle(),
    subtitle: getEmbedSubtitle(),
    calendarUrl: getCalendarUrl(),
    isMockData: options.status !== "live",
    revalidateMinutes: FIVE_MINUTES,
    events,
    sourceMode: options.status === "live" ? "google-api" : "mock",
    status: options.status,
    statusMessage: options.statusMessage,
    hasLiveConfig: options.hasLiveConfig,
    errors: options.errors,
    timeZone: options.timeZone,
    generatedAt: new Date().toISOString(),
    month: buildMonthView(events, monthKey, options.timeZone, parseDisplayDays()),
    sources: options.sources,
  };
}

export function getCalendarEventTime(
  event: CalendarEvent,
  timeZone: string,
): { startsAt: string; endsAt: string } {
  return formatTimeRange(event.startsAt, event.endsAt, event.allDay, timeZone);
}

export async function getCalendarFeed(monthKey?: string): Promise<CalendarFeed> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY?.trim();
  const sources = getSources();
  const configuredTimeZone = getConfiguredTimeZone();
  const hasLiveConfig = Boolean(apiKey && sources.length > 0);
  const baseTimeZone = configuredTimeZone || DEFAULT_TIME_ZONE;
  const resolvedMonthKey = getResolvedMonthKey(monthKey, baseTimeZone);
  const columns = parseDisplayDays();
  const visibleRange = getVisibleMonthRange(resolvedMonthKey, columns);

  if (!hasLiveConfig) {
    const timeZone = baseTimeZone;
    const mockEvents = buildMockEvents(timeZone);

    return buildFeed(mockEvents, {
      status: "mock-no-config",
      statusMessage:
        "Live Google Calendar credentials are missing, so the app is rendering sample event data.",
      hasLiveConfig: false,
      errors: [],
      timeZone,
      monthKey: resolvedMonthKey,
      sources: mockEvents.length
        ? [
            {
              id: "mock-calendar",
              label: "Sample Calendar",
              timeZone,
              eventCount: mockEvents.length,
            },
          ]
        : [],
    });
  }

  const start = new Date(`${visibleRange.firstVisible}T00:00:00.000Z`);
  const end = new Date(`${addDays(visibleRange.lastVisible, 2)}T00:00:00.000Z`);

  try {
    const results = await Promise.all(
      sources.map((source) => fetchSourceEvents(source, apiKey as string, start, end)),
    );

    const timeZone = configuredTimeZone || results[0]?.timeZone || DEFAULT_TIME_ZONE;
    const events = results
      .flatMap((result) => result.events)
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));

    return buildFeed(events, {
      status: "live",
      statusMessage: `Live Google Calendar sync active across ${results.length} source${
        results.length === 1 ? "" : "s"
      }.`,
      hasLiveConfig: true,
      errors: [],
      timeZone,
      monthKey: resolvedMonthKey,
      sources: results.map((result) => ({
        id: result.sourceId,
        label: result.label,
        category: result.category,
        timeZone: result.timeZone,
        eventCount: result.events.length,
      })),
    });
  } catch (error) {
    const timeZone = baseTimeZone;
    const message = error instanceof Error ? error.message : "Unknown Google Calendar error";
    const mockEvents = buildMockEvents(timeZone);

    return buildFeed(mockEvents, {
      status: "mock-error",
      statusMessage:
        "Google Calendar is configured, but the live fetch failed. Sample events are being shown instead.",
      hasLiveConfig: true,
      errors: [message],
      timeZone,
      monthKey: resolvedMonthKey,
      sources: [
        {
          id: "mock-calendar",
          label: "Fallback Sample Calendar",
          timeZone,
          eventCount: mockEvents.length,
        },
      ],
    });
  }
}
