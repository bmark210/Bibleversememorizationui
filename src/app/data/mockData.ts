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
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    translation: 'NIV',
    testament: 'NT',
    tags: ['Gospel', 'Salvation', 'Love'],
    masteryLevel: 85,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
    totalReviews: 12,
    correctReviews: 10,
  },
  {
    id: '2',
    reference: 'Philippians 4:13',
    text: 'I can do all this through him who gives me strength.',
    translation: 'NIV',
    testament: 'NT',
    tags: ['Strength', 'Encouragement'],
    masteryLevel: 92,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days
    totalReviews: 18,
    correctReviews: 17,
  },
  {
    id: '3',
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd, I lack nothing.',
    translation: 'NIV',
    testament: 'OT',
    tags: ['Comfort', 'Trust', 'Psalms'],
    masteryLevel: 45,
    nextReview: new Date(Date.now()), // Today
    totalReviews: 5,
    correctReviews: 3,
  },
  {
    id: '4',
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    translation: 'NIV',
    testament: 'OT',
    tags: ['Trust', 'Wisdom', 'Guidance'],
    masteryLevel: 60,
    nextReview: new Date(Date.now()), // Today
    totalReviews: 8,
    correctReviews: 5,
  },
  {
    id: '5',
    reference: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    translation: 'NIV',
    testament: 'NT',
    tags: ['Faith', 'Purpose', 'Trust'],
    masteryLevel: 72,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days
    totalReviews: 10,
    correctReviews: 8,
  },
  {
    id: '6',
    reference: 'Jeremiah 29:11',
    text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.',
    translation: 'NIV',
    testament: 'OT',
    tags: ['Hope', 'Future', 'Plans'],
    masteryLevel: 38,
    nextReview: new Date(Date.now()), // Today
    totalReviews: 4,
    correctReviews: 2,
  },
  {
    id: '7',
    reference: 'Matthew 6:33',
    text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.',
    translation: 'NIV',
    testament: 'NT',
    tags: ['Kingdom', 'Priority', 'Trust'],
    masteryLevel: 55,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
    totalReviews: 7,
    correctReviews: 4,
  },
  {
    id: '8',
    reference: 'Isaiah 40:31',
    text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
    translation: 'NIV',
    testament: 'OT',
    tags: ['Strength', 'Hope', 'Renewal'],
    masteryLevel: 80,
    nextReview: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4), // 4 days
    totalReviews: 14,
    correctReviews: 12,
  },
];

export const mockCollections: Collection[] = [
  {
    id: '1',
    name: 'Gospel Essentials',
    description: 'Core verses about salvation and the gospel message',
    verseCount: 12,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Comfort & Peace',
    description: 'Verses for times of anxiety and stress',
    verseCount: 8,
    createdAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    name: 'Wisdom & Guidance',
    description: 'Proverbs and verses about decision-making',
    verseCount: 15,
    createdAt: new Date('2024-03-05'),
  },
  {
    id: '4',
    name: 'The Psalms',
    description: 'Memorable passages from the book of Psalms',
    verseCount: 20,
    createdAt: new Date('2024-03-20'),
  },
  {
    id: '5',
    name: 'Paul\'s Letters',
    description: 'Key verses from Romans, Ephesians, and Philippians',
    verseCount: 18,
    createdAt: new Date('2024-04-01'),
  },
  {
    id: '6',
    name: 'Promises of God',
    description: 'Verses about God\'s promises and faithfulness',
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
    { day: 'Mon', reviews: 5 },
    { day: 'Tue', reviews: 8 },
    { day: 'Wed', reviews: 6 },
    { day: 'Thu', reviews: 9 },
    { day: 'Fri', reviews: 7 },
    { day: 'Sat', reviews: 4 },
    { day: 'Sun', reviews: 3 },
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
