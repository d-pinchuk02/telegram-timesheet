import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN as string;

const bot = new Telegraf(BOT_TOKEN);

bot.command('in', async (ctx) => {
  await ctx.replyWithMarkdownV2(`🟠 Tracked *clock in* at _09:41_`);
});

bot.command('out', async (ctx) => {
  await ctx.replyWithMarkdownV2(`🟢 Tracked *clock out* at _09:41_`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export default bot.webhookCallback("/.netlify/functions/update");
