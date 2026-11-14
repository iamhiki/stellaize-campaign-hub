/** Documents a creator may upload: 신분증·사업자등록증 and 통장사본, as a photo or a PDF. */
export const DOC_KINDS = ["idDoc", "bankCopy"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const DOC_LABEL: Record<DocKind, string> = { idDoc: "신분증 또는 사업자등록증", bankCopy: "통장사본" };
export const MAX_DOC_BYTES = 5 * 1024 * 1024;

/**
 * The file's real type from its first bytes, or null when it isn't a PDF, JPEG or PNG. The browser's own
 * "type" is whatever the sender says, so it is never trusted.
 */
export function sniff(b: Uint8Array): "application/pdf" | "image/jpeg" | "image/png" | null {
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (starts(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  return null;
}
