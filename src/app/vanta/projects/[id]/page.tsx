// VANTA — project workbench (V1).

import { VantaWorkbench } from "@/components/vanta/VantaWorkbench";

export const metadata = { title: "Workbench · Vanta" };

interface PageProps { params: Promise<{ id: string }> }

export default async function VantaWorkbenchPage({ params }: PageProps) {
  const { id } = await params;
  return <VantaWorkbench projectId={id} />;
}
