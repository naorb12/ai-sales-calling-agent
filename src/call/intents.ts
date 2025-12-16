/**
 * Simplified intent classification for sales calls
 * 
 * 5 intents:
 * - POSITIVE: Customer is interested, accepting, wants to continue
 * - OBJECTION: Customer has concerns (1st time = engaged, 2+ times = end call)
 * - ASK_MORE_INFO: Customer has neutral questions, wants clarification
 * - NEGATIVE: Customer is not interested, wants to end call
 * - UNCLEAR: Fallback when we can't determine intent
 */
export enum Intent {
  POSITIVE,
  NEGATIVE,
  OBJECTION, // Kind of not sure, tantative ("its a bit expensive, we have a solution already, etc.")
  ASK_MORE_INFO,
  UNCLEAR,
}
