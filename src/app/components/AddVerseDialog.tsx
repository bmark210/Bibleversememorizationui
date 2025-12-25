import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

interface AddVerseDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (verse: {
    reference: string;
    text: string;
    translation: string;
    tags: string[];
  }) => void;
}

export function AddVerseDialog({ open, onClose, onAdd }: AddVerseDialogProps) {
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('niv');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reference || !text) return;

    onAdd({
      reference,
      text,
      translation,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    // Reset form
    setReference('');
    setText('');
    setTranslation('niv');
    setTags('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Verse</DialogTitle>
          <DialogDescription>
            Add a verse to your memorization collection
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                placeholder="e.g., John 3:16"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Verse Text</Label>
              <Textarea
                id="text"
                placeholder="Enter the verse text..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="translation-select">Translation</Label>
              <Select value={translation} onValueChange={setTranslation}>
                <SelectTrigger id="translation-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niv">NIV</SelectItem>
                  <SelectItem value="esv">ESV</SelectItem>
                  <SelectItem value="kjv">KJV</SelectItem>
                  <SelectItem value="nlt">NLT</SelectItem>
                  <SelectItem value="nasb">NASB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., Gospel, Salvation, Love"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Verse</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
