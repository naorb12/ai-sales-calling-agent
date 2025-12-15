import { CallStage } from "./stages.js";
import { Intent } from "./intents.js";

export function nextStage(
  currentStage: CallStage,
  intent: Intent,
  repeatingStage: number
): CallStage {
  if (currentStage === CallStage.INTRO) {
    return handleIntroStage(intent, repeatingStage);
  }

  if (currentStage === CallStage.PITCH) {
    return handlePitchStage(intent, repeatingStage);
  }
  if (currentStage === CallStage.BOOK_MEETING) {
    return handleBookMeetingStage(intent, repeatingStage);
  }
  if (currentStage === CallStage.END) {
    return handleEndStage(intent);
  }
  return CallStage.END;
}

function handleIntroStage(intent: Intent, repeatingStage: number): CallStage {
  if (
    intent === Intent.INTERESTED ||
    intent === Intent.ACCEPTION ||
    intent === Intent.ASK_MORE_INFO
  ) {
    return CallStage.PITCH;
  }
  if (
    intent === Intent.NOT_INTERESTED ||
    intent === Intent.OBJECTION ||
    intent === Intent.UNCLEAR
  ) {
    if (repeatingStage < 1) {
      return CallStage.INTRO;
    } else {
      return CallStage.END;
    }
  }

  return CallStage.END;
}

function handlePitchStage(intent: Intent, repeatingStage: number): CallStage {
  if (intent === Intent.INTERESTED || intent === Intent.ACCEPTION) {
    return CallStage.BOOK_MEETING;
  }
  if (intent === Intent.ASK_MORE_INFO) {
    if (repeatingStage < 2) {
      return CallStage.PITCH;
    } else {
      return CallStage.END;
    }
  }
  if (
    intent === Intent.NOT_INTERESTED ||
    intent === Intent.OBJECTION ||
    intent === Intent.UNCLEAR
  ) {
    if (repeatingStage < 1) {
      return CallStage.PITCH;
    } else {
      return CallStage.END;
    }
  }
  return CallStage.END;
}

function handleBookMeetingStage(
  intent: Intent,
  repeatingStage: number
): CallStage {
  if (intent === Intent.INTERESTED || intent === Intent.ACCEPTION) {
    return CallStage.END;
  }
  if (intent === Intent.ASK_MORE_INFO || intent === Intent.UNCLEAR) {
    if (repeatingStage < 3) {
      return CallStage.BOOK_MEETING;
    } else {
      return CallStage.END;
    }
  }
  if (intent === Intent.OBJECTION) {
    if (repeatingStage < 2) {
      return CallStage.BOOK_MEETING;
    } else {
      return CallStage.END;
    }
  }
  if (intent === Intent.NOT_INTERESTED) {
    return CallStage.END;
  }
  return CallStage.END;
}

function handleEndStage(intent: Intent) {
  if (
    intent === Intent.UNCLEAR ||
    intent === Intent.NOT_INTERESTED ||
    intent === Intent.OBJECTION
  ) {
    return CallStage.TERMINATE;
  }
  if (intent === Intent.ASK_MORE_INFO) {
    return CallStage.PITCH;
  } else {
    return CallStage.END;
  }
}
