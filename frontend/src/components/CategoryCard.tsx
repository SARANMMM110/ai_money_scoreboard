import { motion } from 'framer-motion';
import { getCategoryColor } from '../types';

const CATEGORY_ICONS: Record<string, { emoji: string; tint: string }> = {
  schema: { emoji: '🏷️', tint: 'bg-purple-soft text-purple' },
  eeat: { emoji: '🛡️', tint: 'bg-brand-soft text-brand' },
  faq: { emoji: '❓', tint: 'bg-caution-soft text-caution' },
  content: { emoji: '📝', tint: 'bg-good-soft text-good' },
  technical: { emoji: '⚙️', tint: 'bg-surface-2 text-dim' },
  authority: { emoji: '⭐', tint: 'bg-caution-soft text-caution' },
  ai_accessibility: { emoji: '🤖', tint: 'bg-purple-soft text-purple' },
};

interface CategoryCardProps {
  label: string;
  score: number;
  maxScore: number;
  finding?: string;
  categoryKey?: string;
  index?: number;
}

export function CategoryCard({ label, score, maxScore, finding, categoryKey, index = 0 }: CategoryCardProps) {
  const color = getCategoryColor(score, maxScore);
  const pct = Math.round((score / maxScore) * 100);
  const icon = CATEGORY_ICONS[categoryKey ?? ''] ?? { emoji: '📊', tint: 'bg-surface-2 text-dim' };
  const isWeak = pct < 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative bg-surface border rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:shadow-panel hover:-translate-y-1 ${
        isWeak ? 'border-critical/15 shadow-[0_4px_20px_rgba(224,74,79,0.06)]' : 'border-line shadow-card hover:border-brand/20'
      }`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all group-hover:w-1.5"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start gap-3 mb-4 pl-1">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${icon.tint}`}>
          {icon.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ink leading-tight">{label}</h3>
          <p className="text-xs text-faint mt-0.5">{pct}% of max</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-xl font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
          <span className="font-mono text-sm text-faint">/{maxScore}</span>
        </div>
      </div>

      <div className="pl-1 mb-3">
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: index * 0.05 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {finding && (
        <p className={`text-xs leading-relaxed pl-1 line-clamp-2 ${isWeak ? 'text-dim' : 'text-faint'}`}>
          {finding}
        </p>
      )}
    </motion.div>
  );
}
