import { CallStage } from "./stages.js";
import { Intent } from "./intents.js";

export function nextStage(
  currentStage: CallStage,
  intent: Intent,
  repeatingStage: number
): CallStage {
  if (currentStage === CallStage.INTRO) {
    if (intent === Intent.INTRESTED || intent === Intent.ACCEPTION) {
      return CallStage.PITCH;
    }
    if (intent === Intent.NOT_INTERESTED || intent === Intent.OBJECTION) {
      if (repeatingStage < 1) {
        return CallStage.INTRO;
      } else {
        return CallStage.END;
      }
    }
  }
}
