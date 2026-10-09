import { cacheLife } from "next/cache";
import { LAB_REGISTRY_URL, parseLabRegistry, type LabExperiment } from "@/content/lab";
import { LAB_FALLBACK } from "@/content/lab-fallback";

/**
 * Live Lab experiments, read on the server and cached for hours: a new
 * experiment shows up without a deploy, and GitHub is not hit per visit.
 * Any failure (network, status, shape) serves the bundled snapshot.
 */
export async function getLabExperiments(): Promise<readonly LabExperiment[]> {
  "use cache";
  cacheLife("hours");

  try {
    const response = await fetch(LAB_REGISTRY_URL);
    if (!response.ok) throw new Error(`Lab registry responded ${response.status}`);
    const experiments = parseLabRegistry(await response.json());
    if (!experiments || experiments.length === 0) throw new Error("Lab registry payload is invalid");
    return experiments;
  } catch (error) {
    console.warn("Serving the Lab snapshot.", error);
    return LAB_FALLBACK;
  }
}
