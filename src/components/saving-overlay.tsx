/**
 * SavingOverlay — shows a full-form loading overlay with spinner and message
 * while a form submission is in progress.
 */
export function SavingOverlay({ message = "Menyimpan data..." }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-gray-700">{message}</p>
    </div>
  );
}

/**
 * SavingButton — a submit button that automatically shows a spinner when saving.
 */
export function SavingButton({
  saving,
  label = "Simpan",
  savingLabel = "Menyimpan...",
  className = "",
}: {
  saving: boolean;
  label?: string;
  savingLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={saving}
      className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {saving ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          {savingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
