"use client";

import useStaticData from "@/data/useStaticData";
import { Timeline } from "./ui/timeline";

// import { Timeline } from "@/components/Timeline";
// import useStaticData from "@/hooks/useStaticData";

export function BuilderFeaturesSection() {
  const { BuilderFeatures } = useStaticData();

  if (!BuilderFeatures) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <Timeline {...BuilderFeatures} />
    </section>
  );
}
