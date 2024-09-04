import type { Context } from "@netlify/functions";

export default async (req: Request, ctx: Context) => {
  return new Response("Hello, world!");
}

