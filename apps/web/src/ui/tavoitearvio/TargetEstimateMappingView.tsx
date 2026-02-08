"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type MappingItem = {
  target_estimate_item_id: string;
  littera_code: string;
  item_code: string;
  item_desc: string | null;
  qty: number | null;
  unit: string | null;
  total_eur: number | string | null;
  is_leaf: boolean;
  work_package_id: string | null;
  work_package_name: string | null;
  proc_package_id: string | null;
  proc_package_name: string | null;
};

type WorkPackage = {
  work_package_id: string;
  code?: string;
  name: string;
  status: string | null;
  created_at: string;
};

type ProcPackage = {
  proc_package_id: string;
  name: string;
  description: string | null;
  default_work_package_id: string | null;
};

type MappingData = {
  items: MappingItem[];
  workPackages: WorkPackage[];
  procPackages: ProcPackage[];
};

const toNumber = (value: number | string | null) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
  return new Intl.NumberFormat("fi-FI", options).format(value);
};

const formatMoney = (value: number) =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQty = (value: number) =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getStatusLabel = (item: MappingItem) => {
  if (!item.is_leaf) return "Otsikko";
  if (!item.work_package_id) return "Työpaketti puuttuu";
  if (!item.proc_package_id) return "Hankintapaketti puuttuu";
  return "OK";
};

