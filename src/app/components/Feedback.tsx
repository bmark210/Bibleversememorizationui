"use client";

import React from "react";
import { Loader2, MessageSquareMore, Send } from "lucide-react";
import { ApiError } from "@/api/core/ApiError";
import type { bible_memory_db_internal_domain_Feedback } from "@/api/models/bible_memory_db_internal_domain_Feedback";
import { FeedbackService } from "@/api/services/FeedbackService";
import { toast } from "@/app/lib/toast";
import { isAdminTelegramId } from "@/lib/admins";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "./ui/utils";

type FeedbackAdminRow = bible_memory_db_internal_domain_Feedback & {
  user: {
    name: string | null;
    nickname: string | null;
    avatarUrl: string | null;
  };
};

const MAX_FEEDBACK_LENGTH = 500;
const ADMIN_FEEDBACK_PAGE_SIZE = 3;
const FEEDBACK_COOLDOWN_MS = 60 * 60 * 1000;
const FEEDBACK_LAST_SUBMIT_KEY_PREFIX = "feedback:lastSubmitAt:";

const PANEL =
  "rounded-[1.2rem] border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]";

function feedbackLastSubmitStorageKey(telegramId: string): string {
  return `${FEEDBACK_LAST_SUBMIT_KEY_PREFIX}${telegramId}`;
}

function readLastSubmitAt(telegramId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      feedbackLastSubmitStorageKey(telegramId),
    );
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeLastSubmitAt(telegramId: string, at: number): void {
  try {
    window.localStorage.setItem(
      feedbackLastSubmitStorageKey(telegramId),
      String(at),
    );
  } catch {
    /* quota / private mode */
  }
}

function computeCooldownRemainingMs(telegramId: string): number {
  const last = readLastSubmitAt(telegramId);
  if (last == null) return 0;
  return Math.max(0, last + FEEDBACK_COOLDOWN_MS - Date.now());
}

function formatCooldownRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
  }
  if (m > 0) {
    return `${m} мин`;
  }
  return `${s} с`;
}

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

function getFeedbackAuthorName(item: FeedbackAdminRow): string {
  const name = item.user.name?.trim();
  if (name) return name;

  const nickname = item.user.nickname?.trim();
  if (nickname) return `@${nickname}`;

  const tid = String(item.telegramId ?? "");
  return `Пользователь #${tid.slice(-4)}`;
}

