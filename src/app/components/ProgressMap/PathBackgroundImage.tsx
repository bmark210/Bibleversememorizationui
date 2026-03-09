'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { PathPoint } from './utils'
import type { PilgrimLocationPathPoint } from './pilgrimConfig'

interface PathBackgroundImageProps {
  imageUrl: string
  /** Точки пути в относительных координатах (0-1) - обязательные */
  pathPoints: PilgrimLocationPathPoint[]
  width: number
  height: number
  /** Режим заполнения */
  fitMode?: 'cover' | 'contain' | 'fill'
  /** Фокусная точка для cover режима (0-1) */
  focalPoint?: { x: number; y: number }
  /** Отступы для fine-tuning */
  padding?: { top: number; bottom: number; left: number; right: number }
  /** Прозрачность картинки */
  opacity?: number
  /** Функция-ребенок получает преобразованные точки пути в canvas координатах */
  children: (points: PathPoint[]) => React.ReactNode
}

interface ImageTransform {
  scale: number
  x: number
  y: number
  /** Область видимой части картинки (0-1) после cover cropping */
  visibleRect: { x: number; y: number; width: number; height: number }
}

/**
 * Вычисляет transform для cover режима (как object-fit: cover)
 */
function calculateCoverTransform(
  imgW: number,
  imgH: number,
  containerW: number,
  containerH: number,
  focalPoint: { x: number; y: number } = { x: 0.5, y: 0.5 }
): ImageTransform {
  const imgAspect = imgW / imgH
  const containerAspect = containerW / containerH

  let scale: number
  let visibleW: number
  let visibleH: number

  if (imgAspect > containerAspect) {
    // Картинка шире контейнера - масштабируем по высоте, обрезаем по бокам
    scale = containerH / imgH
    visibleH = 1 // Вся высота видна
    visibleW = (containerW / scale) / imgW // Какая часть ширины видна
  } else {
    // Картинка уже контейнера - масштабируем по ширине, обрезаем сверху/снизу
    scale = containerW / imgW
    visibleW = 1 // Вся ширина видна
    visibleH = (containerH / scale) / imgH // Какая часть высоты видна
  }

  // Вычисляем смещение чтобы фокусная точка была видна
  // visibleRect.x/y - это относительные координаты видимой области на картинке
  const maxOffsetX = Math.max(0, 1 - visibleW)
  const maxOffsetY = Math.max(0, 1 - visibleH)
  
  // Фокусная точка должна быть в центре видимой области
  let visibleX = focalPoint.x - visibleW / 2
  let visibleY = focalPoint.y - visibleH / 2
  
  // Клэмпим чтобы не выйти за границы картинки
  visibleX = Math.max(0, Math.min(maxOffsetX, visibleX))
  visibleY = Math.max(0, Math.min(maxOffsetY, visibleY))

  // Пиксельные координаты трансформации
  const scaledImgW = imgW * scale
  const scaledImgH = imgH * scale
  
  const x = -visibleX * scaledImgW
  const y = -visibleY * scaledImgH

  return {
    scale,
    x,
    y,
    visibleRect: {
      x: visibleX,
      y: visibleY,
      width: visibleW,
      height: visibleH,
    },
  }
}

/**
 * Конвертирует относительные точки пути (0-1) в canvas координаты
 * с учётом cover трансформации
 */
function convertPathPointsToCanvas(
  configPoints: PilgrimLocationPathPoint[],
  transform: ImageTransform,
  imgW: number,
  imgH: number,
  _containerW: number,
  _containerH: number,
): PathPoint[] {
  const { scale, x, y } = transform

  return configPoints.map((point) => {
    // Координаты точки на оригинальной картинке
    const imgX = point.x * imgW * scale
    const imgY = point.y * imgH * scale

    // Позиция на canvas с учётом transform
    const canvasX = imgX + x
    const canvasY = imgY + y

    return { x: canvasX, y: canvasY }
  })
}

/**
 * Проверяет что точка попадает в видимую область
 */
function isPointVisible(
  point: PilgrimLocationPathPoint,
  visibleRect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= visibleRect.x &&
    point.x <= visibleRect.x + visibleRect.width &&
    point.y >= visibleRect.y &&
    point.y <= visibleRect.y + visibleRect.height
  )
}

