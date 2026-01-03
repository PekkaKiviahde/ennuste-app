"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

const formatDateKey = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ForecastTable({
  rows,
  targetOptions
}: {
  rows: ForecastRow[];
  targetOptions: TargetOption[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [mappingFilter, setMappingFilter] = useState(searchParams.get("mapping") ?? "ALL");
  const [startDate, setStartDate] = useState(searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("end") ?? "");

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    const nextMapping = searchParams.get("mapping") ?? "ALL";
    const nextStart = searchParams.get("start") ?? "";
    const nextEnd = searchParams.get("end") ?? "";
    if (nextQuery !== query) setQuery(nextQuery);
    if (nextMapping !== mappingFilter) setMappingFilter(nextMapping);
    if (nextStart !== startDate) setStartDate(nextStart);
    if (nextEnd !== endDate) setEndDate(nextEnd);
  }, [searchParams, query, mappingFilter, startDate, endDate]);

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
  }, [rows, query, mappingFilter, startDate, endDate, targetLookup]);

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

  const resetDates = () => {
    setStartDate("");
    setEndDate("");
  };

  const updateParams = (next: {
    q?: string;
    mapping?: string;
    start?: string;
    end?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      next.q ? params.set("q", next.q) : params.delete("q");
    }
    if (next.mapping !== undefined) {
      next.mapping && next.mapping !== "ALL" ? params.set("mapping", next.mapping) : params.delete("mapping");
    }
    if (next.start !== undefined) {
      next.start ? params.set("start", next.start) : params.delete("start");
    }
    if (next.end !== undefined) {
      next.end ? params.set("end", next.end) : params.delete("end");
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <>
      <div className="table-filters">
        <div>
          <label className="label" htmlFor="forecast-query">Suodata tavoitearvio</label>
          <input
            className="input"
            id="forecast-query"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              updateParams({ q: value });
            }}
            placeholder="Esim. 1100 tai Runko"
          />
        </div>
        <div>
          <label className="label" htmlFor="forecast-mapping">Mapping</label>
          <select
            className="input"
            id="forecast-mapping"
            value={mappingFilter}
            onChange={(event) => {
              const value = event.target.value;
              setMappingFilter(value);
              updateParams({ mapping: value });
            }}
          >
            <option value="ALL">Kaikki</option>
            <option value="MAPPED">Valittu</option>
            <option value="UNMAPPED">Ei mappingia</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="forecast-start-date">Alkaen</label>
          <input
            className="input"
            id="forecast-start-date"
            type="date"
            value={startDate}
            onChange={(event) => {
              const value = event.target.value;
              setStartDate(value);
              updateParams({ start: value });
            }}
          />
        </div>
        <div>
          <label className="label" htmlFor="forecast-end-date">Asti</label>
          <input
            className="input"
            id="forecast-end-date"
            type="date"
            value={endDate}
            onChange={(event) => {
              const value = event.target.value;
              setEndDate(value);
              updateParams({ end: value });
            }}
          />
          {(startDate || endDate) && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => {
                resetDates();
                updateParams({ start: "", end: "" });
              }}
            >
              Tyhjenna
            </button>
          )}
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
