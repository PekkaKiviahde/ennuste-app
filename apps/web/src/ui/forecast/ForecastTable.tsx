"use client";

import { useMemo, useState } from "react";

type ForecastRow = {
  forecast_event_id: string;
  target_littera_id: string;
  mapping_version_id?: string | null;
  event_time: string;
  created_by: string;
  comment?: string | null;
  kpi_value?: number | null;
};

type TargetOption = {
  id: string;
  label: string;
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

export default function ForecastTable({
  rows,
  targetOptions
}: {
  rows: ForecastRow[];
  targetOptions: TargetOption[];
}) {
  const [query, setQuery] = useState("");
  const [mappingFilter, setMappingFilter] = useState("ALL");

  const targetLookup = useMemo(
    () => new Map(targetOptions.map((option) => [option.id, option.label])),
    [targetOptions]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (mappingFilter === "MAPPED" && !row.mapping_version_id) {
        return false;
      }
      if (mappingFilter === "UNMAPPED" && row.mapping_version_id) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      const label = (targetLookup.get(row.target_littera_id) ?? row.target_littera_id).toLowerCase();
      return label.includes(normalized) || row.target_littera_id.toLowerCase().includes(normalized);
    });
  }, [rows, query, mappingFilter, targetLookup]);

  const grouped = useMemo(() => {
    const map = new Map<string, ForecastRow[]>();
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

  return (
    <>
      <div className="table-filters">
        <div>
          <label className="label" htmlFor="forecast-query">Suodata tavoitearvio</label>
          <input
            className="input"
            id="forecast-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Esim. 1100 tai Runko"
          />
        </div>
        <div>
          <label className="label" htmlFor="forecast-mapping">Mapping</label>
          <select
            className="input"
            id="forecast-mapping"
            value={mappingFilter}
            onChange={(event) => setMappingFilter(event.target.value)}
          >
            <option value="ALL">Kaikki</option>
            <option value="MAPPED">Valittu</option>
            <option value="UNMAPPED">Ei mappingia</option>
          </select>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Tavoitearvio</th>
            <th>Mapping</th>
            <th>Aika</th>
            <th>Tekija</th>
            <th>Kommentti</th>
          </tr>
        </thead>
        <tbody>
          {grouped.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="notice">Ei ennustetapahtumia valituilla suodattimilla.</div>
              </td>
            </tr>
          ) : (
            grouped.flatMap((group) => [
              <tr key={`group-${group.label}`} className="table-group">
                <td colSpan={5}>{group.label}</td>
              </tr>,
              ...group.items.map((row) => (
                <tr key={row.forecast_event_id}>
                  <td>{targetLookup.get(row.target_littera_id) ?? row.target_littera_id}</td>
                  <td>{row.mapping_version_id ? "Valittu" : "Ei mappingia"}</td>
                  <td>{formatDateTime(row.event_time)}</td>
                  <td>
                    <div>{row.created_by}</div>
                    <div className="muted">{row.forecast_event_id}</div>
                  </td>
                  <td>
                    <div>{row.comment ?? "-"}</div>
                    <div className="muted">KPI: {row.kpi_value ?? "-"}</div>
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
