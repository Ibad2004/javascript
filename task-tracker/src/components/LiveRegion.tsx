export type Announcement = { text: string; id: number };

/**
 * A visually hidden live region. Screen readers read its text when it changes
 * ("Task added", "Changes saved", "Task deleted").
 * The region itself always stays on the page; only the <span> inside is replaced.
 * The key changes for every message, so the same text twice is still read twice.
 */
export function LiveRegion({ announcement }: { announcement: Announcement }) {
  return (
    <div role="status" className="visually-hidden" aria-live="polite" aria-atomic="true">
      {announcement.text !== '' && <span key={announcement.id}>{announcement.text}</span>}
    </div>
  );
}
