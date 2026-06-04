import {
  LayoutDashboard,
  Layers,
  FlaskConical,
  Upload,
  UserCheck,
  ClipboardList,
  Shield,
  CheckSquare,
} from 'lucide-react';

/**
 * UBT Lab — Navigation Configuration
 *
 * Flat structure: no nested groups.
 * Role filtering is done in Layout.jsx via canSee(item.roles).
 *
 *   roles: null        → visible to ALL authenticated users
 *   roles: ['admin']   → admin only
 *   roles: ['worker']  → worker only
 *
 * Admin sidebar:  Dashboard · UBT Bundles · Tests · Results · Workers · Assignments · Proxies
 * Worker sidebar: Dashboard · My Bundles  · My Tasks · Submit Results
 *
 * Research Engine pages (Ideas, Patterns, Hypotheses, Experiments, Results, Winners)
 * remain accessible to admins via direct URL but are NOT listed in the sidebar.
 */

export const NAV = [
  // ── Shared ───────────────────────────────────────────────────────────────────
  {
    type:  'link',
    to:    '/',
    label: 'Dashboard',
    icon:  LayoutDashboard,
    roles: null,
  },

  // ── Admin ─────────────────────────────────────────────────────────────────────
  {
    type:  'link',
    to:    '/test-bundles',
    label: 'UBT Bundles',
    icon:  Layers,
    roles: ['admin'],
  },
  {
    type:  'link',
    to:    '/tests',
    label: 'Tests',
    icon:  FlaskConical,
    roles: ['admin'],
  },
  {
    type:  'link',
    to:    '/results',
    label: 'Results',
    icon:  Upload,
    roles: ['admin'],
  },
  {
    type:  'link',
    to:    '/workers',
    label: 'Workers',
    icon:  UserCheck,
    roles: ['admin'],
  },
  {
    type:  'link',
    to:    '/assignment-center',
    label: 'Assignments',
    icon:  ClipboardList,
    roles: ['admin'],
  },
  {
    type:  'link',
    to:    '/proxies',
    label: 'Proxies',
    icon:  Shield,
    roles: ['admin'],
  },

  // ── Worker ────────────────────────────────────────────────────────────────────
  {
    type:  'link',
    to:    '/test-bundles',
    label: 'My Bundles',
    icon:  Layers,
    roles: ['worker'],
  },
  {
    type:  'link',
    to:    '/tasks',
    label: 'My Tasks',
    icon:  CheckSquare,
    roles: ['worker'],
  },
  {
    type:  'link',
    to:    '/results',
    label: 'Submit Results',
    icon:  Upload,
    roles: ['worker'],
  },
];
