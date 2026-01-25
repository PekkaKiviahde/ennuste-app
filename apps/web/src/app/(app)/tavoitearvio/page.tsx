import { loadMappingLines, loadMappingVersions, loadTargetEstimate } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";
import ImportStagingPanel from "../../../ui/tavoitearvio/ImportStagingPanel";

export default async function TargetEstimatePage({
  searchParams
}: {
  searchParams?: { q?: string; mv?: string };
}) {
  const session = await requireSession();
  const services = createServices();
  const rows = await loadTargetEstimate(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const mappingLines = await loadMappingLines(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const mappingVersions = await loadMappingVersions(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const mappingQuery = (searchParams?.mv ?? "").trim().toLowerCase();
  const filterMatch = (value: unknown) => String(value ?? "").toLowerCase().includes(query);
  const mappingFilterMatch = (value: unknown) =>
    String(value ?? "").toLowerCase().includes(mappingQuery);

  const formatDate = (value: unknown) => {
    if (!value) return "";
    const date =
      value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat("fi-FI", { dateStyle: "short" }).format(date);
  };
  const formatDateTime = (value: unknown) => {
    if (!value) return "";
    const date =
      value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat("fi-FI", { dateStyle: "short", timeStyle: "short" }).format(date);
  };
  const filteredRows = query
    ? rows.filter((row: any) =>
        filterMatch(row.littera_code) || filterMatch(row.littera_title) || filterMatch(row.cost_type)
      )
    : rows;
  const filteredMappingLines = query
    ? mappingLines.filter((row: any) =>
        filterMatch(row.mapping_status) ||
        filterMatch(row.work_code) ||
        filterMatch(row.work_title) ||
        filterMatch(row.target_code) ||
        filterMatch(row.target_title) ||
        filterMatch(row.allocation_rule) ||
        filterMatch(row.cost_type)
      )
    : mappingLines;
  const filteredMappingVersions = mappingQuery
    ? mappingVersions.filter((row: any) =>
        mappingFilterMatch(row.status) ||
        mappingFilterMatch(row.reason) ||
        mappingFilterMatch(row.created_by) ||
        mappingFilterMatch(row.approved_by)
      )
    : mappingVersions;
  const targetCount = filteredRows.length;
  const mappingLineCount = filteredMappingLines.length;
  const mappingVersionCount = filteredMappingVersions.length;

  return (
    <div className="grid">
      <ImportStagingPanel username={session.username} />

      <section className="card">
        <h1>Tavoitearvio</h1>
        <p>Tavoitearvio-litterat ja kustannuslajit projektissa.</p>
        <form className="form-grid" method="get">
          <label className="label" htmlFor="q">Suodatus</label>
          <input
            className="input"
            id="q"
            name="q"
            placeholder="Hae littera, nimi tai kustannuslaji"
            defaultValue={searchParams?.q ?? ""}
          />
          <div className="status-actions">
            <button className="btn btn-primary btn-sm" type="submit">Suodata</button>
            <a className="btn btn-secondary btn-sm" href="/tavoitearvio">Nollaa</a>
          </div>
        </form>
        {query && (
          <div className="notice">
            Näytetään suodatetut rivit haulla: "{query}"
          </div>
        )}
        <div className="status-actions">
          <span className="badge">Rivejä: {targetCount}</span>
        </div>
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Littera</th>
              <th>Nimi</th>
              <th>Kustannuslaji</th>
              <th>Määrä EUR</th>
              <th>Voimassa</th>
            </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="notice">Ei tavoitearviorivejä vielä.</div>
              </td>
            </tr>
          ) : (
            filteredRows.map((row: any) => (
              <tr key={`${row.target_littera_id}-${row.cost_type}-${row.valid_from}`}>
                <td>{row.littera_code}</td>
                <td>{row.littera_title}</td>
                <td>{row.cost_type}</td>
                <td>{row.amount}</td>
                <td>
                  {formatDate(row.valid_from)} - {row.valid_to ? formatDate(row.valid_to) : "inf"}
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
    </section>

      <section className="card">
        <h2>Mäppäys</h2>
        <p>Työpakettilittera {"->"} tavoitearvio-littera mäppäys, status ja sääntö.</p>
        <div className="status-actions">
          <span className="badge">Rivejä: {mappingLineCount}</span>
        </div>
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Status</th>
              <th>Työpakettilittera</th>
              <th>Tavoitearvio</th>
              <th>Sääntö</th>
              <th>Kustannuslaji</th>
            </tr>
        </thead>
        <tbody>
          {filteredMappingLines.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="notice">Ei mäppäysrivejä vielä.</div>
              </td>
            </tr>
          ) : (
            filteredMappingLines.map((row: any) => (
              <tr key={row.mapping_line_id}>
                <td>{row.mapping_status}</td>
                <td>{row.work_code} {row.work_title}</td>
                <td>{row.target_code} {row.target_title}</td>
                <td>{row.allocation_rule} {row.allocation_value}</td>
                <td>{row.cost_type ?? "ALL"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>

      <section className="card">
        <h2>Mäppäysversiot</h2>
        <p>Mäppäysversiot, voimassaolo ja hyväksyntä.</p>
        <form className="form-grid" method="get">
          <label className="label" htmlFor="mv">Mäppäysversioiden haku</label>
          <input
            className="input"
            id="mv"
            name="mv"
            placeholder="Hae status, peruste tai hyväksyjä"
            defaultValue={searchParams?.mv ?? ""}
          />
          <div className="status-actions">
            <button className="btn btn-primary btn-sm" type="submit">Suodata</button>
            <a className="btn btn-secondary btn-sm" href="/tavoitearvio">Nollaa</a>
          </div>
        </form>
        {mappingQuery && (
          <div className="notice">
            Näytetään mäppäysversiot haulla: "{mappingQuery}"
          </div>
        )}
        <div className="status-actions">
          <span className="badge">Rivejä: {mappingVersionCount}</span>
        </div>
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Status</th>
              <th>Voimassa</th>
              <th>Peruste</th>
              <th>Hyväksyntä</th>
              <th>Luotu</th>
            </tr>
          </thead>
          <tbody>
            {filteredMappingVersions.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="notice">Ei mäppäysversioita vielä.</div>
                </td>
              </tr>
            ) : (
              filteredMappingVersions.map((row: any) => (
                <tr key={row.mapping_version_id}>
                  <td>{row.status}</td>
                  <td>
                    {formatDate(row.valid_from)} - {row.valid_to ? formatDate(row.valid_to) : "inf"}
                  </td>
                  <td>{row.reason ?? "-"}</td>
                  <td>{row.approved_by ? `${row.approved_by} ${formatDateTime(row.approved_at)}` : "-"}</td>
                  <td>{row.created_by ?? "-"} {formatDateTime(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
