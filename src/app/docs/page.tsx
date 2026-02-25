"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background p-6">
      <div className="text-sm text-muted-foreground">Загрузка документации…</div>
    </div>
  ),
});

export default function DocsPage() {
  return <SwaggerUI url="/api/docs" />;
}

