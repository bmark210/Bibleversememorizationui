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
      toast.info('No verses scheduled for today', {
        description: 'Great job! You\'re all caught up.',
      });
      return;
    }
    setIsTraining(true);
  };

  const handleCompleteTraining = () => {
    setIsTraining(false);
    setCurrentPage('dashboard');
    toast.success('Training complete!', {
      description: 'Great work! Your progress has been saved.',
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
    toast.success('Verse added successfully', {
      description: `${verse.reference} has been added to your collection.`,
    });
  };

  const handleStartTrainingFromVerse = (verseId: string) => {
    const verse = mockVerses.find(v => v.id === verseId);
    if (verse) {
      setIsTraining(true);
    }
  };

  const handleSelectCollection = (collectionId: string) => {
    toast.info('Collection selected', {
      description: 'This would show verses in the selected collection.',
    });
  };

  const handleCreateCollection = () => {
    toast.info('Create collection', {
      description: 'This would open a dialog to create a new collection.',
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