import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FAKE_TODAY, makeTask } from '../test/makeTask';
import { TaskForm } from './TaskForm';

type Props = ComponentProps<typeof TaskForm>;

function renderForm(props: Partial<Props> = {}) {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(
    <TaskForm
      submitLabel="Add task"
      onSubmit={onSubmit}
      tasks={[makeTask({ id: 'a', title: 'Buy milk' })]}
      today={FAKE_TODAY}
      clearOnSubmit
      {...props}
    />,
  );
  const title = screen.getByLabelText('Title');
  const description = screen.getByLabelText('Description');
  const dueDate = screen.getByLabelText('Due date');
  const submit = screen.getByRole('button', { name: props.submitLabel ?? 'Add task' });
  return { user, onSubmit, title, description, dueDate, submit };
}

describe('TaskForm', () => {
  it('has a label for every input', () => {
    renderForm();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
  });

  it('has a working submit button and no "next update" note any more', () => {
    const { submit } = renderForm();
    expect(submit).toBeEnabled();
    expect(screen.queryByText('Adding tasks comes in the next update.')).not.toBeInTheDocument();
  });

  it('stops the browser from reloading the page on submit', () => {
    const { submit } = renderForm();
    const form = submit.closest('form');
    expect(form).not.toBeNull();
    if (form === null) return;
    // fireEvent returns false when the handler called preventDefault().
    expect(fireEvent.submit(form)).toBe(false);
  });

  it('does not crash when the user presses Enter in the title field', async () => {
    const { user, title } = renderForm();
    await user.type(title, 'Buy bread{Enter}');
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument();
  });

  it('starts with priority "Medium" and empty fields', () => {
    const { title, description, dueDate } = renderForm();
    expect(screen.getByLabelText('Priority')).toHaveValue('medium');
    expect(title).toHaveValue('');
    expect(description).toHaveValue('');
    expect(dueDate).toHaveValue('');
  });

  it('submits trimmed values when Enter is pressed in the title', async () => {
    const { user, onSubmit, title, description } = renderForm();
    await user.type(description, '   ');
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.type(title, '  Buy bread  {Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Buy bread',
      description: '',
      priority: 'high',
      dueDate: null,
    });
  });

  it('clears the form and puts focus back on the title after a successful add', async () => {
    const { user, title, description, submit } = renderForm();
    await user.type(title, 'Buy bread');
    await user.type(description, 'Brown');
    await user.click(submit);
    expect(title).toHaveValue('');
    expect(description).toHaveValue('');
    expect(screen.getByLabelText('Priority')).toHaveValue('medium');
    expect(title).toHaveFocus();
  });

  it.each([
    ['empty', ''],
    ['only spaces', '    '],
  ])('blocks a title that is %s, with a linked error and focus on the field', async (_, text) => {
    const { user, onSubmit, title, submit } = renderForm();
    if (text !== '') await user.type(title, text);
    await user.click(submit);

    expect(onSubmit).not.toHaveBeenCalled();
    const error = screen.getByText('Title is required');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title.getAttribute('aria-describedby')).toContain(error.id);
    expect(title).toHaveFocus();
  });

  it('does not show "Title is required" before the user tries to submit', () => {
    const { title } = renderForm();
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows a live counter that counts an emoji as one character', async () => {
    const { user, title } = renderForm();
    expect(screen.getByText('0/100')).toBeInTheDocument();
    await user.type(title, 'Buy 🛒');
    expect(screen.getByText('5/100')).toBeInTheDocument();
    // The counter is linked to the input, so screen readers hear it too.
    expect(title.getAttribute('aria-describedby')).toContain(screen.getByText('5/100').id);
  });

  it('does not cut pasted long text: red counter, error, and saving is blocked', async () => {
    const { user, onSubmit, title, submit } = renderForm();
    const long = 'x'.repeat(150);
    await user.click(title);
    await user.paste(long);

    expect(title).not.toHaveAttribute('maxLength');
    expect(title).toHaveValue(long);
    expect(screen.getByText('150/100')).toHaveClass('over');
    expect(screen.getByText('Title must be 100 characters or less')).toBeInTheDocument();

    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(title).toHaveFocus();
  });

  it('allows exactly 100 characters (98/100 is not red)', async () => {
    const { user, onSubmit, title, submit } = renderForm();
    await user.click(title);
    await user.paste('y'.repeat(98));
    expect(screen.getByText('98/100')).not.toHaveClass('over');
    await user.paste('yy');
    expect(screen.getByText('100/100')).not.toHaveClass('over');
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('blocks a description over 500 characters and focuses it', async () => {
    const { user, onSubmit, title, description, submit } = renderForm();
    await user.type(title, 'Long notes');
    await user.click(description);
    await user.paste('d'.repeat(501));
    expect(screen.getByText('501/500')).toHaveClass('over');
    expect(screen.getByText('Description must be 500 characters or less')).toBeInTheDocument();

    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(description).toHaveFocus();
    expect(description).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a date with a 5-digit year', async () => {
    const { user, onSubmit, title, dueDate, submit } = renderForm();
    await user.type(title, 'Far future');
    // A date input in Chrome lets you type a 6-digit year. jsdom accepts it too.
    fireEvent.change(dueDate, { target: { value: '20266-11-12' } });
    expect(screen.getByText('Enter a valid date')).toBeInTheDocument();

    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(dueDate).toHaveFocus();
    expect(dueDate).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a half-typed date that the browser reports as badInput', async () => {
    const { user, onSubmit, title, dueDate, submit } = renderForm();
    await user.type(title, 'Half date');
    // A browser gives value "" for "12/mm/2026" but sets validity.badInput. jsdom never does.
    Object.defineProperty(dueDate, 'validity', { value: { badInput: true } });
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid date')).toBeInTheDocument();
  });

  it('warns about a past due date but still saves it', async () => {
    const { user, onSubmit, title, dueDate, submit } = renderForm();
    await user.type(title, 'Late');
    fireEvent.change(dueDate, { target: { value: '2026-11-01' } });
    const warning = screen.getByText('This date is in the past');
    expect(dueDate.getAttribute('aria-describedby')).toContain(warning.id);
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dueDate: '2026-11-01' }));
  });

  it('warns about a duplicate title (any case, trimmed) but still saves it', async () => {
    const { user, onSubmit, title, submit } = renderForm();
    await user.type(title, '  BUY MILK ');
    expect(screen.getByText('A task with this title already exists')).toBeInTheDocument();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'BUY MILK' }));
  });

  it('a double click on Add submits only once and shows no error', async () => {
    const { user, onSubmit, title, submit } = renderForm();
    await user.type(title, 'Only once');
    await user.dblClick(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });

  it('after an add, an empty submit made on purpose still shows the error once the user types', async () => {
    const { user, onSubmit, title, submit } = renderForm();
    await user.type(title, 'First{Enter}');
    await user.type(title, ' ');
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  describe('as an edit form', () => {
    const initialValues = {
      title: 'Buy milk',
      description: 'Two litres',
      priority: 'high',
      dueDate: '2026-11-12',
    } as const;

    it('starts prefilled, with Save and Cancel', () => {
      const { title, description, dueDate } = renderForm({
        initialValues,
        submitLabel: 'Save',
        onCancel: vi.fn(),
        editingId: 'a',
        clearOnSubmit: false,
      });
      expect(title).toHaveValue('Buy milk');
      expect(description).toHaveValue('Two litres');
      expect(dueDate).toHaveValue('2026-11-12');
      expect(screen.getByLabelText('Priority')).toHaveValue('high');
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      // Its own title is not a "duplicate".
      expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
    });

    it('calls onCancel on Escape and on the Cancel button', async () => {
      const onCancel = vi.fn();
      const { user, title } = renderForm({
        initialValues,
        submitLabel: 'Save',
        onCancel,
        clearOnSubmit: false,
      });
      await user.type(title, '{Escape}');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it('reports when the values differ from the start values', async () => {
      const onDirtyChange = vi.fn();
      const { user, title } = renderForm({
        initialValues,
        submitLabel: 'Save',
        onDirtyChange,
        clearOnSubmit: false,
      });
      await user.type(title, '!');
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);
      await user.type(title, '{Backspace}');
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    });

    it('cannot save an empty title', async () => {
      const { user, onSubmit, title } = renderForm({
        initialValues,
        submitLabel: 'Save',
        clearOnSubmit: false,
      });
      await user.clear(title);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });
});
