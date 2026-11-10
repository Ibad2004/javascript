import type { Task } from '../types';

/**
 * Static demo data for Day 11. There is no server and nothing is saved yet.
 * The dates are fixed, so "Overdue" and "Due today" depend on the real date
 * the app is opened (written for 10 Nov 2026).
 */
export const sampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Set up the Vite project',
    description: 'Create the project with the react-ts template and remove the demo content.',
    done: true,
    priority: 'high',
    dueDate: '2026-11-09',
  },
  {
    id: 'task-2',
    title: 'Prepare the status meeting notes',
    description: 'Points to cover:\n- Component tree\n- Props vs state\n- Edge cases we handled',
    done: false,
    priority: 'high',
    dueDate: '2026-11-10',
  },
  {
    id: 'task-3',
    title: 'Reply to the design feedback',
    description: 'Ali left comments on the wireframes. Answer each one.',
    done: false,
    priority: 'medium',
    dueDate: '2026-11-05',
  },
  {
    id: 'task-4',
    title:
      'Refactor_TaskListComponent_to_support_full_keyboard_navigation_and_screen_reader_labels',
    description:
      'A long title with no spaces, to check that it wraps instead of breaking the layout.',
    done: false,
    priority: 'low',
    dueDate: '2026-11-20',
  },
  {
    id: 'task-5',
    title: 'ہفتہ وار رپورٹ جمع کروائیں',
    description: 'ٹیم لیڈ کو ہفتہ وار رپورٹ ای میل کریں۔',
    done: false,
    priority: 'medium',
    dueDate: '2026-11-14',
  },
  {
    id: 'task-6',
    title: 'Plan the Day 15 styling',
    description: 'Colours, spacing and maybe a dark mode. Ideas only for now.',
    done: false,
    priority: 'low',
    dueDate: null,
  },
  {
    id: 'task-7',
    title: 'Read about React keys',
    description: '',
    done: true,
    priority: 'low',
    dueDate: '2026-11-08',
  },
  {
    id: 'task-8',
    title: 'Buy groceries 🛒',
    description: 'Milk, eggs, bread',
    done: true,
    priority: 'medium',
    dueDate: '2026-11-07',
  },
];
