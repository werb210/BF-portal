import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PipelineApplication, PipelineStage } from "./pipeline.types";
import { evaluateStageTransition, normalizeStageId, sortPipelineStages } from "./pipeline.types";
import { PipelineEngineContext } from "./PipelineEngineProvider";
import Modal from "@/components/ui/Modal";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { logActivity } from "@/hooks/useActivityLog";
import { trackPortalEvent } from "@/lib/portalTracking";
import { useAuth } from "@/hooks/useAuth";

type PipelineBulkActionsProps = {
  selectedCards: PipelineApplication[];
  stages: PipelineStage[];
  onClearSelection: () => void;
};

const resolveNextStage = (card: PipelineApplication, stages: PipelineStage[]): string | null => {
  const orderedStages = sortPipelineStages(stages);
  const normalized = normalizeStageId(card.stage);
  const currentIndex = orderedStages.findIndex((stage) => normalizeStageId(stage.id) === normalized);
  const currentStage = orderedStages[currentIndex];
  if (currentStage?.allowedTransitions?.length) {
    return currentStage.allowedTransitions[0] ?? null;
  }
  if (currentIndex === -1 || currentIndex >= orderedStages.length - 1) {
    return null;
  }
  return orderedStages[currentIndex + 1]?.id ?? null;
};

const PipelineBulkActions = ({ selectedCards, stages, onClearSelection }: PipelineBulkActionsProps) => {
  const config = useContext(PipelineEngineContext);
  if (!config) throw new Error("PipelineEngineProvider missing");

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const selectedCount = selectedCards.length;
  const [confirmAction, setConfirmAction] = useState<"export" | "stage" | null>(null);
  const stageStartRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const now = Date.now();
    selectedCards.forEach((card) => {
      if (!stageStartRef.current[card.id]) {
        stageStartRef.current[card.id] = now;
      }
    });
  }, [selectedCards]);

  const stageTransitions = useMemo(
    () =>
      selectedCards.map((card) => {
        const nextStage = resolveNextStage(card, stages);
        const transition = evaluateStageTransition({
          card,
          fromStage: card.stage,
          toStage: nextStage,
          stages
        });
        return { card, nextStage, transition };
      }),
    [selectedCards, stages]
  );

  const stageError = useMemo(() => {
    if (selectedCount === 0) return null;
    const blocked = stageTransitions.find((entry) => !entry.transition.allowed);
    if (!blocked) return null;
    return blocked.transition.reason ?? "One or more selected applications cannot move forward.";
  }, [selectedCount, stageTransitions]);

  const exportMutation = useMutation({
    mutationFn: () => config.api.exportApplications?.(selectedCards.map((card) => card.id)) ?? Promise.reject(new Error("Export is not supported for this business unit")),
    onSuccess: (blob) => {
      void logActivity("bulk_export", {
        count: selectedCards.length,
        applicationIds: selectedCards.map((card) => card.id)
      }).catch(() => undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pipeline-export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }
  });

  const stageMutation = useMutation({
    mutationFn: async () => {
      const userId = (user as { id?: string | null } | null)?.id ?? "unknown";
      stageTransitions.forEach((entry) => {
        if (!entry.nextStage) return;
        const now = Date.now();
        const stageStartedAt = stageStartRef.current[entry.card.id] ?? now;
        trackPortalEvent("staff_action", {
          user_id: userId,
          action_type: "stage_move",
          application_id: entry.card.id,
          from_stage: entry.card.stage,
          to_stage: entry.nextStage
        });
        trackPortalEvent("stage_completed", {
          application_id: entry.card.id,
          previous_stage_duration_ms: now - stageStartedAt
        });
        trackPortalEvent("stage_entered", {
          application_id: entry.card.id,
          new_stage: entry.nextStage
        });
        stageStartRef.current[entry.card.id] = now;

        const normalizedNextStage = normalizeStageId(entry.nextStage);
        if (normalizedNextStage === "ACCEPTED" || normalizedNextStage === "REJECTED") {
          trackPortalEvent("deal_status_changed", {
            application_id: entry.card.id,
            new_status: normalizedNextStage === "ACCEPTED" ? "funded" : "declined",
            user_id: userId
          });
        }
      });
      await Promise.all(
        stageTransitions.map((entry) =>
          entry.nextStage
            ? config.api.updateStage(entry.card.id, entry.nextStage)
            : Promise.resolve(null)
        )
      );
    },
    onSuccess: () => {
      void logActivity("pipeline_move", {
        count: selectedCards.length,
        transitions: stageTransitions.map((entry) => ({
          applicationId: entry.card.id,
          from: entry.card.stage,
          to: entry.nextStage
        }))
      }).catch(() => undefined);
      queryClient.setQueriesData(
        { queryKey: ["pipeline"] },
        (current: { stages: PipelineStage[]; applications: PipelineApplication[] } | undefined) => {
          if (!current) return current;
          const updatedApplications = current.applications.map((application) => {
            const transition = stageTransitions.find((entry) => entry.card.id === application.id);
            if (!transition?.nextStage) return application;
            return { ...application, stage: transition.nextStage };
          });
          return { ...current, applications: updatedApplications };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      onClearSelection();
    }
  });

  if (selectedCount === 0) return null;

  return (
    <div className="pipeline-bulk">
      <div className="pipeline-bulk__summary">
        <strong>{selectedCount}</strong> selected
        <button className="btn btn--ghost" type="button" onClick={onClearSelection}>
          Clear
        </button>
      </div>
      <div className="pipeline-bulk__actions">
        {FEATURE_FLAGS.BULK_EXPORT ? (
          <button className="btn btn--ghost" type="button" onClick={() => setConfirmAction("export")}>
            Export CSV
          </button>
        ) : null}
        <button
          className="btn btn--primary"
          type="button"
          disabled={Boolean(stageError) || stageMutation.isPending}
          title={stageError ?? undefined}
          onClick={() => setConfirmAction("stage")}
        >
          {stageMutation.isPending ? "Updating…" : "Move to next stage"}
        </button>
        {stageError ? <span className="pipeline-bulk__hint">{stageError}</span> : null}
      </div>
      {confirmAction ? (
        <Modal title={confirmAction === "export" ? "Confirm export" : "Confirm stage update"} onClose={() => setConfirmAction(null)}>
          <div className="space-y-4">
            <p>
              {confirmAction === "export"
                ? "Export the selected applications to CSV?"
                : "Move the selected applications to the next stage?"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  if (confirmAction === "export") {
                    exportMutation.mutate();
                  } else {
                    stageMutation.mutate();
                  }
                  setConfirmAction(null);
                }}
                disabled={confirmAction === "stage" ? Boolean(stageError) || stageMutation.isPending : exportMutation.isPending}
              >
                Confirm
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default PipelineBulkActions;
