// Mock data for the Bible verse memorization platform

export interface Verse {
  id: string;
  reference: string;
  text: string;
  translation: string;
  testament: 'OT' | 'NT';
  tags: string[];
  masteryLevel: number; // 0-100
  nextReview: Date;
  totalReviews: number;
  correctReviews: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  verseCount: number;
  createdAt: Date;
}

export interface TrainingSession {
  verse: Verse;
  mode: 'flashcard' | 'fill-blanks' | 'first-letters' | 'typing';
}

export const mockVerses: Verse[] = [
  {
    id: '1',
    reference: 'Иоанн 3:16',
    text: 'Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного, дабы всякий верующий в Него не погиб, но имел жизнь вечную.',
    translation: 'СП',
    testament: 'NT',
    tags: ['Евангелие', 'Спасение', 'Любовь'],
    masteryLevel: 85,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
    totalReviews: 12,
    correctReviews: 10,
  },
  {
    id: '2',
    reference: 'Филиппийцам 4:13',
    text: 'Всё могу в укрепляющем меня Иисусе Христе.',
    translation: 'СП',
    testament: 'NT',
    tags: ['Сила', 'Ободрение'],
    masteryLevel: 92,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days
    totalReviews: 18,
    correctReviews: 17,
  },
  {
    id: '3',
    reference: 'Псалом 22:1',
    text: 'Господь — Пастырь мой; я ни в чём не буду нуждаться.',
    translation: 'СП',
    testament: 'OT',
    tags: ['Утешение', 'Доверие', 'Псалмы'],
    masteryLevel: 45,
    nextReview: new Date(Date.now()), // Today
    totalReviews: 5,
    correctReviews: 3,
  },
  {
    id: '4',
    reference: 'Притчи 3:5-6',
    text: 'Надейся на Господа всем сердцем твоим, и не полагайся на разум твой. Во всех путях твоих познавай Его, и Он направит стези твои.',
    translation: 'СП',
    testament: 'OT',
    tags: ['Доверие', 'Мудрость', 'Руководство'],
    masteryLevel: 60,
    nextReview: new Date(Date.now()), // Today
    totalReviews: 8,
    correctReviews: 5,
  },
  {
    id: '5',
    reference: 'Римлянам 8:28',
    text: 'Притом знаем, что любящим Бога, призванным по Его изволению, всё содействует ко благу.',
    translation: 'СП',
    testament: 'NT',
    tags: ['Вера', 'Цель', 'Доверие'],
    masteryLevel: 72,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days
    totalReviews: 10,
    correctReviews: 8,
  },
  {
    id: '6',
    reference: 'Иеремия 29:11',
    text: 'Ибо только Я знаю намерения, какие имею о вас, говорит Господь, намерения во благо, а не на зло, чтобы дать вам будущность и надежду.',
    translation: 'СП',
    testament: 'OT',
    tags: ['Надежда', 'Будущее', 'Планы'],
    masteryLevel: 38,
    nextReview: new Date(Date.now()), // Today
    totalReviews: 4,
    correctReviews: 2,
  },
  {
    id: '7',
    reference: 'Матфей 6:33',
    text: 'Ищите же прежде Царства Божия и правды Его, и это всё приложится вам.',
    translation: 'СП',
    testament: 'NT',
    tags: ['Царство', 'Приоритет', 'Доверие'],
    masteryLevel: 55,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
    totalReviews: 7,
    correctReviews: 4,
  },
  {
    id: '8',
    reference: 'Исаия 40:31',
    text: 'А надеющиеся на Господа обновятся в силе: поднимут крылья, как орлы, потекут — и не устанут, пойдут — и не утомятся.',
    translation: 'СП',
    testament: 'OT',
    tags: ['Сила', 'Надежда', 'Обновление'],
    masteryLevel: 80,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4), // 4 days
    totalReviews: 14,
    correctReviews: 12,
  },
];

export const mockCollections: Collection[] = [
  {
    id: '1',
    name: 'Основы Евангелия',
    description: 'Ключевые стихи о спасении и евангельском послании',
    verseCount: 12,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Утешение и мир',
    description: 'Стихи для времен тревоги и стресса',
    verseCount: 8,
    createdAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    name: 'Мудрость и руководство',
    description: 'Притчи и стихи о принятии решений',
    verseCount: 15,
    createdAt: new Date('2024-03-05'),
  },
  {
    id: '4',
    name: 'Псалмы',
    description: 'Запоминающиеся отрывки из книги Псалмов',
    verseCount: 20,
    createdAt: new Date('2024-03-20'),
  },
  {
    id: '5',
    name: 'Послания Павла',
    description: 'Ключевые стихи из Римлянам, Ефесянам и Филиппийцам',
    verseCount: 18,
    createdAt: new Date('2024-04-01'),
  },
  {
    id: '6',
    name: 'Обещания Бога',
    description: 'Стихи об обещаниях и верности Бога',
    verseCount: 10,
    createdAt: new Date('2024-04-15'),
  },
];

export const mockStats = {
  streak: 12,
  versesMastered: 24,
  totalVerses: 67,
  reviewsThisWeek: 42,
  weeklyReviews: [
    { day: 'Пн', reviews: 5 },
    { day: 'Вт', reviews: 8 },
    { day: 'Ср', reviews: 6 },
    { day: 'Чт', reviews: 9 },
    { day: 'Пт', reviews: 7 },
    { day: 'Сб', reviews: 4 },
    { day: 'Вс', reviews: 3 },
  ],
  masteryDistribution: [
    { level: '0-25%', count: 15 },
    { level: '26-50%', count: 12 },
    { level: '51-75%', count: 18 },
    { level: '76-100%', count: 22 },
  ],
};

export const getVersesForToday = (): Verse[] => {
  return mockVerses.filter(verse => {
    const today = new Date();
    const reviewDate = new Date(verse.nextReview);
    return reviewDate.toDateString() === today.toDateString();
  });
};

export const getVerseById = (id: string): Verse | undefined => {
  return mockVerses.find(verse => verse.id === id);
};
