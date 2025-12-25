'use client'

import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Verse } from '../data/mockData';

interface VerseListProps {
  verses: Verse[];
  onAddVerse: () => void;
  onStartTraining: (verseId: string) => void;
}

export function VerseList({ verses, onAddVerse, onStartTraining }: VerseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [masteryFilter, setMasteryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filteredVerses = verses.filter((verse) => {
    const matchesSearch =
      searchQuery === '' ||
      verse.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      verse.text.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTestament = testamentFilter === 'all' || verse.testament === testamentFilter;

    const matchesMastery =
      masteryFilter === 'all' ||
      (masteryFilter === 'low' && verse.masteryLevel < 40) ||
      (masteryFilter === 'medium' && verse.masteryLevel >= 40 && verse.masteryLevel < 75) ||
      (masteryFilter === 'high' && verse.masteryLevel >= 75);

    return matchesSearch && matchesTestament && matchesMastery;
  });

  const getMasteryColor = (level: number) => {
    if (level < 40) return 'text-destructive';
    if (level < 75) return 'text-orange-500';
    return 'text-[#059669]';
  };

  const getMasteryLabel = (level: number) => {
    if (level < 40) return 'Изучение';
    if (level < 75) return 'Практика';
    return 'Освоено';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Мои стихи</h1>
          <p className="text-muted-foreground">
            {filteredVerses.length} {filteredVerses.length === 1 ? 'стих' : filteredVerses.length < 5 ? 'стиха' : 'стихов'}
          </p>
        </div>
        <Button onClick={onAddVerse}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить стих
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск стихов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={testamentFilter} onValueChange={(value: any) => setTestamentFilter(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Завет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все заветы</SelectItem>
            <SelectItem value="OT">Ветхий Завет</SelectItem>
            <SelectItem value="NT">Новый Завет</SelectItem>
          </SelectContent>
        </Select>

        <Select value={masteryFilter} onValueChange={(value: any) => setMasteryFilter(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Освоение" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все уровни</SelectItem>
            <SelectItem value="low">Изучение (0-39%)</SelectItem>
            <SelectItem value="medium">Практика (40-74%)</SelectItem>
            <SelectItem value="high">Освоено (75-100%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Verse List */}
      {filteredVerses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Стихи, соответствующие вашим фильтрам, не найдены.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVerses.map((verse) => (
            <Card
              key={verse.id}
              className="p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onStartTraining(verse.id)}
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3>{verse.reference}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {verse.translation}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getMasteryColor(verse.masteryLevel)}`}
                    >
                      {getMasteryLabel(verse.masteryLevel)}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {verse.text}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {verse.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px] w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                    <span className="text-xs text-muted-foreground">Освоение</span>
                    <span className="text-sm font-medium">{verse.masteryLevel}%</span>
                  </div>
                  <Progress value={verse.masteryLevel} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {verse.totalReviews} {verse.totalReviews === 1 ? 'повторение' : verse.totalReviews < 5 ? 'повторения' : 'повторений'}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
