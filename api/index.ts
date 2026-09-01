
import express from "express";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

dotenv.config({ override: true });

const RAW_BACKEND_KEYS = [
  process.env.VITE_OPENROUTER_API_KEY_1 || process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "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",
  process.env.VITE_OPENROUTER_API_KEY_2 || "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",
  process.env.VITE_OPENROUTER_API_KEY_3 || "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",
  process.env.VITE_OPENROUTER_API_KEY_4 || "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"
];

// Filter out empty or unconfigured strings so only valid active keys are stored in pool
const OPENROUTER_API_KEYS = RAW_BACKEND_KEYS.filter(
  (key): key is string => typeof key === 'string' && key.trim().length > 0
);

let currentKeyIndex = 0;

function getActiveKey(customKey?: string): string {
  if (customKey && customKey.startsWith("sk-or-")) {
    return customKey;
  }
  if (OPENROUTER_API_KEYS.length === 0) return "";
  return OPENROUTER_API_KEYS[currentKeyIndex % OPENROUTER_API_KEYS.length];
}

function rotateToNextKey(): string {
  if (OPENROUTER_API_KEYS.length <= 1) {
    return getActiveKey();
  }
  const prevIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % OPENROUTER_API_KEYS.length;
  console.log(
    `[Nexara Failover Engine] Key #${prevIndex + 1} exhausted. Auto-switching to Key #${currentKeyIndex + 1}...`
  );
  return OPENROUTER_API_KEYS[currentKeyIndex];
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const OPENROUTER_FREE_MODELS = [
  "openrouter/free",
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "nvidia/nemotron-4-340b-instruct:free"
];

export function parseApiError(err: any): string {
  if (!err) return "An unknown error occurred.";

  if (typeof err === "string") {
    const trimmed = err.trim();
    if (trimmed === "[object Object]") return "An unexpected API error occurred.";
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseApiError(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof err === "object") {
    if (err.error) {
      return parseApiError(err.error);
    }
    if (typeof err.message === "string" && err.message && err.message !== "[object Object]") {
      return err.message;
    }
    if (typeof err.message === "object" && err.message) {
      return parseApiError(err.message);
    }
    if (typeof err.detail === "string") {
      return err.detail;
    }
    if (typeof err.msg === "string") {
      return err.msg;
    }
    try {
      const str = JSON.stringify(err);
      if (str && str !== "{}" && str !== "[object Object]") {
        return str;
      }
    } catch {
      // Fallback
    }
  }

  const fallback = String(err);
  return fallback !== "[object Object]" ? fallback : "An unexpected API error occurred.";
}

function shouldTriggerWebSearch(userQuery: string, explicitSearchSetting?: boolean): boolean {
  if (explicitSearchSetting === true) return true;
  if (explicitSearchSetting === false) return false;
  if (!userQuery || typeof userQuery !== "string") return false;

  const text = userQuery.trim().toLowerCase();
  if (!text) return false;

  // If user provided an explicit URL link in message, enable search/web content processing
  if (/(https?:\/\/[^\s]+)/.test(text)) {
    return true;
  }

  // Common casual greetings and general identity questions - STRICTLY DO NOT trigger web search
  const casualGreetingRegex = /^(hi|hello|hey|hy|hola|sup|yo|greetings|good\s*(morning|afternoon|evening|night)|how\s*are\s*you|how\s*r\s*u|how\s*is\s*it\s*going|whats\s*up|what's\s*up|who\s*are\s*you|what\s*is\s*your\s*name|who\s*made\s*you|who\s*created\s*you|who\s*built\s*you|কেমন\s*আছো|কেমন\s*আছেন|হাই|হ্যালো|হেই|নমস্কার|সালাম|আসসালামু\s*আলাইকুম|assalamu\s*alaikum|তুমি\s*কে|তোমার\s*নাম\s*কি|তোমাকে\s*কে\s*বানিয়েছে|তোমার\s*ডেভেলপার\s*কে|শুভ\s*(সকাল|সন্ধ্যা|রাত্রি))[!?.\s]*$/i;
  
  if (casualGreetingRegex.test(text)) {
    return false;
  }

  // Explicit real-time / live search keywords
  const realtimeKeywords = [
    "search", "search the web", "search online", "google", "look up online", "browse the web",
    "latest news", "current news", "today news", "today's news", "breaking news", "recent news",
    "stock price", "crypto price", "live price", "current price", "btc price", "eth price", "share market",
    "weather today", "current weather", "weather forecast", "temperature today",
    "live score", "match score", "score today", "who won today",
    "latest version", "release date", "recent update", "what happened today", "today's events",
    "খবর", "আজকের খবর", "সর্বশেষ খবর", "লাইভ দাম", "শেয়ার বাজার", "আজকের আবহাওয়া", "আজকের খেলা", "লাইভ স্কোর"
  ];

  const hasRealtimeKeyword = realtimeKeywords.some(keyword => text.includes(keyword));
  if (hasRealtimeKeyword) {
    return true;
  }

  return false;
}

function sanitizeResponseText(text: string): string {
  if (!text) return "";
  let sanitized = text;
  sanitized = sanitized.replace(/<think>[\s\S]*?<\/think>/gi, '');
  sanitized = sanitized.replace(/<think>[\s\S]*$/gi, '');
  sanitized = sanitized.replace(/(?:User|Response|Prompt|System|Input|Output)?\s*Safety(?:\s*Rating)?\s*:\s*(?:safe|unsafe|flagged|ok|neutral|[\w-]+)/gi, '');
  sanitized = sanitized.replace(/^:\s*OPENROUTER PROCESSING\s*/gim, '');
  return sanitized.replace(/^\s+/, '').trim();
}

async function callOpenRouter(
  modelName: string, 
  messages: any[], 
  temperature: number = 0.7, 
  customKey?: string,
  onChunk?: (chunk: string) => void,
  onStatus?: (status: string, tool?: string) => void,
  enableWebSearch: boolean = false
) {
  const poolSize = OPENROUTER_API_KEYS.length;
  const hasCustomKey = !!(customKey && customKey.startsWith("sk-or-"));
  const totalKeyAttempts = hasCustomKey ? poolSize + 1 : poolSize;

  if (poolSize === 0 && !hasCustomKey) {
    throw new Error("Missing OpenRouter API key. Please configure API keys in environment or settings.");
  }

  const requestedModel = (!modelName || modelName === "openrouter/free") ? "openrouter/free" : modelName;

  const modelsToTry = Array.from(new Set([
    requestedModel,
    "openrouter/free",
    ...OPENROUTER_FREE_MODELS
  ]));

  let lastError: Error | null = null;
  const refererUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://nexara-ai.com");

  for (let keyAttempt = 0; keyAttempt < totalKeyAttempts; keyAttempt++) {
    let activeApiKey: string;
    let keyLabel: string;

    if (keyAttempt === 0 && hasCustomKey) {
      activeApiKey = customKey!;
      keyLabel = "User Custom Key";
    } else {
      activeApiKey = getActiveKey();
      keyLabel = `Pool Key #${currentKeyIndex + 1}`;
    }

    if (!activeApiKey) {
      rotateToNextKey();
      continue;
    }

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${activeApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": refererUrl,
      "X-Title": "Nexara AI"
    };

    let keyExhausted = false;

    for (const model of modelsToTry) {
      try {
        console.log(`[OpenRouter Fast Stream | ${keyLabel}] Trying model: ${model} (Web Search: ${enableWebSearch})`);
        if (onStatus) {
          onStatus("Nexara AI is thinking...", "thinking");
        }

        const bodyPayload: any = {
          model: model,
          messages: messages,
          temperature: temperature,
          stream: true
        };

        if (enableWebSearch) {
          bodyPayload.plugins = [{ id: "web" }];
        }

        let response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload)
        });

        if (!response.ok && enableWebSearch) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = parseApiError(errorData) || `OpenRouter HTTP ${response.status}`;
          console.warn(`[OpenRouter Warning | ${keyLabel}] Model ${model} failed with web plugin (${response.status}): ${errMsg}. Retrying without plugin...`);

          // Retry without web plugin
          delete bodyPayload.plugins;
          response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify(bodyPayload)
          });
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = parseApiError(errorData) || `OpenRouter HTTP ${response.status}`;
          console.warn(`[OpenRouter Warning | ${keyLabel}] Model ${model} failed (${response.status}): ${errMsg}`);
          lastError = new Error(errMsg);

          const isRateLimit = response.status === 429 || 
                              response.status === 402 || 
                              response.status === 403 || 
                              errMsg.toLowerCase().includes("rate limit") || 
                              errMsg.toLowerCase().includes("quota") || 
                              errMsg.toLowerCase().includes("free-models-per-day") ||
                              errMsg.toLowerCase().includes("insufficient");

          if (isRateLimit) {
            keyExhausted = true;
            break;
          }
          continue;
        }

        if (!response.body) {
          throw new Error("No stream body returned");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let accumulatedText = "";
        let emittedLength = 0;
        let currentMode: 'thinking' | 'web_search' | 'code_gen' | 'writing' = 'thinking';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          let lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (trimmed === "data: [DONE]") continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                if (json.error) {
                  const streamErrMsg = parseApiError(json.error);
                  throw new Error(streamErrMsg);
                }
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  accumulatedText += delta;

                  let nextMode: 'code_gen' | 'writing' = 'writing';
                  if (accumulatedText.includes('```') || accumulatedText.includes('filename=')) {
                    nextMode = 'code_gen';
                  }

                  if (currentMode !== nextMode) {
                    currentMode = nextMode;
                    if (onStatus) {
                      if (nextMode === 'code_gen') {
                        onStatus("Writing code...", "code_gen");
                      } else {
                        onStatus("Writing response...", "writing");
                      }
                    }
                  }

                  if (onChunk) {
                    const sanitizedSoFar = sanitizeResponseText(accumulatedText);
                    if (sanitizedSoFar.length > emittedLength) {
                      const chunkToEmit = sanitizedSoFar.slice(emittedLength);
                      emittedLength = sanitizedSoFar.length;
                      onChunk(chunkToEmit);
                    }
                  }
                }
              } catch (e: any) {
                if (e?.message && !e.message.includes("Unexpected token")) {
                  throw e;
                }
              }
            }
          }
        }

        const sanitized = sanitizeResponseText(accumulatedText);
        if (sanitized || accumulatedText) {
          return sanitized || accumulatedText;
        }
      } catch (err: any) {
        const errMsg = parseApiError(err);
        console.warn(`[OpenRouter Stream Warning | ${keyLabel}] Exception calling ${model}:`, errMsg);
        lastError = new Error(errMsg);
      }
    }

    if (keyExhausted) {
      if (keyAttempt === 0 && hasCustomKey) {
        console.log(`[Nexara Failover Engine] Custom API key exhausted. Auto-switching to Pool Key #${currentKeyIndex + 1}...`);
      } else {
        rotateToNextKey();
      }
      continue;
    }

    if (keyAttempt < totalKeyAttempts - 1) {
      rotateToNextKey();
    }
  }

  throw lastError || new Error("All API keys in the 4-key failover pool failed consecutively.");
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/api/health", async (req, res) => {
  const activeKey = getActiveKey();
  res.json({ 
    status: "ok", 
    activeKeyPoolSize: OPENROUTER_API_KEYS.length,
    openRouterKeyPrefix: activeKey ? activeKey.substring(0, 8) : "none"
  });
});

