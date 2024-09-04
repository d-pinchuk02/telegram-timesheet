import type { Context } from "@netlify/functions";

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const API_SEND_MESSAGE = `${API_BASE}/sendMessage`;

const sendResponse = async (res: string, msg: any) => {
  return await fetch(API_SEND_MESSAGE, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      chat_id: msg.chat.id,
      text: res,
    }),
  });
}

export default async (req: Request, ctx: Context) => {
  const body = await req.json();
  console.log("Update from telegram:");
  console.log(body);

  await sendResponse("Test response!", body.message);

  return new Response("");
}
