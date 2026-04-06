"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { getPublicApiBaseUrl } from "@/lib/publicApiBase";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen p-6">
      <div className="text-sm text-muted-foreground">Загрузка документации…</div>
    </div>
  ),
});

const FALLBACK_API_BASE = "https://bible-memory-db-production.up.railway.app";

export default function DocsPage() {
  const explicit = process.env.NEXT_PUBLIC_SWAGGER_URL?.trim();
  const specUrl =
    explicit ||
    `${getPublicApiBaseUrl() || FALLBACK_API_BASE}/swagger/doc.json`;
  return <SwaggerUI url={specUrl} />;
}

