"use client";

import React from "react";
import { Send } from "lucide-react";
import { useTelegram } from "../contexts/TelegramContext";
import {
  FEEDBACK_EMAIL,
  MAX_FEEDBACK_LENGTH,
} from "@/app/lib/feedbackConfig";
import { toast } from "@/app/lib/toast";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "./ui/utils";

type FeedbackProps = { telegramId?: string | null };

export function Feedback({ telegramId = null }: FeedbackProps) {
  const { user } = useTelegram();
  const [text, setText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const trimmed = text.trim();
  const remaining = MAX_FEEDBACK_LENGTH - text.length;
  const canSubmit =
    !isSubmitting &&
    trimmed.length > 0 &&
    text.length <= MAX_FEEDBACK_LENGTH;

  const handleSubmit = React.useCallback(async () => {
    if (!trimmed) {
      toast.warning("Введите сообщение", { label: "Обратная связь" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          telegramId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; recipient?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.message ??
            "Не удалось отправить сообщение. Попробуйте ещё раз.",
        );
      }

      setText("");
      toast.success("Сообщение отправлено", {
        label: "Обратная связь",
        description: payload?.recipient ?? FEEDBACK_EMAIL,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось отправить сообщение. Попробуйте ещё раз.";
      console.error("Не удалось отправить сообщение", error);
      toast.error(message, {
        label: "Обратная связь",
        description: FEEDBACK_EMAIL,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [telegramId, trimmed, user]);

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
      {/* textarea stretches to fill all available height in the card */}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Баг, неудобство или идея — любые мысли приветствуются…"
        maxLength={MAX_FEEDBACK_LENGTH}
        disabled={isSubmitting}
        className="flex-1 h-full min-h-0 rounded-[1.25rem] border-border-subtle bg-bg-surface shadow-none resize-none"
      />

      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className={cn("text-xs", remaining < 120 ? "text-state-warning" : "text-text-muted")}>
          {remaining} симв.
        </span>

        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="h-10 rounded-full px-4 gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {isSubmitting ? "Отправляем..." : "Отправить"}
        </Button>
      </div>
    </div>
  );
}
