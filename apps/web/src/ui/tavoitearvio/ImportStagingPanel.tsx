"use client";

import { useMemo, useState } from "react";

type Issue = {
  issue_code: string;
  issue_message: string | null;
  severity: string;
};

type StagingLine = {
  staging_line_id: string;
  row_no: number;
  raw_json: Record<string, unknown>;
  edit_json: Record<string, unknown> | null;
  issues: Issue[];
};

type StagingBatch = {
  staging_batch_id: string;
  file_name: string | null;
  status: string | null;
  issue_count: number;
  created_at: string;
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const fetchJson = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "Virhe");
  }
  return payload;
};

export default function ImportStagingPanel({ username }: { username: string }) {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState<string | null>(null);
  const [batchId, setBatchId] = useState("");
  const [actor, setActor] = useState(username);
  const [result, setResult] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [lines, setLines] = useState<StagingLine[]>([]);
  const [batches, setBatches] = useState<StagingBatch[]>([]);
  const [mode, setMode] = useState<"issues" | "clean" | "all">("issues");
  const [severity, setSeverity] = useState<string>("");
  const [exportMode, setExportMode] = useState<"clean" | "all">("clean");
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [force, setForce] = useState(false);
  const hasFile = Boolean(csvText);

  const visibleLines = useMemo(() => lines, [lines]);

  const handleFileChange = async (file?: File | null) => {
    if (!file) {
      setFileName("");
      setCsvText(null);
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
  };

  const loadLines = async (
    targetBatchId: string,
    nextMode: "issues" | "clean" | "all" = mode,
    nextSeverity: string = severity
  ) => {
    if (!targetBatchId) {
      throw new Error("Staging-batch ID puuttuu.");
    }
    const params = new URLSearchParams();
    params.set("mode", nextMode);
    if (nextSeverity) {
      params.set("severity", nextSeverity);
    }
    const data = await fetchJson(`/api/import-staging/${targetBatchId}/lines?${params.toString()}`);
    setLines(data.lines || []);
  };

  const loadBatches = async () => {
    const data = await fetchJson("/api/import-staging");
    setBatches(data.batches || []);
  };

  const createStaging = async () => {
    if (!csvText) {
      throw new Error("CSV ei ole ladattuna.");
    }
    if (!actor.trim()) {
      throw new Error("Tuojan nimi puuttuu.");
    }
    const res = await fetchJson("/api/import-staging/budget", {
      method: "POST",
      body: JSON.stringify({
        importedBy: actor.trim(),
        filename: fileName,
        csvText
      })
    });
    setBatchId(res.staging_batch_id);
    setResult(
      `Staging luotu. batch=${res.staging_batch_id} · rivit=${res.line_count} · issueita=${res.issue_count}${
        res.warnings?.length ? ` · varoitukset: ${res.warnings.join(" | ")}` : ""
      }`
    );
    await loadLines(res.staging_batch_id);
  };

  const showSummary = async () => {
    if (!batchId) {
      throw new Error("Staging-batch ID puuttuu.");
    }
    const res = await fetchJson(`/api/import-staging/${batchId}/summary`);
    const totals = res.totals_by_cost_type || {};
    const totalsAll = res.totals_by_cost_type_all || {};
    const lines: string[] = [
      `Batch: ${res.staging_batch_id}`,
      `Riveja: ${res.line_count}`,
      `Koodit: ${res.codes_count}`,
      `Ohitetut rivit: ${res.skipped_rows}`,
      `Ohitetut arvot: ${res.skipped_values}`,
      `ERROR-issuet: ${res.error_issues}`,
      `LABOR (puhdas): ${formatAmount(totals.LABOR || 0)}`,
      `LABOR (kaikki): ${formatAmount(totalsAll.LABOR || 0)}`,
      `MATERIAL (puhdas): ${formatAmount(totals.MATERIAL || 0)}`,
      `MATERIAL (kaikki): ${formatAmount(totalsAll.MATERIAL || 0)}`,
      `SUBCONTRACT (puhdas): ${formatAmount(totals.SUBCONTRACT || 0)}`,
      `SUBCONTRACT (kaikki): ${formatAmount(totalsAll.SUBCONTRACT || 0)}`,
      `RENTAL (puhdas): ${formatAmount(totals.RENTAL || 0)}`,
      `RENTAL (kaikki): ${formatAmount(totalsAll.RENTAL || 0)}`,
      `OTHER (puhdas): ${formatAmount(totals.OTHER || 0)}`,
      `OTHER (kaikki): ${formatAmount(totalsAll.OTHER || 0)}`
    ];
    if (res.top_codes?.length) {
      lines.push("", "Top 10 litterat:");
      res.top_codes.forEach((row: any, idx: number) => {
        const title = row.title ? ` — ${row.title}` : "";
        lines.push(`${idx + 1}. ${row.code}${title}: ${formatAmount(row.total || 0)}`);
      });
    }
    if (res.top_lines?.length) {
      lines.push("", "Top 10 littera+kustannuslaji:");
      res.top_lines.forEach((row: any, idx: number) => {
        const title = row.title ? ` — ${row.title}` : "";
        lines.push(`${idx + 1}. ${row.code}${title} (${row.cost_type}): ${formatAmount(row.total || 0)}`);
      });
    }
    setSummary(lines.join("\n"));
  };

  const approveBatch = async () => {
    if (!batchId) {
      throw new Error("Staging-batch ID puuttuu.");
    }
    const preview = await fetchJson(`/api/import-staging/${batchId}/summary`);
    if (preview.error_issues > 0) {
      throw new Error("Batchissa on ERROR-issueita. Korjaa ennen hyväksyntää.");
    }
    const res = await fetchJson(`/api/import-staging/${batchId}/approve`, {
      method: "POST",
      body: JSON.stringify({ message: "Hyvaksytty UI:ssa" })
    });
    setResult(`Batch hyväksytty (event=${res.staging_batch_event_id}).`);
  };

  const rejectBatch = async () => {
    if (!batchId) {
      throw new Error("Staging-batch ID puuttuu.");
    }
    const res = await fetchJson(`/api/import-staging/${batchId}/reject`, {
      method: "POST",
      body: JSON.stringify({ message: "Hylatty UI:ssa" })
    });
    setResult(`Batch hylätty (event=${res.staging_batch_event_id}).`);
  };

  const commitBatch = async () => {
    if (!batchId) {
      throw new Error("Staging-batch ID puuttuu.");
    }
    const res = await fetchJson(`/api/import-staging/${batchId}/commit`, {
      method: "POST",
      body: JSON.stringify({
        message: "Siirretty UI:ssa",
        allowDuplicate,
        force
      })
    });
    setResult(`Siirto valmis. import_batch_id=${res.import_batch_id} · rivit=${res.inserted_rows}`);
  };

  const exportCsv = async () => {
    if (!batchId) {
      throw new Error("Staging-batch ID puuttuu.");
    }
    const res = await fetch(`/api/import-staging/${batchId}/export?mode=${exportMode}`, {
      credentials: "include"
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "CSV export epäonnistui.");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `budget-staging-${batchId}-${exportMode}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setResult(`CSV ladattu (${exportMode}).`);
  };

  return (
    <section className="card">
      <h2>Staging-tuonti (tavoitearvio)</h2>
      <p>CSV:ssa tulee olla Litterakoodi + kustannussarakkeet (Työ/Aine/Alih/Vmiehet/Muu tai Summa).</p>

      <div className="form-grid">
        <label className="label" htmlFor="staging-imported-by">Tuonut</label>
        <input
          id="staging-imported-by"
          className="input"
          value={actor}
          onChange={(event) => setActor(event.target.value)}
        />

        <label className="label" htmlFor="staging-file">CSV-tiedosto</label>
        <input
          id="staging-file"
          className="input"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />

        <label className="label" htmlFor="staging-batch-id">Staging batch ID</label>
        <input
          id="staging-batch-id"
          className="input"
          value={batchId}
          onChange={(event) => setBatchId(event.target.value)}
          placeholder="uuid"
        />
      </div>

      <div className="status-actions">
        <button className="btn btn-primary btn-sm" type="button" disabled={!hasFile} onClick={() => createStaging().catch((err) => setResult(err.message))}>
          Luo staging
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => loadBatches().catch((err) => setResult(err.message))}>
          Hae batchit
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => loadLines(batchId).catch((err) => setResult(err.message))}>
          Hae rivit
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => showSummary().catch((err) => setResult(err.message))}>
          Esikatsele siirto
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => approveBatch().catch((err) => setResult(err.message))}>
          Hyväksy batch
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => rejectBatch().catch((err) => setResult(err.message))}>
          Hylkää batch
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => exportCsv().catch((err) => setResult(err.message))}>
          Lataa CSV
        </button>
        <button className="btn btn-primary btn-sm" type="button" onClick={() => commitBatch().catch((err) => setResult(err.message))}>
          Siirrä budjettiin
        </button>
      </div>

      <div className="status-actions">
        <label className="label">
          <input type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} /> Force siirto
        </label>
        <label className="label">
          <input
            type="checkbox"
            checked={allowDuplicate}
            onChange={(event) => setAllowDuplicate(event.target.checked)}
          /> Salli duplikaatti
        </label>
      </div>

      {result && <div className="notice">{result}</div>}

      <div className="form-grid">
        <label className="label" htmlFor="staging-mode">Näytä rivit</label>
        <select
          id="staging-mode"
          className="input"
          value={mode}
          onChange={(event) => {
            const value = event.target.value as "issues" | "clean" | "all";
            setMode(value);
            if (batchId) {
              loadLines(batchId, value, severity).catch((err) => setResult(err.message));
            }
          }}
        >
          <option value="issues">Issues</option>
          <option value="clean">Clean</option>
          <option value="all">All</option>
        </select>

        <label className="label" htmlFor="staging-severity">Severity</label>
        <select
          id="staging-severity"
          className="input"
          value={severity}
          onChange={(event) => {
            const value = event.target.value;
            setSeverity(value);
            if (batchId) {
              loadLines(batchId, mode, value).catch((err) => setResult(err.message));
            }
          }}
        >
          <option value="">Kaikki</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>

        <label className="label" htmlFor="staging-export-mode">CSV moodi</label>
        <select
          id="staging-export-mode"
          className="input"
          value={exportMode}
          onChange={(event) => setExportMode(event.target.value as "clean" | "all")}
        >
          <option value="clean">clean</option>
          <option value="all">all</option>
        </select>
      </div>

      {batches.length > 0 && (
        <div className="history">
          {batches.map((batch) => (
            <div key={batch.staging_batch_id} className="history-item">
              <strong>{batch.staging_batch_id}</strong>
              <div>
                {batch.file_name || "-"} · {new Date(batch.created_at).toLocaleString("fi-FI")} ·{" "}
                {batch.status || "DRAFT"} · issueita={batch.issue_count}
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setBatchId(batch.staging_batch_id)}>
                Valitse batch
              </button>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="history">
          <pre>{summary}</pre>
        </div>
      )}

      <div className="history">
        {visibleLines.length === 0 ? (
          <div className="notice">Ei riveja.</div>
        ) : (
          visibleLines.map((line) => (
            <StagingLineCard
              key={line.staging_line_id}
              line={line}
              onEditSaved={() => loadLines(batchId).catch((err) => setResult(err.message))}
              onError={(message) => setResult(message)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function StagingLineCard({
  line,
  onEditSaved,
  onError
}: {
  line: StagingLine;
  onEditSaved: () => void;
  onError: (message: string) => void;
}) {
  const [editJson, setEditJson] = useState("");
  const [preview, setPreview] = useState("");

  const saveEdit = async () => {
    try {
      const parsed = editJson ? JSON.parse(editJson) : null;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Korjaus JSON puuttuu.");
      }
      await fetchJson(`/api/import-staging/lines/${line.staging_line_id}/edits`, {
        method: "POST",
        body: JSON.stringify({
          edit: parsed,
          reason: "UI-korjaus"
        })
      });
      setEditJson("");
      onEditSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Korjaus epäonnistui.");
    }
  };

  const undoEdit = async () => {
    try {
      await fetchJson(`/api/import-staging/lines/${line.staging_line_id}/edits`, {
        method: "POST",
        body: JSON.stringify({
          edit: {},
          reason: "Peruutus"
        })
      });
      setPreview("Yhdistelma: (peruttu)");
      onEditSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Peruutus epäonnistui.");
    }
  };

  const previewMerged = () => {
    try {
      const parsed = editJson ? JSON.parse(editJson) : {};
      const merged = { ...(line.raw_json || {}), ...(line.edit_json || {}), ...(parsed || {}) };
      setPreview(JSON.stringify(merged, null, 2));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Esikatselu epäonnistui.");
    }
  };

  return (
    <div className="history-item">
      <strong>Rivi {line.row_no}</strong>
      <div>
        {line.issues?.length
          ? line.issues.map((i) => `${i.severity || "INFO"} ${i.issue_code}: ${i.issue_message || ""}`).join(" | ")
          : "Ei issueita."}
      </div>
      <pre>{JSON.stringify(line.raw_json || {}, null, 2)}</pre>
      {preview ? <pre>{preview}</pre> : <pre>Yhdistelma: (ei esikatselua)</pre>}
      <label className="label">Korjaus JSON (vain muuttuvat kentät)</label>
      <textarea
        className="input"
        rows={3}
        value={editJson}
        placeholder='{"Litterakoodi":"0100","Työ €":"123,00"}'
        onChange={(event) => setEditJson(event.target.value)}
      />
      <div className="status-actions">
        <button className="btn btn-secondary btn-sm" type="button" onClick={saveEdit}>
          Tallenna korjaus
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => previewMerged()}>
          Esikatsele yhdistelma
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={undoEdit}>
          Peru korjaus
        </button>
      </div>
    </div>
  );
}
