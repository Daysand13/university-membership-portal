/** Full name including a middle name when the record has one, without a stray double space when it doesn't. */
export function formatFullName(
  firstName: string,
  middleName: string | null | undefined,
  lastName: string,
): string {
  return [firstName, middleName, lastName].filter(Boolean).join(" ");
}
