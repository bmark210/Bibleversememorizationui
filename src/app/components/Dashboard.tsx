'use client'

import React from 'react';
import { Plus, Play, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Verse } from '../data/mockData';

interface DashboardProps {
  todayVerses: Verse[];
  onStartTraining: () => void;
  onAddVerse: () => void;
  onViewAll: () => void;
}

export function Dashboard({ todayVerses, onStartTraining, onAddVerse, onViewAll }: DashboardProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays > 1) return `Через ${diffDays} дней`;
    return 'Просрочено';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="mb-2">С возвращением!</h1>
        <p className="text-muted-foreground">
          У вас {todayVerses.length} {todayVerses.length === 1 ? 'стих' : todayVerses.length < 5 ? 'стиха' : 'стихов'} для повторения сегодня.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <Button
          onClick={onStartTraining}
          variant="default"
          size="lg"
          className="flex-1 py-3 sm:flex-initial"
        >
          <Play className="w-4 h-4 mr-2" />
          Начать тренировку
        </Button>
        <Button
          onClick={onAddVerse}
          variant="outline"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить стих
        </Button>
      </div>

      {/* Today's Verses Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2>Стихи на сегодня</h2>
          <Button
            variant="ghost"
            onClick={onViewAll}
            className="text-primary hover:text-primary"
          >
            Показать все
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {todayVerses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              На сегодня стихов не запланировано. Отлично, что вы в графике!
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {todayVerses.map((verse) => (
              <Card key={verse.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-2">{verse.reference}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {verse.text}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{verse.translation}</span>
                      <span>•</span>
                      <span>{verse.totalReviews} {verse.totalReviews === 1 ? 'повторение' : verse.totalReviews < 5 ? 'повторения' : 'повторений'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Освоение</div>
                      <div className="text-sm font-medium">{verse.masteryLevel}%</div>
                    </div>
                    <Progress value={verse.masteryLevel} className="w-full h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatDate(verse.nextReview)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Текущая серия</div>
          <div className="text-2xl font-semibold text-primary">12 дней</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Освоено стихов</div>
          <div className="text-2xl font-semibold">24</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">На этой неделе</div>
          <div className="text-2xl font-semibold">42 повторения</div>
        </Card>
      </div>
    </div>
  );
}
