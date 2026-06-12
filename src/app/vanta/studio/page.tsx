// VANTA — studio / knowledge view (advanced). The agent roster, signature looks, and
// content packs live on as internal modules behind the Auto Editor — this page keeps
// them inspectable without cluttering the primary workflow.

import { VantaHub } from "@/components/vanta/VantaHub";

export const metadata = { title: "Studio · Vanta" };

export default function VantaStudioPage() {
  return <VantaHub />;
}
