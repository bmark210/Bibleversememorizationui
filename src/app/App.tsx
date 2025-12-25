'use client'

import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TrainingSession } from './components/TrainingSession';
import { VerseList } from './components/VerseList';
import { Collections } from './components/Collections';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { AddVerseDialog } from './components/AddVerseDialog';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import {
  mockVerses,
  mockCollections,
  mockStats,
  getVersesForToday,
} from './data/mockData';

type Page = 'dashboard' | 'verses' | 'collections' | 'stats' | 'settings' | 'training';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isTraining, setIsTraining] = useState(false);
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);

  const todayVerses = getVersesForToday();

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setIsTraining(false);
  };

  const handleStartTraining = () => {
    if (todayVerses.length === 0) {
      toast.info('На сегодня стихов не запланировано', {
        description: 'Отлично! Вы всё успели.',
      });
      return;
    }
    setIsTraining(true);
  };

  const handleCompleteTraining = () => {
    setIsTraining(false);
    setCurrentPage('dashboard');
    toast.success('Тренировка завершена!', {
      description: 'Отличная работа! Ваш прогресс сохранён.',
    });
  };

  const handleExitTraining = () => {
    setIsTraining(false);
    setCurrentPage('dashboard');
  };

  const handleAddVerse = () => {
    setShowAddVerseDialog(true);
  };

  const handleVerseAdded = (verse: any) => {
    toast.success('Стих успешно добавлен', {
      description: `${verse.reference} добавлен в вашу коллекцию.`,
    });
  };

  const handleStartTrainingFromVerse = (verseId: string) => {
    const verse = mockVerses.find(v => v.id === verseId);
    if (verse) {
      setIsTraining(true);
    }
  };

  const handleSelectCollection = (collectionId: string) => {
    toast.info('Коллекция выбрана', {
      description: 'Здесь будут показаны стихи из выбранной коллекции.',
    });
  };

  const handleCreateCollection = () => {
    toast.info('Создать коллекцию', {
      description: 'Здесь откроется диалог для создания новой коллекции.',
    });
  };

  // Training mode - full screen
  if (isTraining) {
    return (
      <>
        <TrainingSession
          verses={todayVerses.length > 0 ? todayVerses : mockVerses.slice(0, 3)}
          allVerses={mockVerses}
          onComplete={handleCompleteTraining}
          onExit={handleExitTraining}
        />
        <Toaster />
      </>
    );
  }

  // Regular app layout
  return (
    <>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {currentPage === 'dashboard' && (
          <Dashboard
            todayVerses={todayVerses}
            onStartTraining={handleStartTraining}
            onAddVerse={handleAddVerse}
            onViewAll={() => setCurrentPage('verses')}
          />
        )}

        {currentPage === 'verses' && (
          <VerseList
            verses={mockVerses}
            onAddVerse={handleAddVerse}
            onStartTraining={handleStartTrainingFromVerse}
          />
        )}

        {currentPage === 'collections' && (
          <Collections
            collections={mockCollections}
            onCreateCollection={handleCreateCollection}
            onSelectCollection={handleSelectCollection}
          />
        )}

        {currentPage === 'stats' && (
          <Statistics stats={mockStats} />
        )}

        {currentPage === 'settings' && (
          <Settings />
        )}
      </Layout>

      <AddVerseDialog
        open={showAddVerseDialog}
        onClose={() => setShowAddVerseDialog(false)}
        onAdd={handleVerseAdded}
      />

      <Toaster />
    </>
  );
}