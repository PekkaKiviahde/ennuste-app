import { loadDashboard, loadWorkPackageReport, loadWorkflowStatus } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function ReportPage() {
  const session = await requireSession();
  const services = createServices();
  const rows = await loadWorkPackageReport(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const dashboard = await loadDashboard(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const status = await loadWorkflowStatus(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fi-FI", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };
  const formatNumber = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return "-";
    if (Number.isNaN(value)) return String(value);
    return new Intl.NumberFormat("fi-FI", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };
  const formatCpi = (value: number | null | undefined, hasCpi: boolean | null | undefined) => {
    if (!hasCpi || value === null || value === undefined) {
      return "Ei laskettavissa";
    }
    return formatNumber(value, 3);
  };
  const planningLabel = status.planning?.status ?? "Ei suunnitelmaa";
  const planningTime = formatDateTime(status.planning?.event_time);
  const planningSummary = status.planning?.summary?.trim();
  const lockSummaryLabel = status.isLocked
    ? planningSummary || "Ei lukituksen selitettä."
    : "Lukitus ei ole voimassa.";
  const summary = dashboard as
    | {
        bac_total?: number | null;
        ev_total?: number | null;
        ac_star_total?: number | null;
        cpi?: number | null;
        actual_including_unmapped_total?: number | null;
        work_phases_baseline_locked?: number | null;
        work_phases_with_week_update?: number | null;
      }
    | null;
  const summaryBaseline = summary?.work_phases_baseline_locked ?? 0;
  const summaryWeekly = summary?.work_phases_with_week_update ?? 0;
  const varianceTotal =
    summary?.ev_total != null && summary?.ac_star_total != null
      ? summary.ev_total - summary.ac_star_total
      : null;
  const varianceClass =
    varianceTotal == null ? "" : varianceTotal >= 0 ? "variance-positive" : "variance-negative";
  const varianceLabel =
    varianceTotal == null
      ? "Poikkeamaa ei voida laskea."
      : varianceTotal >= 0
        ? "EV ylittää AC*:n."
        : "AC* ylittää EV:n.";
  const maxKpi = Math.max(summary?.bac_total ?? 0, summary?.ev_total ?? 0, summary?.ac_star_total ?? 0, 0);
  const toPercent = (value: number | null | undefined) => {
    if (!value || maxKpi <= 0) return "0%";
    return `${Math.round((value / maxKpi) * 100)}%`;
  };

  return (
    <div className="grid">
      <section className="card">
        <h1>Raportti</h1>
        <p>Työvaiheiden yhteenveto, KPI ja poikkeamat.</p>
        {!status.planning && (
          <div className="notice error">Työpakettisuunnittelu puuttuu. Ennustetapahtumia ei voi luoda.</div>
        )}
        <div className="status-grid">
          <div className="status-item">
            <div className="label">Työpakettisuunnittelun tila</div>
            <div className="value">{planningLabel}</div>
            <div className="value muted">{planningTime}</div>
          </div>
          <div className="status-item">
            <div className="label">Lukituksen selite</div>
            <div className="value">{lockSummaryLabel}</div>
            <div className="value muted">{status.isLocked ? "Lukitus voimassa" : "Ei lukitusta"}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>KPI-yhteenveto</h2>
        <p>Projektitason KPI ja toteuman kooste.</p>
        <div className="status-grid">
          <div className="status-item">
            <div className="label">BAC yhteensä</div>
            <div className="value">{formatNumber(summary?.bac_total ?? null)}</div>
          </div>
          <div className="status-item">
            <div className="label">EV yhteensä</div>
            <div className="value">{formatNumber(summary?.ev_total ?? null)}</div>
          </div>
          <div className="status-item">
            <div className="label">AC* yhteensä</div>
            <div className="value">{formatNumber(summary?.ac_star_total ?? null)}</div>
          </div>
          <div className="status-item">
            <div className="label">CPI</div>
            <div className="value">{formatCpi(summary?.cpi ?? null, summary?.cpi != null)}</div>
          </div>
          <div className="status-item">
            <div className="label">Poikkeama (EV - AC*)</div>
            <div className={`value ${varianceClass}`}>{formatNumber(varianceTotal)}</div>
            <div className="value muted">{varianceLabel}</div>
          </div>
          <div className="status-item">
            <div className="label">Toteuma (sis. unmapped)</div>
            <div className="value">{formatNumber(summary?.actual_including_unmapped_total ?? null)}</div>
          </div>
          <div className="status-item">
            <div className="label">Työvaiheet lukittu/viikkopäivitetty</div>
            <div className="value">
              {summaryBaseline} / {summaryWeekly}
            </div>
          </div>
        </div>
        <div className="kpi-sparkline">
          <div className="kpi-row">
            <div className="label">BAC</div>
            <div className="kpi-bar">
              <span
                className="kpi-fill bac"
                style={{ width: toPercent(summary?.bac_total) }}
                title={`BAC ${formatNumber(summary?.bac_total ?? null)}`}
              />
            </div>
            <div className="value">{formatNumber(summary?.bac_total ?? null)}</div>
          </div>
          <div className="kpi-row">
            <div className="label">EV</div>
            <div className="kpi-bar">
              <span
                className="kpi-fill ev"
                style={{ width: toPercent(summary?.ev_total) }}
                title={`EV ${formatNumber(summary?.ev_total ?? null)}`}
              />
            </div>
            <div className="value">{formatNumber(summary?.ev_total ?? null)}</div>
          </div>
          <div className="kpi-row">
            <div className="label">AC*</div>
            <div className="kpi-bar">
              <span
                className="kpi-fill ac"
                style={{ width: toPercent(summary?.ac_star_total) }}
                title={`AC* ${formatNumber(summary?.ac_star_total ?? null)}`}
              />
            </div>
            <div className="value">{formatNumber(summary?.ac_star_total ?? null)}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>KPI-selitteet</h2>
        <p>Näin tulkitset raportin mittarit.</p>
        <ul className="kpi-notes">
          <li><strong>BAC</strong> = budjetoitu kokonaiskustannus.</li>
          <li><strong>EV</strong> = ansaittu arvo suhteessa valmiusasteeseen.</li>
          <li><strong>AC*</strong> = toteuma sisältäen ghost-rivit.</li>
          <li><strong>CPI</strong> = EV / AC* (miten tehokkaasti edetään).</li>
          <li><strong>Poikkeama</strong> = EV - AC* (plus = ahead, miinus = overrun).</li>
        </ul>
      </section>

      <section className="card">
        <h2>Työvaiheet</h2>
        <p>Työvaiheiden yhteenveto, KPI ja poikkeamat.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Työvaihe</th>
            <th>BAC</th>
            <th>EV</th>
            <th>AC*</th>
            <th>CPI</th>
            <th>Poikkeama EUR</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="notice">Ei raporttirivejä vielä.</div>
              </td>
            </tr>
          ) : (
            rows.map((row: any) => (
              <tr key={row.work_phase_id}>
                <td>{row.work_phase_name}</td>
                <td>{formatNumber(row.bac_total)}</td>
                <td>{formatNumber(row.ev_value)}</td>
                <td>{formatNumber(row.ac_star_total)}</td>
                <td>{formatCpi(row.cpi, row.has_cpi)}</td>
                <td>{formatNumber(row.cost_variance_eur)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </section>
    </div>
  );
}
