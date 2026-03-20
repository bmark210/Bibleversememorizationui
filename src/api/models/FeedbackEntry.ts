/**
 * Запись отзыва для UI админки. API отдаёт плоский {@link bible_memory_db_internal_domain_Feedback};
 * поле user оставлено для совместимости с шаблоном (пока без обогащения с бэкенда).
 */
export type FeedbackEntry = {
  id: string;
  telegramId: string;
  text: string;
  createdAt?: string;
  user: {
    name: string | null;
    nickname: string | null;
    avatarUrl?: string | null;
  };
};
