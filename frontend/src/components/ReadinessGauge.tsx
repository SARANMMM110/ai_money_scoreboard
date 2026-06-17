import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CATEGORIES, getScoreColor } from '../types';

interface GaugeProps {
  mode: 'scanning' | 'complete' | 'demo';
  score?: number;
  band?: string;
  progress?: { category: string; status: string; score?: number }[];
  statusMessage?: string;
  size?: number;
}

const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active, reduced]);

  return value;
}

export function ReadinessGauge({
  mode,
  score = 0,
  band,
  progress = [],
  statusMessage = 'Initializing scan…',
  size = 320,
}: GaugeProps) {
  const reduced = useReducedMotion();
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size * 0.38;
  const nodeR = size * 0.44;
  const strokeW = size * 0.025;

  const isComplete = mode === 'complete';
  const isScanning = mode === 'scanning';
  const displayScore = useCountUp(score, 900, isComplete);
  const fillColor = isComplete ? getScoreColor(score) : 'var(--brand)';

  const scorePct = isComplete ? score : 0;
  const fillAngle = (scorePct / 100) * 360;

  const doneCount = progress.filter((p) => p.status === 'done').length;
  const demoOffset = mode === 'demo' ? (Date.now() / 50) % 360 : 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Brand glow */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)' }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
        {/* Track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke="var(--line)"
          strokeWidth={strokeW}
        />

        {/* Score fill (complete) */}
        {isComplete && fillAngle > 0 && (
          <motion.path
            d={describeArc(cx, cy, ringR, 0, fillAngle)}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        {/* Scanning orbit arc */}
        {(isScanning || mode === 'demo') && (
          <motion.circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${ringR * 0.8} ${ringR * 5}`}
            animate={reduced ? {} : { rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: `${cx}px ${cy}px`, rotate: demoOffset }}
            opacity={0.8}
          />
        )}

        {/* Category nodes */}
        {CATEGORY_KEYS.map((key, i) => {
          const angle = (i / CATEGORY_KEYS.length) * 360 - 90;
          const pos = polarToCartesian(cx, cy, nodeR, angle + 90);
          const prog = progress.find((p) => p.category === key);
          const isDone = prog?.status === 'done';
          const isRunning = prog?.status === 'running';
          const isDemoActive = mode === 'demo' && i === Math.floor((Date.now() / 800) % 7);

          let nodeColor = 'var(--line)';
          if (isComplete && prog?.score !== undefined) {
            const cat = CATEGORIES.find((c) => c.key === key)!;
            nodeColor = getScoreColor((prog.score / cat.max) * 100);
          } else if (isDone || isRunning || isDemoActive) {
            nodeColor = 'var(--brand)';
          }

          return (
            <g key={key}>
              {(isRunning || isDemoActive) && !reduced && (
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size * 0.028}
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth={1}
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size * 0.018}
                fill={isDone || isRunning || isDemoActive || isComplete ? nodeColor : 'var(--surface-2)'}
                stroke={isDone || isRunning || isComplete ? nodeColor : 'var(--line)'}
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
        {isComplete ? (
          <>
            <motion.div
              className="font-mono text-3xl font-bold tabular-nums"
              style={{ color: fillColor, fontSize: size * 0.18 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {displayScore}
            </motion.div>
            {band && (
              <motion.p
                className="text-text-dim text-sm mt-1 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {band}
              </motion.p>
            )}
          </>
        ) : (
          <>
            <p className="font-mono text-brand text-lg tabular-nums">{doneCount}/7</p>
            <p className="text-text-dim text-xs mt-2 max-w-[140px] leading-snug">{statusMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}
