import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, type Variants } from 'motion/react';

/**
 * KiroGhost, the mascot mark. Traced from web/public/kiro-logo.png: a rounded
 * body with a flat-ish bottom scalloped by two soft feet, and two oval eyes.
 * This is the single reusable ghost used everywhere in the app (favicon, XP
 * orb, hint bubble, map marker, badge seal, locked state).
 */

export type GhostMood = 'idle' | 'happy' | 'thinking' | 'sad' | 'celebrating';

export interface KiroGhostProps {
  /** Pixel size of the square viewport. Defaults to 96. */
  size?: number;
  mood?: GhostMood;
  /** Gentle vertical bob loop, off by default so static contexts (badges) stay still. */
  float?: boolean;
  /** Extra classes applied to the outer svg element. */
  className?: string;
  /** Accessible label. Pass '' to mark the mark purely decorative. */
  label?: string;
}

const bodyVariantsByMood: Record<GhostMood, Variants['body']> = {
  idle: { scale: 1, rotate: 0 },
  happy: { scale: [1, 1.08, 0.97, 1.02, 1], rotate: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  thinking: { scale: 1, rotate: [0, -2, 2, -1, 0], transition: { duration: 1.6, repeat: Infinity } },
  sad: { scale: [1, 0.95, 1], rotate: [0, -3, 3, -2, 2, 0], transition: { duration: 0.45 } },
  celebrating: {
    scale: [1, 1.15, 0.95, 1.1, 1],
    rotate: [0, -4, 4, -2, 0],
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

/**
 * Eyes track the cursor slightly. Used on the dashboard per the brief. Returns
 * a small [dx, dy] offset in pixels, clamped so the pupils never leave the socket.
 */
function useEyeTracking(enabled: boolean) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 20 });
  const springY = useSpring(y, { stiffness: 220, damping: 20 });
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      x.set(0);
      y.set(0);
      return;
    }
    const handleMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const distance = Math.hypot(dx, dy) || 1;
      const clampedDistance = Math.min(distance, 220);
      const max = 2.4;
      x.set((dx / distance) * (clampedDistance / 220) * max);
      y.set((dy / distance) * (clampedDistance / 220) * max);
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, [enabled, x, y]);

  return { ref, springX, springY };
}

export const KiroGhost = forwardRef<SVGSVGElement, KiroGhostProps>(function KiroGhost(
  { size = 96, mood = 'idle', float = false, className, label = 'Kiro' },
  forwardedRef,
) {
  const gradientId = useId();
  const glowId = useId();
  const trackCursor = mood === 'idle' || mood === 'happy';
  const { ref: trackingRef, springX, springY } = useEyeTracking(trackCursor);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (mood === 'celebrating') {
      setConfetti(true);
      const timeout = setTimeout(() => setConfetti(false), 900);
      return () => clearTimeout(timeout);
    }
    setConfetti(false);
    return undefined;
  }, [mood]);

  const mouthPath = mouthForMood(mood);
  const eyeShapeScaleY = mood === 'happy' ? 0.35 : mood === 'sad' ? 1.15 : 1;

  return (
    <motion.svg
      ref={(node) => {
        trackingRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) (forwardedRef as { current: SVGSVGElement | null }).current = node;
      }}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      animate={float ? { y: [0, -4, 0] } : undefined}
      transition={float ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
      data-testid="kiro-ghost"
      data-mood={mood}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.g variants={bodyVariantsByMood} animate={mood} initial={false} style={{ originX: 0.5, originY: 0.55 }}>
        {/* Ghost body: rounded dome top, two soft feet along a flat-ish bottom. */}
        <path
          d="M48 8
             C 26 8 12 24 12 46
             L 12 76
             C 12 82 18 85 22 81
             L 27 75
             C 30 79 36 81 40 76
             L 44 71
             C 46 74 50 74 52 71
             L 56 76
             C 60 81 66 79 69 75
             L 74 81
             C 78 85 84 82 84 76
             L 84 46
             C 84 24 70 8 48 8 Z"
          fill={`url(#${gradientId})`}
          stroke="#f4f1fb"
          strokeOpacity={0.15}
          strokeWidth={1.5}
        />

        {/* Eyes: two ovals, tracking the cursor a little when idle or happy. */}
        <motion.g style={{ x: springX, y: springY }}>
          <ellipse cx="35" cy="46" rx="6.5" ry={9 * eyeShapeScaleY} fill="#160a24" />
          <ellipse cx="61" cy="46" rx="6.5" ry={9 * eyeShapeScaleY} fill="#160a24" />
          {mood !== 'happy' && (
            <>
              <circle cx="33" cy="42" r="1.6" fill="#f4f1fb" opacity={0.85} />
              <circle cx="59" cy="42" r="1.6" fill="#f4f1fb" opacity={0.85} />
            </>
          )}
        </motion.g>

        <path
          d={mouthPath}
          fill="none"
          stroke="#160a24"
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={mood === 'idle' ? 0.5 : 0.85}
        />
      </motion.g>

      {confetti && <ConfettiBurst />}
    </motion.svg>
  );
});

function mouthForMood(mood: GhostMood): string {
  switch (mood) {
    case 'happy':
    case 'celebrating':
      return 'M38 58 Q48 68 58 58';
    case 'sad':
      return 'M38 62 Q48 54 58 62';
    case 'thinking':
      return 'M40 60 L56 60';
    default:
      return 'M40 59 Q48 62 56 59';
  }
}

const CONFETTI_COLORS = ['#f4f1fb', '#ddd6fe', '#a78bfa', '#fbbf24', '#34d399'];

function ConfettiBurst() {
  const pieces = Array.from({ length: 10 }, (_, i) => i);
  return (
    <g aria-hidden="true">
      {pieces.map((i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 26 + (i % 3) * 6;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        return (
          <motion.rect
            key={i}
            x={46}
            y={40}
            width={4}
            height={4}
            rx={1}
            fill={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
            initial={{ opacity: 1, x: 46, y: 40, rotate: 0 }}
            animate={{ opacity: 0, x: 46 + dx, y: 40 + dy, rotate: 180 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        );
      })}
    </g>
  );
}
