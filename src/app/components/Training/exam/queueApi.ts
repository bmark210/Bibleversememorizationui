import { OpenAPI } from "@/api/core/OpenAPI";
import type { QueueResponse } from "./types";

function baseUrl() {
  return OpenAPI.BASE || "";
}

export async function fetchVerseQueue(params: {
  telegramId: string;
  translation?: string;
}): Promise<QueueResponse> {
  const url = new URL(
    `${baseUrl()}/api/users/${params.telegramId}/verses/queue`,
  );
  if (params.translation) {
    url.searchParams.set("translation", params.translation);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`fetchVerseQueue failed: ${res.status}`);
  }
  return res.json();
}

export async function addVerseToQueue(params: {
  telegramId: string;
  externalVerseId: string;
}): Promise<{ status: string; queueCount?: number; canAddMore?: boolean }> {
  const res = await fetch(
    `${baseUrl()}/api/users/${params.telegramId}/verses/queue`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalVerseId: params.externalVerseId }),
    },
  );
  if (!res.ok) {
    throw new Error(`addVerseToQueue failed: ${res.status}`);
  }
  return res.json();
}

export async function reorderVerseInQueue(params: {
  telegramId: string;
  externalVerseId: string;
  queuePosition: number;
}): Promise<{ status: string }> {
  const res = await fetch(
    `${baseUrl()}/api/users/${params.telegramId}/verses/${params.externalVerseId}/queue`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queuePosition: params.queuePosition }),
    },
  );
  if (!res.ok) {
    throw new Error(`reorderVerseInQueue failed: ${res.status}`);
  }
  return res.json();
}

export async function removeVerseFromQueue(params: {
  telegramId: string;
  externalVerseId: string;
}): Promise<{ status: string }> {
  const res = await fetch(
    `${baseUrl()}/api/users/${params.telegramId}/verses/${params.externalVerseId}/queue`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(`removeVerseFromQueue failed: ${res.status}`);
  }
  return res.json();
}
