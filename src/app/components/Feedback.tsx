"use client";

import React from "react";
import { Send } from "lucide-react";
import { useTelegram } from "../contexts/TelegramContext";
import { openTelegramLink } from "@/app/hooks/useTelegramWebApp";
import { toast } from "@/app/lib/toast";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "./ui/utils";

const FEEDBACK_EMAIL = "markbaltenko@gmail.com";
const MAX_LENGTH = 500;

type FeedbackProps = { telegramId?: string | null };

function buildMailto(params: {
  text: string;
  telegramId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const displayName = [params.firstName, params.lastName].filter(Boolean).join(" ").trim();
  const body = [
    params.text,
    "",
    "---",
    displayName        ? `Имя: ${displayName}`            : null,
    params.username    ? `Username: @${params.username}`  : null,
    params.telegramId  ? `Telegram ID: ${params.telegramId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Bible Memory — отзыв")}&body=${encodeURIComponent(body)}`;
}

export function Feedback({ telegramId = null }: FeedbackProps) {
  const { user } = useTelegram();
  const [text, setText] = React.useState("");

  const trimmed = text.trim();
  const remaining = MAX_LENGTH - text.length;
  const canSubmit = trimmed.length > 0 && text.length <= MAX_LENGTH;

  const handleSubmit = React.useCallback(() => {
    if (!trimmed) {
      toast.warning("Введите сообщение", { label: "Обратная связь" });
      return;
    }
    openTelegramLink(
      buildMailto({
        text: trimmed,
        telegramId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        username: user?.username,
      }),
    );
    toast.success("Письмо подготовлено", {
      label: "Обратная связь",
      description: FEEDBACK_EMAIL,
    });
  }, [telegramId, trimmed, user]);

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
      {/* textarea stretches to fill all available height in the card */}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Баг, неудобство или идея — любые мысли приветствуются…"
        maxLength={MAX_LENGTH}
        className="flex-1 h-full min-h-0 rounded-[1.25rem] border-border-subtle bg-bg-surface shadow-none resize-none"
      />

      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className={cn("text-xs", remaining < 120 ? "text-state-warning" : "text-text-muted")}>
          {remaining} симв.
        </span>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-10 rounded-full px-4 gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          Отправить
        </Button>
      </div>
    </div>
  );
}
