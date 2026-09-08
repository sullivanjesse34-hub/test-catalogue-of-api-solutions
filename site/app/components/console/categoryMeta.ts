import {
  Activity,
  FlaskConical,
  Inbox,
  Layers,
  LayoutGrid,
  type LucideIcon,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

import type {CategoryId} from '@/lib/catalogue';

/** A lucide icon per catalogue category, shared across the console. */
export const CAT_ICON: Record<CategoryId, LucideIcon> = {
  catalogue: LayoutGrid,
  creative: Sparkles,
  creators: Users,
  foundational: Target,
  leads: Inbox,
  measurement: FlaskConical,
  miscellaneous: Layers,
  performance: TrendingUp,
  signals: Activity,
};

/** One-line description per category, shown on the Overview hub cards. */
export const CAT_BLURB: Record<CategoryId, string> = {
  catalogue: 'Feed health, match rates & batch optimisation.',
  creative: 'Advantage+ creative, fatigue alerts & reels quality.',
  creators: 'Discover creators & boost partnership ads.',
  foundational: 'Opportunity scoring & campaign QA.',
  leads: 'Lead retrieval set-up & health.',
  measurement: 'Lift studies & marketing mix modelling.',
  miscellaneous: 'Audiences, reservations, targeting & warehouse.',
  performance: 'Value rules at scale.',
  signals: 'CAPI health, gateway & signal opportunities.',
};
