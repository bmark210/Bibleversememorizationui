'use client'

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Moon, Palette, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';

type Theme = 'light' | 'dark';

interface ProfileProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Profile({ theme, onToggleTheme }: ProfileProps) {
  const shouldReduceMotion = useReducedMotion();

  const sectionVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 12,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.24,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div
        {...(shouldReduceMotion
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.2, ease: 'easeOut' as const },
            })}
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: shouldReduceMotion ? 0 : 0.06,
                delayChildren: shouldReduceMotion ? 0 : 0.02,
              },
            },
          }}
          className="space-y-6"
        >
          <motion.div className="mb-2" variants={sectionVariants}>
            <h1 className="mb-1">Профиль</h1>
            <p className="text-muted-foreground">Настройки внешнего вида приложения.</p>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <Card className="relative overflow-hidden border-border/70 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-5 sm:p-6 gap-0">
              <div className="pointer-events-none absolute inset-0 opacity-65">
                <div className="absolute -top-20 -right-14 h-48 w-48 rounded-full bg-primary/15 blur-2xl" />
                <div className="absolute -bottom-16 left-0 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl" />
              </div>

              <div className="relative space-y-4">
                <h3 className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Оформление
                </h3>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="space-y-1">
                    <Label className="text-sm">Тема приложения</Label>
                    <p className="text-sm text-muted-foreground">
                      Сейчас активна {theme === 'dark' ? 'тёмная' : 'светлая'} тема.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onToggleTheme}
                    className="gap-2 rounded-full border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
                    aria-label={`Переключить на ${theme === 'light' ? 'тёмную' : 'светлую'} тему`}
                  >
                    <Sun className={`w-4 h-4 ${theme === 'dark' ? 'hidden' : 'block'}`} />
                    <Moon className={`w-4 h-4 ${theme === 'dark' ? 'block' : 'hidden'}`} />
                    <span>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
