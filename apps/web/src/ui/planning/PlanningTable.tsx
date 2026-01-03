"use client";

import { useMemo, useState } from "react";

type PlanningRow = {
  planning_event_id: string;
  target_littera_id: string;
  status: string;
  event_time: string;
  created_by: string;
  summary?: string | null;
  observations?: string | null;
};

type TargetOption = {
  id: string;
  label: string;
};

const statusClass = (status: string | null | undefined) => {
  if (status === "READY_FOR_FORECAST") return "ready";
  if (status === "LOCKED") return "locked";
  if (status === "DRAFT") return "draft";
  return "missing";
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

const formatDateKey = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function PlanningTable({
  rows,
  targetOptions
}: {
  rows: PlanningRow[];
  targetOptions: TargetOption[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const targetLookup = useMemo(
    () => new Map(targetOptions.map((option) => [option.id, option.label])),
    [targetOptions]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) {
        return false;
      }
      if (startDate || endDate) {
        const rowDate = formatDateKey(row.event_time);
        if (startDate && rowDate < startDate) {
          return false;
        }
        if (endDate && rowDate > endDate) {
          return false;
        }
      }
      if (!normalized) {
        return true;
      }
      const label = (targetLookup.get(row.target_littera_id) ?? row.target_littera_id).toLowerCase();
      return label.includes(normalized) || row.target_littera_id.toLowerCase().includes(normalized);
    });
  }, [rows, query, statusFilter, startDate, endDate, targetLookup]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlanningRow[]>();
    for (const row of filtered) {
      const key = targetLookup.get(row.target_littera_id) ?? row.target_littera_id;
      const list = map.get(key);
      if (list) {
        list.push(row);
      } else {
        map.set(key, [row]);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "fi-FI"))
      .map(([label, items]) => ({
        label,
        items: items.sort((a, b) => b.event_time.localeCompare(a.event_time))
      }));
  }, [filtered, targetLookup]);

  const resetDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <>
      <div className="table-filters">
        <div>
          <label className="label" htmlFor="planning-query">Suodata tavoitearvio</label>
          <input
            className="input"
            id="planning-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Esim. 1100 tai Runko"
          />
        </div>
        <div>
          <label className="label" htmlFor="planning-status">Tila</label>
          <select
            className="input"
            id="planning-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">Kaikki</option>
            <option value="DRAFT">Luonnos</option>
            <option value="READY_FOR_FORECAST">Valmis ennusteeseen</option>
            <option value="LOCKED">Lukittu</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="planning-start-date">Alkaen</label>
          <input
            className="input"
            id="planning-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="planning-end-date">Asti</label>
          <input
            className="input"
            id="planning-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
          {(startDate || endDate) && (
            <button className="btn btn-secondary btn-sm" type="button" onClick={resetDates}>
              Tyhjenna
            </button>
          )}
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Tavoitearvio</th>
            <th>Tila</th>
            <th>Aika</th>
            <th>Tekija</th>
            <th>Yhteenveto</th>
          </tr>
        </thead>
        <tbody>
          {grouped.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="notice">Ei suunnitelmia valituilla suodattimilla.</div>
              </td>
            </tr>
          ) : (
            grouped.flatMap((group) => [
              <tr key={`group-${group.label}`} className="table-group">
                <td colSpan={5}>{group.label}</td>
              </tr>,
              ...group.items.map((row) => (
                <tr key={row.planning_event_id}>
                  <td>{targetLookup.get(row.target_littera_id) ?? row.target_littera_id}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                  <td>{formatDateTime(row.event_time)}</td>
                  <td>
                    <div>{row.created_by}</div>
                    <div className="muted">{row.planning_event_id}</div>
                  </td>
                  <td>
                    <div>{row.summary ?? "-"}</div>
                    <div className="muted">{row.observations ?? "-"}</div>
                  </td>
                </tr>
              ))
            ])
          )}
        </tbody>
      </table>
    </>
  );
}