/**
 * Компонент синхронизирует фоновую картинку с координатами SVG path.
 * 
 * Архитектура для 16:9 картинок:
 * 1. Картинка масштабируется в cover режиме (заполняет весь экран)
 * 2. Кастомные точки пути из конфига преобразуются в canvas координаты
 * 3. SVG path использует эти точки вместо автоматической генерации
 */
export function PathBackgroundImage({
  imageUrl,
  pathPoints,
  width,
  height,
  fitMode = 'cover',
  focalPoint = { x: 0.5, y: 0.5 },
  padding = { top: 0, bottom: 0, left: 0, right: 0 },
  opacity = 1,
  children,
}: PathBackgroundImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageNaturalSize, setImageNaturalSize] = useState<{ w: number; h: number } | null>(null)

  // Загрузка картинки
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      setImageLoaded(true)
    }
    img.src = imageUrl
  }, [imageUrl])

  // Вычисляем трансформацию
  const transform = useMemo<ImageTransform | null>(() => {
    if (!imageLoaded || !imageNaturalSize) return null

    const { w: imgW, h: imgH } = imageNaturalSize
    const containerW = width - padding.left - padding.right
    const containerH = height - padding.top - padding.bottom

    if (fitMode === 'cover') {
      return calculateCoverTransform(imgW, imgH, containerW, containerH, focalPoint)
    }

    // Для других режимов пока используем cover (можно расширить)
    return calculateCoverTransform(imgW, imgH, containerW, containerH, focalPoint)
  }, [imageLoaded, imageNaturalSize, width, height, fitMode, focalPoint, padding])

  // Конвертируем относительные точки пути (0-1) в canvas координаты
  const canvasPoints = useMemo<PathPoint[]>(() => {
    if (!transform || !imageNaturalSize) {
      // Fallback: возвращаем точки как есть (в относительных координатах)
      return pathPoints.map((p) => ({ x: p.x * width, y: p.y * height }))
    }

    const { w: imgW, h: imgH } = imageNaturalSize
    const converted = convertPathPointsToCanvas(
      pathPoints,
      transform,
      imgW,
      imgH,
      width,
      height
    )

    // Проверяем что все точки видны
    const allVisible = pathPoints.every((p: PilgrimLocationPathPoint) => isPointVisible(p, transform.visibleRect))
    if (!allVisible) {
      console.warn('[PathBackgroundImage] Некоторые точки пути вне видимой области картинки')
    }

    return converted
  }, [pathPoints, transform, imageNaturalSize, width, height])

  if (!imageLoaded || !transform) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width,
          height,
        }}
      >
        {children(pathPoints.map((p) => ({ x: p.x * width, y: p.y * height })))}
      </div>
    )
  }

  const { scale, x, y, visibleRect } = transform
  const { w: imgW, h: imgH } = imageNaturalSize!

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
      }}
    >
      {/* Фоновая картинка с cover трансформацией */}
      <div
        style={{
          position: 'absolute',
          top: padding.top,
          left: padding.left,
          width: imgW * scale,
          height: imgH * scale,
          transform: `translate(${x}px, ${y}px)`,
          transformOrigin: 'top left',
          willChange: 'transform',
          opacity,
        }}
      >
        <img
          src={imageUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'fill',
          }}
        />
      </div>

      {/* Контент поверх (SVG path, маркеры) с преобразованными точками */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
        {children(canvasPoints)}
      </div>

      {/* Debug: показываем границы видимой области (убрать в проде) */}
      {false && (
        <div
          style={{
            position: 'absolute',
            top: padding.top,
            left: padding.left,
            width: visibleRect.width * imgW * scale,
            height: visibleRect.height * imgH * scale,
            transform: `translate(${visibleRect.x * imgW * scale + x}px, ${visibleRect.y * imgH * scale + y}px)`,
            border: '2px dashed red',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        />
      )}
    </div>
  )
}

// Экспортируем вспомогательные функции для использования в других компонентах
export { calculateCoverTransform, convertPathPointsToCanvas, isPointVisible }
