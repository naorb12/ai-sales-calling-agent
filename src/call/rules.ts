import { CallStage } from "./stages.js";
import { Intent } from "./intents.js";

/**
 * State machine: determines next stage based on current stage, intent, and repeat count
 * 
 * Key logic for objections: 1st objection = stay engaged, 2+ objections = politely end
 */
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
  // Positive response → move to pitch
  if (intent === Intent.POSITIVE || intent === Intent.ASK_MORE_INFO) {
    return CallStage.PITCH;
  }

  // First objection → stay in intro, try once more
  // Multiple objections or negative → end call
  if (intent === Intent.OBJECTION || intent === Intent.UNCLEAR) {
    if (repeatingStage < 1) {
      return CallStage.INTRO; // Give them one more chance
    }
    return CallStage.END;
  }

  // Hard no → end immediately
  if (intent === Intent.NEGATIVE) {
    return CallStage.END;
  }

  return CallStage.END;
}

function handlePitchStage(intent: Intent, repeatingStage: number): CallStage {
  // Positive → ready to book meeting
  if (intent === Intent.POSITIVE) {
    return CallStage.BOOK_MEETING;
  }

  // Questions → stay in pitch, answer up to 2 times
  if (intent === Intent.ASK_MORE_INFO) {
    if (repeatingStage < 2) {
      return CallStage.PITCH;
    }
    return CallStage.END; // Too many questions, they're not convinced
  }

  // First objection → stay in pitch, address concern
  // Multiple objections → politely end (they're not interested)
  if (intent === Intent.OBJECTION || intent === Intent.UNCLEAR) {
    if (repeatingStage < 1) {
      return CallStage.PITCH; // Give them one more chance
    }
    return CallStage.END;
  }

  // Hard no → end immediately
  if (intent === Intent.NEGATIVE) {
    return CallStage.END;
  }

  return CallStage.END;
}

function handleBookMeetingStage(
  intent: Intent,
  repeatingStage: number
): CallStage {
  // Positive → meeting booked, end call
  if (intent === Intent.POSITIVE) {
    return CallStage.END;
  }

  // Questions about booking → answer up to 3 times
  if (intent === Intent.ASK_MORE_INFO || intent === Intent.UNCLEAR) {
    if (repeatingStage < 3) {
      return CallStage.BOOK_MEETING;
    }
    return CallStage.END; // Too much back-and-forth
  }

  // First objection at booking → try once more
  // Multiple objections → they're not ready, end gracefully
  if (intent === Intent.OBJECTION) {
    if (repeatingStage < 1) {
      return CallStage.BOOK_MEETING; // One more try
    }
    return CallStage.END; // Leave them alone
  }

  // Hard no → end immediately
  if (intent === Intent.NEGATIVE) {
    return CallStage.END;
  }

  return CallStage.END;
}

function handleEndStage(intent: Intent): CallStage {
  // Any negative signal → terminate
  if (
    intent === Intent.NEGATIVE ||
    intent === Intent.OBJECTION ||
    intent === Intent.UNCLEAR
  ) {
    return CallStage.TERMINATE;
  }

  // They have more questions at the end → go back to pitch
  if (intent === Intent.ASK_MORE_INFO) {
    return CallStage.PITCH;
  }

  // Otherwise terminate
  return CallStage.TERMINATE;
}
