#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HELP_TEXT = `
Usage:
  node scripts/weekly-discord.mjs preview [--week=YYYY-MM-DD] [--base-url=https://example.com]
  node scripts/weekly-discord.mjs post [--week=YYYY-MM-DD] [--base-url=https://example.com]

Commands:
  preview   Fetches the deployed /api/discord/weekly preview payload and prints it.
  post      Sends a POST to the deployed /api/discord/weekly route.

Options:
  --week=YYYY-MM-DD   Optional Monday anchor date for the weekly view.
  --base-url=URL      Override WEEKLY_DISCORD_BASE_URL for one run.
  --help              Show this help.

Environment:
  WEEKLY_DISCORD_BASE_URL   Deployed app base URL, for example https://your-app.up.railway.app
  DISCORD_WEEKLY_POST_SECRET Optional secret sent as Bearer auth for the POST route.
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

    if (token.startsWith("--week=")) {
      options.week = token.slice("--week=".length).trim();
      continue;
    }

    if (token.startsWith("--base-url=")) {
      options.baseUrl = token.slice("--base-url=".length).trim();
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
    throw new Error("WEEKLY_DISCORD_BASE_URL is empty.");
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getBaseUrl(baseUrlOverride) {
  const candidate = baseUrlOverride || process.env.WEEKLY_DISCORD_BASE_URL;

  if (!candidate) {
    throw new Error(
      "Missing WEEKLY_DISCORD_BASE_URL. Set it in your local environment or pass --base-url=...",
    );
  }

  return normalizeBaseUrl(candidate);
}

function buildApiUrl(baseUrl, week) {
  const url = new URL("/api/discord/weekly", baseUrl);

  if (week) {
    url.searchParams.set("week", week);
  }

  return url;
}

function getPostHeaders() {
  const secret = process.env.DISCORD_WEEKLY_POST_SECRET?.trim();

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
  console.log(`Week: ${data.label} (${data.weekKey})`);
  console.log(`Image: ${new URL(data.imagePath, baseUrl).toString()}`);
  console.log(`Webhook configured: ${data.webhookConfigured ? "yes" : "no"}`);
  console.log("");
  console.log(data.content);
}

function printPostResult(data, targetUrl) {
  console.log(`Target: ${targetUrl}`);
  console.log(`Posted week: ${data.label} (${data.weekKey})`);
  console.log(`Filename: ${data.filename}`);
  console.log(`Discord status: ${data.discordStatus}`);
}

async function runPreview(baseUrl, week) {
  const url = buildApiUrl(baseUrl, week);
  const response = await fetch(url);
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Preview request failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  printPreview(data, url.toString(), baseUrl);
}

async function runPost(baseUrl, week) {
  const url = buildApiUrl(baseUrl, week);
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
    await runPreview(baseUrl, options.week);
    return;
  }

  await runPost(baseUrl, options.week);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`weekly-discord: ${message}`);
  process.exitCode = 1;
});