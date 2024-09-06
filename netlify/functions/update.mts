import http from "serverless-http";
import { Telegraf, Markup, type Context } from "telegraf";
import { Redis } from "@upstash/redis";

const BOT_TOKEN = process.env.BOT_TOKEN as string;
const BOT_WHITELIST = (process.env.BOT_WHITELIST as string).split(",");
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL as string;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string;

const DEFAULT_KEYBOARD = Markup.keyboard([
  ["🔵 Clock In", "🟢 Clock Out"],
  ["📋 List Entries"],
]).resize().persistent(true)

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

  const message = elements.map((element) => {
    if (!element.startsWith("clock")) return element;

    const [type, unix, formatted] = element.split("|");

    if (type === "clock_in") {
      return `\n🔵 ${formatted} - clock in`;
    } else if (type === "clock_out") {
      return `🟢 ${formatted} - clock out`;
    }
  }).join("\n");

  await ctx.replyWithMarkdownV2(message, DEFAULT_KEYBOARD);
};

bot.command("list", handleListCommand);
bot.hears("📋 List Entries", handleListCommand);

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

export const handler = http(bot.webhookCallback("/.netlify/functions/update"));
