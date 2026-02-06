import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import CourseHeader from '../components/course/CourseHeader';
import PartDetailPanel from '../components/course/PartDetailPanel';
import { MOCK_COURSE } from '../lib/mock-course';
import type { Course, Part, Phase, PartStatus } from '../lib/course-types';

// Dynamic import for React Flow (needs window)
const CourseCanvas = dynamic(
  () => import('../components/course/CourseCanvas'),
  { ssr: false }
);

// ── Main Page Component ──────────────────────────────────────

export default function CoursePage() {
  const router = useRouter();
  const [course, setCourse] = useState<Course>(MOCK_COURSE);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // ── Condensation animation state ──
  const [isCondensing, setIsCondensing] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<(() => void) | null>(null);

  // Find selected part and its phase
  const selectedPart: Part | null = (() => {
    if (!selectedPartId) return null;
    for (const phase of course.phases) {
      const part = phase.parts.find(p => p.id === selectedPartId);
      if (part) return part;
    }
    return null;
  })();

  const selectedPhase: Phase | null = (() => {
    if (!selectedPartId) return null;
    for (const phase of course.phases) {
      if (phase.parts.some(p => p.id === selectedPartId)) return phase;
    }
    return null;
  })();

  const handlePartClick = useCallback((partId: string) => {
    setSelectedPartId(partId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedPartId(null);
  }, []);

  // Helper: update a part's status and unlock next
  const updatePartStatus = useCallback((partId: string, newStatus: PartStatus) => {
    setCourse(prev => {
      const updated = JSON.parse(JSON.stringify(prev)) as Course;
      let foundPart = false;
      let shouldUnlockNext = false;

      for (let pi = 0; pi < updated.phases.length; pi++) {
        const phase = updated.phases[pi];
        for (let pti = 0; pti < phase.parts.length; pti++) {
          const part = phase.parts[pti];

          if (foundPart && shouldUnlockNext && part.status === 'locked') {
            part.status = 'not_started';
            shouldUnlockNext = false;
          }

          if (part.id === partId) {
            part.status = newStatus;
            foundPart = true;
            if (newStatus === 'mastered') {
              shouldUnlockNext = true;
            }
          }
        }

        // Cross-phase unlock: if we need to unlock and haven't yet, check next phase
        if (shouldUnlockNext && pi < updated.phases.length - 1) {
          const nextPhase = updated.phases[pi + 1];
          if (nextPhase.parts[0]?.status === 'locked') {
            nextPhase.parts[0].status = 'not_started';
            shouldUnlockNext = false;
          }
        }
      }

      return updated;
    });
  }, []);

  const handleStartLesson = useCallback(() => {
    if (selectedPartId) {
      updatePartStatus(selectedPartId, 'in_progress');
    }
  }, [selectedPartId, updatePartStatus]);

  const handleMarkMastered = useCallback(() => {
    if (selectedPartId) {
      updatePartStatus(selectedPartId, 'mastered');
      setSelectedPartId(null);
    }
  }, [selectedPartId, updatePartStatus]);

  // ── Trigger condensation ──
  const handleHomeClick = useCallback(() => {
    if (isCondensing) return;
    setSelectedPartId(null);
    setIsCondensing(true);
  }, [isCondensing]);

  // ── DOM-level animation: clone real nodes and animate them colliding ──
  useEffect(() => {
    if (!isCondensing) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Create a fixed overlay to hold the cloned nodes
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
    document.body.appendChild(overlay);

    // Clone every PartNode (skip phase-group backgrounds)
    const nodeEls = document.querySelectorAll('.react-flow__node');
    const clones: HTMLElement[] = [];
    let idx = 0;

    nodeEls.forEach((el) => {
      const dataId = el.getAttribute('data-id') || '';
      if (dataId.startsWith('phase_group_')) return;

      const rect = el.getBoundingClientRect();
      const clone = el.cloneNode(true) as HTMLElement;
      const delay = idx * 0.025;

      // Position the clone at the node's exact screen position
      clone.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        transform: none;
        z-index: 9999;
        pointer-events: none;
        margin: 0;
        transition:
          left 0.75s cubic-bezier(0.32,0,0.15,1) ${delay}s,
          top 0.75s cubic-bezier(0.32,0,0.15,1) ${delay}s,
          transform 0.75s cubic-bezier(0.32,0,0.15,1) ${delay}s,
          opacity 0.75s cubic-bezier(0.32,0,0.15,1) ${delay}s;
      `;

      overlay.appendChild(clone);
      clones.push(clone);
      idx++;
    });

    // Double rAF — ensure initial styles are painted, then trigger the collision
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clones.forEach((clone) => {
          const w = clone.offsetWidth;
          clone.style.left = `${centerX - w / 2}px`;
          clone.style.top = `${centerY - 20}px`;
          clone.style.transform = 'scale(0.12)';
          clone.style.opacity = '0';
        });
      });
    });

    // Show course card after nodes converge
    const t1 = setTimeout(() => setShowCard(true), 500);

    // Measure card rect, stash it, navigate
    const t2 = setTimeout(() => {
      if (cardRef.current) {
        const r = cardRef.current.getBoundingClientRect();
        sessionStorage.setItem(
          'condenseCard',
          JSON.stringify({ left: r.left, top: r.top, width: r.width, height: r.height }),
        );
      }
      router.push('/');
    }, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
  }, [isCondensing, router]);

  return (
    <>
      <Head>
        <title>{course.title} | AI Mentor</title>
        <meta name="description" content={`Personalized course: ${course.title}`} />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          WebkitFontSmoothing: 'antialiased',
          background: '#faf9f7',
        }}
      >
        {/* Course content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <CourseHeader course={course} onHomeClick={handleHomeClick} onResetView={() => resetViewRef.current?.()} />
          <CourseCanvas
            course={course}
            selectedPartId={selectedPartId}
            onPartClick={handlePartClick}
            onStatusChange={updatePartStatus}
            onResetViewReady={(fn) => { resetViewRef.current = fn; }}
          />
          <PartDetailPanel
            part={selectedPart}
            phase={selectedPhase}
            isOpen={!!selectedPartId}
            onClose={handleClosePanel}
            onStartLesson={handleStartLesson}
            onMarkMastered={handleMarkMastered}
          />
        </motion.div>

        {/* Condensation — backdrop + course card */}
        {isCondensing && (
          <>
            {/* White backdrop — hides edges, background, phase groups */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9998,
                background: 'rgba(250,249,247,0.93)',
              }}
            />

            {/* Course card — materializes at center after nodes collide */}
            <motion.div
              ref={cardRef}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={showCard ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.4, ease: [0.32, 0, 0.15, 1] }}
              style={{
                position: 'fixed',
                left: 'calc(50% - 150px)',
                top: 'calc(50% - 25px)',
                width: 300,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                border: '1px solid #ece9e4',
                borderRadius: 10,
                background: '#faf9f7',
                boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {(() => {
                const totalP = course.phases.reduce((s, p) => s + p.parts.length, 0);
                const masteredP = course.phases.reduce(
                  (s, p) => s + p.parts.filter((pt) => pt.status === 'mastered').length,
                  0,
                );
                const pct = totalP > 0 ? Math.round((masteredP / totalP) * 100) : 0;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: pct === 100 ? '#00c864' : '#ff6b00',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#1a1a1a',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {course.title}
                        </span>
                        <span style={{ fontSize: 11, color: '#a0a0a0', marginTop: 1 }}>
                          {course.phases.length} phases &middot; {totalP} lessons
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: pct === 100 ? '#00c864' : '#999',
                        }}
                      >
                        {pct}%
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ccc"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </div>

      {/* Global styles for lesson content + edge animation */}
      <style jsx global>{`
        @keyframes dashFlow {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -10;
          }
        }

        .lesson-content {
          font-size: 14px;
          line-height: 1.7;
          color: #333;
        }
        .lesson-content h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 16px;
          letter-spacing: -0.02em;
        }
        .lesson-content h3 {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 20px 0 8px;
        }
        .lesson-content p {
          margin: 0 0 12px;
        }
        .lesson-content strong {
          color: #1a1a1a;
          font-weight: 600;
        }
        .lesson-content code {
          background: #f0eeea;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .lesson-content pre {
          background: #1a1a1a;
          color: #e5e5e5;
          padding: 16px;
          border-radius: 10px;
          overflow-x: auto;
          margin: 12px 0;
          font-size: 12px;
          line-height: 1.6;
        }
        .lesson-content pre code {
          background: none;
          padding: 0;
          color: inherit;
          font-size: 12px;
        }
        .lesson-content ul, .lesson-content ol {
          padding-left: 20px;
          margin: 8px 0 12px;
        }
        .lesson-content li {
          margin-bottom: 4px;
        }

        /* React Flow overrides */
        .react-flow__controls button {
          background: #faf9f7 !important;
          border: none !important;
          color: #666 !important;
          width: 32px !important;
          height: 32px !important;
        }
        .react-flow__controls button:hover {
          background: #f0eeea !important;
          color: #1a1a1a !important;
        }
        .react-flow__minimap {
          background: rgba(250,249,247,0.9) !important;
        }

        /* Scrollbar styling for panel */
        .lesson-content::-webkit-scrollbar,
        div[style*="overflowY: auto"]::-webkit-scrollbar {
          width: 4px;
        }
        div[style*="overflowY: auto"]::-webkit-scrollbar-thumb {
          background: #d9d4cd;
          border-radius: 4px;
        }
      `}</style>
    </>
  );
}
