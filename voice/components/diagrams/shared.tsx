// Shared SVG theme constants and helpers for diagram renderers

export const THEME = {
  bg: '#faf9f7',
  surface: '#f5f3f0',
  surfaceLight: '#ece9e4',
  border: '#ece9e4',
  borderHover: '#d9d4cd',
  accent: '#ff6b00',
  accentHover: '#e55a00',
  text: '#1a1a1a',
  textMuted: '#999',
  correct: '#00c864',
  correctBg: '#ecfdf5',
  incorrect: '#f44336',
  incorrectBg: '#ffebee',
  warning: '#ff9800',
  warningBg: '#fff5eb',
  white: '#ffffff',
} as const

export const SVG_WIDTH = 760
export const SVG_HEIGHT = 460

// Reusable SVG arrowhead marker definitions
export function ArrowDefs() {
  return (
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill={THEME.textMuted} />
      </marker>
      <marker
        id="arrowhead-accent"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill={THEME.accent} />
      </marker>
      <marker
        id="arrowhead-correct"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill={THEME.correct} />
      </marker>
      <marker
        id="arrowhead-incorrect"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill={THEME.incorrect} />
      </marker>
    </defs>
  )
}

// Geometry helpers
export function midpoint(x1: number, y1: number, x2: number, y2: number) {
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
}

export function pointInRect(
  px: number, py: number,
  rx: number, ry: number, rw: number, rh: number
) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Convert pointer event to SVG coordinates
export function pointerToSVG(
  e: React.PointerEvent<SVGSVGElement>,
  svg: SVGSVGElement
): { x: number; y: number } {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  return {
    x: (e.clientX - ctm.e) / ctm.a,
    y: (e.clientY - ctm.f) / ctm.d,
  }
}
