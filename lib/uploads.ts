/**
 * 제출본·기획안 양식 파일 (기획자 11/20: 기획안은 워드·PDF·텍스트 등 여러 형태, 가편안·수정본은 영상).
 * Shared by the upload screens and the server. Files go straight from the browser to storage
 * (Vercel refuses a request over 4.5MB), and always come back as a download, never shown in a page.
 */

/**
 * Per file. Supabase's free plan stops at 50MB a file; a longer video goes in as a link (드라이브, 유튜브 일부 공개)
 * until storage is moved to a plan or service with room for it (docs/setup.md "제출 파일").
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Extension → the type it is stored and served as. Anything else is refused. */
export const UPLOAD_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  key: "application/x-iwork-keynote-sffkey",
  pages: "application/x-iwork-pages-sffpages",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  rtf: "application/rtf",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  avi: "video/x-msvideo",
  webm: "video/webm",
  mkv: "video/x-matroska",
};
/** For the file picker. */
export const UPLOAD_ACCEPT = Object.keys(UPLOAD_TYPES).map((e) => `.${e}`).join(",");

export const extOf = (name: string) => (name.match(/\.([A-Za-z0-9]{1,6})$/)?.[1] ?? "").toLowerCase();

/** The reason a file can't go up, or "". */
export function uploadProblem(name: string, size: number) {
  if (!UPLOAD_TYPES[extOf(name)]) return "올릴 수 없는 파일 형식입니다. 문서(PDF·워드·한글·PPT·텍스트), 이미지, 영상(mp4·mov 등)을 올려 주세요.";
  if (size <= 0) return "빈 파일입니다.";
  if (size > MAX_UPLOAD_BYTES) return `파일이 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB보다 큽니다. 큰 영상은 드라이브나 유튜브(일부 공개)에 올리고 ‘링크로 내기’로 제출해 주세요.`;
  return "";
}

/** What screens get about a stored file. The storage key stays on the server. */
export type FileInfo = { name: string; size: number; type: string };

export const sizeText = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
