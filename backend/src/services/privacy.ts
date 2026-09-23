// Reject recognizable payment credentials before conversation storage or AI calls.
// This is a precaution, not a guarantee that arbitrary sensitive text is detectable.
export function containsPaymentCredentials(text: string): boolean {
  if (/\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b/i.test(text)) return true;
  if (/(?:cvv|cvc|пин|pin|код\s+из\s+смс|sms\s*code)\s*[:=—-]?\s*\d{3,8}/iu.test(text)) return true;
  if (/(?:номер\s+карт[ыа]|card\s*(?:number)?|карт[аыуе])\s*[:=—-]?\s*(?:\d[ -]?){8,19}/iu.test(text)) return true;
  return /(?:^|[^\d])(?:\d[ -]?){12,18}\d(?![ -]?\d)/u.test(text);
}
