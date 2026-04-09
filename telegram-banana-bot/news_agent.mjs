import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const parser = new Parser();

// RSS 來源清單 (包含巨頭、開源與 AI 繪圖)
const RSS_FEEDS = [
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'Decrypt AI', url: 'https://decrypt.co/news/artificial-intelligence/feed' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' }
];

/**
 * 抓取最新新聞並進行 AI 摘要
 * @param {string} apiKey Gemini API Key
 * @returns {Promise<string>} 格式化好的新聞報表
 */
export async function getAiNewsReport(apiKey) {
  console.log('🔍 [NewsAgent] 正在抓取 RSS 來源...');
  
  const allItems = [];
  
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      // 每個來源只取前 3 則最新新聞
      const items = parsed.items.slice(0, 3).map(item => ({
        source: feed.name,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet || item.content
      }));
      allItems.push(...items);
    } catch (err) {
      console.error(`❌ [NewsAgent] 抓取 ${feed.name} 失敗:`, err.message);
    }
  }

  if (allItems.length === 0) {
    return '📭 今日暫無重大 AI 新聞更新。';
  }

  // 排序：按日期降序
  allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // 只取前 8 則最重要的進行摘要，避免 Prompt 過長
  const newsContext = allItems.slice(0, 8).map((item, index) => (
    `[${index + 1}] 來源: ${item.source}\n標題: ${item.title}\n簡介: ${item.contentSnippet}\n連結: ${item.link}`
  )).join('\n\n---\n\n');

  console.log('🧠 [NewsAgent] 正在進行 AI 內容摘要...');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  // 現有 Key 實測僅支援此預覽型號，故將摘要也導向此模型
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

  // 取得目前日期 (格式: 2026/04/08)
  const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');

  const prompt = `
你是一位專業的 AI 科技新聞代理人（龍蝦模式）。
請根據以下提供的最新新聞資訊，生成一份「精簡條列式」的每日 AI 新聞報表。

**規範：**
1. 每個項目包含：【標題】、一句話精華摘要、以及[來源連結]。
2. 語氣要專業且易讀。
3. 如果有多個來源在講同一件事，請合併成一則。
4. 輸出語言為繁體中文。

**參考資訊：**
${newsContext}

**輸出範本：**
🦞 **每日 AI 龍蝦報報 - ${today}**
---
• **【標題】** 內容摘要一行字。[閱讀原文](連結)
• **【標題】** 內容摘要一行字。[閱讀原文](連結)
---
祝您有充滿 AI 靈感的一天！🍌
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    if (!text) throw new Error('AI 回傳內容為空');
    
    // 取得本次使用的 Token 統計
    const usageMetadata = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
    
    return {
      text,
      usage: usageMetadata
    };
  } catch (err) {
    console.error('❌ [NewsAgent] AI 摘要發生錯誤:');
    console.error('訊息:', err.message);
    const errorMsg = `❌ 新聞摘要生成失敗 (錯誤: ${err.message})。請稍後再試。`;
    return { text: errorMsg, usage: null };
  }
}
