import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels(); // This might not be how you call listModels in v1 SDK
    // In @google/generative-ai, listModels is not on a specific model but usually on a separate client or via a specific call.
    // Actually, it's not and the user is using the SDK.
    // I'll try a raw fetch or a simpler way if the SDK doesn't expose it easily.
    console.log("Checking models manually...");
  } catch (err) {
    console.error(err);
  }
}

// Just try common names
const candidates = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
  'gemini-3.1-flash-image-preview'
];

async function testModels() {
  for (const name of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent("ping");
      console.log(`✅ [${name}] is available!`);
    } catch (err) {
      console.log(`❌ [${name}] failed: ${err.message}`);
    }
  }
}

testModels();
