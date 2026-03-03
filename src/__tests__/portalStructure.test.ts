import { describe, expect, it } from "vitest";
import { PIPELINE_STAGE_ORDER } from "@/core/engines/pipeline/pipeline.types";
import { TABS } from "@/pages/applications/drawer/DrawerTabs";
import portalStructure from "@/_artifacts/portal-v1-structure.json";

describe("portal v1 structure artifact", () => {
  it("locks the pipeline stage list", () => {
    expect(portalStructure.pipelineStages).toEqual(PIPELINE_STAGE_ORDER);
  });

  it("locks the application card tab order", () => {
    const expectedTabNames = TABS.map((tab) => tab.label);
    const artifactTabNames = portalStructure.applicationCard.tabs.map((tab) => tab.name);
    expect(artifactTabNames).toEqual(expectedTabNames);
  });

  it("does not allow write actions on view-only tabs", () => {
    portalStructure.applicationCard.tabs.forEach((tab) => {
      if (tab.editable === false) {
        expect(!tab.actions || tab.actions.length === 0).toBe(true);
      }
    });
  });
});
