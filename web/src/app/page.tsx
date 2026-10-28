import { HeartwoodShell } from "@/components/heartwood-shell"
import { fetchServerSnapshot } from "@/lib/heartwood-api"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const initialSnapshot = await fetchServerSnapshot()
  return <HeartwoodShell initialSnapshot={initialSnapshot} />
}
