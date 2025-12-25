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
        <h1 className="mb-1">Settings</h1>
        <p className="text-muted-foreground">
          Customize your learning experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Learning Preferences */}
        <Card className="p-6">
          <h3 className="mb-6">Learning Preferences</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="translation">Default Translation</Label>
              <Select defaultValue="niv">
                <SelectTrigger id="translation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niv">NIV - New International Version</SelectItem>
                  <SelectItem value="esv">ESV - English Standard Version</SelectItem>
                  <SelectItem value="kjv">KJV - King James Version</SelectItem>
                  <SelectItem value="nlt">NLT - New Living Translation</SelectItem>
                  <SelectItem value="nasb">NASB - New American Standard Bible</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose your preferred Bible translation for new verses
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="daily-goal">Daily Verse Goal</Label>
              <Input
                id="daily-goal"
                type="number"
                defaultValue="5"
                min="1"
                max="50"
              />
              <p className="text-sm text-muted-foreground">
                Number of verses to review each day
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="training-mode">Default Training Mode</Label>
              <Select defaultValue="flashcard">
                <SelectTrigger id="training-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flashcard">Flashcard</SelectItem>
                  <SelectItem value="fill-blanks">Fill in the Blanks</SelectItem>
                  <SelectItem value="first-letters">First Letters</SelectItem>
                  <SelectItem value="typing">Full Typing</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Your preferred method for verse memorization
              </p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h3 className="mb-6">Notifications</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded to review your verses
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Progress Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly stats via email
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Streak Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your streak is at risk
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-6">
          <h3 className="mb-6">Account</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                defaultValue="John Doe"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                defaultValue="john.doe@example.com"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="america-new-york">
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="america-new-york">Eastern Time (ET)</SelectItem>
                  <SelectItem value="america-chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="america-denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="america-los-angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="europe-london">London (GMT)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Used for daily reminders and streak tracking
              </p>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card className="p-6">
          <h3 className="mb-6">Data Management</h3>
          
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <Label>Export Data</Label>
                <p className="text-sm text-muted-foreground">
                  Download all your verses and progress
                </p>
              </div>
              <Button variant="outline">Export</Button>
            </div>

            <Separator />

            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <Label>Reset Progress</Label>
                <p className="text-sm text-muted-foreground">
                  Clear all review history and start fresh
                </p>
              </div>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                Reset
              </Button>
            </div>

            <Separator />

            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <Label>Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and data
                </p>
              </div>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                Delete
              </Button>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
