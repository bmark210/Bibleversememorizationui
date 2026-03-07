'use client'

import React from 'react'
import type { PilgrimLocationPalette } from './pilgrimConfig'

export type StepState = 'done' | 'active' | 'locked'

interface StepNodeProps {
  state: StepState
  xPct: number
  yPct: number
  palette: PilgrimLocationPalette
  isLocationMilestone?: boolean
  onClick?: () => void
}

export function StepNode({
  state,
  xPct,
  yPct,
  palette,
  isLocationMilestone = false,
  onClick,
}: StepNodeProps) {
  const size = state === 'active' ? 20 : isLocationMilestone ? 13 : 10
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${xPct}%`,
    top: `${yPct}%`,
    width: size,
    height: size,
    borderRadius: '999px',
    transform: 'translate(-50%, -50%)',
    zIndex: state === 'active' ? 10 : 4,
    pointerEvents: onClick ? 'auto' : 'none',
  }

  if (state === 'active') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Открыть следующий шаг"
        style={{
          ...baseStyle,
          border: 'none',
          background: `radial-gradient(circle at 30% 30%, #fff8e6 0%, ${palette.accent} 58%, #53391d 100%)`,
          boxShadow: `0 0 0 9px ${palette.accentSoft}, 0 14px 28px ${palette.pathGlow}`,
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: '999px',
            border: '2px solid rgba(255,255,255,0.86)',
          }}
        />
      </button>
    )
  }

  if (state === 'done') {
    return (
      <div
        aria-hidden
        style={{
          ...baseStyle,
          background: `linear-gradient(180deg, #fff7e0 0%, ${palette.accent} 100%)`,
          boxShadow: isLocationMilestone
            ? `0 0 0 3px ${palette.accentSoft}`
            : `0 6px 14px ${palette.pathGlow}`,
        }}
      />
    )
  }

  return (
    <div
      aria-hidden
      style={{
        ...baseStyle,
        background: 'rgba(255, 248, 236, 0.22)',
        border: '1px solid rgba(255,255,255,0.28)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    />
  )
}
