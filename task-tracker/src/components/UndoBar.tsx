import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { FocusEvent } from 'react';

export const UNDO_TIMEOUT_MS = 5000;

type UndoBarProps = {
  message: string;
  onUndo: () => void;
  /** Called when the time is up. */
  onTimeout: () => void;
  durationMs?: number;
};

/**
 * "Task deleted. [Undo]" for about 5 seconds, instead of a confirm dialog.
 * The timer PAUSES while the mouse is over the bar or the focus is inside it,
 * so a keyboard or screen reader user has time to reach the button.
 * App gives it key={deleted task id}: a new delete starts a fresh 5 seconds.
 */
export function UndoBar({
  message,
  onUndo,
  onTimeout,
  durationMs = UNDO_TIMEOUT_MS,
}: UndoBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const isPaused = isHovered || hasFocus;
  // Time left, kept across pauses. A ref: changing it must not re-render.
  const remainingMsRef = useRef(durationMs);
  // Always calls the latest onTimeout, without restarting the timer when App re-renders.
  const timeUp = useEffectEvent(onTimeout);

  useEffect(() => {
    if (isPaused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => timeUp(), remainingMsRef.current);
    // Runs on pause AND on unmount: the timer is always cleared, so it never fires late.
    return () => {
      clearTimeout(timer);
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - startedAt));
    };
  }, [isPaused]);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    // Moving focus from one button inside the bar to another is not "leaving".
    if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
  }

  return (
    <div
      className="undo-bar"
      role="group"
      aria-label="Undo delete"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={handleBlur}
    >
      <p>{message}</p>
      <button type="button" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
