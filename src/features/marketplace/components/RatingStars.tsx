'use client';

import { Star } from 'lucide-react';
import clsx from 'clsx';

interface RatingStarsProps {
  /** 当前评分 (1-5) */
  rating: number;
  /** 是否只读模式 */
  readOnly?: boolean;
  /** 可交互时的点击回调 */
  onChange?: (rating: number) => void;
  /** 尺寸 */
  size?: 'sm' | 'md';
}

const SIZE_MAP = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
};

export default function RatingStars({ rating, readOnly = true, onChange, size = 'sm' }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          className={clsx(
            'transition-colors',
            !readOnly && 'cursor-pointer hover:scale-110',
            readOnly && 'cursor-default'
          )}
        >
          <Star
            className={clsx(
              SIZE_MAP[size],
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-slate-300 dark:text-slate-600'
            )}
          />
        </button>
      ))}
    </div>
  );
}
