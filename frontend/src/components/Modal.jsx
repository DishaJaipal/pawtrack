export function Modal({ title, onClose, children, }) {
    return (<div className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/40 sm:items-center">
      <div className="soft-card-shadow max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface-container-lowest p-6 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>);
}
