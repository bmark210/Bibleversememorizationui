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
          <DialogTitle>Добавить новый стих</DialogTitle>
          <DialogDescription>
            Добавьте стих в вашу коллекцию для заучивания
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Ссылка</Label>
              <Input
                id="reference"
                placeholder="например, Иоанн 3:16"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Текст стиха</Label>
              <Textarea
                id="text"
                placeholder="Введите текст стиха..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="translation-select">Перевод</Label>
              <Select value={translation} onValueChange={setTranslation}>
                <SelectTrigger id="translation-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niv">СП</SelectItem>
                  <SelectItem value="esv">РБО</SelectItem>
                  <SelectItem value="kjv">ЦСЯ</SelectItem>
                  <SelectItem value="nlt">НРП</SelectItem>
                  <SelectItem value="nasb">НМП</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Теги (через запятую)</Label>
              <Input
                id="tags"
                placeholder="например, Евангелие, Спасение, Любовь"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">Добавить стих</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
