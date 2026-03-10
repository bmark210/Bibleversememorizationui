export type FeedbackAuthorRecord = {
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
};

export type FeedbackRecord = {
  id: string;
  telegramId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user: FeedbackAuthorRecord;
};
