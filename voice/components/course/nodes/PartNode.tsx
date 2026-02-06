import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { PartStatus } from '../../../lib/course-types';

export interface PartNodeData {
  label: string;
  status: PartStatus;
  phaseIndex: number;
  partIndex: number;
  isSelected: boolean;
  [key: string]: unknown;
}

const statusConfig: Record<PartStatus, {
  border: string;
  bg: string;
  text: string;
  icon: string;
  shadow: string;
  opacity: number;
}> = {
  locked: {
    border: 'rgba(0,0,0,0.06)',
    bg: '#fbfbfb',
    text: '#b0b0b0',
    icon: '🔒',
    shadow: '0 1px 3px rgba(0,0,0,0.03)',
    opacity: 0.6,
  },
  not_started: {
    border: 'rgba(0,0,0,0.08)',
    bg: '#ffffff',
    text: '#1a1a1a',
    icon: '○',
    shadow: '0 1px 4px rgba(0,0,0,0.05)',
    opacity: 1,
  },
  in_progress: {
    border: 'rgba(255, 107, 0, 0.35)',
    bg: '#ffffff',
    text: '#1a1a1a',
    icon: '◐',
    shadow: '0 2px 12px rgba(255, 107, 0, 0.10), 0 1px 3px rgba(0,0,0,0.04)',
    opacity: 1,
  },
  mastered: {
    border: 'rgba(0, 200, 100, 0.3)',
    bg: '#ffffff',
    text: '#1a1a1a',
    icon: '✓',
    shadow: '0 2px 12px rgba(0, 200, 100, 0.08), 0 1px 3px rgba(0,0,0,0.04)',
    opacity: 1,
  },
};

function PartNode({ data }: NodeProps) {
  const nodeData = data as unknown as PartNodeData;
  const config = statusConfig[nodeData.status];
  const isLocked = nodeData.status === 'locked';

  // Selection ring color
  const selectionRing = nodeData.status === 'mastered'
    ? 'rgba(0,200,100,0.25)'
    : nodeData.status === 'locked'
      ? 'rgba(0,0,0,0.06)'
      : 'rgba(255,107,0,0.25)';

  return (
    <>
      {/* Invisible handles — edges still connect but no visible dots */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: config.opacity }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
          delay: nodeData.phaseIndex * 0.12 + nodeData.partIndex * 0.06,
        }}
        whileHover={isLocked
          ? { scale: 1.015, opacity: 0.78 }
          : { scale: 1.03, y: -1 }
        }
        style={{
          background: config.bg,
          border: `1.5px solid ${config.border}`,
          borderRadius: 14,
          padding: '13px 16px',
          width: 210,
          cursor: 'pointer',
          boxShadow: nodeData.isSelected
            ? `0 0 0 2.5px ${selectionRing}, ${config.shadow}`
            : config.shadow,
          transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
          userSelect: 'none' as const,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: nodeData.status === 'mastered' ? 13 : 11,
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: nodeData.status === 'mastered'
                ? '#00c864'
                : nodeData.status === 'in_progress'
                  ? '#ff6b00'
                  : nodeData.status === 'locked'
                    ? 'rgba(0,0,0,0.04)'
                    : 'rgba(0,0,0,0.05)',
              color: nodeData.status === 'mastered' || nodeData.status === 'in_progress'
                ? '#fff'
                : config.text,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {config.icon}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 550,
              color: config.text,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {nodeData.label}
          </span>
        </div>

        {nodeData.status === 'in_progress' && (
          <motion.div
            style={{
              marginTop: 10,
              height: 2.5,
              borderRadius: 2,
              background: 'rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '45%' }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ff6b00, #ff8533)',
                borderRadius: 2,
              }}
            />
          </motion.div>
        )}
      </motion.div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
    </>
  );
}

export default memo(PartNode);
