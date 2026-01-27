import { loadWorkPackageComposition } from "@ennuste/application";
import { createServices } from "../../../../server/services";
import { requireSession } from "../../../../server/session";

const formatMoney = (value: unknown) => {
  const n = typeof value === "number" ? value : value == null ? null : Number(value);
  if (n == null || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

export default async function WorkPackageCompositionPage() {
  const session = await requireSession();
  const services = createServices();
  const rows = (await loadWorkPackageComposition(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  })) as any[];

  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    const key = row.work_package_id as string;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  const totals = new Map<string, number>();
  for (const [key, list] of grouped.entries()) {
    const sum = list.reduce((acc, r) => acc + (typeof r.total_eur === "number" ? r.total_eur : Number(r.total_eur ?? 0) || 0), 0);
    totals.set(key, sum);
  }

  return (
    <div className="grid">
      <section className="card">
        <h1>Työpaketin koostumus (item-taso)</h1>
        <p>Näyttää mistä tavoitearvion item-riveistä työpaketit muodostuvat (mäppäyksen perusteella).</p>
        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="/raportti">Takaisin raporttiin</a>
          <a className="btn btn-secondary btn-sm" href="/tavoitearvio/mappaus">Avaa mäppäys</a>
        </div>
        <div className="status-actions">
          <span className="badge">Työpaketteja: {grouped.size}</span>
          <span className="badge">Rivejä: {rows.length}</span>
        </div>
      </section>

      {grouped.size === 0 ? (
        <section className="card">
          <div className="notice">
            Ei koostumusta vielä. Varmista, että tavoitearvio on tuotu ja item-rivejä on mäpätty työpaketteihin.
          </div>
        </section>
      ) : (
        Array.from(grouped.entries()).map(([workPackageId, list]) => {
          const first = list[0] ?? {};
          const header = `${first.work_package_code ?? ""} ${first.work_package_name ?? ""}`.trim() || workPackageId;
          const total = totals.get(workPackageId) ?? 0;
          return (
            <section className="card" key={workPackageId}>
              <h2>{header}</h2>
              <div className="status-actions">
                <span className="badge">Summa: {formatMoney(total)} EUR</span>
                {first.proc_package_name && (
                  <span className="badge">Hankinta: {first.proc_package_code ?? ""} {first.proc_package_name}</span>
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
                  {list.map((row) => (
                    <tr key={`${row.work_package_id}-${row.item_code}-${row.littera_code}`}>
                      <td>{row.littera_code}</td>
                      <td>{row.item_code}</td>
                      <td>{row.item_desc ?? "-"}</td>
                      <td className="right">{formatMoney(row.total_eur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}

