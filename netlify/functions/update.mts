import type { Context } from "@netlify/functions";

export default async (req: Request, ctx: Context) => {
  const body = await req.text();
  console.log("Update from telegram:");
  console.log(body);

  return new Response("");
}

