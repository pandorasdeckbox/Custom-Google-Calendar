#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HELP_TEXT = `
Usage:
  node scripts/monthly-discord.mjs preview [--month=YYYY-MM] [--base-url=https://example.com]
  node scripts/monthly-discord.mjs post [--month=YYYY-MM] [--base-url=https://example.com]

Commands:
  preview   Fetches the deployed /api/discord/monthly preview payload and prints it.
  post      Sends a POST to the deployed /api/discord/monthly route.

Options:
  --month=YYYY-MM     Optional month key for the monthly view.
  --base-url=URL      Override MONTHLY_DISCORD_BASE_URL for one run.
  --test              Use the deployed test webhook target instead of the live announcement webhook.
  --help              Show this help.

Environment:
  MONTHLY_DISCORD_BASE_URL     Deployed app base URL, for example https://your-app.up.railway.app
  WEEKLY_DISCORD_BASE_URL      Fallback deployed app base URL if the monthly value is not set
  DISCORD_MONTHLY_POST_SECRET  Optional secret sent as Bearer auth for the POST route
  DISCORD_WEEKLY_POST_SECRET   Fallback secret if the monthly value is not set
`.trim();

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return "";
  }

  const quote = trimmed[0];
  const hasMatchingQuotes =
    (quote === '"' || quote === "'") && trimmed.at(-1) === quote && trimmed.length >= 2;

  if (!hasMatchingQuotes) {
    return trimmed;
  }

  const unquoted = trimmed.slice(1, -1);

  if (quote === '"') {
    return unquoted
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"');
  }

  return unquoted.replace(/\\'/g, "'");
}

function loadEnvFile(filePath, protectedKeys) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key || protectedKeys.has(key)) {
      continue;
    }

    const value = parseEnvValue(line.slice(equalsIndex + 1));
    process.env[key] = value;
  }
}

function loadLocalEnvFiles() {
  const protectedKeys = new Set(Object.keys(process.env));
  const cwd = process.cwd();

  loadEnvFile(join(cwd, ".env"), protectedKeys);
  loadEnvFile(join(cwd, ".env.local"), protectedKeys);
}

function parseArgs(argv) {
  if (argv[0] === "--help" || argv[0] === "-h") {
    return {
      command: undefined,
      options: { help: true },
    };
  }

  const [command, ...rest] = argv;
  const options = {};

  for (const token of rest) {
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token.startsWith("--month=")) {
      options.month = token.slice("--month=".length).trim();
      continue;
    }

    if (token.startsWith("--base-url=")) {
      options.baseUrl = token.slice("--base-url=".length).trim();
      continue;
    }

    if (token === "--test") {
      options.test = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return {
    command,
    options,
  };
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("MONTHLY_DISCORD_BASE_URL is empty.");
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getBaseUrl(baseUrlOverride) {
  const candidate =
    baseUrlOverride || process.env.MONTHLY_DISCORD_BASE_URL || process.env.WEEKLY_DISCORD_BASE_URL;

  if (!candidate) {
    throw new Error(
      "Missing MONTHLY_DISCORD_BASE_URL or WEEKLY_DISCORD_BASE_URL. Set one in your local environment or pass --base-url=...",
    );
  }

  return normalizeBaseUrl(candidate);
}

function buildApiUrl(baseUrl, month, useTestTarget) {
  const url = new URL("/api/discord/monthly", baseUrl);

  if (month) {
    url.searchParams.set("month", month);
  }

  if (useTestTarget) {
    url.searchParams.set("target", "test");
  }

  return url;
}

function getPostHeaders() {
  const secret =
    process.env.DISCORD_MONTHLY_POST_SECRET?.trim() ||
    process.env.DISCORD_WEEKLY_POST_SECRET?.trim();

  if (!secret) {
    return {};
  }

  return {
    Authorization: `Bearer ${secret}`,
  };
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return {
      raw: text,
    };
  }
}

function printPreview(data, targetUrl, baseUrl) {
  console.log(`Target: ${targetUrl}`);
  console.log(`Month: ${data.label} (${data.monthKey})`);
  console.log(`Image: ${new URL(data.imagePath, baseUrl).toString()}`);
  console.log(`Webhook configured: ${data.webhookConfigured ? "yes" : "no"}`);
  console.log("");
  console.log(data.content);
}

function printPostResult(data, targetUrl) {
  console.log(`Target: ${targetUrl}`);
  console.log(`Posted month: ${data.label} (${data.monthKey})`);
  console.log(`Filename: ${data.filename}`);
  console.log(`Discord status: ${data.discordStatus}`);
}

async function runPreview(baseUrl, month, useTestTarget) {
  const url = buildApiUrl(baseUrl, month, useTestTarget);
  const response = await fetch(url);
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Preview request failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  printPreview(data, url.toString(), baseUrl);
}

async function runPost(baseUrl, month, useTestTarget) {
  const url = buildApiUrl(baseUrl, month, useTestTarget);
  const response = await fetch(url, {
    method: "POST",
    headers: getPostHeaders(),
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Post request failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  printPostResult(data, url.toString());
}

async function main() {
  loadLocalEnvFiles();
  const { command, options } = parseArgs(process.argv.slice(2));

  if (!command || options.help || command === "help") {
    console.log(HELP_TEXT);
    return;
  }

  if (command !== "preview" && command !== "post") {
    throw new Error(`Unknown command: ${command}`);
  }

  const baseUrl = getBaseUrl(options.baseUrl);

  if (command === "preview") {
    await runPreview(baseUrl, options.month, options.test === true);
    return;
  }

  await runPost(baseUrl, options.month, options.test === true);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`monthly-discord: ${message}`);
  process.exitCode = 1;
});