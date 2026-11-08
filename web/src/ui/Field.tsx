// Form fields: label, optional hint and error, all wired with ids and aria for screen readers.
import { createContext, use, useId, type ComponentProps, type ReactNode } from 'react';

interface FieldCtx { id: string; describedBy?: string; invalid: boolean }
const Ctx = createContext<FieldCtx | null>(null);

export function Field({ label, hint, error, children, optional }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; optional?: boolean; children: ReactNode }) {
  const id = useId();
  const hintId = hint ? id + '-hint' : undefined;
  const errId = error ? id + '-err' : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={'ss-field' + (error ? ' is-invalid' : '')}>
      <label className="ss-label" htmlFor={id}>{label}{optional && <span className="ss-optional"> (optional)</span>}</label>
      <Ctx value={{ id, describedBy, invalid: Boolean(error) }}>{children}</Ctx>
      {hint && <p className="ss-hint" id={hintId}>{hint}</p>}
      {error && <p className="ss-error" id={errId} role="alert">{error}</p>}
    </div>
  );
}

function useField() {
  const f = use(Ctx);
  return f ? { id: f.id, 'aria-describedby': f.describedBy, 'aria-invalid': f.invalid || undefined } : {};
}

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input {...useField()} {...rest} className={'ss-input' + (className ? ' ' + className : '')} />;
}
export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea {...useField()} {...rest} className={'ss-input ss-textarea' + (className ? ' ' + className : '')} />;
}
export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <span className="ss-select-wrap">
      <select {...useField()} {...rest} className={'ss-input ss-select' + (className ? ' ' + className : '')}>{children}</select>
    </span>
  );
}
