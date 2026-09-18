import { Button } from "./Button";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
  confirming = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-inverse-surface/40 px-4">
      <div className="soft-card-shadow w-full max-w-sm rounded-xl bg-surface-container-lowest p-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        <p className="font-body-md text-body-md mt-2 text-on-surface-variant">{message}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className={`min-h-[48px] flex-1 rounded-lg px-6 font-label-md text-label-md font-semibold text-white transition-opacity disabled:opacity-50 ${
              danger ? "bg-error" : "bg-primary"
            }`}
          >
            {confirming ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
