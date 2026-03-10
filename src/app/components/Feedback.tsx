"use client";

import React from "react";
import { Loader2, MessageSquareMore, Send } from "lucide-react";
import type { FeedbackEntry } from "@/api/models/FeedbackEntry";
import { FeedbackService } from "@/api/services/FeedbackService";
import { toast } from "@/app/lib/toast";
import { isAdminTelegramId } from "@/lib/admins";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const MAX_FEEDBACK_LENGTH = 500;
const ADMIN_FEEDBACK_PAGE_SIZE = 8;

type FeedbackProps = {
  telegramId?: string | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getFeedbackAuthorName(item: FeedbackEntry): string {
  const name = item.user.name?.trim();
  if (name) return name;

  const nickname = item.user.nickname?.trim();
  if (nickname) return `@${nickname}`;

  return `Пользователь #${item.telegramId.slice(-4)}`;
}

function formatFeedbackDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Без даты";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

export function Feedback({ telegramId = null }: FeedbackProps) {
  const [text, setText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [adminPageIndex, setAdminPageIndex] = React.useState(1);
  const [adminItems, setAdminItems] = React.useState<FeedbackEntry[]>([]);
  const [adminTotalCount, setAdminTotalCount] = React.useState(0);
  const [isAdminListLoading, setIsAdminListLoading] = React.useState(false);
  const [adminListError, setAdminListError] = React.useState<string | null>(
    null,
  );
  const [refreshVersion, setRefreshVersion] = React.useState(0);

  const normalizedTelegramId = telegramId?.trim() ?? "";
  const isAdmin = isAdminTelegramId(normalizedTelegramId);
  const trimmedText = text.trim();
  const remainingChars = MAX_FEEDBACK_LENGTH - text.length;
  const totalPages = Math.max(
    1,
    Math.ceil(adminTotalCount / ADMIN_FEEDBACK_PAGE_SIZE),
  );
  const canSubmit =
    normalizedTelegramId.length > 0 &&
    trimmedText.length > 0 &&
    text.length <= MAX_FEEDBACK_LENGTH &&
    !isSubmitting;

  React.useEffect(() => {
    if (!isAdmin || !normalizedTelegramId) {
      setAdminItems([]);
      setAdminTotalCount(0);
      setAdminListError(null);
      setIsAdminListLoading(false);
      return;
    }

    const startWith = Math.max(
      0,
      (adminPageIndex - 1) * ADMIN_FEEDBACK_PAGE_SIZE,
    );
    const request = FeedbackService.getApiFeedback(
      normalizedTelegramId,
      ADMIN_FEEDBACK_PAGE_SIZE,
      startWith,
    );

    setIsAdminListLoading(true);
    setAdminListError(null);

    request
      .then((page) => {
        setAdminItems(page.items);
        setAdminTotalCount(page.totalCount);

        const nextTotalPages = Math.max(
          1,
          Math.ceil(page.totalCount / ADMIN_FEEDBACK_PAGE_SIZE),
        );
        if (adminPageIndex > nextTotalPages) {
          setAdminPageIndex(nextTotalPages);
        }
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось загрузить отзывы";
        setAdminListError(message);
      })
      .finally(() => {
        setIsAdminListLoading(false);
      });

    return () => {
      request.cancel();
    };
  }, [adminPageIndex, isAdmin, normalizedTelegramId, refreshVersion]);

  const handleSubmit = async () => {
    if (!normalizedTelegramId) {
      toast.error("Не найден telegramId");
      return;
    }

    if (!trimmedText) {
      toast.error("Введите текст отзыва");
      return;
    }

    if (text.length > MAX_FEEDBACK_LENGTH) {
      toast.error(`Максимум ${MAX_FEEDBACK_LENGTH} символов`);
      return;
    }

    setIsSubmitting(true);
    try {
      await FeedbackService.postApiFeedback({
        telegramId: normalizedTelegramId,
        text: trimmedText,
      });

      setText("");
      toast.success("Отзыв отправлен");

      if (isAdmin) {
        if (adminPageIndex !== 1) {
          setAdminPageIndex(1);
        } else {
          setRefreshVersion((prev) => prev + 1);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось отправить отзыв";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Обратная связь
            </h2>
            {isAdmin ? (
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                Админ
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-foreground/56">
            Напишите, чего не хватает, что неудобно, что стоит улучшить, опишите
            найденный баг или просто поделитесь своим мнением.
          </p>
        </div>
      </div>

      {!normalizedTelegramId ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background/45 p-4 text-sm text-foreground/56">
          Раздел станет доступен после инициализации профиля в Telegram.
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Введите ваше сообщение..."
            maxLength={MAX_FEEDBACK_LENGTH}
            className="min-h-28 rounded-2xl border-border/60 bg-background/45 px-4 py-3 shadow-none"
          />

          <div className="flex items-center justify-between gap-3">
            <div
              className={`text-xs ${
                remainingChars < 150
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground/42"
              }`}
            >
              {remainingChars} симв.
            </div>

            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="h-10 rounded-full px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Отправляем
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Отправить
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {isAdmin && normalizedTelegramId ? (
        <div className="border-t border-border/55 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareMore className="h-4 w-4 text-foreground/55" />
              <h3 className="text-sm font-medium text-foreground/82">
                Отзывы пользователей
              </h3>
            </div>

            <div className="text-xs text-foreground/42">
              {adminTotalCount} всего
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {isAdminListLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`feedback-skeleton-${index}`}
                  className="h-24 animate-pulse rounded-2xl border border-border/60 bg-background/45"
                />
              ))
            ) : adminListError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <div>{adminListError}</div>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRefreshVersion((prev) => prev + 1)}
                  >
                    Повторить
                  </Button>
                </div>
              </div>
            ) : adminItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/45 p-4 text-sm text-foreground/56">
                Отзывов пока нет.
              </div>
            ) : (
              adminItems.map((item) => {
                const authorName = getFeedbackAuthorName(item);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/60 bg-background/45 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 border border-border/60 bg-background/70">
                        {item.user.avatarUrl ? (
                          <AvatarImage
                            src={item.user.avatarUrl}
                            alt={authorName}
                          />
                        ) : null}
                        <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                          {getInitials(authorName || "U")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground/82">
                              {authorName}
                            </div>
                            <div className="text-xs text-foreground/45">
                              ID: {item.telegramId}
                            </div>
                          </div>

                          <div className="text-xs text-foreground/42">
                            {formatFeedbackDate(item.createdAt)}
                          </div>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/72">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {adminTotalCount > ADMIN_FEEDBACK_PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between border-t border-border/55 pt-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={adminPageIndex <= 1 || isAdminListLoading}
                onClick={() =>
                  setAdminPageIndex((prev) => Math.max(1, prev - 1))
                }
                className="h-9 rounded-full border-border/60 bg-background/55 px-4 text-xs text-foreground/78 shadow-none"
              >
                Назад
              </Button>

              <div className="text-xs text-foreground/42">
                {adminPageIndex}/{totalPages}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={adminPageIndex >= totalPages || isAdminListLoading}
                onClick={() =>
                  setAdminPageIndex((prev) => Math.min(totalPages, prev + 1))
                }
                className="h-9 rounded-full border-border/60 bg-background/55 px-4 text-xs text-foreground/78 shadow-none"
              >
                Вперёд
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
