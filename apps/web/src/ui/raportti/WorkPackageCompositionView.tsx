"use client";

import { useMemo, useState } from "react";

type WorkPackageCompositionRow = {
  target_estimate_item_id: string;
  work_package_id: string;
  work_package_code: string | null;
  work_package_name: string | null;
  proc_package_id: string | null;
  proc_package_code: string | null;
  proc_package_name: string | null;
  littera_code: string | null;
  item_code: string | null;
  item_desc: string | null;
  total_eur: number | string | null;
};

type NormalizedRow = WorkPackageCompositionRow & {
  total_eur_num: number;
};

type WorkPackageGroup = {
  workPackageId: string;
  workPackageCode: string | null;
  workPackageName: string | null;
  procPackages: { procPackageId: string; code: string | null; name: string | null }[];
  rows: NormalizedRow[];
  totalEur: number;
};

const toNumber = (value: number | string | null) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const getWorkPackageLabel = (group: WorkPackageGroup) => {
  const code = (group.workPackageCode ?? "").trim();
  const name = (group.workPackageName ?? "").trim();
  return `${code} ${name}`.trim() || group.workPackageId;
};

const normalize = (row: WorkPackageCompositionRow): NormalizedRow => ({
  ...row,
  total_eur_num: toNumber(row.total_eur)
});

const textIncludes = (value: string | null | undefined, query: string) => {
  if (!value) return false;
  return value.toLowerCase().includes(query);
};

const matchesSearch = (row: WorkPackageCompositionRow, query: string) => {
  if (!query) return true;
  return (
    textIncludes(row.work_package_code, query) ||
    textIncludes(row.work_package_name, query) ||
    textIncludes(row.proc_package_code, query) ||
    textIncludes(row.proc_package_name, query) ||
    textIncludes(row.littera_code, query) ||
    textIncludes(row.item_code, query) ||
    textIncludes(row.item_desc, query)
  );
};

type GroupSort = "code-asc" | "sum-desc" | "sum-asc";
type RowSort = "littera-item-asc" | "sum-desc" | "sum-asc";

