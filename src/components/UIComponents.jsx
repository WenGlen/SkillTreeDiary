

import {
  calcSkillEIK,
  getRadius,
  getLevelFromMap,
  getNonMergedDescendants,
  getStrokeColor
} from "../utils/calcUtils";

// SkillTree：左側技能樹
export function SkillTree({ roots, placedNodes, diarys, activeSkill, setActiveSkill }) {
  return (
    <div className="flex-3 relative bg-black">
      <svg
        width="800"
        height="800"
        className="bg-black"
        onClick={(e) => {
          if (e.target.tagName === "svg") setActiveSkill(null);
        }}
      >
        {/* 畫線區（你可以把 map 線條的程式碼搬進來） */}
        {placedNodes.map((node) => {
            // 🚫 不畫整合/細化技能的線
            if (node.isMerged || node.level >= 4) return null;
            if (!node.parentId) return null;

            const parent = placedNodes.find((n) => n.id === node.parentId);
            if (!parent || parent.isMerged || parent.level >= 4) return null;

            return (
            <line
                key={`${node.id}-line`}
                x1={parent.x}
                y1={parent.y}
                x2={node.x}
                y2={node.y}
                stroke="#666"
                strokeWidth="4"
            />
            );
        })}

        {/* 畫節點區（circle + text 的程式碼搬進來） */}
        {placedNodes.map((node) => {
            if (node.isMerged || node.level >= 4) return null; // 🚫 不畫整合/細化技能

            const totals = calcSkillEIK(node.id, roots, diarys);
            const sum = totals.k + totals.e + totals.i;
            const radius = getRadius(sum);

            // 計算邊線顏色（基礎灰 + EIK 疊加）

            const strokeColor = getStrokeColor(totals.e, totals.i, totals.k);

            return (
                <g key={node.id}>
                <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill="#aaaaaa" // 中心固定灰
                    stroke={strokeColor}
                    strokeWidth={activeSkill?.id === node.id ? 4 : 2} // 點擊後邊框變粗
                    style={{
                    transition: "r 0.2s ease, transform 0.2s ease, stroke 0.3s ease",
                    cursor: "pointer",
                    }}
                    onClick={(e) => {
                    e.stopPropagation();
                    setActiveSkill(node);
                    }}
                />
                <text
                    x={node.x}
                    y={node.y + radius + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="11"
                    pointerEvents="none"
                >
                    {node.name}
                </text>
                </g>
            );
        })}

      </svg>
    </div>
  );
}

// DiaryPanel：右側日記面板
export function DiaryPanel({
  activeSkill,
  diarys = [],
  expandedDiaryId,
  setExpandedDiaryId,
  skillsMap,
  roots,
}) {

  // 先宣告
  const relatedDiarys = diarys.filter((d) =>
    d.skills.includes(activeSkill.id)
  );

  return (
    <div className="w-[300px] border-l border-gray-700 p-2 bg-gray-900 text-white flex flex-col">
        {/* 技能說明區（activeSkill 的細節程式碼搬進來） */}
        <div
        style={{
            minHeight: "200px",
            marginBottom: "20px",
            padding: "10px",
            background: "#1f2937",
            border: "1px solid #333",
            borderRadius: "8px",
        }}
        >
        {activeSkill ? (() => {
            const detail = skillsMap?.[activeSkill.id];
            if (!detail) return null;

            // ✅ 用 map 逆推層級，避免 level 取不到
            const detailLevel = detail.level ?? getLevelFromMap(detail.id);
            const totals = calcSkillEIK(detail.id, roots, diarys);

            // ✅ 細化技能：第 3 層才顯示，且要把所有「非整合」子孫列出
            const refinedList =
            detailLevel === 3 ? getNonMergedDescendants(detail).filter(s => !s.isMerged) : [];

            return (
            <>
                {/* 標題（整合 or 第 4 層以上才顯示 parent） */}
                {(detail.isMerged || detailLevel >= 4) ? (
                <div>
                    <div style={{ fontSize: "11px", color: "#999", marginBottom: "2px" }}>
                    {skillsMap?.[detail.parentId]?.name || "父技能"}
                    </div>
                    <h3 style={{ margin: 0, color: "#fff" }}>↳ {detail.name}</h3>
                </div>
                ) : (
                <h3 style={{ margin: 0, color: "#fff" }}>{detail.name}</h3>
                )}

                {/* E-I-K */}
                <div style={{ fontSize: "12px", marginBottom: "6px" }}>
                <span style={{ color: "#00aaaa" }}>E: {totals.e}　</span>
                <span style={{ color: "#aa00aa" }}>I: {totals.i}　</span>
                <span style={{ color: "#aaaa00" }}>K: {totals.k}</span>
                </div>

                {/* 描述 */}
                <p style={{ fontSize: "12px", color: "#bbb" }}>
                {detail.description || "尚無描述"}
                </p>

                {/* 整合技能 */}
                {detail.mergedChildren?.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                    <h4 style={{ color: "#ccc", fontSize: "13px" }}>整合技能</h4>
                    <ul style={{ fontSize: "12px", color: "#aaa", paddingLeft: "16px" }}>
                    {detail.mergedChildren.map((c) => {
                        const child = skillsMap[c.id] || c;
                        const t = calcSkillEIK(child.id, roots, diarys);
                        return (
                        <li
                            key={child.id}
                            style={{ cursor: "pointer", marginBottom: "8px" }}
                            onClick={() => setActiveSkill(child)}
                        >
                            {child.name}　
                            <span> ( </span>
                            <span style={{ color: "#00aaaa" }}>{t.e}</span>
                            <span>-</span>
                            <span style={{ color: "#aa00aa" }}>{t.i}</span>
                            <span>-</span>
                            <span style={{ color: "#aaaa00" }}>{t.k}</span>
                            <span> ) </span>
                        </li>
                        );
                    })}
                    </ul>
                </div>
                )}

                {/* 細化技能（第 3 層＋所有非整合子孫） */}
                {refinedList.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                    <h4 style={{ color: "#ccc", fontSize: "13px" }}>細化技能</h4>
                    <ul style={{ fontSize: "12px", color: "#ddd", paddingLeft: "16px" }}>
                    {refinedList.map((c) => {
                        const t = calcSkillEIK(c.id, roots, diarys);
                        return (
                        <li
                            key={c.id}
                            style={{ cursor: "pointer", marginBottom: "8px" }}
                            onClick={() => setActiveSkill(c)}
                        >
                            {c.name}　
                            <span> ( </span>
                            <span style={{ color: "#00aaaa" }}>{t.e}</span>
                            <span>-</span>
                            <span style={{ color: "#aa00aa" }}>{t.i}</span>
                            <span>-</span>
                            <span style={{ color: "#aaaa00" }}>{t.k}</span>
                            <span> ) </span>
                        </li>
                        );
                    })}
                    </ul>
                </div>
                )}
            </>
            );
        })() : (
            <p style={{ fontSize: "12px", color: "#666" }}>點擊技能以查看詳細資訊</p>
        )}
        </div>

        {/* 日記區（relatedDiarys 的 map 渲染搬進來） */}
        <div>
            <h2 style={{ color: "#fff" }}>日記區</h2>
            {relatedDiarys.length > 0 ? (
              <ul style={{ color: "#ddd", fontSize: "12px" }}>
                {relatedDiarys.map((d) => (
                  <li key={d.id} style={{ marginBottom: "12px", cursor: "pointer" }}>
                    {/* 點擊標題切換展開/收合 */}
                    <div
                      onClick={() =>
                        setExpandedDiaryId(expandedDiaryId === d.id ? null : d.id)
                      }
                      style={{ fontWeight: "bold", color: "#fff" }}
                    >
                      {d.title} ({d.date.slice(0, 10)})
                    </div>

                    {/* E-I-K & Link */}
                    {d.eik && (
                      <div style={{ fontSize: "11px" }}>
                        E: {d.eik.e}　I: {d.eik.i}　K: {d.eik.k}
                      </div>
                    )}
                    {d.linkUrl && (
                      <a
                        href={d.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "11px", color: "#4dabf7" }}
                      >
                        {d.linkName || "查看連結"}
                      </a>
                    )}

                    {/* 展開內容 */}
                    {expandedDiaryId === d.id && (
                      <div style={{ marginTop: "6px", fontSize: "12px", color: "#bbb" }}>
                        {d.content || "（沒有內容）"}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

            ) : (
              <p style={{ fontSize: "12px", color: "#999" }}>尚無相關日記</p>
            )}
        </div>
    </div>
  );
}
