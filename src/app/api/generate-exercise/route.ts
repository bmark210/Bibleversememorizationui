import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type ImpostorWordData = {
  original: string;
  modified: string;
  changedWord: string;
  correctWord: string;
  wordIndex: number;
};

// Simple in-memory cache with TTL
const cache = new Map<string, { data: ImpostorWordData; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(mode: string, verseText: string): string {
  return `${mode}:${verseText}`;
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 503 },
    );
  }

  let body: { mode: string; verseText: string; verseReference: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mode, verseText, verseReference } = body;
  if (!mode || !verseText) {
    return NextResponse.json(
      { error: "mode and verseText required" },
      { status: 400 },
    );
  }

  if (mode !== "impostor-word") {
    return NextResponse.json(
      { error: `Unknown mode: ${mode}` },
      { status: 400 },
    );
  }

  // Check cache
  const cacheKey = getCacheKey(mode, verseText);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ mode, data: cached.data });
  }

  const prompt = `Ты помощник для приложения запоминания Библейских стихов.
Стих: "${verseText}" (${verseReference})

Замени ОДНО слово на похожее по смыслу но НЕВЕРНОЕ.
Не меняй имена собственные, союзы или предлоги.
Выбери значимое слово (существительное, глагол, прилагательное).

Ответь строго в JSON формате:
{"original": "...", "modified": "...", "changedWord": "неверное_слово", "correctWord": "правильное_слово", "wordIndex": N}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 256,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: "AI service error" },
        { status: 502 },
      );
    }

    const geminiResponse = await res.json();
    const textContent =
      geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 502 },
      );
    }

    const data: ImpostorWordData = JSON.parse(textContent);
    if (!data.modified || !data.changedWord || !data.correctWord) {
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 502 },
      );
    }

    // Cache the result
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    // Evict old entries periodically
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (val.expiresAt <= now) cache.delete(key);
      }
    }

    return NextResponse.json({ mode, data });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "AI request timeout" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 502 },
    );
  }
}
