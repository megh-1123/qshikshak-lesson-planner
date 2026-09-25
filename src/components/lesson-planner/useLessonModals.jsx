import { useCallback, useState } from 'react';
import LessonDetail from './LessonDetail';
import LessonForm from './LessonForm';
import CompletionForm from './CompletionForm';
import RescheduleModal from './RescheduleModal';
import AddPeriodsModal from './AddPeriodsModal';

/**
 * One hook that wires up all lesson dialogs. Pages call:
 *   const lm = useLessonModals(reload);
 *   lm.openDetail(item) / lm.openEdit(item) / lm.openComplete(item, 'partial') / lm.openReschedule(item, 'cancel')
 *   … and render {lm.modals}
 */
export function useLessonModals(onChanged) {
  const [state, setState] = useState({ type: null, item: null, extra: null });
  const close = useCallback(() => setState({ type: null, item: null, extra: null }), []);
  const open =
    (type) =>
    (item, extra = null) =>
      setState({ type, item, extra });
  const changed = () => onChanged?.();

  const modals = (
    <>
      <LessonDetail
        open={state.type === 'detail'}
        item={state.item}
        onClose={close}
        onEdit={open('edit')}
        onComplete={open('complete')}
        onReschedule={(it, mode) => setState({ type: 'reschedule', item: it, extra: mode })}
        onAddPeriods={open('periods')}
      />
      <LessonForm
        open={state.type === 'edit'}
        item={state.item}
        onClose={close}
        onSaved={changed}
        onAddPeriods={open('periods')}
      />
      <CompletionForm
        open={state.type === 'complete'}
        item={state.item}
        initialStatus={state.extra}
        onClose={close}
        onDone={changed}
      />
      <RescheduleModal
        open={state.type === 'reschedule'}
        item={state.item}
        initialMode={state.extra || 'reschedule'}
        onClose={close}
        onDone={changed}
      />
      <AddPeriodsModal open={state.type === 'periods'} item={state.item} onClose={close} onDone={changed} />
    </>
  );

  return {
    openDetail: open('detail'),
    openEdit: open('edit'),
    openComplete: open('complete'),
    openReschedule: open('reschedule'),
    openAddPeriods: open('periods'),
    modals,
  };
}
