import React from 'react';
import { Plus, BookOpen, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Collection } from '../data/mockData';

interface CollectionsProps {
  collections: Collection[];
  onCreateCollection: () => void;
  onSelectCollection: (collectionId: string) => void;
}

export function Collections({ collections, onCreateCollection, onSelectCollection }: CollectionsProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="mb-1">Collections</h1>
          <p className="text-muted-foreground">
            Organize verses by theme or topic
          </p>
        </div>
        <Button onClick={onCreateCollection}>
          <Plus className="w-4 h-4 mr-2" />
          Create Collection
        </Button>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection) => (
          <Card
            key={collection.id}
            className="p-6 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => onSelectCollection(collection.id)}
          >
            <div className="space-y-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>

              {/* Content */}
              <div>
                <h3 className="mb-2 group-hover:text-primary transition-colors">
                  {collection.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {collection.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4" />
                  <span>{collection.verseCount} verse{collection.verseCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(collection.createdAt)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Create New Card */}
        <Card
          className="p-6 border-2 border-dashed border-border hover:border-primary hover:bg-accent/50 transition-all cursor-pointer group"
          onClick={onCreateCollection}
        >
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="mb-2">Create Collection</h3>
              <p className="text-sm text-muted-foreground">
                Group verses by theme
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Empty State */}
      {collections.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="mb-2">No collections yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first collection to organize verses by theme or topic.
              </p>
              <Button onClick={onCreateCollection}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Collection
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
