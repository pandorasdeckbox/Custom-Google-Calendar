import { NextResponse } from "next/server";

import { getCalendarFeed } from "@/lib/calendar";
import {
  buildWeeklyCalendarImageResponse,
  buildWeeklyDiscordMessage,
  buildWeeklyImageFilename,
} from "@/lib/weekly-calendar-discord";

export const runtime = "nodejs";
export const revalidate = 300;

function getDiscordWebhookUrl() {
  return process.env.DISCORD_WEEKLY_WEBHOOK_URL?.trim();
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

function getWebhookUrlWithWait(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.set("wait", "true");
  return url.toString();
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
  const { searchParams } = new URL(request.url);
  const weekKey = searchParams.get("week") || undefined;
  const feed = await getCalendarFeed({
    viewMode: "week",
    weekKey,
  });

  return NextResponse.json({
    weekKey: feed.month.key,
    label: feed.month.label,
    content: buildWeeklyDiscordMessage(feed),
    imagePath: `/week/image${weekKey ? `?week=${encodeURIComponent(weekKey)}` : ""}`,
    webhookConfigured: Boolean(getDiscordWebhookUrl()),
    authRequired: Boolean(getPostingSecret()),
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "DISCORD_WEEKLY_WEBHOOK_URL is not configured." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const weekKey = searchParams.get("week") || undefined;
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

  const discordResponse = await fetch(getWebhookUrlWithWait(webhookUrl), {
    method: "POST",
    body: formData,
  });

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
    weekKey: feed.month.key,
    label: feed.month.label,
    filename,
    discordStatus: discordResponse.status,
  });
}
