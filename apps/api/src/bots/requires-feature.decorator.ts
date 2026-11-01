import { SetMetadata } from "@nestjs/common";
import type { BotFeature } from "@prisma/client";

export const REQUIRED_FEATURES_KEY = "requiredFeatures";

/** The route answers 404 for bots that don't have every listed feature. */
export const RequiresFeature = (...features: BotFeature[]) =>
  SetMetadata(REQUIRED_FEATURES_KEY, features);
