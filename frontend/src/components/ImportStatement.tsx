import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { useImportStatement } from "../lib/hooks";
import type { StatementImportResult } from "../lib/types";

/**
 * "Import statement" control: pick a PDF (GPay / UPI / bank export), auto-import the
 * detected transactions, and show a summary. If the PDF is password protected, prompts
 * for the password and retries.
 */
export function ImportStatement() {
  const importMutation = useImportStatement();
  const fileInput = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [result, setResult] = useState<StatementImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPendingFile(null);
    setPassword("");
    setNeedsPassword(false);
  }

  async function run(file: File, pwd?: string) {
    setError(null);
    setResult(null);
    try {
      const res = await importMutation.mutateAsync({ file, password: pwd });
      setResult(res);
      reset();
    } catch (e) {
      const message = (e as Error).message;
      if (/password/i.test(message)) {
        setPendingFile(file);
        setNeedsPassword(true);
      } else {
        setError(message);
        reset();
      }
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) run(file);
  }

  const busy = importMutation.isPending;

  return (
    <div className="space-y-3">
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onFileChosen}
      />
      <button
        className="btn-ghost"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        title="Import transactions from a PDF statement"
      >
        <Upload className="h-4 w-4" />
        {busy ? "Importing…" : "Import statement"}
      </button>

      {needsPassword && pendingFile && (
        <div className="card flex flex-wrap items-end gap-3 border-amber-200 bg-amber-50/60">
          <FileText className="mb-2 h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <label className="label">This PDF is password protected — enter its password</label>
            <input
              className="input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password && run(pendingFile, password)}
              placeholder="Statement password"
            />
          </div>
          <button
            className="btn-primary"
            disabled={!password || busy}
            onClick={() => run(pendingFile, password)}
          >
            Unlock & import
          </button>
          <button className="btn-ghost" onClick={reset} disabled={busy}>
            Cancel
          </button>
        </div>
      )}

      {result && (
        <div className="card flex items-start gap-3 border-emerald-200 bg-emerald-50/60">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-ink">
              Imported {result.importedCount} transaction{result.importedCount === 1 ? "" : "s"}
              {result.skippedCount > 0 && ` · ${result.skippedCount} row(s) skipped`}
            </p>
            {result.warnings.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-body">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            {result.importedCount > 0 && (
              <p className="mt-1 text-xs text-muted">
                Review them below and edit categories or amounts if anything looks off.
              </p>
            )}
          </div>
          <button className="text-muted hover:text-ink" onClick={() => setResult(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="card flex items-start gap-3 border-rose-200 bg-rose-50/60">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-rose-600" />
          <p className="flex-1 text-sm text-ink">{error}</p>
          <button className="text-muted hover:text-ink" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
