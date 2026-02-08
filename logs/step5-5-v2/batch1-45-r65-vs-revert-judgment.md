## R65版 全45件判定

| ID | キー | 判定 | 理由 |
|----|------|------|------|
| B1-01 | casual_0 | ⚠️PASS | "going to rain"は確定的だが許容範囲 |
| B1-01 | casual_50 | ✅PASS | |
| B1-01 | casual_100 | ✅PASS | |
| B1-01 | business_0 | ⚠️PASS | 同上 |
| B1-01 | business_50 | ✅PASS | |
| B1-01 | business_100 | ❌FAIL | We主語追加（人称違反） |
| B1-01 | formal_0 | ⚠️PASS | |
| B1-01 | formal_50 | ✅PASS | |
| B1-01 | formal_100 | ❌FAIL | We主語追加（人称違反） |
| B1-02 | casual_0 | ✅PASS | |
| B1-02 | casual_50 | ✅PASS | |
| B1-02 | casual_100 | ✅PASS | |
| B1-02 | business_0 | ✅PASS | |
| B1-02 | business_50 | ✅PASS | |
| B1-02 | business_100 | ✅PASS | |
| B1-02 | formal_0 | ✅PASS | |
| B1-02 | formal_50 | ⚠️PASS | business_50と酷似だが微差あり |
| B1-02 | formal_100 | ✅PASS | |
| B1-03 | casual_0 | ✅PASS | |
| B1-03 | casual_50 | ✅PASS | |
| B1-03 | casual_100 | ✅PASS | |
| B1-03 | business_0 | ✅PASS | |
| B1-03 | business_50 | ✅PASS | |
| B1-03 | business_100 | ✅PASS | |
| B1-03 | formal_0 | ✅PASS | |
| B1-03 | formal_50 | ❌FAIL | business_50と完全同一 |
| B1-03 | formal_100 | ⚠️PASS | 冗長だが意味は保持 |
| B1-04 | casual_0 | ❌FAIL | "become part of"は異動ではない |
| B1-04 | casual_50 | ⚠️PASS | "joining"は自発的だが許容 |
| B1-04 | casual_100 | ✅PASS | |
| B1-04 | business_0 | ❌FAIL | 同上（0%共通） |
| B1-04 | business_50 | ❌FAIL | "I am now involved"時制ミス |
| B1-04 | business_100 | ❌FAIL | "I am pleased"感情追加 |
| B1-04 | formal_0 | ❌FAIL | 同上（0%共通） |
| B1-04 | formal_50 | ❌FAIL | "I am pleased"感情追加 |
| B1-04 | formal_100 | ❌FAIL | "I am delighted"感情追加 |
| B1-05 | casual_0 | ✅PASS | |
| B1-05 | casual_50 | ❌FAIL | "might want to"で推薦弱体化 |
| B1-05 | casual_100 | ✅PASS | |
| B1-05 | business_0 | ✅PASS | |
| B1-05 | business_50 | ⚠️PASS | "might consider"やや弱いが許容 |
| B1-05 | business_100 | ❌FAIL | "appears to be"確信度違反 |
| B1-05 | formal_0 | ✅PASS | |
| B1-05 | formal_50 | ⚠️PASS | business_50と酷似 |
| B1-05 | formal_100 | ⚠️PASS | business_100と酷似だが微差 |

**R65版: PASS 33 / FAIL 12 → PASS率 73.3%**

---

## リバート版 全45件判定

| ID | キー | 判定 | 理由 |
|----|------|------|------|
| B1-01 | casual_0 | ⚠️PASS | |
| B1-01 | casual_50 | ✅PASS | |
| B1-01 | casual_100 | ✅PASS | |
| B1-01 | business_0 | ⚠️PASS | |
| B1-01 | business_50 | ✅PASS | 自然 |
| B1-01 | business_100 | ❌FAIL | "We anticipate...we recommend"主語追加 |
| B1-01 | formal_0 | ⚠️PASS | |
| B1-01 | formal_50 | ✅PASS | |
| B1-01 | formal_100 | ❌FAIL | "we recommend"主語追加 |
| B1-02 | casual_0 | ✅PASS | |
| B1-02 | casual_50 | ✅PASS | |
| B1-02 | casual_100 | ✅PASS | |
| B1-02 | business_0 | ✅PASS | |
| B1-02 | business_50 | ✅PASS | |
| B1-02 | business_100 | ✅PASS | |
| B1-02 | formal_0 | ✅PASS | |
| B1-02 | formal_50 | ⚠️PASS | business_50と酷似 |
| B1-02 | formal_100 | ✅PASS | "be so bold as to inquire"で独自性あり |
| B1-03 | casual_0 | ✅PASS | |
| B1-03 | casual_50 | ✅PASS | |
| B1-03 | casual_100 | ✅PASS | "reckon/steep"良いカジュアル |
| B1-03 | business_0 | ✅PASS | |
| B1-03 | business_50 | ✅PASS | |
| B1-03 | business_100 | ✅PASS | |
| B1-03 | formal_0 | ✅PASS | |
| B1-03 | formal_50 | ❌FAIL | business_50と完全同一 |
| B1-03 | formal_100 | ⚠️PASS | 冗長だが意味保持 |
| B1-04 | casual_0 | ✅PASS | "be transferred to"正確 |
| B1-04 | casual_50 | ✅PASS | "being moved to"受動的で正確 |
| B1-04 | casual_100 | ✅PASS | "getting shifted to"OK |
| B1-04 | business_0 | ✅PASS | |
| B1-04 | business_50 | ✅PASS | "reassigned...effective next month"正確 |
| B1-04 | business_100 | ❌FAIL | "I am pleased to inform"感情追加 |
| B1-04 | formal_0 | ✅PASS | |
| B1-04 | formal_50 | ✅PASS | "reassigned...commencing"正確 |
| B1-04 | formal_100 | ✅PASS | "scheduled to be reassigned"感情なし |
| B1-05 | casual_0 | ✅PASS | |
| B1-05 | casual_50 | ❌FAIL | "might want to"推薦弱体化 |
| B1-05 | casual_100 | ✅PASS | |
| B1-05 | business_0 | ✅PASS | |
| B1-05 | business_50 | ⚠️PASS | |
| B1-05 | business_100 | ❌FAIL | "appears to be"確信度違反 |
| B1-05 | formal_0 | ✅PASS | |
| B1-05 | formal_50 | ⚠️PASS | business_50と酷似 |
| B1-05 | formal_100 | ⚠️PASS | business_100と酷似 |

**リバート版: PASS 39 / FAIL 6 → PASS率 86.7%**

---

## 最終比較

| | R65版 | リバート版 |
|--|-------|-----------|
| PASS | 33 | **39** |
| FAIL | 12 | **6** |
| PASS率 | 73.3% | **86.7%** |
| 差 | — | **+13.4pt** |

| 文別FAIL | R65 | リバート |
|----------|-----|---------|
| B1-01 | 2 | 2 |
| B1-02 | 0 | 0 |
| B1-03 | 1 | 1 |
| B1-04 | **7** | **1** |
| B1-05 | 2 | 2 |

**B1-04が決定打。** R65版はFAIL7件（0%ベースの"become"が全体に波及）、リバート版はFAIL1件のみ。

**結論：リバート版 86.7% > R65版 73.3%。戻すべき。**
