export interface PathPoint {
  x: number
  y: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Builds a gentler horizontal drift than a plain sine wave.
 * The two-frequency blend keeps the line smooth but less synthetic.
 */
export function stepXFraction(stepIndex: number, totalSteps: number, amplitude = 0.26): number {
  const progress = totalSteps <= 1 ? 0 : stepIndex / (totalSteps - 1)
  const primary = Math.sin(stepIndex * 0.64)
  const secondary = Math.sin(stepIndex * 0.22 + 0.85) * 0.42
  const envelope = 0.92 - Math.abs(progress - 0.5) * 0.18
  const drift = (primary * 0.72 + secondary * 0.28) * amplitude * envelope

  return clamp(0.5 + drift, 0.16, 0.84)
}

export function generatePathPoints(
  steps: number,
  width: number,
  height: number,
  options?: {
    paddingTop?: number
    paddingBottom?: number
    amplitude?: number
    stepOffset?: number
  },
): PathPoint[] {
  if (steps <= 0) return []

  const paddingTop = options?.paddingTop ?? 28
  const paddingBottom = options?.paddingBottom ?? 28
  const amplitude = options?.amplitude ?? 0.26
  const stepOffset = options?.stepOffset ?? 0
  const usableHeight = Math.max(height - paddingTop - paddingBottom, 1)

  return Array.from({ length: steps }, (_, index) => {
    const progress = steps === 1 ? 0 : index / (steps - 1)
    return {
      x: stepXFraction(stepOffset + index, Math.max(steps + stepOffset, steps), amplitude) * width,
      y: paddingTop + progress * usableHeight,
    }
  })
}

/**
 * Converts points to a smooth Catmull-Rom spline expressed as cubic bezier commands.
 */
export function pointsToSvgPath(points: PathPoint[]): string {
  if (points.length < 2) return ''

  const first = points[0]!
  let path = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]!
    const p1 = points[index]!
    const p2 = points[index + 1]!
    const p3 = points[index + 2] ?? p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }

  return path
}

export function generateRelativePathPoints(
  steps: number,
  options?: {
    startY?: number
    endY?: number
    amplitude?: number
    stepOffset?: number
  },
): PathPoint[] {
  if (steps <= 0) return []

  const startY = options?.startY ?? 0.1
  const endY = options?.endY ?? 0.9
  const amplitude = options?.amplitude ?? 0.26
  const stepOffset = options?.stepOffset ?? 0
  const usableHeight = endY - startY

  return Array.from({ length: steps }, (_, index) => {
    const progress = steps === 1 ? 0 : index / (steps - 1)
    return {
      x: stepXFraction(stepOffset + index, Math.max(steps + stepOffset, steps), amplitude),
      y: startY + progress * usableHeight,
    }
  })
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
