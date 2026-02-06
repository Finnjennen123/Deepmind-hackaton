import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrbTransitionProps {
  onComplete: () => void;
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  spin: number;
}

function generateParticles(count: number): Particle[] {
  const colors = ['#ff6b00', '#ff8533', '#ffab5e', '#00c864', '#00a855', '#1a1a1a', '#444', '#222'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
    distance: 150 + Math.random() * 500,
    size: 3 + Math.random() * 14,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.3,
    spin: (Math.random() - 0.5) * 360,
  }));
}

export default function OrbTransition({ onComplete }: OrbTransitionProps) {
  const [visible, setVisible] = useState(true);
  const [exploded, setExploded] = useState(false);
  const particles = useMemo(() => generateParticles(64), []);

  useEffect(() => {
    // Orb pulses for 0.7s, then explodes
    const t1 = setTimeout(() => setExploded(true), 700);
    // Particles scatter and fade naturally over ~2.5s, then we fade the overlay
    const t2 = setTimeout(() => setVisible(false), 3400);
    // After the exit animation, signal done
    const t3 = setTimeout(() => onComplete(), 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: '#faf9f7',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Central orb — pulses then vanishes on explosion */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={
              exploded
                ? { scale: 0, opacity: 0 }
                : { scale: [0.5, 1, 1.15, 1], opacity: 1 }
            }
            transition={
              exploded
                ? { duration: 0.15, ease: 'easeIn' }
                : { duration: 0.7, ease: 'easeInOut' }
            }
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b00, #ff8533)',
              boxShadow: '0 0 80px rgba(255, 107, 0, 0.4), 0 0 160px rgba(255, 107, 0, 0.15)',
              position: 'absolute',
            }}
          />

          {/* Shockwave ring */}
          {exploded && (
            <motion.div
              initial={{ scale: 0, opacity: 0.7 }}
              animate={{ scale: 8, opacity: 0 }}
              transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: '2px solid rgba(255, 107, 0, 0.35)',
                position: 'absolute',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Flash burst on explosion */}
          {exploded && (
            <motion.div
              initial={{ opacity: 0.6, scale: 0.5 }}
              animate={{ opacity: 0, scale: 3 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,107,0,0.35) 0%, rgba(255,133,51,0.1) 50%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Particles — scatter outward and fade to nothing */}
          {exploded &&
            particles.map((p) => (
              <ExplodingParticle key={p.id} particle={p} />
            ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ExplodingParticle({ particle }: { particle: Particle }) {
  const { angle, distance, size, color, delay, spin } = particle;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;
  const farX = Math.cos(angle) * (distance * 1.3);
  const farY = Math.sin(angle) * (distance * 1.3);

  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        x: [0, tx, farX],
        y: [0, ty, farY],
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0],
        rotate: [0, spin, spin * 1.3],
      }}
      transition={{
        duration: 2.2,
        delay,
        ease: [0.22, 1, 0.36, 1],
        times: [0, 0.4, 1],
        opacity: { duration: 2.4, delay, times: [0, 0.25, 1] },
        scale: { duration: 2.4, delay, times: [0, 0.3, 1] },
      }}
      style={{
        width: size,
        height: size,
        borderRadius: size > 10 ? 4 : '50%',
        background: color,
        position: 'absolute',
        boxShadow: `0 0 ${size * 3}px ${color}55`,
      }}
    />
  );
}
