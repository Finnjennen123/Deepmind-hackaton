import { memo } from 'react';
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';

interface AnimatedEdgeData {
  status?: 'locked' | 'active' | 'completed';
}

function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const edgeData = (data || {}) as AnimatedEdgeData;
  const status = edgeData.status || 'locked';

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 20,
  });

  const strokeColor =
    status === 'completed'
      ? '#00c864'
      : status === 'active'
        ? '#ff6b00'
        : '#d8d8d8';

  const strokeWidth = status === 'locked' ? 1 : 1.5;
  const dashArray = status === 'locked' ? '4 6' : '5 4';
  const shouldAnimate = status === 'active' || status === 'completed';

  return (
    <path
      d={edgePath}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      strokeLinecap="round"
      opacity={status === 'locked' ? 0.35 : 0.8}
      style={shouldAnimate ? {
        animation: `dashFlow ${status === 'active' ? '1.2s' : '2.5s'} linear infinite`,
      } : undefined}
    />
  );
}

export default memo(AnimatedEdge);
