import http from "serverless-http";
import { Telegraf } from "telegraf";
import { Redis } from "@upstash/redis";

const BOT_TOKEN = process.env.BOT_TOKEN as string;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL as string;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string;

const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

const bot = new Telegraf(BOT_TOKEN);

const getTimestamp = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const unix = now.getTime() / 1000;
  const formatted = `${hours}:${minutes}`;

  return {
    unix,
    formatted,
  };
}

bot.command("in", async (ctx) => {
  const time = getTimestamp();

  await redis.zadd(
    "events",
    { nx: true },
    { score: time.unix, member: "clock_in" },
  );
  await ctx.replyWithMarkdownV2(`🟠 Tracked *clock in* at _${time.formatted}_`);
});

bot.command("out", async (ctx) => {
  const time = getTimestamp();

  await redis.zadd(
    "events",
    { nx: true },
    { score: time.unix, member: "clock_out" },
  );
  await ctx.replyWithMarkdownV2(`🟢 Tracked *clock out* at _${time.formatted}_`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

export const handler = http(bot.webhookCallback("/.netlify/functions/update"));
