import type { Context } from "@netlify/functions";
import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL as string;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN as string;

const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

const humanDateIntl = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "Europe/Kyiv",
});

export const handler = async (req: Request, ctx: Context) => {
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

  return {
    body: JSON.stringify(entries),
    headers: {
      "Content-Type": "application/json",
    },
    statusCode: 200,
  };
};
