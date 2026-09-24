export function FormField({ label, hint, id, ...props }) {
    return (<label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      <input id={id} className="min-h-[48px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-secondary" {...props}/>
      {hint && <span className="font-body-md text-label-sm text-on-surface-variant">{hint}</span>}
    </label>);
}
export function FormTextArea({ label, hint, id, ...props }) {
    return (<label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      <textarea id={id} className="min-h-[48px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-secondary" {...props}/>
      {hint && <span className="font-body-md text-label-sm text-on-surface-variant">{hint}</span>}
    </label>);
}
export function FormSelect({ label, id, children, ...props }) {
    return (<label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      <select id={id} className="min-h-[48px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-secondary" {...props}>
        {children}
      </select>
    </label>);
}
