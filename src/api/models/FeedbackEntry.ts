export type FeedbackEntry = {
  id: string;
  telegramId: string;
  text: string;
  createdAt?: string;
  user: {
    name: string | null;
    nickname: string | null;
    avatarUrl: string | null;
  };
};