app.post("/api/tts", async (req, res) => {
  // Gracefully notify frontend to use high-quality Web Speech API synthesis
  res.json({ fallbackToBrowser: true });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, language, apiKey, memory, temperature, systemPromptOverride } = req.body;
    
    
    const hasImage = messages.some((m: any) => Array.isArray(m.content));

    // Pollinations AI image generation intercept
    const latestUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    let lastUserText = '';
    if (latestUserMsg) {
        if (Array.isArray(latestUserMsg.content)) {
            lastUserText = latestUserMsg.content.find((c: any) => c.type === 'text')?.text || '';
        } else {
            lastUserText = latestUserMsg.content || '';
        }
    }

    if (!hasImage && lastUserText) {
        const lowerText = lastUserText.toLowerCase();
        const isImageGen = lowerText.match(/\b(draw|generate image|create photo|create an image|generate a photo|generate a picture|make a picture|create a picture|image of)\b/i);
        
        if (isImageGen) {
            const seed = Math.floor(Math.random() * 1000);
            const encodedPrompt = encodeURIComponent(lastUserText);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1024&height=1024&nologo=true&seed=${seed}`;
            
            const reply = `Here is your generated image:\n\n![Generated Image](${imageUrl})`;
            return res.json({ reply });
        }
    }

    
    const languageMap: Record<string, string> = {
      en: 'English',
      bn: 'Bengali (বাংলা)',
      zh: 'Mandarin Chinese (中文)',
      hi: 'Hindi (हिन्दी)',
      es: 'Spanish (Español)',
      fr: 'French (Français)'
    };
    
    const langName = languageMap[language as string] || 'English';
    const langInstruction = `CRITICAL RULE: Match the user's input language automatically. If the user speaks Bengali (বাংলা), you MUST reply entirely in natural, fluent Bengali. If in English, respond in English. Do NOT use awkward machine translation tones. (App UI language is set to ${langName}).`;
    
    const memoryInstruction = memory ? `\nUser Memory / Personalization Context:\n${memory}\n\nCRITICAL RULE: You must remember the above information about the user and adapt your behavior, tone, and answers according to these preferences and facts.` : '';

    const defaultSystemContent = `You are Nexara AI, a high-performance next-generation AI assistant created and developed by Pretom Biswas.

CONVERSATIONAL BEHAVIOR & IDENTITY:
- Identity & Creator: You are Nexara AI, created and developed by Pretom Biswas. Whenever asked about your identity or creator ("Who are you?", "Who created you?", "Who built you?", "তুমি কে?", "তোমাকে কে বানিয়েছ?"), always state clearly and proudly that you are Nexara AI, created and developed by Pretom Biswas.
- Casual Greetings: Respond naturally, warmly, and concisely to casual greetings (such as "hi", "hello", "how are you", "হাই", "কেমন আছো") without citing dictionary links, search engine sources, or dumping unnecessary definitions. Keep conversational replies direct, friendly, clean, and engaging.
- Language Auto-Matching: Match the user's input language automatically. If the user speaks Bengali (বাংলা), respond in natural, fluent Bengali; if in English, respond in English; if in any other language, respond in that language. Do NOT use awkward machine translation phrasing.

CODE & ARTIFACTS RULE:
- When writing code, scripts, or multi-file applications, place all code inside fenced markdown code blocks with proper language tags and file names (e.g., \`\`\`tsx filename="App.tsx" or \`\`\`python script.py). Keep conversational text concise and let code blocks handle implementation details.

CITATION & FORMATTING RULE:
- Only embed markdown citation links [Source Name](URL) when performing explicit web searches for real-time online information. Never attach dictionary links, search engine landing pages, or dictionary references for simple greetings or general knowledge answers.
- Do NOT output internal reasoning steps or <think> tags. Keep responses direct, modern, clean, and visually well-structured.
${langInstruction}${memoryInstruction}`;

    const systemPrompt = {
      role: "system",
      content: systemPromptOverride || defaultSystemContent
    };

    let urlScrapedContent = "";
    let scrapedImages: string[] = [];
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    if (lastUserMessage) {
        if (Array.isArray(lastUserMessage.content)) {
            lastUserText = lastUserMessage.content.find((p: any) => p.type === 'text' || p.text)?.text || "";
        } else {
            lastUserText = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : "";
        }

        const urls = lastUserText.match(/(https?:\/\/[^\s]+)/g);
        if (urls && urls.length > 0) {
            for (let i = 0; i < Math.min(urls.length, 2); i++) {
                try {
                    const fetchRes = await fetch(urls[i]);
                    if (fetchRes.ok) {
                        const html = await fetchRes.text();
                        const $ = cheerio.load(html);
                        
                        const images: {src: string, alt: string}[] = [];
                        
                        // Extract meta info
                        const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
                        if (ogImage && ogImage.startsWith('http')) {
                            images.push({ src: ogImage, alt: 'Website Cover Image' });
                        }

                        $('img').each((_, el) => {
                            let src = $(el).attr('src') || $(el).attr('data-src');
                            let alt = $(el).attr('alt') || '';
                            if (src) {
                                if (src.startsWith('/')) {
                                    try {
                                        src = new URL(src, urls[i]).href;
                                    } catch(e) {}
                                }
                                if (src.startsWith('http')) {
                                    const srcLower = src.toLowerCase();
                                    if (!srcLower.includes('logo') && 
                                        !srcLower.includes('icon') && 
                                        !srcLower.includes('svg') &&
                                        !srcLower.includes('avatar') &&
                                        !srcLower.includes('spinner') &&
                                        !srcLower.includes('tracking')) {
                                        images.push({src, alt});
                                    }
                                }
                            }
                        });
                        
                        const uniqueImages = [];
                        const seenSrc = new Set();
                        for (const img of images) {
                            if (!seenSrc.has(img.src)) {
                                seenSrc.add(img.src);
                                uniqueImages.push(img);
                            }
                        }
                        const topImages = uniqueImages.slice(0, 20);
                        
                        if (topImages.length > 0 && urls.length === 1) {
                            scrapedImages = topImages.slice(0, 10).map(img => img.src); // Take top 10 for display
                        }
                        
                        $('script, style, noscript, iframe, svg, nav, footer, header').remove();
                        const textContent = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
                        if (textContent) {
                            urlScrapedContent += `\n--- Extracted Web Content from ${urls[i]} ---\n`;
                            urlScrapedContent += `${textContent}\n`;
                            if (topImages.length > 0) {
                                urlScrapedContent += `\nAvailable Images from this URL that you can show to the user using Markdown (![alt](url)) if they ask for photos/images:\n`;
                                topImages.forEach(img => urlScrapedContent += `- URL: ${img.src} | Description/Alt: ${img.alt || 'No description'}\n`);
                            }
                            urlScrapedContent += `--- End Web Content ---\n`;
                        }
                    }
                } catch(e) {
                   console.log("Failed to fetch URL", urls[i], e);
                }
            }
        }
    }

    if (urlScrapedContent) {
        systemPrompt.content += `\n\nCRITICAL CONTEXT:\nThe user shared the following web link(s). I have automatically scraped their textual content and image URLs for you. Read it and answer based on this content. IMPORTANT: If there are "Available Images" in the scraped content, you MUST include at least 1 to 3 of them in your response using markdown syntax (e.g. ![Image](url)) so the user can see what the webpage looks like.\n\n${urlScrapedContent.substring(0, 15000)}`;
    }

    // Determine whether web search plugin should be triggered
    const enableWebSearch = shouldTriggerWebSearch(lastUserText, req.body.webSearch);

    // Primary execution via OpenRouter API with multi-model fallback (Llama 3.3 70B, DeepSeek R1, Qwen 2.5, MiniMax, Gemini via OpenRouter)
    let reply = "";
    let openRouterModel = (req.body.model && req.body.model.includes('/')) 
      ? req.body.model 
      : "openrouter/free";
    let finalMessages = [];

    if (hasImage) {
      let combinedText = "System Instructions:\n" + systemPrompt.content + "\n\n";
      const visionConstraint = "Analyze the provided image with high precision. Isolate and parse text, mathematical formulas, and symbols pixel-by-pixel. Do NOT merge context or memory from previously analyzed images. Avoid hallucinating unread text or complex equations. Always restrict your analysis strictly to the provided image. Focus on high-precision object detection first, then extract fine details without guessing.";
      const visionInstruction = language === 'bn' ? 
          `Analyze the provided image with high precision. Isolate and parse text, mathematical formulas, and symbols pixel-by-pixel. Do NOT merge context or memory from previously analyzed images. Avoid hallucinating unread text or complex equations. ব্যবহারকারী বাংলায় প্রশ্ন করলে বাংলায় উত্তর দাও। ছবিটি ভালোভাবে দেখে তারপর উত্তর দাও। ছবিতে যা সত্যিই দেখা যাচ্ছে শুধু সেটির ভিত্তিতে উত্তর দাও। নিশ্চিত না হলে অনুমান করো না; পরিষ্কারভাবে বলো যে বিষয়টি অস্পষ্ট। ${visionConstraint}` : 
          `You are a highly accurate visual analysis assistant. Analyze the provided image with high precision. Isolate and parse text, mathematical formulas, and symbols pixel-by-pixel. Do NOT merge context or memory from previously analyzed images. Avoid hallucinating unread text or complex equations. Base your answer only on information actually visible in the image. Do not guess, hallucinate, or invent objects, text, people, colors, or details that are not visible. If something is unclear or unreadable, explicitly say that it is unclear. When the user asks about text in the image, carefully inspect and transcribe only the visible text. ${visionConstraint}`;
      combinedText += "Vision Instructions:\n" + visionInstruction + "\n\n";
      
      let allImages = [];
      let historyText = "";
      for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          const role = m.role === 'user' ? 'User' : 'Assistant';
          if (Array.isArray(m.content)) {
              let textPart = "";
              for (const c of m.content) {
                  if (c.type === 'text') textPart += c.text + " ";
                  if (c.type === 'image_url') allImages.push(c.image_url.url);
              }
              historyText += `${role}: ${textPart}\n\n`;
          } else {
              historyText += `${role}: ${m.content}\n\n`;
          }
      }
      combinedText += "Chat History:\n" + historyText;

      let finalContent: any[] = [{ type: "text", text: combinedText }];
      for (const imgUrl of allImages) {
          if (!imgUrl || !imgUrl.startsWith('data:image/')) {
              return res.status(400).json({ error: language === 'bn' ? "আমি ছবিটি ঠিকভাবে পাইনি। অনুগ্রহ করে ছবিটি আবার upload করুন।" : "Image data is missing or invalid. Please upload the image again." });
          }
          finalContent.push({ type: "image_url", image_url: { url: imgUrl } });
      }
      finalMessages = [{ role: "user", content: finalContent }];
    } else {
      finalMessages = [systemPrompt, ...messages];
    }

    const isStreamingRequested = req.headers.accept?.includes("text/event-stream") || req.body.stream !== false;

    if (isStreamingRequested) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ status: language === 'bn' ? "নেক্সারা এআই ভাবছে..." : "Nexara AI is thinking..." })}\n\n`);

      try {
        reply = await callOpenRouter(
          openRouterModel, 
          finalMessages, 
          temperature !== undefined ? temperature : 0.7, 
          apiKey,
          (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          },
          (status, tool) => {
            res.write(`data: ${JSON.stringify({ status, tool })}\n\n`);
          },
          enableWebSearch
        );
      } catch (openRouterErr: any) {
        let cleanErr = parseApiError(openRouterErr);
        console.warn("OpenRouter API streaming error:", cleanErr);

        const isCustomKey = !!(apiKey && apiKey.startsWith("sk-or-"));
        if (cleanErr.includes("429") || cleanErr.toLowerCase().includes("rate limit") || cleanErr.includes("free-models-per-day") || cleanErr.toLowerCase().includes("quota")) {
          if (!isCustomKey) {
            cleanErr = language === 'bn'
              ? "নেক্সারা এআই এর জন্য নির্ধারিত ফ্রি ওপেনরাউটার দৈনিক রিকোয়েস্ট সীমা কোটা শেষ হয়ে গেছে। নিরবচ্ছিন্নভাবে কথা বলতে সেটিংস (Settings ⚙️) পেজ থেকে আপনার নিজের OpenRouter API Key টি সেট করুন।"
              : "The default OpenRouter daily free quota has been reached. Please add your own OpenRouter API Key in Settings (⚙️) to continue chatting seamlessly.";
          } else {
            cleanErr = language === 'bn'
              ? "আপনার OpenRouter API Key-এর রিকোয়েস্ট সীমা বা কোটা শেষ হয়ে গেছে। দয়া করে আপনার OpenRouter ক্রেডিট চেক করুন।"
              : "Your custom OpenRouter API key rate limit or quota has been exceeded. Please check your OpenRouter credits.";
          }
        }
        res.write(`data: ${JSON.stringify({ error: cleanErr })}\n\n`);
        return res.end();
      }

      if (scrapedImages.length > 0) {
        let imgBlock = `\n\n---\n### 🖼️ Website Images (Scraped)\n\n`;
        let addedCount = 0;
        for (const img of scrapedImages) {
            if (!reply.includes(img)) {
                imgBlock += `![Website Scraped Image](${img})\n\n`;
                addedCount++;
            }
        }
        if (addedCount > 0) {
            reply += imgBlock;
            res.write(`data: ${JSON.stringify({ chunk: imgBlock })}\n\n`);
        }
      }

      reply = sanitizeResponseText(reply);
      res.write(`data: ${JSON.stringify({ done: true, reply })}\n\n`);
      return res.end();
    } else {
      // Non-streaming JSON fallback
      try {
        reply = await callOpenRouter(openRouterModel, finalMessages, temperature !== undefined ? temperature : 0.7, apiKey, undefined, undefined, enableWebSearch);
      } catch (openRouterErr: any) {
        const cleanErr = parseApiError(openRouterErr);
        console.warn("OpenRouter API call failed:", cleanErr);
        throw new Error(cleanErr);
      }

      if (scrapedImages.length > 0) {
        let imgBlock = `\n\n---\n### 🖼️ Website Images (Scraped)\n\n`;
        let addedCount = 0;
        for (const img of scrapedImages) {
            if (!reply.includes(img)) {
                imgBlock += `![Website Scraped Image](${img})\n\n`;
                addedCount++;
            }
        }
        if (addedCount > 0) {
            reply += imgBlock;
        }
      }
      reply = sanitizeResponseText(reply);
      return res.json({ reply });
    }
  } catch (error: any) {
    console.error("API Error:", error);
    const parsedErr = parseApiError(error);
    const isCustomKey = !!(req.body.apiKey && typeof req.body.apiKey === "string" && req.body.apiKey.startsWith("sk-or-"));
    
    let errorMessage = parsedErr || "Failed to fetch AI response";
    if (parsedErr.includes("API key not valid") || parsedErr.includes("Invalid API Key")) {
      errorMessage = req.body.language === 'bn' 
        ? "আপনার API Key টি সঠিক নয়। দয়া করে সেটিংস থেকে সঠিক Key যুক্ত করুন।"
        : "The API key is invalid. Please check your Settings.";
    } else if (parsedErr.includes("429") || parsedErr.includes("RESOURCE_EXHAUSTED") || parsedErr.includes("quota") || parsedErr.toLowerCase().includes("rate limit") || parsedErr.includes("free-models-per-day")) {
      if (!isCustomKey) {
        errorMessage = req.body.language === 'bn' 
          ? "নেক্সারা এআই এর জন্য নির্ধারিত ফ্রি ওপেনরাউটার দৈনিক রিকোয়েস্ট সীমা কোটা শেষ হয়ে গেছে। নিরবচ্ছিন্নভাবে কথা বলতে সেটিংস (Settings ⚙️) পেজ থেকে আপনার নিজের OpenRouter API Key টি সেট করুন।" 
          : "The default OpenRouter daily free quota has been reached. Please add your own OpenRouter API Key in Settings (⚙️) to continue chatting seamlessly.";
      } else {
        errorMessage = req.body.language === 'bn'
          ? "আপনার OpenRouter API Key-এর রিকোয়েস্ট সীমা বা কোটা শেষ হয়ে গেছে। দয়া করে আপনার OpenRouter ক্রেডিট চেক করুন।"
          : "Your custom OpenRouter API key rate limit or quota has been exceeded. Please check your OpenRouter credits.";
      }
    }

    if (error?.status === 503 || parsedErr.includes("503")) {
      return res.status(503).json({ error: "The AI model is currently experiencing high demand and is temporarily unavailable. Please try again in a few minutes." });
    }
    
    res.status(error?.status || 500).json({ error: errorMessage });
  }
});

// Catch-all route for /api/* to ensure we always return JSON instead of falling back to HTML SPA
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
