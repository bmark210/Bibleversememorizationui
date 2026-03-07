'use client'

import React from 'react'
import type { LocationTheme } from './themes'

interface StatsBarProps {
  streakDays: number
  score: number
  rank: number | null
  bottomInset: number
  theme: LocationTheme
}

interface StatItemProps {
  icon: string
  value: string | number
  label: string
  accentColor: string
}

function StatItem({ icon, value, label, accentColor }: StatItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        flex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
        <span
          style={{
            fontWeight: 800,
            fontSize: 17,
            color: accentColor,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: 'rgba(0,0,0,0.45)',
          letterSpacing: 0.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export function StatsBar({ streakDays, score, rank, bottomInset, theme }: StatsBarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: bottomInset + 12,
        paddingTop: 12,
        paddingLeft: 16,
        paddingRight: 16,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: `${theme.stepBg}e0`,
        borderTop: `1px solid ${theme.accentColor}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 25,
      }}
    >
      <StatItem icon="🔥" value={streakDays} label="дней" accentColor={theme.accentColor} />

      <div
        style={{
          width: 1,
          height: 32,
          background: `${theme.accentColor}33`,
          flexShrink: 0,
        }}
      />

      <StatItem icon="⚡" value={score} label="очков" accentColor={theme.accentColor} />

      <div
        style={{
          width: 1,
          height: 32,
          background: `${theme.accentColor}33`,
          flexShrink: 0,
        }}
      />

      <StatItem
        icon="🏆"
        value={rank != null ? `#${rank}` : '—'}
        label="место"
        accentColor={theme.accentColor}
      />
    </div>
  )
}
