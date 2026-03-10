'use client'

import React from 'react'

interface PlayerMarkerProps {
  name: string
  initials: string
  avatarUrl: string | null
  badgeLabel?: string | null
  xPct: number
  yPct: number
  onClick?: () => void
}

function AvatarFace({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null
  initials: string
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
        background: 'linear-gradient(180deg, #8f7449 0%, #5d4528 100%)',
        color: '#fffaf0',
        fontSize: initials.length > 1 ? 12 : 14,
        fontWeight: 800,
        letterSpacing: 0.4,
      }}
    >
      {initials}
    </span>
  )
}

export function PlayerMarker({
  name,
  initials,
  avatarUrl,
  badgeLabel,
  xPct,
  yPct,
  onClick,
}: PlayerMarkerProps) {
  const markerStyle = {
    position: 'absolute',
    left: `${xPct}%`,
    top: `${yPct}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: 14,
    pointerEvents: onClick ? 'auto' : 'none',
  } as const
  const markerContent = (
    <>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '999px',
          padding: 3,
          background: 'linear-gradient(180deg, rgba(255,247,229,0.98) 0%, rgba(191,151,83,0.95) 100%)',
          boxShadow: '0 14px 32px rgba(98,73,33,0.28)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '999px',
            overflow: 'hidden',
            background: 'rgba(255,250,243,0.86)',
            border: '2px solid rgba(255,255,255,0.9)',
          }}
        >
          <AvatarFace avatarUrl={avatarUrl} initials={initials} />
        </div>
      </div>

      {badgeLabel ? (
        <span
          style={{
            position: 'absolute',
            right: -6,
            bottom: -4,
            minWidth: 26,
            height: 18,
            padding: '0 6px',
            borderRadius: 999,
            background: 'rgba(53, 38, 20, 0.92)',
            border: '1px solid rgba(255, 231, 191, 0.32)',
            color: '#fff3d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          {badgeLabel}
        </span>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={`Открыть профиль ${name}`}
        onClick={onClick}
        style={{
          ...markerStyle,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {markerContent}
      </button>
    )
  }

  return (
    <div aria-label={`Ваша позиция: ${name}`} style={markerStyle}>
      {markerContent}
    </div>
  )
}
