import React from 'react';
import { Save } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';

export function Settings() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1">Настройки</h1>
        <p className="text-muted-foreground">
          Настройте свой опыт обучения
        </p>
      </div>

      <div className="space-y-6">
        {/* Learning Preferences */}
        <Card className="p-6">
          <h3 className="mb-6">Предпочтения обучения</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="translation">Перевод по умолчанию</Label>
              <Select defaultValue="niv">
                <SelectTrigger id="translation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niv">СП - Синодальный перевод</SelectItem>
                  <SelectItem value="esv">РБО - Российское Библейское Общество</SelectItem>
                  <SelectItem value="kjv">ЦСЯ - Церковнославянский</SelectItem>
                  <SelectItem value="nlt">НРП - Новый русский перевод</SelectItem>
                  <SelectItem value="nasb">НМП - Новый международный перевод</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Выберите предпочитаемый перевод Библии для новых стихов
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="daily-goal">Цель на день</Label>
              <Input
                id="daily-goal"
                type="number"
                defaultValue="5"
                min="1"
                max="50"
              />
              <p className="text-sm text-muted-foreground">
                Количество стихов для повторения каждый день
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="training-mode">Режим тренировки по умолчанию</Label>
              <Select defaultValue="flashcard">
                <SelectTrigger id="training-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flashcard">Карточки</SelectItem>
                  <SelectItem value="fill-blanks">Заполнить пробелы</SelectItem>
                  <SelectItem value="first-letters">Первые буквы</SelectItem>
                  <SelectItem value="typing">Полная печать</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Ваш предпочитаемый метод заучивания стихов
              </p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h3 className="mb-6">Уведомления</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ежедневные напоминания</Label>
                <p className="text-sm text-muted-foreground">
                  Получать напоминания о повторении стихов
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Еженедельная сводка прогресса</Label>
                <p className="text-sm text-muted-foreground">
                  Получать еженедельную статистику по email
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Предупреждения о серии</Label>
                <p className="text-sm text-muted-foreground">
                  Получать уведомления, когда серия под угрозой
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-6">
          <h3 className="mb-6">Аккаунт</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Полное имя</Label>
              <Input
                id="name"
                defaultValue="Иван Иванов"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">Email адрес</Label>
              <Input
                id="email"
                type="email"
                defaultValue="ivan.ivanov@example.com"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Select defaultValue="europe-moscow">
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="europe-moscow">Москва (MSK)</SelectItem>
                  <SelectItem value="europe-kiev">Киев (EET)</SelectItem>
                  <SelectItem value="europe-minsk">Минск (MSK)</SelectItem>
                  <SelectItem value="asia-yekaterinburg">Екатеринбург (YEKT)</SelectItem>
                  <SelectItem value="asia-novosibirsk">Новосибирск (NOVT)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Используется для ежедневных напоминаний и отслеживания серии
              </p>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card className="p-6">
          <h3 className="mb-6">Управление данными</h3>
          
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <Label>Экспорт данных</Label>
                <p className="text-sm text-muted-foreground">
                  Скачать все ваши стихи и прогресс
                </p>
              </div>
              <Button variant="outline">Экспорт</Button>
            </div>

            <Separator />

            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <Label>Сбросить прогресс</Label>
                <p className="text-sm text-muted-foreground">
                  Очистить всю историю повторений и начать заново
                </p>
              </div>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                Сбросить
              </Button>
            </div>

            <Separator />

            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <Label>Удалить аккаунт</Label>
                <p className="text-sm text-muted-foreground">
                  Навсегда удалить ваш аккаунт и данные
                </p>
              </div>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                Удалить
              </Button>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">
            <Save className="w-4 h-4 mr-2" />
            Сохранить изменения
          </Button>
        </div>
      </div>
    </div>
  );
}
