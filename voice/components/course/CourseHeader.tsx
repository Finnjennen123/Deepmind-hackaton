import { motion } from 'framer-motion';
import type { Course } from '../../lib/course-types';

interface CourseHeaderProps {
  course: Course;
  onHomeClick?: () => void;
  onResetView?: () => void;
}

export default function CourseHeader({ course, onHomeClick, onResetView }: CourseHeaderProps) {
  const totalParts = course.phases.reduce((sum, p) => sum + p.parts.length, 0);
  const masteredParts = course.phases.reduce(
    (sum, p) => sum + p.parts.filter(pt => pt.status === 'mastered').length,
    0
  );
  const progress = totalParts > 0 ? Math.round((masteredParts / totalParts) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(250,249,247,0.95) 0%, rgba(250,249,247,0) 100%)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {course.title}
        </h1>
        <p
          style={{
            fontSize: 12,
            color: '#999',
            margin: '2px 0 0',
          }}
        >
          {course.phases.length} phases · {totalParts} lessons
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'auto' }}>
        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 120,
              height: 4,
              borderRadius: 2,
              background: '#ece9e4',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              style={{
                height: '100%',
                borderRadius: 2,
                background: progress === 100
                  ? '#00c864'
                  : 'linear-gradient(90deg, #ff6b00, #ff8533)',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: progress === 100 ? '#00c864' : '#1a1a1a',
              minWidth: 36,
              textAlign: 'right',
            }}
          >
            {progress}%
          </span>
        </div>

        {/* Reset view button */}
        <button
          onClick={onResetView}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#faf9f7',
            border: '1px solid #ece9e4',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.15s',
            pointerEvents: 'auto',
            color: '#666',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#d9d4cd';
            e.currentTarget.style.color = '#1a1a1a';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#ece9e4';
            e.currentTarget.style.color = '#666';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title="Reset view"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        {/* Home button */}
        <button
          onClick={onHomeClick || (() => window.location.href = '/')}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#faf9f7',
            border: '1px solid #ece9e4',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.15s',
            pointerEvents: 'auto',
            color: '#666',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#d9d4cd';
            e.currentTarget.style.color = '#1a1a1a';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#ece9e4';
            e.currentTarget.style.color = '#666';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title="Home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
