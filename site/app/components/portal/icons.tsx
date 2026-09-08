import {
  Activity,
  Boxes,
  FlaskConical,
  Gauge,
  Layers,
  type LucideIcon,
  Magnet,
  Shapes,
  Sparkles,
  Users,
} from 'lucide-react';

import type {CategoryId} from '@/lib/catalogue';

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  catalogue: Boxes,
  creative: Sparkles,
  creators: Users,
  foundational: Layers,
  leads: Magnet,
  measurement: FlaskConical,
  miscellaneous: Shapes,
  performance: Gauge,
  signals: Activity,
};
