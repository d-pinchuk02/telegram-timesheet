import http from "serverless-http";
import { Telegraf, Markup, type Context } from "telegraf";
import { Redis } from "@upstash/redis";
import '@formatjs/intl-datetimeformat/polyfill';
import '@formatjs/intl-datetimeformat/locale-data/en';
import '@formatjs/intl-datetimeformat/add-all-tz';

const BOT_TOKEN = process.env.BOT_TOKEN as string;
const BOT_WHITELIST = (process.env.BOT_WHITELIST as string).split(",");
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL as string;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string;

const DEFAULT_KEYBOARD = Markup.keyboard([
  ["🔵 Clock In", "🟢 Clock Out"],
  ["📋 List Entries"],
]).resize().persistent(true)

const ENTRY_TYPES = {
  "clock_in": "Clock in",
  "clock_out": "Clock out",
};

const ENTRY_TYPE_COLORS = {
  "clock_in": "🔵",
  "clock_out": "🟢",
  "undefined": "🟣",
};

const humanDateIntl = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "Europe/Kyiv",
});

const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

const bot = new Telegraf(BOT_TOKEN);

const formatHoursMinutes = (date: Date) => {
  return date.toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv' })
};

const getTimestamp = () => {
  const unix = Math.floor(Date.now() / 1000);
  const now = new Date(unix * 1000);
  const formatted = formatHoursMinutes(now);

  return {
    unix,
    formatted,
  };
}

bot.use((ctx, next) => {
  const userId = ctx.from!.id.toString();

  if (BOT_WHITELIST.includes(userId)) {
    return next();
  }

  return ctx.reply("🔒 Unauthorized!");
});

const handleInCommand = async (ctx: Context) => {
  const time = getTimestamp();

  await redis.rpush(
    "events",
    ["clock_in", time.unix, time.formatted].join("|"),
  );
  await ctx.replyWithMarkdownV2(`🔵 Tracked *clock in* at _${time.formatted}_`, DEFAULT_KEYBOARD);
};

bot.command("in", handleInCommand);
bot.hears("🔵 Clock In", handleInCommand);

const handleOutCommand = async (ctx: Context) => {
  const time = getTimestamp();

  await redis.rpush(
    "events",
    ["clock_out", time.unix, time.formatted].join("|"),
  );
  await ctx.replyWithMarkdownV2(`🟢 Tracked *clock out* at _${time.formatted}_`, DEFAULT_KEYBOARD);
};

bot.command("out", handleOutCommand);
bot.hears("🟢 Clock Out", handleOutCommand);

const handleListCommand = async (ctx: Context) => {
  const length = await redis.llen("events");
  const elements = await redis.lrange("events", 0, length - 1);

  const entries = elements.map((element, elementIndex) => {
    const [type, timestamp, formatted] = element.split("|");
    const date = new Date(Number(timestamp) * 1000);
    const humanDate = humanDateIntl.format(date);

    return {
      id: elementIndex,
      type,
      timestamp,
      formatted,
      humanDate,
    };
  });
  // @ts-ignore
  entries.sort((a, b) => b.timestamp - a.timestamp);

  let groupedEntries: any[] = [];
  let prevIndex = 0,
      groupIndex = 0;
  entries.forEach((entry, entryIndex) => {
    if (entries[prevIndex].humanDate === entry.humanDate) {
      groupedEntries[groupIndex] ||= [];
      groupedEntries[groupIndex].push(entry);
    } else {
      groupedEntries.push([entry]);
      groupIndex++;
    }

    prevIndex = entryIndex;
  });

  const message = groupedEntries.map((entryGroup) => {
    const header = `*${entryGroup[0].humanDate}*\n`;
    const entryStrings = entryGroup.map((entry: any) => {
      // @ts-ignore
      const color = ENTRY_TYPE_COLORS[entry.type] ?? ENTRY_TYPE_COLORS["undefined"];
      const time = entry.formatted.substring(0, 5);
      // @ts-ignore
      const type = ENTRY_TYPES[entry.type] ?? entry.type.replaceAll("_", " ");

      return `${color} ${time} \\| ${type}`;
    }).join("\n");

    return header + entryStrings;
  }).join("\n\n");

  await ctx.replyWithMarkdownV2(message, DEFAULT_KEYBOARD);
};

bot.command("list", handleListCommand);
bot.hears("📋 List Entries", handleListCommand);

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

export const handler = http(bot.webhookCallback("/.netlify/functions/update"));
