/**
 * Convert numbers to Hebrew words for better TTS pronunciation
 * OpenAI TTS struggles with numeric times (14:00) and dates (18/12) in Hebrew
 */

/**
 * Convert a number to Hebrew words
 */
function numberToHebrewWord(num: number): string {
  const ones = [
    "",
    "אחת",
    "שתיים",
    "שלוש",
    "ארבע",
    "חמש",
    "שש",
    "שבע",
    "שמונה",
    "תשע",
  ];
  const tens = ["", "עשר", "עשרים", "שלושים", "ארבעים", "חמישים"];
  const teens = [
    "עשר",
    "אחת עשרה",
    "שתיים עשרה",
    "שלוש עשרה",
    "ארבע עשרה",
    "חמש עשרה",
    "שש עשרה",
    "שבע עשרה",
    "שמונה עשרה",
    "תשע עשרה",
  ];

  if (num === 0) return "אפס";
  if (num < 10) return ones[num] ?? num.toString();
  if (num >= 10 && num < 20) return teens[num - 10] ?? num.toString();
  if (num >= 20 && num < 60) {
    const tensDigit = Math.floor(num / 10);
    const onesDigit = num % 10;
    const tensWord = tens[tensDigit] ?? "";
    const onesWord = ones[onesDigit] ?? "";
    return onesDigit === 0 ? tensWord : `${tensWord} ו${onesWord}`;
  }
  return num.toString(); // Fallback for larger numbers
}

/**
 * Convert times like "14:00" to Hebrew words in 12-hour format
 * Examples:
 * - "14:00" → "ארבע" (2pm)
 * - "16:00" → "ארבע" (4pm)
 * - "9:30" → "תשע ושלושים"
 */
function convertTimeToHebrew(text: string): string {
  return text.replace(/(\d{1,2}):(\d{2})/g, (match, hours, minutes) => {
    let hour = parseInt(hours);
    
    // Convert to 12-hour format
    if (hour > 12) {
      hour = hour - 12;
    } else if (hour === 0) {
      hour = 12;
    }
    
    const hourText = numberToHebrewWord(hour);
    if (minutes === "00") {
      return hourText;
    }
    const minuteText = numberToHebrewWord(parseInt(minutes));
    return `${hourText} ו${minuteText}`;
  });
}

/**
 * Convert dates like "18/12" to Hebrew words
 * Example: "18/12" → "שמונה עשרה לשתיים עשרה"
 */
function convertDateToHebrew(text: string): string {
  return text.replace(/(\d{1,2})\/(\d{1,2})/g, (match, day, month) => {
    const dayText = numberToHebrewWord(parseInt(day));
    const monthText = numberToHebrewWord(parseInt(month));
    return `${dayText} ל${monthText}`;
  });
}

/**
 * Main function: Convert all numbers in text to Hebrew words
 */
export function numbersToHebrew(text: string): string {
  // First, handle times (HH:MM format)
  text = convertTimeToHebrew(text);

  // Then, handle dates (DD/MM format)
  text = convertDateToHebrew(text);

  return text;
}

