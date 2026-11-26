import { D_BODY, D_BOX, D_EYES, D_EYE_R, EYES, INK, SHAPES, SHAPE_FILL, type ShapeId } from '@/lib/djazzi-d-mark'

// DJAZZI(26/11/2026): the person's Djazzi, a shape whose eyes blink, as on
// the phone (agent-shape.tsx). The choices offered are in model.ts.

export const fillOf = (color: string) => SHAPE_FILL[color] ?? SHAPE_FILL.white

/** A Djazzi shape whose eyes blink (`dj-eye`, in the onboarding's CSS). */
export function Shape({ shape, color, size }: { shape: ShapeId; color: string; size: number }) {
  const fill = fillOf(color)
  const isD = shape === 'b'
  const box = isD ? `${D_BOX.x} ${D_BOX.y} ${D_BOX.size} ${D_BOX.size}` : '0 0 100 100'
  const e = isD ? null : (SHAPES[shape as Exclude<ShapeId, 'b'>].eyes ?? EYES)
  const eyes: Array<[number, number]> = isD ? D_EYES.map((p) => [p.cx, p.cy] as [number, number]) : [[e![0], e![1]], [e![2], e![3]]]
  return (
    <svg width={size} height={size} viewBox={box} aria-hidden="true">
      <path d={isD ? D_BODY : SHAPES[shape as Exclude<ShapeId, 'b'>].d} fill={fill} />
      {eyes.map(([cx, cy], i) => (
        <circle key={i} className="dj-eye" cx={cx} cy={cy} r={isD ? D_EYE_R : 5.2} fill={fill === INK ? '#FFFFFF' : INK} />
      ))}
    </svg>
  )
}