function mapApiFeedbackToEntry(
  item: bible_memory_db_internal_domain_Feedback,
): FeedbackAdminRow {
  return {
    id: String(item.id ?? ""),
    telegramId: String(item.telegramId ?? ""),
    text: String(item.text ?? ""),
    createdAt: item.createdAt,
    user: { name: null, nickname: null, avatarUrl: null },
  };
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
  const [adminItems, setAdminItems] = React.useState<FeedbackAdminRow[]>([]);
  const [adminTotalCount, setAdminTotalCount] = React.useState(0);
  const [isAdminListLoading, setIsAdminListLoading] = React.useState(false);
  const [adminListError, setAdminListError] = React.useState<string | null>(
    null,
  );
  const [refreshVersion, setRefreshVersion] = React.useState(0);
  const [cooldownRemainingMs, setCooldownRemainingMs] = React.useState(0);

  const normalizedTelegramId = telegramId?.trim() ?? "";
  const isAdmin = isAdminTelegramId(normalizedTelegramId);
  const trimmedText = text.trim();
  const remainingChars = MAX_FEEDBACK_LENGTH - text.length;
  const totalPages = Math.max(
    1,
    Math.ceil(adminTotalCount / ADMIN_FEEDBACK_PAGE_SIZE),
  );
  const isFeedbackCooldownActive = cooldownRemainingMs > 0;
  const canSubmit =
    normalizedTelegramId.length > 0 &&
    trimmedText.length > 0 &&
    text.length <= MAX_FEEDBACK_LENGTH &&
    !isSubmitting &&
    !isFeedbackCooldownActive;

  React.useEffect(() => {
    if (!normalizedTelegramId) {
      setCooldownRemainingMs(0);
      return;
    }
    const tick = () =>
      setCooldownRemainingMs(
        computeCooldownRemainingMs(normalizedTelegramId),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [normalizedTelegramId]);

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
    const request = FeedbackService.listFeedback(
      undefined,
      ADMIN_FEEDBACK_PAGE_SIZE,
      startWith,
    );

    setIsAdminListLoading(true);
    setAdminListError(null);

    request
      .then((page) => {
        const items = (page.items ?? []).map(mapApiFeedbackToEntry);
        setAdminItems(items);
        const total = page.total ?? items.length;
        setAdminTotalCount(total);

        const nextTotalPages = Math.max(
          1,
          Math.ceil(total / ADMIN_FEEDBACK_PAGE_SIZE),
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

  const applyTemplate = (template: string) => {
    setText((current) => {
      const currentTrimmed = current.trim();
      if (!currentTrimmed) {
        return template;
      }
      if (currentTrimmed.includes(template)) {
        return current;
      }
      return `${currentTrimmed}\n\n${template}`;
    });
  };

  const handleSubmit = async () => {
    if (!normalizedTelegramId) {
      toast.warning("Не найден telegramId", {
        label: "Обратная связь",
      });
      return;
    }

    if (!trimmedText) {
      toast.warning("Введите текст отзыва", {
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

    const remaining = computeCooldownRemainingMs(normalizedTelegramId);
    if (remaining > 0) {
      toast.info(
        `Следующий отзыв можно отправить через ${formatCooldownRemaining(remaining)}.`,
        { label: "Обратная связь" },
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await FeedbackService.createFeedback({
        telegramId: normalizedTelegramId,
        text: trimmedText,
      });

      const sentAt = Date.now();
      writeLastSubmitAt(normalizedTelegramId, sentAt);
      setCooldownRemainingMs(
        Math.max(0, sentAt + FEEDBACK_COOLDOWN_MS - Date.now()),
      );

      setText("");
      toast.success("Отзыв отправлен", {
        label: "Обратная связь",
      });

      if (isAdmin) {
        if (adminPageIndex !== 1) {
          setAdminPageIndex(1);
        } else {
          setRefreshVersion((prev) => prev + 1);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        const bodyError =
          error.body &&
          typeof error.body === "object" &&
          "error" in error.body &&
          typeof (error.body as { error?: unknown }).error === "string"
            ? (error.body as { error: string }).error
            : null;
        writeLastSubmitAt(normalizedTelegramId, Date.now());
        setCooldownRemainingMs(
          computeCooldownRemainingMs(normalizedTelegramId),
        );
        toast.warning(
          bodyError ?? error.message ?? "Слишком частые отправки отзывов",
          { label: "Обратная связь" },
        );
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось отправить отзыв";
        toast.error(message, {
          label: "Обратная связь",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 short-phone:h-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            Обратная связь
          </div>
          <div className="text-xs text-text-muted">1 сообщение в час</div>
        </div>

        <div className="inline-flex items-center rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-[11px] text-text-secondary">
          {isAdmin ? "Админ" : `${MAX_FEEDBACK_LENGTH} симв.`}
        </div>
      </div>

      {!normalizedTelegramId ? (
        <div
          className={cn(
            PANEL,
            "flex flex-1 items-center justify-center px-4 py-6 text-sm text-text-secondary",
          )}
        >
          Раздел станет доступен после инициализации профиля в Telegram.
        </div>
      ) : (
        <>
          <div className={cn(PANEL, "shrink-0 p-3")}>
            {isFeedbackCooldownActive ? (
              <div className="mb-3 rounded-full border border-border-subtle bg-bg-surface px-3 py-2 text-xs text-text-secondary">
                Следующая отправка через{" "}
                <span className="font-medium text-text-primary">
                  {formatCooldownRemaining(cooldownRemainingMs)}
                </span>
              </div>
            ) : null}

            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Что стоит улучшить?"
              maxLength={MAX_FEEDBACK_LENGTH}
              disabled={isFeedbackCooldownActive}
              className="min-h-[104px] rounded-[1.2rem] border-border-subtle bg-bg-surface shadow-none disabled:opacity-60"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
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

          {isAdmin ? (
            <div className={cn(PANEL, "flex min-h-0 flex-1 flex-col p-3")}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareMore className="h-4 w-4 text-text-muted" />
                  <div className="text-sm font-medium text-text-primary">
                    Отзывы
                  </div>
                </div>

                <div className="text-xs text-text-muted">
                  {adminTotalCount} всего
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {isAdminListLoading ? (
                  Array.from({ length: ADMIN_FEEDBACK_PAGE_SIZE }).map((_, index) => (
                    <div
                      key={`feedback-skeleton-${index}`}
                      className="h-[86px] animate-pulse rounded-[1rem] border border-border-subtle bg-bg-surface"
                    />
                  ))
                ) : adminListError ? (
                  <div className="rounded-[1rem] border border-state-error/25 bg-state-error/12 px-4 py-3 text-sm text-state-error">
                    <div>{adminListError}</div>
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRefreshVersion((prev) => prev + 1)}
                        className="rounded-full"
                      >
                        Повторить
                      </Button>
                    </div>
                  </div>
                ) : adminItems.length === 0 ? (
                  <div className="rounded-[1rem] border border-dashed border-border-subtle bg-bg-surface px-4 py-6 text-sm text-text-secondary">
                    Отзывов пока нет.
                  </div>
                ) : (
                  adminItems.map((item) => {
                    const authorName = getFeedbackAuthorName(item);

                    return (
                      <div
                        key={item.id}
                        className="rounded-[1rem] border border-border-subtle bg-bg-surface px-3 py-2.5"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 border border-border-subtle bg-bg-elevated">
                            {item.user.avatarUrl ? (
                              <AvatarImage
                                src={item.user.avatarUrl}
                                alt={authorName}
                              />
                            ) : null}
                            <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
                              {getInitials(authorName || "U")}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-text-primary">
                                  {authorName}
                                </div>
                                <div className="text-[11px] text-text-muted">
                                  ID {item.telegramId}
                                </div>
                              </div>

                              <div className="shrink-0 text-[11px] text-text-muted">
                                {formatFeedbackDate(item.createdAt)}
                              </div>
                            </div>

                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-5 text-text-secondary">
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
                <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={adminPageIndex <= 1 || isAdminListLoading}
                    onClick={() =>
                      setAdminPageIndex((prev) => Math.max(1, prev - 1))
                    }
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    Назад
                  </Button>

                  <div className="text-xs text-text-muted">
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
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    Вперёд
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid flex-1 min-h-0 grid-cols-2 gap-2 short-phone:grid-cols-1">
              <div className={cn(PANEL, "flex flex-col justify-between p-3")}>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    Что писать
                  </div>
                  <div className="mt-2 text-sm font-medium text-text-primary">
                    Баг, идея или неудобство
                  </div>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    Хватает 1-2 предложений с названием экрана и тем, что
                    произошло.
                  </p>
                </div>

                <div className="text-xs text-text-muted">
                  Чем точнее описание, тем быстрее правка.
                </div>
              </div>

              <div className={cn(PANEL, "flex flex-col justify-between p-3")}>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                    Статус
                  </div>
                  <div className="mt-2 text-sm font-medium text-text-primary">
                    {isFeedbackCooldownActive
                      ? "Отправка временно недоступна"
                      : "Можно отправлять сейчас"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    Лимит обновляется автоматически раз в секунду.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    applyTemplate(
                      "Экран:\nЧто делал:\nЧто увидел:\nЧто ожидал:",
                    )
                  }
                  className="h-9 rounded-full px-3 text-xs"
                >
                  Вставить шаблон
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
