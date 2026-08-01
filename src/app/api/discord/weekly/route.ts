import { NextResponse } from "next/server";

import { getCalendarFeed } from "@/lib/calendar";
import {
  buildWeeklyCalendarImageResponse,
  buildWeeklyDiscordMessage,
  buildWeeklyImageFilename,
} from "@/lib/weekly-calendar-discord";

export const runtime = "nodejs";
export const revalidate = 300;
const DISCORD_POST_TIMEOUT_MS = 15000;

function getDiscordWebhookUrl() {
  return process.env.DISCORD_WEEKLY_WEBHOOK_URL?.trim();
}

function getDiscordTestWebhookUrl() {
  return process.env.DISCORD_WEEKLY_TEST_WEBHOOK_URL?.trim();
}

function getPostingSecret() {
  return process.env.DISCORD_WEEKLY_POST_SECRET?.trim();
}

function isAuthorized(request: Request) {
  const secret = getPostingSecret();
  if (!secret) return true;

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-calendar-post-secret")?.trim() === secret;
}

function resolveWebhookTarget(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTarget = searchParams.get("target")?.trim().toLowerCase();
  const useTestWebhook = rawTarget === "test" || searchParams.get("test") === "1";

  return {
    weekKey: searchParams.get("week") || undefined,
    target: useTestWebhook ? "test" : "live",
    webhookUrl: useTestWebhook ? getDiscordTestWebhookUrl() : getDiscordWebhookUrl(),
  } as const;
}

async function getWeeklyAssets(weekKey?: string) {
  const feed = await getCalendarFeed({
    viewMode: "week",
    weekKey,
  });
  const imageResponse = await buildWeeklyCalendarImageResponse(feed);
  const imageBlob = new Blob([await imageResponse.arrayBuffer()], {
    type: "image/png",
  });

  return {
    feed,
    imageBlob,
    filename: buildWeeklyImageFilename(feed),
    content: buildWeeklyDiscordMessage(feed),
  };
}

export async function GET(request: Request) {
  const { weekKey, target, webhookUrl } = resolveWebhookTarget(request);
  const feed = await getCalendarFeed({
    viewMode: "week",
    weekKey,
  });

  return NextResponse.json({
    weekKey: feed.month.key,
    label: feed.month.label,
    content: buildWeeklyDiscordMessage(feed),
    imagePath: `/week/image${weekKey ? `?week=${encodeURIComponent(weekKey)}` : ""}`,
    target,
    webhookConfigured: Boolean(webhookUrl),
    authRequired: Boolean(getPostingSecret()),
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { weekKey, target, webhookUrl } = resolveWebhookTarget(request);
  if (!webhookUrl) {
    return NextResponse.json(
      {
        error:
          target === "test"
            ? "DISCORD_WEEKLY_TEST_WEBHOOK_URL is not configured."
            : "DISCORD_WEEKLY_WEBHOOK_URL is not configured.",
      },
      { status: 500 },
    );
  }
  const { feed, imageBlob, filename, content } = await getWeeklyAssets(weekKey);
  const formData = new FormData();

  formData.set(
    "payload_json",
    JSON.stringify({
      content,
      username: `${feed.brandName} Calendar`,
    }),
  );
  formData.set("files[0]", imageBlob, filename);

  let discordResponse: Response;

  try {
    discordResponse = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(DISCORD_POST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Discord webhook request timed out or failed.",
        details: message,
      },
      { status: 504 },
    );
  }

  if (!discordResponse.ok) {
    const errorText = await discordResponse.text();

    return NextResponse.json(
      {
        error: "Discord webhook request failed.",
        discordStatus: discordResponse.status,
        details: errorText,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    target,
    weekKey: feed.month.key,
    label: feed.month.label,
    filename,
    discordStatus: discordResponse.status,
  });
}
