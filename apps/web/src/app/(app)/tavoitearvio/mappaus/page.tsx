import { requireSession } from "../../../../server/session";
import TargetEstimateMappingView from "../../../../ui/tavoitearvio/TargetEstimateMappingView";

export default async function TargetEstimateMappingPage() {
  await requireSession();

  return (
    <div className="grid">
      <TargetEstimateMappingView />
    </div>
  );
}
