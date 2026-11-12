import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTask } from './test/makeTask';
import { addForm, detailPanel, listedTitles, liveRegion, renderApp } from './test/renderApp';

describe('App: adding tasks', () => {
  it('adds a trimmed task, clears the form, focuses the title and announces it', async () => {
    const { user } = await renderApp([makeTask({ id: 'a', title: 'Existing' })]);
    const title = within(addForm()).getByLabelText('Title');

    await user.type(title, '  Buy milk  ');
    await user.type(within(addForm()).getByLabelText('Description'), '   ');
    await user.click(within(addForm()).getByRole('button', { name: 'Add task' }));

    expect(listedTitles()).toContain('Buy milk');
    expect(title).toHaveValue('');
    expect(title).toHaveFocus();
    expect(liveRegion()).toHaveTextContent('Task added');
    expect(screen.getByText('0 of 2 done')).toBeInTheDocument();

    // A description of only spaces is stored as "" and shows "No description".
    await user.click(screen.getByRole('button', { name: /^Buy milk/ }));
    expect(within(detailPanel()).getByText('No description')).toBeInTheDocument();
  });

  it('adds with Enter in the title field', async () => {
    const { user } = await renderApp([]);
    await user.type(within(addForm()).getByLabelText('Title'), 'From the keyboard{Enter}');
    expect(listedTitles()).toEqual(['From the keyboard']);
  });

  it('adds nothing when the title is only spaces', async () => {
    const { user } = await renderApp([]);
    await user.type(within(addForm()).getByLabelText('Title'), '   {Enter}');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('a double click on "Add task" adds only ONE task', async () => {
    const { user } = await renderApp([]);
    await user.type(within(addForm()).getByLabelText('Title'), 'Double');
    await user.dblClick(within(addForm()).getByRole('button', { name: 'Add task' }));
    expect(listedTitles()).toEqual(['Double']);
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });

  it('adding the first task replaces the empty state', async () => {
    const { user } = await renderApp([]);
    expect(screen.getByText('No tasks yet. Add your first task below.')).toBeInTheDocument();
    await user.type(within(addForm()).getByLabelText('Title'), 'First{Enter}');
    expect(screen.queryByText('No tasks yet. Add your first task below.')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 task')).toBeInTheDocument();
  });

  it('allows a duplicate title after the warning (both tasks are listed)', async () => {
    const { user } = await renderApp([makeTask({ id: 'a', title: 'Buy milk' })]);
    await user.type(within(addForm()).getByLabelText('Title'), 'buy milk');
    expect(screen.getByText('A task with this title already exists')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(listedTitles()).toHaveLength(2);
  });

  it('says in the header where the tasks are saved', async () => {
    await renderApp([]);
    expect(screen.getByText('Saved on the local mock server (json-server)')).toBeVisible();
  });
});
