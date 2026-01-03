import { loadMappingLines, loadTargetEstimate } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function TargetEstimatePage() {
  const session = requireSession();
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

  const formatDate = (value: unknown) => {
    if (!value) return "";
    const date =
      value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat("fi-FI", { dateStyle: "short" }).format(date);
  };

  return (
    <div className="grid">
      <section className="card">
        <h1>Tavoitearvio</h1>
        <p>Tavoitearvio-litterat ja kustannuslajit projektissa.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Littera</th>
              <th>Nimi</th>
              <th>Kustannuslaji</th>
              <th>Maara EUR</th>
              <th>Voimassa</th>
            </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="notice">Ei tavoitearvioriveja viela.</div>
              </td>
            </tr>
          ) : (
            rows.map((row: any) => (
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
        <h2>Mapping</h2>
        <p>Tyolittera {"->"} tavoitearvio-littera mapping, status ja saanto.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Tyolittera</th>
              <th>Tavoitearvio</th>
              <th>Saanto</th>
              <th>Kustannuslaji</th>
            </tr>
        </thead>
        <tbody>
          {mappingLines.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="notice">Ei mapping-riveja viela.</div>
              </td>
            </tr>
          ) : (
            mappingLines.map((row: any) => (
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
    </div>
  );
}
