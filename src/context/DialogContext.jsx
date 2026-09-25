// In-app replacement for the browser's confirm() and prompt() pop-ups ("localhost says…").
// Usage in any component:
//   const dialog = useDialog();
//   if (!(await dialog.confirm({ title: 'Delete plan?', message: '…', confirmLabel: 'Delete', danger: true }))) return;
//   const name = await dialog.prompt({ title: 'Edit name', label: 'Name', defaultValue: item.name });
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import Modal from '@/components/common/Modal';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null);
  const [value, setValue] = useState('');
  const resolver = useRef(null);

  const open = useCallback(
    (type, opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setValue(opts.defaultValue ?? '');
        setDlg({ type, ...opts });
      }),
    [],
  );

  const api = useMemo(
    () => ({
      confirm: (opts) => open('confirm', typeof opts === 'string' ? { message: opts } : opts),
      prompt: (opts) => open('prompt', typeof opts === 'string' ? { title: opts } : opts),
    }),
    [open],
  );

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDlg(null);
  };
  const cancel = () => close(dlg?.type === 'confirm' ? false : null);
  const ok = () => {
    if (dlg.type === 'prompt') {
      if (!value.trim()) return;
      close(value.trim());
    } else close(true);
  };

  const Icon = dlg?.danger ? AlertTriangle : HelpCircle;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        open={!!dlg}
        onClose={cancel}
        width={440}
        title={dlg?.title || (dlg?.type === 'prompt' ? 'Enter a value' : 'Are you sure?')}
        footer={
          dlg && (
            <>
              <button className="btn ghost" onClick={cancel}>
                {dlg.cancelLabel || 'Cancel'}
              </button>
              <button
                className={`btn ${dlg.danger ? 'danger-solid' : 'primary'}`}
                onClick={ok}
                disabled={dlg.type === 'prompt' && !value.trim()}
                autoFocus={dlg.type === 'confirm'}
              >
                {dlg.confirmLabel || 'OK'}
              </button>
            </>
          )
        }
      >
        {dlg && (
          <div className="stack" style={{ gap: 14 }}>
            {dlg.message && (
              <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 12 }}>
                <span className={`dialog-icon ${dlg.danger ? 'danger' : ''}`}>
                  <Icon size={20} />
                </span>
                <p style={{ whiteSpace: 'pre-line', lineHeight: 1.5, paddingTop: 6 }}>{dlg.message}</p>
              </div>
            )}
            {dlg.type === 'prompt' && (
              <label className="field">
                {dlg.label && <span className="field-label">{dlg.label}</span>}
                <input
                  className="input"
                  autoFocus
                  value={value}
                  placeholder={dlg.placeholder || ''}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === 'Enter' && ok()}
                />
              </label>
            )}
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export const useDialog = () => useContext(DialogContext);