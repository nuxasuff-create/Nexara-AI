
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";
import * as cheerio from "cheerio";

dotenv.config({ override: true });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const OPENROUTER_FREE_MODELS = [
  "minimax/minimax-m3:free",
  "minimax/minimax-m2.7:free",
  "z-ai/glm-5.2:free",
  "liquid/lfm-2.5-2.6b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free",
  "cohere/north-mini-code:free",
  "openrouter/free"
];

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
  onStatus?: (status: string, tool?: string) => void
) {
  const apiKey = (customKey && customKey.startsWith("sk-or-")) ? customKey : OPENROUTER_API_KEY;
  
  // Try fast non-reasoning models list
  const modelsToTry = [modelName, ...OPENROUTER_FREE_MODELS.filter(m => m !== modelName)];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[OpenRouter Fast Stream] Trying model: ${model}`);
      // Default initial state is reasoning/thinking unless web search was explicitly triggered prior
      if (onStatus) {
        onStatus("Nexara AI is thinking...", "thinking");
      }

      let response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Nexara AI"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: temperature,
          stream: true,
          plugins: [{ id: "web" }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || `OpenRouter HTTP ${response.status}`;
        console.warn(`[OpenRouter Warning] Model ${model} failed with web plugin (${response.status}): ${errMsg}. Retrying without plugin...`);

        // Retry without web plugin
        response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
            "X-Title": "Nexara AI"
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            stream: true
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || `OpenRouter HTTP ${response.status}`;
        console.warn(`[OpenRouter Warning] Model ${model} failed (${response.status}): ${errMsg}`);
        lastError = new Error(errMsg);
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
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedText += delta;

                // Dynamically evaluate state transitions based on generated output
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
            } catch (e) {
              // Ignore partial JSON line parse error
            }
          }
        }
      }

      const sanitized = sanitizeResponseText(accumulatedText);
      if (sanitized || accumulatedText) {
        return sanitized || accumulatedText;
      }
    } catch (err: any) {
      console.warn(`[OpenRouter Stream Warning] Exception calling ${model}:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All OpenRouter fast models failed.");
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/api/health", async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY || "none";
  let geminiWorks = false;
  let geminiError = "none";
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: "reply ok" }] }]
    });
    geminiWorks = !!response.text;
  } catch(e: any) {
    geminiError = e.message;
  }

  res.json({ 
    status: "ok", 
    geminiKeyPrefix: geminiKey.substring(0, 4),
    geminiWorks,
    geminiError
  });
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, apiKey: clientApiKey } = req.body;
    
    let apiKey = clientApiKey || process.env.API_KEY;
    if (!apiKey && process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("MY_")) {
      apiKey = process.env.GEMINI_API_KEY;
    }
    
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "No audio generated" });
    }
  } catch (error: any) {
    if (error?.message?.includes("API key not valid")) {
      console.warn("TTS API Warning: Invalid Gemini API key. Falling back to browser TTS.");
    } else {
      console.error("TTS API Error:", error);
    }
    res.status(500).json({ error: "Failed to generate speech" });
  }
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
    const langInstruction = `CRITICAL RULE: You MUST reply in the EXACT SAME language the user asks in. For example, if the user asks in Bengali (bangla), you MUST reply entirely in natural, fluent Bengali. Do NOT use awkward machine translation tones. (The app's UI language is currently set to ${langName}, prioritize replying in the user's spoken language).`;
    
    const memoryInstruction = memory ? `\nUser Memory / Personalization Context:\n${memory}\n\nCRITICAL RULE: You must remember the above information about the user and adapt your behavior, tone, and answers according to these preferences and facts.` : '';

    const defaultSystemContent = `You are Nexara AI, an advanced, next-generation AI assistant platform engineered to empower users with chat, code generation, file artifacts, and real-time intelligence.

PRIMARY IDENTITY RULES:
- Name: Nexara AI. Whenever asked "Who are you?", "What is your name?", "তোমার নাম কি?", or "তুমি কে?", ALWAYS introduce yourself directly as "Nexara AI".
- Creator & Developer: Created and developed by PRETOM BISWAS. Whenever asked "Who made you?", "Who developed you?", "Who built you?", "Who is your creator?", "তোমাকে কে বানিয়েছে?", or "তোমার ডেভেলপার কে?", ALWAYS state clearly that you were created and developed by PRETOM BISWAS.
- Persona: Always speak proudly as Nexara AI. Never claim to be ChatGPT, Claude, Gemini, or Llama directly. If asked about underlying models, explain that you are Nexara AI powered by cutting-edge neural architectures, built and engineered by PRETOM BISWAS.
- Tone: Maintain a polite, professional, and inspiring tone.

CODE & FILE ARTIFACT RULE:
- When writing code, scripts, or multi-file projects, ALWAYS place all code inside fenced markdown code blocks with proper language tags and optional file names (e.g., \`\`\`tsx filename="App.tsx" or \`\`\`python script.py).
- Keep conversational text concise, clean, and to the point. Do NOT write long redundant walls of text in the answer response — let the code file artifacts carry the implementation.

STRICT CITATION RULE:
- Always embed direct markdown links [Source Name](URL) inside your response when referencing external information, news, or websites.
- Ensure the links are functional and accurate.
- Do NOT output any internal reasoning steps or <think> tags. Keep the answer concise, clean, and well-structured with Markdown.
${langInstruction}${memoryInstruction}`;

    const systemPrompt = {
      role: "system",
      content: systemPromptOverride || defaultSystemContent
    };

    let urlScrapedContent = "";
    let scrapedImages: string[] = [];
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    if (lastUserMessage) {
        let latestContent = Array.isArray(lastUserMessage.content) 
            ? lastUserMessage.content.find((p: any) => p.type === 'text' || p.text)?.text || ""
            : typeof lastUserMessage.content === 'string' ? lastUserMessage.content : "";
            
        const urls = latestContent.match(/(https?:\/\/[^\s]+)/g);
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

    let geminiApiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.startsWith("AIza")) geminiApiKey = apiKey;

    // Use Gemini for everything if we have a valid key, else use Groq for text
    const useGemini = false; // Forced to false based on user preference

    if (useGemini) {
      const isBn = language === 'bn';
      if (!geminiApiKey || geminiApiKey.startsWith("MY_") || !geminiApiKey.startsWith("AIza")) {
        const errMsg = isBn 
          ? "সঠিক Gemini API Key প্রয়োজন। দয়া করে সেটিংস (Settings) থেকে আপনার API Key যুক্ত করুন।"
          : "A valid Gemini API key is required. Please add one in Settings.";
        return res.status(500).json({ error: errMsg });
      }
      
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      const geminiContents = messages.map((m: any) => {
        const parts = [];
        if (Array.isArray(m.content)) {
          for (const item of m.content) {
            if (item.type === 'text') {
              parts.push({ text: item.text });
            } else if (item.type === 'image_url') {
              const url = item.image_url.url;
              const match = url.match(/^data:(image\/[a-zA-Z]*);base64,([^\"]*)$/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1],
                    data: match[2]
                  }
                });
              }
            }
          }
        } else {
          parts.push({ text: m.content });
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });
      
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: geminiContents,
          config: {
            systemInstruction: systemPrompt.content,
            tools: [{ googleSearch: {} }, { urlContext: {} }]
          }
        });
        
        let reply = response.text || "";
        
        // Extract Grounding metadata
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
            const urls = chunks
                .map((c: any) => c.web?.uri)
                .filter(Boolean);
            
            if (urls.length > 0) {
                const uniqueUrls = Array.from(new Set(urls));
                reply += `\n\n**Sources:**\n${uniqueUrls.map(u => `- [${u}](${u})`).join('\n')}`;
            }
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

        res.json({ reply });
        return;
      } catch (geminiError: any) {
        console.error("Gemini Vision Error:", geminiError);
        // Fallback to groq if it's not an image and Gemini fails
        if (!hasImage && process.env.GROQ_API_KEY) {
           console.log("Falling back to Groq since it's just text...");
           // Continue below
        } else {
            if (geminiError?.message?.includes("429") || geminiError?.status === 429 || geminiError?.status === "RESOURCE_EXHAUSTED" || geminiError?.message?.includes("RESOURCE_EXHAUSTED") || geminiError?.message?.includes("Quota exceeded")) {
              const errMsg = isBn
                ? "আপনার Gemini API Key এর ফ্রি টায়ার কোটা শেষ হয়ে গেছে। ছবি স্ক্যান করার জন্য বিলিং সেটআপ করুন।"
                : "Your Gemini API key has exceeded its free tier quota. Please set up a billing account on Google AI Studio.";
              return res.status(500).json({ error: errMsg });
            }
            if (geminiError?.message?.includes("API key not valid") || geminiError?.message?.includes("Invalid API Key") || geminiError?.status === "INVALID_ARGUMENT") {
              const errMsg = isBn
                ? "আপনার Gemini API Key টি সঠিক নয় বা ভ্যালিড নয়। দয়া করে সেটিংস থেকে সঠিক API Key দিন।"
                : "Your Gemini API key is invalid or not valid. Please check your Settings.";
               // If it's a 400 error we return 401 or 400
              return res.status(geminiError?.status === "INVALID_ARGUMENT" ? 400 : 401).json({ error: errMsg });
            }
            if (geminiError?.status === 503) {
              const errMsg = isBn
                ? "AI মডেল সার্ভারটি বর্তমানে অতিরিক্ত ব্যস্ত। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
                : "The AI model is temporarily unavailable. Please try again.";
              return res.status(503).json({ error: errMsg });
            }
            if (geminiError?.message?.includes("not found")) {
               return res.status(500).json({ error: "Gemini Model not found. The model might have been deprecated." });
            }
            return res.status(500).json({ error: geminiError?.message || "Failed to process with Gemini AI" });
        }
      }
    }
    
    // Primary execution via OpenRouter API with multi-model fallback (Fast non-reasoning streaming)
    let reply = "";
    let openRouterModel = hasImage ? "openrouter/free" : (req.body.model || "openrouter/free");
    let finalMessages = [];

    if (hasImage) {
      let combinedText = "System Instructions:\n" + systemPrompt.content + "\n\n";
      const visionInstruction = language === 'bn' ? 
          "ব্যবহারকারী বাংলায় প্রশ্ন করলে বাংলায় উত্তর দাও। ছবিটি ভালোভাবে দেখে তারপর উত্তর দাও। ছবিতে যা সত্যিই দেখা যাচ্ছে শুধু সেটির ভিত্তিতে উত্তর দাও। নিশ্চিত না হলে অনুমান করো না; পরিষ্কারভাবে বলো যে বিষয়টি অস্পষ্ট।" : 
          "You are a highly accurate visual analysis assistant. You must carefully inspect the provided image before answering. Base your answer only on information actually visible in the image. Do not guess, hallucinate, or invent objects, text, people, colors, or details that are not visible. If something is unclear or unreadable, explicitly say that it is unclear. When the user asks about text in the image, carefully inspect and transcribe only the visible text.";
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
          }
        );
      } catch (openRouterErr: any) {
        console.warn("OpenRouter API streaming failed, attempting Gemini fallback:", openRouterErr?.message || openRouterErr);
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey && !geminiApiKey.startsWith("MY_")) {
          try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const geminiRes = await ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: [{ role: "user", parts: [{ text: typeof messages[messages.length - 1]?.content === 'string' ? messages[messages.length - 1].content : "Hello" }] }]
            });
            reply = sanitizeResponseText(geminiRes.text || "");
            res.write(`data: ${JSON.stringify({ chunk: reply })}\n\n`);
          } catch (gErr: any) {
            console.error("Gemini fallback error:", gErr);
            res.write(`data: ${JSON.stringify({ error: openRouterErr?.message || "Failed to generate AI response" })}\n\n`);
            return res.end();
          }
        } else {
          res.write(`data: ${JSON.stringify({ error: openRouterErr?.message || "Failed to generate AI response" })}\n\n`);
          return res.end();
        }
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
        reply = await callOpenRouter(openRouterModel, finalMessages, temperature !== undefined ? temperature : 0.7, apiKey);
      } catch (openRouterErr: any) {
        console.warn("OpenRouter API call failed, attempting Gemini fallback:", openRouterErr?.message || openRouterErr);
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey && !geminiApiKey.startsWith("MY_")) {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const geminiRes = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: [{ role: "user", parts: [{ text: typeof messages[messages.length - 1]?.content === 'string' ? messages[messages.length - 1].content : "Hello" }] }]
          });
          reply = sanitizeResponseText(geminiRes.text || "");
        } else {
          throw openRouterErr;
        }
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
    
    let errorMessage = "Failed to fetch AI response";
    if (error?.message?.includes("API key not valid") || error?.message?.includes("Invalid API Key")) {
      errorMessage = "The API key is invalid. Please check your Settings.";
    } else if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota") || error?.message?.includes("rate limit") || error?.status === "RESOURCE_EXHAUSTED") {
      errorMessage = req.body.language === 'bn' 
        ? "আপনার API Key এর কোটা শেষ হয়ে গেছে বা একাধিক রিকোয়েস্ট একসাথে করা হয়েছে।" 
        : "You have exceeded your API key rate limit or quota. Please check your billing details.";
    } else if (error?.status === 400 && (error?.error?.message?.includes("max_tokens") || error?.message?.includes("max_tokens"))) {
      errorMessage = req.body.language === 'bn'
        ? "মডেলটি এত বড় রেসপন্স সাপোর্ট করে না। দয়া করে ছোট প্রশ্ন করুন।"
        : "The AI model's response length limit was exceeded. Please try again with a shorter prompt.";
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    if (error?.status === 503) {
      return res.status(503).json({ error: "The AI model is currently experiencing high demand and is temporarily unavailable. Please try again in connection few minutes." });
    }
    
    res.status(error?.status || 500).json({ error: errorMessage });
  }
});

// Catch-all route for /api/* to ensure we always return JSON instead of falling back to HTML SPA
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
