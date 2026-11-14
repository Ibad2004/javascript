import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

/** The dialog alone: the parent here does NOT remove it after an answer. */
function renderDialog() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
  const result = render(
    <ConfirmDeleteDialog title="Buy milk" onConfirm={onConfirm} onCancel={onCancel} />,
  );
  return { user: userEvent.setup(), onConfirm, onCancel, showModal, ...result };
}

describe('ConfirmDeleteDialog', () => {
  it('opens as a modal (showModal) with Cancel first in the tab order', () => {
    const { showModal } = renderDialog();
    expect(showModal).toHaveBeenCalledTimes(1);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Cancel', 'Delete']);
    expect(buttons[0]).toHaveFocus();
  });

  it('the first answer wins: a double click on Delete confirms once, Escape after it does nothing', async () => {
    const { user, onConfirm, onCancel } = renderDialog();
    await user.dblClick(screen.getByRole('button', { name: 'Delete' }));
    await user.keyboard('{Escape}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('the browser\'s own "cancel" event (Escape in a real browser) cancels', () => {
    const { onCancel } = renderDialog();
    const event = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), event);
    expect(onCancel).toHaveBeenCalledTimes(1);
    // We close it through React, not by letting the browser close it behind React's back.
    expect(event.defaultPrevented).toBe(true);
  });

  it('closes the native dialog when it is removed', () => {
    const { unmount } = renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');
    unmount();
    expect(dialog).not.toHaveAttribute('open');
  });
});