export default function WorkPackageCompositionView({ rows }: { rows: unknown[] }) {
  const safeRows = (rows as WorkPackageCompositionRow[]) ?? [];

  const [search, setSearch] = useState("");
  const [workPackageId, setWorkPackageId] = useState("");
  const [missingProcOnly, setMissingProcOnly] = useState(false);
  const [groupSort, setGroupSort] = useState<GroupSort>("code-asc");
  const [rowSort, setRowSort] = useState<RowSort>("littera-item-asc");

  const normalized = useMemo(() => safeRows.map(normalize), [safeRows]);

  const allWorkPackages = useMemo(() => {
    const map = new Map<string, { id: string; code: string | null; name: string | null }>();
    for (const row of normalized) {
      if (!row.work_package_id) continue;
      if (!map.has(row.work_package_id)) {
        map.set(row.work_package_id, {
          id: row.work_package_id,
          code: row.work_package_code ?? null,
          name: row.work_package_name ?? null
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const aKey = (a.code ?? a.name ?? a.id).toLowerCase();
      const bKey = (b.code ?? b.name ?? b.id).toLowerCase();
      return aKey.localeCompare(bKey, "fi");
    });
  }, [normalized]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return normalized.filter((row) => {
      if (workPackageId && row.work_package_id !== workPackageId) return false;
      if (missingProcOnly && row.proc_package_id) return false;
      if (query && !matchesSearch(row, query)) return false;
      return true;
    });
  }, [missingProcOnly, normalized, search, workPackageId]);

  const groups = useMemo(() => {
    const map = new Map<string, WorkPackageGroup>();
    for (const row of filteredRows) {
      const group = map.get(row.work_package_id) ?? {
        workPackageId: row.work_package_id,
        workPackageCode: row.work_package_code ?? null,
        workPackageName: row.work_package_name ?? null,
        procPackages: [],
        rows: [],
        totalEur: 0
      };
      group.rows.push(row);
      group.totalEur += row.total_eur_num;
      map.set(row.work_package_id, group);
    }

    for (const group of map.values()) {
      const procMap = new Map<string, { procPackageId: string; code: string | null; name: string | null }>();
      for (const row of group.rows) {
        if (!row.proc_package_id) continue;
        procMap.set(row.proc_package_id, {
          procPackageId: row.proc_package_id,
          code: row.proc_package_code ?? null,
          name: row.proc_package_name ?? null
        });
      }
      group.procPackages = Array.from(procMap.values()).sort((a, b) => {
        const aKey = (a.code ?? a.name ?? a.procPackageId).toLowerCase();
        const bKey = (b.code ?? b.name ?? b.procPackageId).toLowerCase();
        return aKey.localeCompare(bKey, "fi");
      });

      group.rows.sort((a, b) => {
        if (rowSort === "sum-desc") return b.total_eur_num - a.total_eur_num;
        if (rowSort === "sum-asc") return a.total_eur_num - b.total_eur_num;
        const aKey = `${a.littera_code ?? ""}|${a.item_code ?? ""}`.toLowerCase();
        const bKey = `${b.littera_code ?? ""}|${b.item_code ?? ""}`.toLowerCase();
        return aKey.localeCompare(bKey, "fi");
      });
    }

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (groupSort === "sum-desc") return b.totalEur - a.totalEur;
      if (groupSort === "sum-asc") return a.totalEur - b.totalEur;
      const aKey = (a.workPackageCode ?? a.workPackageName ?? a.workPackageId).toLowerCase();
      const bKey = (b.workPackageCode ?? b.workPackageName ?? b.workPackageId).toLowerCase();
      return aKey.localeCompare(bKey, "fi");
    });
    return list;
  }, [filteredRows, groupSort, rowSort]);

  const totalWorkPackages = allWorkPackages.length;
  const totalRows = normalized.length;
  const visibleWorkPackages = groups.length;
  const visibleRows = filteredRows.length;
  const visibleSum = useMemo(() => filteredRows.reduce((sum, row) => sum + row.total_eur_num, 0), [filteredRows]);

  if (totalRows === 0) {
    return (
      <section className="card">
        <div className="notice">
          Ei koostumusta vielä. Varmista, että tavoitearvio on tuotu ja item-rivejä on mäpätty työpaketteihin.
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <div className="table-filters">
          <div>
            <label className="label" htmlFor="search">Haku</label>
            <input
              id="search"
              className="input"
              placeholder="Hae työpaketti / hankinta / littera / item / kuvaus"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="workPackageFilter">Työpaketti</label>
            <select
              id="workPackageFilter"
              className="input"
              value={workPackageId}
              onChange={(event) => setWorkPackageId(event.target.value)}
            >
              <option value="">Kaikki</option>
              {allWorkPackages.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {`${wp.code ?? ""} ${wp.name ?? ""}`.trim() || wp.id}
                </option>
              ))}
            </select>
          </div>
          <label className="label">
            <input
              type="checkbox"
              checked={missingProcOnly}
              onChange={(event) => setMissingProcOnly(event.target.checked)}
            />{" "}
            Puuttuu hankintapaketti
          </label>
          <div>
            <label className="label" htmlFor="groupSort">Järjestys (työpaketit)</label>
            <select
              id="groupSort"
              className="input"
              value={groupSort}
              onChange={(event) => setGroupSort(event.target.value as GroupSort)}
            >
              <option value="code-asc">Koodi A–Ö</option>
              <option value="sum-desc">Summa EUR (suurin ensin)</option>
              <option value="sum-asc">Summa EUR (pienin ensin)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rowSort">Järjestys (rivit)</label>
            <select
              id="rowSort"
              className="input"
              value={rowSort}
              onChange={(event) => setRowSort(event.target.value as RowSort)}
            >
              <option value="littera-item-asc">Littera + item</option>
              <option value="sum-desc">Summa EUR (suurin ensin)</option>
              <option value="sum-asc">Summa EUR (pienin ensin)</option>
            </select>
          </div>
        </div>

        <div className="status-actions">
          <span className="badge">Työpaketteja: {visibleWorkPackages} / {totalWorkPackages}</span>
          <span className="badge">Rivejä: {visibleRows} / {totalRows}</span>
          <span className="badge">Summa: {formatMoney(visibleSum)} EUR</span>
          {(search || workPackageId || missingProcOnly) && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => {
                setSearch("");
                setWorkPackageId("");
                setMissingProcOnly(false);
              }}
            >
              Tyhjennä suodattimet
            </button>
          )}
        </div>
      </section>

      {groups.length === 0 ? (
        <section className="card">
          <div className="notice">Ei osumia nykyisillä suodattimilla.</div>
        </section>
      ) : (
        groups.map((group) => {
          const procLabel =
            group.procPackages.length === 0
              ? null
              : group.procPackages.length === 1
                ? `Hankinta: ${`${group.procPackages[0]?.code ?? ""} ${group.procPackages[0]?.name ?? ""}`.trim()}`
                : `Hankintoja: ${group.procPackages.length}`;
          const procTitle =
            group.procPackages.length <= 1
              ? undefined
              : group.procPackages
                  .map((proc) => `${(proc.code ?? "").trim()} ${(proc.name ?? "").trim()}`.trim() || proc.procPackageId)
                  .join(", ");

          return (
            <section className="card" key={group.workPackageId}>
              <h2>{getWorkPackageLabel(group)}</h2>
              <div className="status-actions">
                <span className="badge">Summa: {formatMoney(group.totalEur)} EUR</span>
                <span className="badge">Rivejä: {group.rows.length}</span>
                {procLabel && (
                  <span className="badge" title={procTitle}>
                    {procLabel}
                  </span>
                )}
              </div>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Littera</th>
                    <th>Item</th>
                    <th>Kuvaus</th>
                    <th className="right">Summa EUR</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.target_estimate_item_id}>
                      <td>{row.littera_code ?? "-"}</td>
                      <td>{row.item_code ?? "-"}</td>
                      <td>{row.item_desc ?? "-"}</td>
                      <td className="right">{formatMoney(row.total_eur_num)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </>
  );
}
