"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { tryGetPublicApiBaseUrl } from "@/lib/publicApiBase";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen p-6">
      <div className="text-sm text-muted-foreground">Загрузка документации…</div>
    </div>
  ),
});

export default function DocsPage() {
  const explicit = process.env.NEXT_PUBLIC_SWAGGER_URL?.trim();
  const baseUrl = tryGetPublicApiBaseUrl();
  const specUrl = explicit || (baseUrl ? `${baseUrl}/swagger/doc.json` : "");

  if (!specUrl) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-sm text-muted-foreground">
          Swagger URL is not configured. Set `NEXT_PUBLIC_SWAGGER_URL` or a valid external `NEXT_PUBLIC_API_BASE_URL`.
        </div>
      </div>
    );
  }

  return <SwaggerUI url={specUrl} />;
}