export default function TargetEstimateMappingView() {
  const [data, setData] = useState<MappingData>({ items: [], workPackages: [], procPackages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [leafOnly, setLeafOnly] = useState(true);
  const [missingWork, setMissingWork] = useState(false);
  const [missingProc, setMissingProc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkWorkPackage, setBulkWorkPackage] = useState("");
  const [bulkProcPackage, setBulkProcPackage] = useState("");
  const [newWorkPackageCode, setNewWorkPackageCode] = useState("");
  const [newWorkPackageName, setNewWorkPackageName] = useState("");
  const [newProcPackageCode, setNewProcPackageCode] = useState("");
  const [newProcPackageName, setNewProcPackageName] = useState("");
  const [newProcDefaultWorkPackage, setNewProcDefaultWorkPackage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/target-estimate-mapping", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Tietojen lataus epäonnistui");
      }
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tietojen lataus epäonnistui");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.items.filter((item) => {
      if (leafOnly && !item.is_leaf) return false;
      if (missingWork && item.is_leaf && item.work_package_id) return false;
      if (missingProc && item.is_leaf && item.proc_package_id) return false;
      if (!query) return true;
      return (
        item.item_code.toLowerCase().includes(query) ||
        (item.item_desc ?? "").toLowerCase().includes(query)
      );
    });
  }, [data.items, leafOnly, missingWork, missingProc, search]);

  const leafItems = useMemo(() => data.items.filter((item) => item.is_leaf), [data.items]);
  const occupiedWorkPackageIds = useMemo(
    () => new Set(data.procPackages.map((proc) => proc.default_work_package_id).filter((id): id is string => Boolean(id))),
    [data.procPackages]
  );
  const availableWorkPackagesForProc = useMemo(
    () => data.workPackages.filter((work) => !occupiedWorkPackageIds.has(work.work_package_id)),
    [data.workPackages, occupiedWorkPackageIds]
  );
  const totalLeafSum = useMemo(
    () => leafItems.reduce((sum, item) => sum + toNumber(item.total_eur), 0),
    [leafItems]
  );
  const workMappedSum = useMemo(
    () => leafItems.filter((item) => item.work_package_id).reduce((sum, item) => sum + toNumber(item.total_eur), 0),
    [leafItems]
  );
  const procMappedSum = useMemo(
    () => leafItems.filter((item) => item.proc_package_id).reduce((sum, item) => sum + toNumber(item.total_eur), 0),
    [leafItems]
  );

  const workMappedPercent = totalLeafSum > 0 ? (workMappedSum / totalLeafSum) * 100 : 0;
  const procMappedPercent = totalLeafSum > 0 ? (procMappedSum / totalLeafSum) * 100 : 0;

  const visibleLeafIds = useMemo(
    () => filteredItems.filter((item) => item.is_leaf).map((item) => item.target_estimate_item_id),
    [filteredItems]
  );

  const toggleSelectAll = () => {
    if (selected.size === visibleLeafIds.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(visibleLeafIds));
  };

  const toggleSelection = (itemId: string) => {
    const next = new Set(selected);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelected(next);
  };

  const assignItems = async (itemIds: string[], payload: { workPackageId?: string | null; procPackageId?: string | null }) => {
    if (itemIds.length === 0) return;
    try {
      setBusy(true);
      setError(null);
      const response = await fetch("/api/target-estimate-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds, ...payload })
      });
      const result = await response.json();
      if (!response.ok) {
        if (result?.code === "WORK_PROC_LINK_MISMATCH") {
          throw new Error("Valittu hankintapaketti kuuluu toiseen tyopakettiin. Valitse hankintapaketin oma tyopaketti.");
        }
        throw new Error(result?.error ?? "Päivitys epäonnistui");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Päivitys epäonnistui");
    } finally {
      setBusy(false);
    }
  };

  const createWorkPackage = async () => {
    const code = newWorkPackageCode.trim();
    const name = newWorkPackageName.trim();
    if (!code || !/^\d{4}$/.test(code)) {
      setError("Tyopaketin koodi on pakollinen ja oltava 4 numeroa.");
      return;
    }
    if (!name) {
      setError("Tyopaketin nimi on pakollinen.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const response = await fetch("/api/work-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error ?? "Työpaketin luonti epäonnistui");
      }
      setNewWorkPackageCode("");
      setNewWorkPackageName("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Työpaketin luonti epäonnistui");
    } finally {
      setBusy(false);
    }
  };

  const createProcPackage = async () => {
    const code = newProcPackageCode.trim();
    const name = newProcPackageName.trim();
    const defaultWorkPackageId = newProcDefaultWorkPackage.trim();
    if (!code || !/^\d{4}$/.test(code)) {
      setError("Hankintapaketin koodi on pakollinen ja oltava 4 numeroa.");
      return;
    }
    if (!name) {
      setError("Hankintapaketin nimi on pakollinen.");
      return;
    }
    if (!defaultWorkPackageId) {
      setError("Hankintapaketti on linkitettävä tyopakettiin.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const response = await fetch("/api/proc-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          defaultWorkPackageId
        })
      });
      const result = await response.json();
      if (!response.ok) {
        if (result?.code === "WORK_PACKAGE_ALREADY_LINKED") {
          throw new Error("Valitulla tyopaketilla on jo hankintapaketti (1:1 MVP).");
        }
        throw new Error(result?.error ?? "Hankintapaketin luonti epäonnistui");
      }
      setNewProcPackageCode("");
      setNewProcPackageName("");
      setNewProcDefaultWorkPackage("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hankintapaketin luonti epäonnistui");
    } finally {
      setBusy(false);
    }
  };

  const bulkAssignWork = async () => {
    const workPackageId = bulkWorkPackage || null;
    await assignItems(Array.from(selected), { workPackageId });
    setSelected(new Set());
  };

  const bulkAssignProc = async () => {
    const procPackageId = bulkProcPackage || null;
    await assignItems(Array.from(selected), { procPackageId });
    setSelected(new Set());
  };

  return (
    <section className="card">
      <h1>Tavoitearvion mäppäys</h1>
      <p>Mäppää tavoitearviorivit työpaketteihin ja hankintapaketteihin item-tasolla.</p>

      <div className="grid grid-2">
        <div>
          <div className="label">Etenemä</div>
          <div className="status-actions">
            <span className="badge">LEAF € työpaketti: {formatNumber(workMappedPercent, { maximumFractionDigits: 1 })}%</span>
            <span className="badge">LEAF € hankintapaketti: {formatNumber(procMappedPercent, { maximumFractionDigits: 1 })}%</span>
          </div>
          <div className="muted">LEAF yhteensä € {formatMoney(totalLeafSum)}</div>
        </div>
        <div>
          <div className="label">Massakohdistus</div>
          <div className="form-grid">
            <div>
              <label className="label" htmlFor="bulk-work">Työpaketti</label>
              <select
                id="bulk-work"
                className="input"
                value={bulkWorkPackage}
                onChange={(event) => setBulkWorkPackage(event.target.value)}
              >
                <option value="">Valitse työpaketti</option>
                {data.workPackages.map((work) => (
                  <option key={work.work_package_id} value={work.work_package_id}>
                    {work.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" type="button" disabled={busy || selected.size === 0} onClick={bulkAssignWork}>
                Kohdista työpaketti
              </button>
            </div>
            <div>
              <label className="label" htmlFor="bulk-proc">Hankintapaketti</label>
              <select
                id="bulk-proc"
                className="input"
                value={bulkProcPackage}
                onChange={(event) => setBulkProcPackage(event.target.value)}
              >
                <option value="">Valitse hankintapaketti</option>
                {data.procPackages.map((proc) => (
                  <option key={proc.proc_package_id} value={proc.proc_package_id}>
                    {proc.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" type="button" disabled={busy || selected.size === 0} onClick={bulkAssignProc}>
                Kohdista hankintapaketti
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-filters">
        <div>
          <label className="label" htmlFor="search">Haku</label>
          <input
            id="search"
            className="input"
            placeholder="Hae koodi tai selite"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <label className="label">
          <input
            type="checkbox"
            checked={leafOnly}
            onChange={(event) => setLeafOnly(event.target.checked)}
          />{" "}
          Vain LEAF
        </label>
        <label className="label">
          <input
            type="checkbox"
            checked={missingWork}
            onChange={(event) => setMissingWork(event.target.checked)}
          />{" "}
          Puuttuu työpaketti
        </label>
        <label className="label">
          <input
            type="checkbox"
            checked={missingProc}
            onChange={(event) => setMissingProc(event.target.checked)}
          />{" "}
          Puuttuu hankintapaketti
        </label>
      </div>

      <details className="dialog">
        <summary className="label">Luo uusi työpaketti</summary>
        <div className="dialog-panel">
          <input
            className="input"
            placeholder="Työpaketin koodi (4 numeroa)"
            value={newWorkPackageCode}
            onChange={(event) => setNewWorkPackageCode(event.target.value)}
          />
          <input
            className="input"
            placeholder="Työpaketin nimi"
            value={newWorkPackageName}
            onChange={(event) => setNewWorkPackageName(event.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            type="button"
            disabled={busy || !newWorkPackageCode.trim() || !newWorkPackageName.trim()}
            onClick={createWorkPackage}
          >
            Luo työpaketti
          </button>
        </div>
      </details>

      <details className="dialog">
        <summary className="label">Luo uusi hankintapaketti</summary>
        <div className="dialog-panel">
          <input
            className="input"
            placeholder="Hankintapaketin koodi (4 numeroa)"
            value={newProcPackageCode}
            onChange={(event) => setNewProcPackageCode(event.target.value)}
          />
          <input
            className="input"
            placeholder="Hankintapaketin nimi"
            value={newProcPackageName}
            onChange={(event) => setNewProcPackageName(event.target.value)}
          />
          <select
            className="input"
            value={newProcDefaultWorkPackage}
            onChange={(event) => setNewProcDefaultWorkPackage(event.target.value)}
          >
            <option value="">Valitse linkitetty työpaketti</option>
            {data.workPackages.map((work) => (
              <option
                key={work.work_package_id}
                value={work.work_package_id}
                disabled={occupiedWorkPackageIds.has(work.work_package_id)}
              >
                {work.name}
              </option>
            ))}
          </select>
          {availableWorkPackagesForProc.length === 0 && (
            <div className="notice">Kaikki työpaketit on jo linkitetty hankintapakettiin (1:1).</div>
          )}
          <button
            className="btn btn-primary btn-sm"
            type="button"
            disabled={
              busy ||
              !newProcPackageCode.trim() ||
              !newProcPackageName.trim() ||
              !newProcDefaultWorkPackage.trim()
            }
            onClick={createProcPackage}
          >
            Luo hankintapaketti
          </button>
        </div>
      </details>

      {error && <div className="notice error">{error}</div>}
      {loading ? (
        <div className="notice">Ladataan...</div>
      ) : (
        <table className="table table-compact">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={visibleLeafIds.length > 0 && selected.size === visibleLeafIds.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Item code</th>
              <th>Selite</th>
              <th>Määrä</th>
              <th>Summa EUR</th>
              <th>Työpaketti</th>
              <th>Hankintapaketti</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="notice">Ei riveja nykyisilla suodattimilla.</div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const qty = toNumber(item.qty);
                const total = toNumber(item.total_eur);
                const statusLabel = getStatusLabel(item);
                const isSelectable = item.is_leaf;
                return (
                  <tr key={item.target_estimate_item_id}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={!isSelectable}
                        checked={selected.has(item.target_estimate_item_id)}
                        onChange={() => toggleSelection(item.target_estimate_item_id)}
                      />
                    </td>
                    <td>
                      <div>{item.item_code}</div>
                      <div className="muted">Littera {item.littera_code}</div>
                    </td>
                    <td>{item.item_desc ?? "-"}</td>
                    <td>{item.unit ? `${formatQty(qty)} ${item.unit}` : formatQty(qty)}</td>
                    <td>{formatMoney(total)}</td>
                    <td>
                      <select
                        className="input"
                        disabled={!item.is_leaf || busy}
                        value={item.work_package_id ?? ""}
                        onChange={(event) => {
                          const value = event.target.value || null;
                          if (value === item.work_package_id) return;
                          void assignItems([item.target_estimate_item_id], { workPackageId: value });
                        }}
                      >
                        <option value="">Valitse</option>
                        {data.workPackages.map((work) => (
                          <option key={work.work_package_id} value={work.work_package_id}>
                            {work.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input"
                        disabled={!item.is_leaf || busy}
                        value={item.proc_package_id ?? ""}
                        onChange={(event) => {
                          const value = event.target.value || null;
                          if (value === item.proc_package_id) return;
                          void assignItems([item.target_estimate_item_id], { procPackageId: value });
                        }}
                      >
                        <option value="">Valitse</option>
                        {data.procPackages.map((proc) => (
                          <option key={proc.proc_package_id} value={proc.proc_package_id}>
                            {proc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="badge">{statusLabel}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
