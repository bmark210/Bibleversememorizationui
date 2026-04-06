export type QueueVerseItem = {
  externalVerseId: string;
  reference: string;
  text?: string;
  queuePosition: number;
};

export type QueueResponse = {
  items: QueueVerseItem[];
  totalCount: number;
  freeSlots: number;
  promotedVerseIds?: string[];
};
