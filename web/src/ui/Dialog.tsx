// Modal dialog and bottom sheet. Use a dialog to confirm or collect a few fields; use a sheet for
// longer tasks on small screens. Both trap focus, close on Escape and the backdrop, and return
// focus to the control that opened them.
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { backdrop, dialog as dialogV, sheet as sheetV } from '../motion/tokens';
import { IconButton } from './Button';
import { useFocusTrap, useScrollLock } from './focus';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: 'dialog' | 'sheet';
  /** For destructive confirmations: Escape and the backdrop don't close it. */
  dismissible?: boolean;
}

export function Dialog({ open, onClose, title, description, children, footer, variant = 'dialog', dismissible = true }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(ref, open);
  useScrollLock(open);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  const v = variant === 'sheet' ? sheetV : dialogV;
  if (typeof document === 'undefined') return null; // pre-rendering: dialogs start closed
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`ss-overlay ss-overlay--${variant}`}>
          <m.div className="ss-backdrop" variants={backdrop} initial="initial" animate="enter" exit="exit" onClick={dismissible ? onClose : undefined} />
          <m.div
            ref={ref}
            className={`ss-modal ss-modal--${variant}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            variants={v}
            initial="initial"
            animate="enter"
            exit="exit"
          >
            <header className="ss-modal-head">
              <h2 id={titleId} className="ss-modal-title">{title}</h2>
              {dismissible && <IconButton icon="x" label={t('actions.close')} onClick={onClose} size="sm" />}
            </header>
            {description && <p id={descId} className="muted ss-modal-desc">{description}</p>}
            {children && <div className="ss-modal-body">{children}</div>}
            {footer && <footer className="ss-modal-foot">{footer}</footer>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
