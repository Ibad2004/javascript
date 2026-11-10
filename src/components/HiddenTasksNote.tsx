import { pluralize } from '../utils/plural';

type HiddenTasksNoteProps = {
  hiddenCount: number;
  onShow: () => void;
};

/** "2 done tasks hidden [Show them]". Shown only while done tasks are hidden. */
export function HiddenTasksNote({ hiddenCount, onShow }: HiddenTasksNoteProps) {
  return (
    <p className="hidden-note">
      {pluralize(hiddenCount, 'done task')} hidden{' '}
      <button type="button" className="link-button" onClick={onShow}>
        Show them
      </button>
    </p>
  );
}
