import { uploadDateOf, type Campaign, type Entry } from "./campaigns";

/**
 * 계약서 자동작성 앱(기획자 제작, Streamlit). 정산서류 개인정보 때문에 각자 PC에서 실행.bat 으로 켜고
 * localhost:8501 에서만 열린다. 그래서 링크는 서버가 아니라 "보는 사람의 PC"를 가리킨다.
 * 다른 주소로 띄웠다면 NEXT_PUBLIC_CONTRACT_APP_URL 로 바꾼다.
 */
export const CONTRACT_APP_URL = process.env.NEXT_PUBLIC_CONTRACT_APP_URL || "http://localhost:8501";

/**
 * 계약서 앱을 열면서 캠페인 정보를 넘기는 주소. 개인정보는 넣지 않는다(캠페인명·광고주·업로드 날짜·크리에이터명만).
 * 업로드 날짜는 크리에이터에게 따로 정한 날짜가 있으면 그 날짜다.
 * 앱 쪽에서 이 값을 읽으려면 docs/contract-app/ 의 패치가 필요하다. 패치 전에는 빈 계약서 앱이 그대로 열린다.
 */
export function contractLink(c: Campaign, e?: Entry) {
  const q = new URLSearchParams({ from: "campaign-hub", campaign: c.name, advertiser: c.advertiser, upload: e ? uploadDateOf(e, c) : c.uploadDate });
  if (e) q.set("creator", e.name);
  return `${CONTRACT_APP_URL}/?${q}`;
}
