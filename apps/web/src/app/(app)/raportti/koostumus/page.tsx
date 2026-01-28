import { loadWorkPackageComposition } from "@ennuste/application";
import { createServices } from "../../../../server/services";
import { requireSession } from "../../../../server/session";
import WorkPackageCompositionView from "../../../../ui/raportti/WorkPackageCompositionView";

export default async function WorkPackageCompositionPage() {
  const session = await requireSession();
  const services = createServices();
  const rows = await loadWorkPackageComposition(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  return (
    <div className="grid">
      <section className="card">
        <h1>Työpaketin koostumus (item-taso)</h1>
        <p>Näyttää mistä tavoitearvion item-riveistä työpaketit muodostuvat (mäppäyksen perusteella).</p>
        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="/raportti">Takaisin raporttiin</a>
          <a className="btn btn-secondary btn-sm" href="/tavoitearvio/mappaus">Avaa mäppäys</a>
        </div>
      </section>
      <WorkPackageCompositionView rows={rows as unknown[]} />
    </div>
  );
}
