"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  const getIsoWeek = (input: Date) => {
    const tmp = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return week;
  };
  const formatted = new Intl.DateTimeFormat("fi-FI", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
  const week = String(getIsoWeek(date)).padStart(2, "0");
  return `${formatted} (vk ${week})`;
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL");
  const [startDate, setStartDate] = useState(searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("end") ?? "");

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    const nextStatus = searchParams.get("status") ?? "ALL";
    const nextStart = searchParams.get("start") ?? "";
    const nextEnd = searchParams.get("end") ?? "";
    if (nextQuery !== query) setQuery(nextQuery);
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus);
    if (nextStart !== startDate) setStartDate(nextStart);
    if (nextEnd !== endDate) setEndDate(nextEnd);
  }, [searchParams, query, statusFilter, startDate, endDate]);

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

  const updateParams = (next: {
    q?: string;
    status?: string;
    start?: string;
    end?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      next.q ? params.set("q", next.q) : params.delete("q");
    }
    if (next.status !== undefined) {
      next.status && next.status !== "ALL" ? params.set("status", next.status) : params.delete("status");
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
          <label className="label" htmlFor="planning-query">Suodata tavoitearvio</label>
          <input
            className="input"
            id="planning-query"
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
          <label className="label" htmlFor="planning-status">Tila</label>
          <select
            className="input"
            id="planning-status"
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;
              setStatusFilter(value);
              updateParams({ status: value });
            }}
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
            onChange={(event) => {
              const value = event.target.value;
              setStartDate(value);
              updateParams({ start: value });
            }}
          />
        </div>
        <div>
          <label className="label" htmlFor="planning-end-date">Asti</label>
          <input
            className="input"
            id="planning-end-date"
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
