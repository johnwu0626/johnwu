import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import cron from 'node-cron';
import fs from 'fs';
import { getAiNewsReport } from './news_agent.mjs';

// 檢查環境變數
const TG_TOKEN = process.env.TG_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!TG_TOKEN || !GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('❌ 錯誤：請在 .env 檔案中設定正確的 TG_TOKEN 與 GEMINI_API_KEY');
  process.exit(1);
}

// 初始化
const bot = new Telegraf(TG_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const CONFIG_PATH = './config.json';

// 讀取/儲存訂閱者 ID
function getSubscribers() {
  if (!fs.existsSync(CONFIG_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return data.subscriberIds || [];
  } catch (e) {
    return [];
  }
}

function saveSubscriber(chatId) {
  let subs = getSubscribers();
  if (!subs.includes(chatId)) {
    subs.push(chatId);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ subscriberIds: subs }, null, 2));
    return true;
  }
  return false;
}

// 設定模型 (Nano Banana 2 / Gemini 3.1 Flash Image Preview)
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-image-preview',
});

// 全域錯誤捕捉
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🚨 [Uncaught Exception]:', err);
});

// 指令：開始
bot.start((ctx) => {
  const username = ctx.from.username || ctx.from.first_name || '使用者';
  saveSubscriber(ctx.chat.id);
  console.log(`[Bot] 收到來自 ${username} 的 /start，已加入每日派送。`);
  ctx.reply('你好！我是 AI 龍蝦代理人。🦞\n\n🖼️ **影像功能**：\n- 直接輸入文字描述。\n- 上傳圖片並附上修改指令。\n\n🗞️ **新聞功能**：\n- 每日上午 09:00 我會自動為您送上 AI 關鍵新聞報表。\n- 您也可以輸入 /news 隨時查看。');
});

// 計算費用與格式化報表的輔助函數
function formatReportWithCost(newsResult) {
  const { text, usage } = newsResult;
  if (!usage) return text;

  // 2026 Gemini 3 Flash 文字計價 (USD/1M tokens)
  // Input: $0.50, Output: $3.00
  const inputCost = (usage.promptTokenCount / 1000000) * 0.5;
  const outputCost = (usage.candidatesTokenCount / 1000000) * 3.0;
  const totalUsd = inputCost + outputCost;
  const totalTwd = totalUsd * 32; // 匯率約略

  const costInfo = `\n---\n📊 **本次任務統計**：\n- Token 消耗：${usage.promptTokenCount + usage.candidatesTokenCount} (In: ${usage.promptTokenCount}, Out: ${usage.candidatesTokenCount})\n- 估計費用：$${totalUsd.toFixed(5)} USD (約台幣 **$${totalTwd.toFixed(4)}** 元)`;
  
  return text + costInfo;
}

// 指令：手動獲取新聞
bot.command('news', async (ctx) => {
  let statusMsg = await ctx.reply('🔍 龍蝦正在掃描全球 AI 新聞，請稍候...');
  try {
    const result = await getAiNewsReport(GEMINI_API_KEY);
    const fullMessage = formatReportWithCost(result);
    await ctx.reply(fullMessage, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply('❌ 獲取新聞失敗：' + err.message);
  } finally {
    if (statusMsg) await ctx.deleteMessage(statusMsg.message_id).catch(() => {});
  }
});

// 每日計時器 (09:00 AM)
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ [Cron] 正在執行每日 AI 新聞推送任務...');
  const subscribers = getSubscribers();
  if (subscribers.length === 0) return;

  try {
    const result = await getAiNewsReport(GEMINI_API_KEY);
    const fullMessage = formatReportWithCost(result);
    for (const chatId of subscribers) {
      try {
        await bot.telegram.sendMessage(chatId, fullMessage, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error(`❌ [Cron] 無法發送至 ${chatId}:`, e.message);
      }
    }
  } catch (err) {
    console.error('❌ [Cron] 每日任務失敗:', err);
  }
}, {
  timezone: "Asia/Taipei"
});

// 指令：Ping
bot.command('ping', (ctx) => ctx.reply('Pong! 🏓 機器人連線正常。'));

// 設定選單指令
// 處理文字訊息 (純對話模式)
bot.on('text', async (ctx) => {
  const prompt = ctx.message.text;
  if (prompt.startsWith('/')) return;

  try {
    // 使用目前可用的模型進行純文字對話
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
    const result = await chatModel.generateContent(prompt);
    const response = await result.response;
    await ctx.reply(response.text());
  } catch (error) {
    console.error('❌ Chat Error:', error);
    await ctx.reply('❌ 聊天功能暫時不可用：' + error.message);
  }
});

// 不再處理圖片上傳
bot.on('photo', (ctx) => {
  ctx.reply('⚠️ 目前已關閉影像生成功能以節省 API 費用。');
});

async function startBot() {
  try {
    console.log('🔍 正在檢查 Webhook 狀態...');
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    bot.launch({ allowedUpdates: ['message', 'callback_query'] }).then(() => console.log('🏁 機器人已停止。'));
    console.log('✅ AI 龍蝦代理人啟動成功！(每日 09:00 新聞推送已就緒)');
  } catch (err) {
    console.error('💥 啟動失敗:', err);
    process.exit(1);
  }
}

startBot();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
