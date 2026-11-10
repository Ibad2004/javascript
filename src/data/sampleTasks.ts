import type { Task } from '../types';
import { addDays } from '../utils/dates';

/**
 * Demo data for Day 11. There is no server and nothing is saved yet.
 *
 * The due dates are relative to `today` (the user's LOCAL date, "YYYY-MM-DD"),
 * so the demo looks the same on any day: one task overdue, one due today,
 * one due tomorrow, one in a week and one with no date.
 * Tests pass a fake `today`, so they never depend on the real date.
 */
export function createSampleTasks(today: string): Task[] {
  return [
    {
      id: 'task-1',
      title: 'Set up the Vite project',
      description: 'Create the project with the react-ts template and remove the demo content.',
      done: true,
      priority: 'high',
      dueDate: addDays(today, -1),
    },
    {
      id: 'task-2',
      title: 'Prepare the status meeting notes',
      description: 'Points to cover:\n- Component tree\n- Props vs state\n- Edge cases we handled',
      done: false,
      priority: 'high',
      dueDate: today,
    },
    {
      id: 'task-3',
      title: 'Reply to the design feedback',
      description: 'Ali left comments on the wireframes. Answer each one.',
      done: false,
      priority: 'medium',
      dueDate: addDays(today, -2),
    },
    {
      id: 'task-4',
      title:
        'Refactor_TaskListComponent_to_support_full_keyboard_navigation_and_screen_reader_labels',
      description:
        'A long title with no spaces, to check that it wraps instead of breaking the layout.',
      done: false,
      priority: 'low',
      dueDate: addDays(today, 7),
    },
    {
      id: 'task-5',
      title: 'ہفتہ وار رپورٹ جمع کروائیں',
      description: 'ٹیم لیڈ کو ہفتہ وار رپورٹ ای میل کریں۔',
      done: false,
      priority: 'medium',
      dueDate: addDays(today, 1),
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
      dueDate: addDays(today, -2),
    },
    {
      id: 'task-8',
      title: 'Buy groceries 🛒',
      description: 'Milk, eggs, bread',
      done: true,
      priority: 'medium',
      dueDate: addDays(today, -3),
    },
  ];
}
