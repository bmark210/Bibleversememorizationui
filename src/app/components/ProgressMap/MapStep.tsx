'use client'

import React from 'react'

export type StepState = 'done' | 'active' | 'locked'

interface MapStepProps {
  state: StepState
  number: number
  onClick?: () => void
}

const SIZE = 52

export function MapStep({ state, number, onClick }: MapStepProps) {
  if (state === 'done') {
    return (
      <div
        onClick={onClick}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #4ade80, #16a34a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(34,197,94,0.5), 0 2px 6px rgba(0,0,0,0.25)',
          border: '3px solid rgba(255,255,255,0.4)',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path
            d="M4 11.5L9 16.5L18 7"
            stroke="#fff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  if (state === 'active') {
    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* "ТУТ" label */}
        <div
          style={{
            position: 'absolute',
            bottom: SIZE + 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1d4ed8',
            color: '#fff',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            whiteSpace: 'nowrap',
            boxShadow: '0 3px 12px rgba(29,78,216,0.45)',
          }}
        >
          ТУТ
          {/* Triangle pointer */}
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '7px solid #1d4ed8',
            }}
          />
        </div>

        {/* Node */}
        <div
          onClick={onClick}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #ffffff, #eff6ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3.5px solid #3b82f6',
            boxShadow: '0 4px 20px rgba(59,130,246,0.55), 0 0 0 6px rgba(59,130,246,0.15)',
            cursor: onClick ? 'pointer' : 'default',
            animation: 'pm-pulse-active 2s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>{number}</span>
        </div>
      </div>
    )
  }

  // locked
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid rgba(255,255,255,0.2)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{number}</span>
    </div>
  )
}
