"use client";

import React from "react";
import { Mail, Send } from "lucide-react";
import { useTelegram } from "../contexts/TelegramContext";
import { openTelegramLink } from "@/app/hooks/useTelegramWebApp";
import { toast } from "@/app/lib/toast";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "./ui/utils";

const FEEDBACK_EMAIL = "markbaltenko@gmail.com";
const MAX_FEEDBACK_LENGTH = 500;

type FeedbackProps = {
  telegramId?: string | null;
};

function buildFeedbackMailto(params: {
  text: string;
  telegramId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const displayName = [params.firstName, params.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const bodyLines = [
    params.text,
    "",
    "---",
    "Данные пользователя:",
    displayName ? `Имя: ${displayName}` : null,
    params.username ? `Username: @${params.username}` : null,
    params.telegramId ? `Telegram ID: ${params.telegramId}` : null,
  ].filter(Boolean);

  const subject = "Bible Memory — отзыв";
  const body = bodyLines.join("\n");

  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function Feedback({ telegramId = null }: FeedbackProps) {
  const { user } = useTelegram();
  const [text, setText] = React.useState("");

  const trimmedText = text.trim();
  const remainingChars = MAX_FEEDBACK_LENGTH - text.length;
  const canSubmit =
    trimmedText.length > 0 && text.length > 0 && text.length <= MAX_FEEDBACK_LENGTH;

  const handleSubmit = React.useCallback(() => {
    if (!trimmedText) {
      toast.warning("Введите сообщение", {
        label: "Обратная связь",
      });
      return;
    }

    if (text.length > MAX_FEEDBACK_LENGTH) {
      toast.warning(`Максимум ${MAX_FEEDBACK_LENGTH} символов`, {
        label: "Обратная связь",
      });
      return;
    }

    const mailtoUrl = buildFeedbackMailto({
      text: trimmedText,
      telegramId,
      firstName: user?.firstName,
      lastName: user?.lastName,
      username: user?.username,
    });

    openTelegramLink(mailtoUrl);

    toast.success("Письмо подготовлено", {
      label: "Обратная связь",
      description: FEEDBACK_EMAIL,
    });
  }, [telegramId, text.length, trimmedText, user?.firstName, user?.lastName, user?.username]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[1.2rem] border border-border-subtle bg-bg-elevated/70 px-3.5 py-3 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-text-secondary">
            <Mail className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-medium text-text-primary">
              Напишите, что стоит улучшить
            </div>
            <p className="mt-1 text-xs leading-5 text-text-muted sm:text-sm">
              После нажатия откроется почтовое приложение с письмом на{" "}
              <span className="font-medium text-text-primary">
                {FEEDBACK_EMAIL}
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Опишите экран, действие и что ожидали увидеть."
        maxLength={MAX_FEEDBACK_LENGTH}
        className="min-h-[132px] rounded-[1.25rem] border-border-subtle bg-bg-surface shadow-none"
      />

      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "text-xs",
            remainingChars < 120 ? "text-state-warning" : "text-text-muted",
          )}
        >
          {remainingChars} симв.
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-11 rounded-full px-4"
        >
          <Send className="h-4 w-4" />
          Отправить на почту
        </Button>
      </div>
    </div>
  );
}
