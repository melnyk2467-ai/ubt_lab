import {
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  Brain,
  FlaskConical,
  BarChart3,
  Trophy,
  Package,
  PlaySquare,
  Users,
  UserCircle,
  CheckSquare,
  TrendingUp,
  Tag,
  UserCheck,
  Beaker,
  ClipboardList,
} from 'lucide-react';

/**
 * UBT Lab — Navigation Configuration
 *
 * `icon` is now a Lucide React component (not an emoji string).
 * Layout.jsx renders it with <item.icon size={15} strokeWidth={1.75} />
 *
 * Roles
 * -----
 * `roles: null`          → visible to ALL authenticated users
 * `roles: ['admin']`     → admins only
 * `roles: ['worker']`    → workers only
 *
 * workerLabel
 * -----------
 * Optional alternative label when the logged-in user is a worker.
 */

export const NAV = [
  // ── Standalone ──────────────────────────────────────────────────────────────
  {
    type:  'link',
    to:    '/',
    label: 'Dashboard',
    icon:  LayoutDashboard,
    roles: null,
  },

  // ── Research Engine ──────────────────────────────────────────────────────────
  {
    type:  'group',
    label: 'Research',
    icon:  FlaskConical,
    roles: null,
    items: [
      { to: '/research/ideas',       label: 'Ideas',       icon: Lightbulb,    roles: ['admin'] },
      { to: '/research/patterns',    label: 'Patterns',    icon: Sparkles,     roles: ['admin'] },
      { to: '/research/hypotheses',  label: 'Hypotheses',  icon: Brain,        roles: ['admin'] },
      { to: '/research/experiments', label: 'Experiments', workerLabel: 'My Experiments', icon: Beaker, roles: null },
      { to: '/research/results',     label: 'Results',     icon: BarChart3,    roles: ['admin'] },
      { to: '/research/winners',     label: 'Winners',     icon: Trophy,       roles: ['admin'] },
    ],
  },

  // ── Content ──────────────────────────────────────────────────────────────────
  {
    type:  'group',
    label: 'Content',
    icon:  PlaySquare,
    roles: null,
    items: [
      { to: '/bundles', label: 'Bundles', icon: Package,    roles: ['admin'] },
      { to: '/videos',  label: 'Videos',  workerLabel: 'My Videos', icon: PlaySquare, roles: null },
    ],
  },

  // ── Team ─────────────────────────────────────────────────────────────────────
  {
    type:  'group',
    label: 'Team',
    icon:  Users,
    roles: null,
    items: [
      { to: '/users',    label: 'Users',    icon: Users,       roles: ['admin'] },
      { to: '/workers',  label: 'Workers',  icon: UserCheck,   roles: ['admin'] },
      { to: '/accounts',           label: 'Accounts',          workerLabel: 'My Accounts', icon: UserCircle,    roles: null },
      { to: '/tasks',              label: 'Tasks',             workerLabel: 'My Tasks',    icon: CheckSquare,  roles: null },
      { to: '/assignment-center',  label: 'Assignment Center',                             icon: ClipboardList, roles: ['admin'] },
    ],
  },

  // ── Offers ───────────────────────────────────────────────────────────────────
  {
    type:  'group',
    label: 'Offers',
    icon:  Tag,
    roles: ['admin'],
    items: [
      { to: '/offers', label: 'Offers', icon: Tag, roles: ['admin'] },
    ],
  },

  // ── Analytics ────────────────────────────────────────────────────────────────
  {
    type:  'group',
    label: 'Analytics',
    icon:  TrendingUp,
    roles: null,
    items: [
      { to: '/metrics', label: 'Metrics', workerLabel: 'My Metrics', icon: TrendingUp, roles: null },
    ],
  },
];
