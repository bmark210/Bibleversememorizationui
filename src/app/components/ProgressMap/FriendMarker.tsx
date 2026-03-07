'use client'

import React from 'react'

export type FriendMarkerEmphasis = 'default' | 'ahead' | 'behind'

interface FriendMarkerProps {
  name: string
  initials: string
  avatarUrl: string | null
  xPct: number
  yPct: number
  offsetX: number
  offsetY: number
  emphasis?: FriendMarkerEmphasis
  badgeLabel?: string | null
  seed: string
}

const FRIEND_PALETTE = [
  ['#a57d47', '#6f5431'],
  ['#879064', '#556039'],
  ['#c08e62', '#875335'],
  ['#93817c', '#5a4e4a'],
  ['#907052', '#664a31'],
]

function toPaletteIndex(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash % FRIEND_PALETTE.length
}

function getShortName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

function AvatarFace({
  avatarUrl,
  initials,
  palette,
}: {
  avatarUrl: string | null
  initials: string
  palette: string[]
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'inherit',
        }}
      />
    )
  }

  return (
    <span
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        background: `linear-gradient(180deg, ${palette[0]} 0%, ${palette[1]} 100%)`,
        color: '#fff8ef',
        fontSize: initials.length > 1 ? 9 : 10,
        fontWeight: 800,
        letterSpacing: 0.2,
      }}
    >
      {initials}
    </span>
  )
}

export function FriendMarker({
  name,
  initials,
  avatarUrl,
  xPct,
  yPct,
  offsetX,
  offsetY,
  emphasis = 'default',
  badgeLabel,
  seed,
}: FriendMarkerProps) {
  const palette = FRIEND_PALETTE[toPaletteIndex(seed)] ?? FRIEND_PALETTE[0]!
  const size = emphasis === 'default' ? 22 : 28
  const ringColor =
    emphasis === 'ahead'
      ? 'rgba(118, 151, 83, 0.72)'
      : emphasis === 'behind'
        ? 'rgba(193, 142, 98, 0.72)'
        : 'rgba(255,255,255,0.54)'
  const label = emphasis === 'default' ? null : getShortName(name)

  return (
    <div
      title={name}
      aria-label={name}
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
        zIndex: emphasis === 'default' ? 8 : 11,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '999px',
          padding: 2,
          background: ringColor,
          boxShadow:
            emphasis === 'default'
              ? '0 8px 16px rgba(60,44,27,0.14)'
              : `0 10px 24px ${ringColor}`,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.84)',
            background: 'rgba(250,244,234,0.78)',
          }}
        >
          <AvatarFace avatarUrl={avatarUrl} initials={initials} palette={palette} />
        </div>

        {badgeLabel ? (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -8,
              minWidth: 22,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              background: 'rgba(53, 38, 20, 0.9)',
              border: '1px solid rgba(255, 235, 204, 0.26)',
              color: '#fff2d9',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {badgeLabel}
          </span>
        ) : null}
      </div>

      {label ? (
        <div
          style={{
            position: 'absolute',
            top: size + 6,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            padding: '4px 8px',
            borderRadius: 999,
            background: 'rgba(52, 37, 21, 0.82)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#fff7ea',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.2,
            boxShadow: '0 8px 24px rgba(49,35,20,0.18)',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  )
}
