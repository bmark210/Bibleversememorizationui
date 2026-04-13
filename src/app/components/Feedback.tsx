"use client";

import React from "react";
import Image from "next/image";
import { ImagePlus, Send, X } from "lucide-react";
import { useTelegram } from "../contexts/TelegramContext";
import {
  FEEDBACK_ATTACHMENT_FIELD,
  FEEDBACK_EMAIL,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  MAX_FEEDBACK_LENGTH,
} from "@/app/lib/feedbackConfig";
import { toast } from "@/app/lib/toast";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "./ui/utils";

type FeedbackProps = { telegramId?: string | null };

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Feedback({ telegramId = null }: FeedbackProps) {
  const { user } = useTelegram();
  const [text, setText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] =
    React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const trimmed = text.trim();
  const remaining = MAX_FEEDBACK_LENGTH - text.length;
  const canSubmit =
    !isSubmitting &&
    trimmed.length > 0 &&
    text.length <= MAX_FEEDBACK_LENGTH;

  React.useEffect(() => {
    if (!attachment) {
      setAttachmentPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(attachment);
    setAttachmentPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [attachment]);

  const clearAttachment = React.useCallback(() => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleAttachmentChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextAttachment = event.target.files?.[0] ?? null;

      if (!nextAttachment) {
        return;
      }

      if (!nextAttachment.type.startsWith("image/")) {
        toast.warning("Можно прикрепить только фотографию", {
          label: "Обратная связь",
        });
        event.target.value = "";
        return;
      }

      if (nextAttachment.size > FEEDBACK_MAX_ATTACHMENT_BYTES) {
        toast.warning("Фотография слишком большая", {
          label: "Обратная связь",
          description: "Максимум 10 MB",
        });
        event.target.value = "";
        return;
      }

      setAttachment(nextAttachment);
    },
    [],
  );

  const handleSubmit = React.useCallback(async () => {
    if (!trimmed) {
      toast.warning("Введите сообщение", { label: "Обратная связь" });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("message", trimmed);
      if (telegramId) {
        formData.set("telegramId", telegramId);
      }
      if (user?.firstName) {
        formData.set("firstName", user.firstName);
      }
      if (user?.lastName) {
        formData.set("lastName", user.lastName);
      }
      if (user?.username) {
        formData.set("username", user.username);
      }
      if (attachment) {
        formData.set(FEEDBACK_ATTACHMENT_FIELD, attachment, attachment.name);
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
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
      clearAttachment();
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
  }, [attachment, clearAttachment, telegramId, trimmed, user]);

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

      <div className="flex shrink-0 flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isSubmitting}
          onChange={handleAttachmentChange}
        />

        {attachment && attachmentPreviewUrl ? (
          <div className="flex items-center gap-3 rounded-[1.2rem] border border-border-subtle bg-bg-elevated/70 p-2.5 shadow-[var(--shadow-soft)]">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[0.95rem] border border-border-subtle bg-bg-subtle">
              <Image
                src={attachmentPreviewUrl}
                alt="Прикреплённая фотография"
                fill
                unoptimized
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-primary">
                {attachment.name}
              </div>
              <div className="mt-0.5 text-xs text-text-muted">
                {formatAttachmentSize(attachment.size)} · 1 фото
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isSubmitting}
              onClick={clearAttachment}
              className="h-9 w-9 rounded-full"
              aria-label="Удалить фотографию"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-fit rounded-full px-4"
          >
            <ImagePlus className="h-4 w-4" />
            Добавить фото
          </Button>
        )}
      </div>

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
