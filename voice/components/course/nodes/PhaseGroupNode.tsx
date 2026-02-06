import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

export interface PhaseGroupNodeData {
  label: string;
  description: string;
  phaseIndex: number;
  partCount: number;
  masteredCount: number;
  [key: string]: unknown;
}

function PhaseGroupNode({ data }: NodeProps) {
  const nodeData = data as unknown as PhaseGroupNodeData;
  const progress = nodeData.partCount > 0
    ? Math.round((nodeData.masteredCount / nodeData.partCount) * 100)
    : 0;
  const isComplete = progress === 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: nodeData.phaseIndex * 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{
        padding: '24px 28px 0',
        minWidth: 300,
        height: '100%',
        borderRadius: 20,
        border: `1px solid ${isComplete ? 'rgba(0, 200, 100, 0.18)' : 'rgba(0,0,0,0.05)'}`,
        background: isComplete
          ? 'rgba(0, 200, 100, 0.02)'
          : 'rgba(248, 247, 245, 0.6)',
        pointerEvents: 'none' as const,
        boxSizing: 'border-box' as const,
      }}
    >
      {/* Phase header — drag handle */}
      <div
        className="phase-drag-handle"
        style={{
          pointerEvents: 'auto' as const,
          cursor: 'grab',
          borderRadius: 10,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          {/* Drag grip indicator */}
          <span
            style={{
              fontSize: 9,
              color: '#ccc',
              lineHeight: 1,
              userSelect: 'none' as const,
            }}
          >
            ⠿
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '1.2px',
              color: isComplete ? '#00c864' : '#b0b0b0',
            }}
          >
            Phase {nodeData.phaseIndex + 1}
          </span>
          {progress > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isComplete ? '#00c864' : '#ff6b00',
                marginLeft: 'auto',
              }}
            >
              {progress}%
            </span>
          )}
        </div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 650,
            color: '#1a1a1a',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          {nodeData.label}
        </h3>
        <p
          style={{
            fontSize: 11.5,
            color: '#a0a0a0',
            margin: '5px 0 0',
            lineHeight: 1.45,
            maxWidth: 250,
          }}
        >
          {nodeData.description}
        </p>

        {/* Progress bar — inline in header */}
        {progress > 0 && (
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: 'rgba(0,0,0,0.04)',
              marginTop: 14,
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: nodeData.phaseIndex * 0.2 + 0.3 }}
              style={{
                height: '100%',
                borderRadius: 2,
                background: isComplete
                  ? '#00c864'
                  : 'linear-gradient(90deg, #ff6b00, #ff8533)',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(PhaseGroupNode);
