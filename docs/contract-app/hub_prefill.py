# ── 캠페인 허브에서 연 경우: 주소에 담긴 캠페인 정보로 칸을 미리 채운다 ─────────────────
# 캠페인 허브(계약서 탭, 크리에이터 진행 표)의 "계약서 작성" 링크는 이런 주소로 이 앱을 연다.
#   http://localhost:8501/?from=campaign-hub&campaign=…&advertiser=…&upload=2026-12-03&creator=…
# 넘어오는 값은 캠페인명·광고주명·업로드 날짜·크리에이터명뿐이다. 개인정보는 오가지 않는다.
#
# app.py 에 넣는 곳: info_key / UPLOAD_DATE_KEY / ppl_key 가 정의된 뒤(광고 금액 절 아래) 아무 곳.
# main() 맨 앞 apply_queued_values() 바로 다음 줄에서 apply_hub_prefill() 을 부른다.


def apply_hub_prefill() -> None:
    """칸을 그리기 전에 한 번만 넣는다. 넣은 뒤 주소의 값을 지워서 '모두 지우기' 뒤에 다시 채워지지 않게 한다."""
    q = st.query_params
    if q.get("from") != "campaign-hub":
        return

    def text(name: str) -> str:
        return (q.get(name) or "").strip()[:200]

    if text("campaign"):
        SS[info_key(fill.INFO_CAMPAIGN)] = text("campaign")
    if text("advertiser"):
        SS[info_key(fill.INFO_ADVERTISER)] = text("advertiser")
    if text("creator"):
        SS[ppl_key(0, "creator")] = text("creator")
    try:
        SS[UPLOAD_DATE_KEY] = date.fromisoformat(text("upload"))
    except ValueError:
        pass  # 날짜가 없거나 형식이 다르면 기본값(오늘) 그대로
    q.clear()
