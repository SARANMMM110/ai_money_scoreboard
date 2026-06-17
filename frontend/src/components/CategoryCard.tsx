import { motion } from 'framer-motion';
import { getCategoryColor } from '../types';

interface CategoryCardProps {
  label: string;
  score: number;
  maxScore: number;
  finding?: string;
  index?: number;
}

export function CategoryCard({ label, score, maxScore, finding, index = 0 }: CategoryCardProps) {
  const color = getCategoryColor(score, maxScore);
  const pct = Math.round((score / maxScore) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="bg-surface-2 border border-line rounded-xl p-5 hover:shadow-card hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-text">{label}</h3>
        <span className="font-mono text-sm tabular-nums" style={{ color }}>
          {score}<span className="text-text-faint">/{maxScore}</span>
        </span>
      </div>

      <div className="h-1.5 bg-line rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {finding && (
        <p className="text-xs text-text-dim leading-relaxed line-clamp-2">{finding}</p>
      )}
    </motion.div>
  );
}
