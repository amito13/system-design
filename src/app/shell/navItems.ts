import { BookOpen, Dumbbell, FlaskConical, ScrollText, type LucideIcon } from 'lucide-react';
import type { Section } from '../router';

export interface NavItem {
  section: Exclude<Section, 'home' | 'settings' | null>;
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { section: 'learn', labelKey: 'nav.learn', href: '#/learn', icon: BookOpen },
  { section: 'practice', labelKey: 'nav.practice', href: '#/practice', icon: Dumbbell },
  { section: 'lab', labelKey: 'nav.lab', href: '#/lab', icon: FlaskConical },
  { section: 'cheatsheets', labelKey: 'nav.cheatsheets', href: '#/cheatsheets', icon: ScrollText },
];
