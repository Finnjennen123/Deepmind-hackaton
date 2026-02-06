import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface OrbExplosionProps {
  orbRect: { left: number; top: number; width: number; height: number };
  onComplete: () => void;
}

interface Shard {
  id: number;
  // start offset from center (on the orb surface)
  startX: number;
  startY: number;
  // final position — way beyond screen
  endX: number;
  endY: number;
  size: number;
  color: string;
  delay: number;
  spin: number;
  aspect: number;
}

function generateShards(count: number, orbRadius: number): Shard[] {
  const colors = [
    '#00c864', '#00a855', '#00e070', '#33d684', '#1abf5c',
    '#ff6b00', '#ff8533', '#ffab5e', '#ff7a1a',
  ];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 900 + Math.random() * 1400;
    // Start on or near the orb's edge
    const startDist = orbRadius * (0.3 + Math.random() * 0.7);
    return {
      id: i,
      startX: Math.cos(angle) * startDist,
      startY: Math.sin(angle) * startDist,
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance,
      size: 6 + Math.random() * 22,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.05, // very tight — almost simultaneous
      spin: (Math.random() - 0.5) * 540,
      aspect: 0.5 + Math.random() * 1.0,
    };
  });
}

// ═════════════════════════════════════════════════════════════
//  OrbExplosion — orb trembles briefly then shatters into
//  pieces that blast beyond the screen.
// ═════════════════════════════════════════════════════════════

export default function OrbExplosion({ orbRect, onComplete }: OrbExplosionProps) {
  const [phase, setPhase] = useState<'vibrate' | 'explode' | 'loading'>('vibrate');

  const orbCX = orbRect.left + orbRect.width / 2;
  const orbCY = orbRect.top + orbRect.height / 2;
  const orbR = orbRect.width / 2;

  const shards = useMemo(() => generateShards(48, orbR), [orbR]);

  useEffect(() => {
    // Subtle vibrate for 0.4s, then explode
    const t1 = setTimeout(() => setPhase('explode'), 400);
    // Show loading text once shards have cleared
    const t2 = setTimeout(() => setPhase('loading'), 1000);
    // Navigate
    const t3 = setTimeout(() => onComplete(), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#faf9f7',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* ── Orb: subtle vibrate then vanish ── */}
      {phase === 'vibrate' && (
        <motion.div
          animate={{
            x: [0, -3, 4, -4, 3, -3, 4, -2, 3, 0],
            y: [0, 2, -3, 3, -2, 3, -3, 2, -2, 0],
            scale: [1, 1.01, 0.99, 1.02, 1.01, 1.02, 1.03, 1.02, 1.03, 1.04],
          }}
          transition={{ duration: 0.4, ease: 'linear' }}
          style={{
            position: 'fixed',
            left: orbCX - orbR,
            top: orbCY - orbR,
            width: orbRect.width,
            height: orbRect.height,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00c864, #00a855)',
            boxShadow: '0 0 60px rgba(0,200,100,0.4)',
          }}
        />
      )}

      {/* ── Explosion flash ── */}
      {phase !== 'vibrate' && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 5, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: orbCX - 120,
            top: orbCY - 120,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(0,200,100,0.5) 0%, rgba(0,200,100,0.15) 40%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Shockwave ring ── */}
      {phase !== 'vibrate' && (
        <motion.div
          initial={{ scale: 0, opacity: 0.7 }}
          animate={{ scale: 10, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            position: 'fixed',
            left: orbCX - 80,
            top: orbCY - 80,
            width: 160,
            height: 160,
            borderRadius: '50%',
            border: '2.5px solid rgba(0,200,100,0.35)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Shards: start at orb surface, blast outward ── */}
      {phase !== 'vibrate' &&
        shards.map((s) => {
          const w = s.size * s.aspect;
          const h = s.size;
          return (
            <motion.div
              key={s.id}
              initial={{
                x: s.startX,
                y: s.startY,
                scale: 1,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: s.endX,
                y: s.endY,
                scale: 0.4,
                opacity: 0,
                rotate: s.spin,
              }}
              transition={{
                duration: 1.0,
                delay: s.delay,
                ease: [0.16, 1, 0.3, 1], // fast start, gentle tail
              }}
              style={{
                position: 'fixed',
                left: orbCX - w / 2,
                top: orbCY - h / 2,
                width: w,
                height: h,
                borderRadius: s.size > 16 ? 4 : s.aspect > 0.8 ? '50%' : 3,
                background: s.color,
                boxShadow: `0 0 ${s.size}px ${s.color}66`,
                pointerEvents: 'none',
              }}
            />
          );
        })}

      {/* ── "Making course..." text ── */}
      {phase === 'loading' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            textAlign: 'center',
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#999',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            Making course...
          </motion.p>
        </motion.div>
      )}
    </div>
  );
}
