import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

/**
 * "Why keys matter", the demo for the status meeting.
 * A key is the item's ID card; the index is only its seat number.
 */
describe('keys', () => {
  /** A row with its OWN state (a note input), like a row with an open edit form. */
  function NoteRow({ name }: { name: string }) {
    const [note, setNote] = useState('');
    return (
      <li>
        <label>
          Note for {name}
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </li>
    );
  }

  function Demo({ keyBy }: { keyBy: 'index' | 'id' }) {
    const [items, setItems] = useState([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    return (
      <>
        <button type="button" onClick={() => setItems((old) => old.slice(1))}>
          Delete A
        </button>
        <ul>
          {items.map((item, index) => (
            <NoteRow key={keyBy === 'index' ? index : item.id} name={item.name} />
          ))}
        </ul>
      </>
    );
  }

  it('with key={index}, deleting the item above moves its state onto the wrong item', async () => {
    const user = userEvent.setup();
    render(<Demo keyBy="index" />);
    await user.type(screen.getByLabelText('Note for A'), 'note about A');

    await user.click(screen.getByRole('button', { name: 'Delete A' }));

    // B now sits in seat 0, so React gives it seat 0's old state: A's note.
    expect(screen.getByLabelText('Note for B')).toHaveValue('note about A');
  });

  it('with key={id}, the state leaves together with its own item', async () => {
    const user = userEvent.setup();
    render(<Demo keyBy="id" />);
    await user.type(screen.getByLabelText('Note for A'), 'note about A');

    await user.click(screen.getByRole('button', { name: 'Delete A' }));

    expect(screen.getByLabelText('Note for B')).toHaveValue('');
  });
});
