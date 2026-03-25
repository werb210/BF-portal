import type { Express } from "express";
import { injectSiloContext } from "../../../middleware/siloContext";
import { setSiloSession } from "../../../middleware/setSiloSession";
import confidenceRoutes from "./confidence.routes";
import ruleRoutes from "./rule.routes";
import voiceRoutes from "./voice.routes";

export function registerAiRoutes(app: Express) {
  app.use(injectSiloContext);
  app.use(setSiloSession);
  app.use("/", ruleRoutes);
  app.use("/", confidenceRoutes);
  app.use("/", voiceRoutes);
}
