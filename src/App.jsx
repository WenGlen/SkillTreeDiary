import { useEffect, useState, useMemo } from "react";

function App() {
  const [roots, setRoots] = useState([]);
  const [placedNodes, setPlacedNodes] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);
  const [diarys, setDiarys] = useState([]);
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);


  // === 抓技能 DB ===
useEffect(() => {
  async function fetchSkills() {
    const res = await fetch("https://skill-tree-diary.vercel.app/api/skills");
    const json = await res.json();

    const map = {};
    json.results.forEach((item) => {
      const id = item.id;
      const parentId = item.properties?.["Parent-Skill"]?.relation?.[0]?.id || null;

      map[id] = {
        id,
        name: item.properties?.["Skill-Name"]?.title?.[0]?.plain_text || "未命名",
        description: item.properties?.["Skill-Description"]?.rich_text?.[0]?.plain_text || "",
        parentId,
        isMerged: item.properties?.["Merge-State"]?.checkbox || false,
        children: [],
        mergedChildren: [], // ✅ 預先放
      };
    });

    // 建立 parent-child 關聯
    const rootsTemp = [];
    Object.values(map).forEach((s) => {
      if (s.parentId && map[s.parentId]) {
        if (s.isMerged) {
          map[s.parentId].mergedChildren.push(s);
        } else {
          map[s.parentId].children.push(s);
        }
      } else {
        rootsTemp.push(s);
      }
    });

    setRoots(rootsTemp);

    // ✅ 產生座標
    const placed = placeNodes(rootsTemp, 1, 0, 2 * Math.PI);
    setPlacedNodes(placed);
  }
  fetchSkills();
}, []);




  // === 抓日記 DB ===
  useEffect(() => {
    async function fetchDiarys() {
      const res = await fetch("https://skill-tree-diary.vercel.app/api/diarys");
      const json = await res.json();

      const mapped = json.results.map((item) => {
        const props = item.properties;                 // ✅ 只宣告一次
        const kieStr = props["K-I-E"]?.rich_text?.[0]?.plain_text ?? "0-0-0";

        // 解析 K-I-E，並處理空白/非數字
        const [k = 0, i = 0, e = 0] = kieStr
          .split("-")
          .map((s) => Number(String(s).trim()) || 0);

        return {
          id: item.id,
          slug: props["diary-slug"]?.rich_text?.[0]?.plain_text || "",
          title: props["Title"]?.title?.[0]?.plain_text || "未命名",
          content: (props["Content"]?.rich_text ?? [])
            .map((t) => t.plain_text)
            .join(""),
          date: props["Created Date"]?.created_time || "",
          kie: { k, i, e },                               // ✅ 統一用 e/i/k
          linkName: props["Link-Name"]?.rich_text?.[0]?.plain_text || "",
          linkUrl: props["Link-URL"]?.url || "",
          skills: (props["Skills"]?.relation ?? []).map((rel) => rel.id),
          invisible: !!props["Invisible"]?.checkbox,
        };
      });

      setDiarys(mapped.filter((d) => !d.invisible));
    }

    fetchDiarys();
  }, []);

const centerX = 400;
const centerY = 400;
const radiusStep = 120;

function placeNodes(skills, level, startAngle, endAngle, map) {
  const nodes = [];
  const visibleSkills = skills.filter((s) => !s.isMerged && level < 4); // 👈 只影響畫圖

  const angleStep = (endAngle - startAngle) / skills.length;

  skills.forEach((skill, index) => {
    // 每個節點的角度
    const angle = startAngle + angleStep * (index + 0.5);
    const radius = level * radiusStep;

    // ✅ 中心偏移，確保分布在 (400,400) 附近
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    nodes.push({
      ...skill,
      level,
      x,
      y,
    });

    // 子節點範圍：給予完整的角度扇形
    if (skill.children?.length) {
      nodes.push(...placeNodes(skill.children, level + 1, angle - angleStep / 2, angle + angleStep / 2));
    }

    if (skill.mergedChildren?.length) {
      nodes.push(...placeNodes(skill.mergedChildren, level + 1, angle - angleStep / 2, angle + angleStep / 2));
    }
  });

  return nodes;
}





const skillsMap = useMemo(() => {
  const map = {};
  const build = (nodes, parentId = null) => {
    nodes.forEach((n) => {
      map[n.id] = { ...n, parentId };
      if (n.children) build(n.children, n.id); // 👈 保留細化技能
      if (n.mergedChildren) build(n.mergedChildren, n.id);
    });
  };
  build(roots);
  return map;
}, [roots]);


  //計算某個技能的總 K-I-E：

  // roots = 整棵技能樹
  // diarys = 所有日記
  function calcSkillKIE(skillId, roots, diarys) {
    let totals = { k: 0, i: 0, e: 0 };

    const collect = (nodeId, nodes) => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          // 找日記加總
          diarys.forEach((d) => {
            if (d.skills.includes(node.id) && d.kie) {
              totals.k += d.kie.k || 0;
              totals.i += d.kie.i || 0;
              totals.e += d.kie.e || 0;
            }
          });

          // 這裡要遞迴子技能（children + mergedChildren）
          if (node.children) {
            node.children.forEach((c) => collect(c.id, node.children));
          }
          if (node.mergedChildren) {
            node.mergedChildren.forEach((c) => collect(c.id, node.mergedChildren));
          }
        } else {
          // 繼續找
          if (node.children) collect(skillId, node.children);
          if (node.mergedChildren) collect(skillId, node.mergedChildren);
        }
      }
    };

    collect(skillId, roots);
    return totals;
  }





  // 處理點擊背景（空白處）關閉視窗
  const handleBackgroundClick = (e) => {
    if (e.target.tagName === "svg") {
      setActiveSkill(null);
    }
  };

  // 🔍 過濾出相關日記
  const relatedDiarys =
    activeSkill && diarys.length > 0
      ? diarys.filter((d) => d.skills.includes(activeSkill.id))
      : [];







  // 在 return 之前加這段
  const activeTotals = activeSkill ? calcSkillKIE(activeSkill.id, roots, diarys) : null;

      // 半徑計算函式
function getRadius(sum) {
  if (sum <= 0) return 1; // 基礎大小
  return 1 + Math.sqrt(sum)*2;

  // 其他可替換方案：
  // 對數 return 16 + Math.log(sum + 1) * 6;
  // 混合 return 16 + Math.log(Math.sqrt(sum) + 1) * 8;
}




    // 由 skillsMap 逆推層級（1 = root）
function getLevelFromMap(id) {
  let lvl = 0;
  let cur = skillsMap?.[id];
  while (cur) {
    lvl += 1;
    cur = skillsMap?.[cur.parentId];
  }
  return lvl;
}

// 取得「非整合」的所有子孫（細化技能要顯示到 5、6 層）
function getNonMergedDescendants(node) {
  const out = [];
  function walk(n) {
    if (!n) return;
    // children
    (n.children || []).forEach((c) => {
      const full = skillsMap[c.id] || c;
      if (!full.isMerged) out.push(full); // 列表裡不放整合技能
      walk(full); // 繼續往下
    });
    // mergedChildren 仍然走訪（通常不會再分支，但保險）
    (n.mergedChildren || []).forEach((c) => {
      const full = skillsMap[c.id] || c;
      walk(full);
    });
  }
  walk(node);
  return out;
}


  function getStrokeColor(e, i, k) {
    let r = 170, g = 170, b = 170; // #aaaaaa

    r += i * 1 + k * 1; // I+K
    g += e * 1 + k * 1; // E+K
    b += e * 1 + i * 1; // E+I

    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);

    return `rgb(${r}, ${g}, ${b})`;
  }






  return (
    
    <div>
      <h1 style={{ textAlign: "center" }}>Skill Tree Diary</h1>

      <div style={{ display: "flex" }}>
        <div style={{ width: "40px" }}></div>

        {/* 左側技能盤 */}
        <div style={{ flex: "3", position: "relative", background: "#000" }}>
          <svg
            width="800"
            height="800"
            style={{ background: "#000" }}
            onClick={handleBackgroundClick}
          >
            {/* 畫線 */}
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

            {/* 畫點 + 文字 */}
{/* 畫點 + 文字 */}
{/* 畫點 + 文字 */}
{placedNodes.map((node) => {
  if (node.isMerged || node.level >= 4) return null; // 🚫 不畫整合/細化技能

  const totals = calcSkillKIE(node.id, roots, diarys);
  const sum = totals.k + totals.i + totals.e;
  const radius = getRadius(sum);

  // 計算邊線顏色（基礎灰 + KIE 疊加）

  const strokeColor = getStrokeColor(totals.k, totals.i, totals.e);

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

        {/* 右側資訊欄 */}
        <div
          style={{
            width: "300px",
            borderLeft: "1px solid #333",
            padding: "10px",
            background: "#111",
            color: "white",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 技能說明 */}
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
    const totals = calcSkillKIE(detail.id, roots, diarys);

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

        {/* K-I-E */}
        <div style={{ fontSize: "12px", marginBottom: "6px" }}>
          <span style={{ color: "#00aaaa" }}>K: {totals.k}　</span>
          <span style={{ color: "#aa00aa" }}>I: {totals.i}　</span>
          <span style={{ color: "#aaaa00" }}>E: {totals.e}</span>
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
                const t = calcSkillKIE(child.id, roots, diarys);
                return (
                  <li
                    key={child.id}
                    style={{ cursor: "pointer", marginBottom: "8px" }}
                    onClick={() => setActiveSkill(child)}
                  >
                    {child.name}　
                    <span> ( </span>
                    <span style={{ color: "#00aaaa" }}>{t.k}</span>
                    <span>-</span>
                    <span style={{ color: "#aa00aa" }}>{t.i}</span>
                    <span>-</span>
                    <span style={{ color: "#aaaa00" }}>{t.e}</span>
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
                const t = calcSkillKIE(c.id, roots, diarys);
                return (
                  <li
                    key={c.id}
                    style={{ cursor: "pointer", marginBottom: "8px" }}
                    onClick={() => setActiveSkill(c)}
                  >
                    {c.name}　
                    <span> ( </span>
                    <span style={{ color: "#00aaaa" }}>{t.k}</span>
                    <span>-</span>
                    <span style={{ color: "#aa00aa" }}>{t.i}</span>
                    <span>-</span>
                    <span style={{ color: "#aaaa00" }}>{t.e}</span>
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






          {/* 日記區 */}
          <div>
            <h2 style={{ color: "#fff" }}>日記區</h2>
            {relatedDiarys.length > 0 ? (
              <ul style={{color: "#ddd", fontSize: "12px" , listStyle:"none",margin: "0", padding: "0"}}>
                {relatedDiarys.map((d) => (
                  <div style={{ marginBottom: "12px", background: "#222733" , borderRadius:"8px", padding: "8px"}}>
                  <li key={d.id} style={{ margin: "0",marginLeft: "16px", cursor: "pointer"}}>
                    {/* 點擊標題切換展開/收合 */}
                    <div
                      onClick={() =>
                        setExpandedDiaryId(expandedDiaryId === d.id ? null : d.id)
                      }
                      style={{ fontWeight: "bold", color: "#fff" }}
                    >
                      {d.title} ({d.date.slice(0, 10)})
                    

                    {/* K-I-E & Link */}
                    {d.kie && (
                      <div style={{ fontSize: "11px" }}>
                        <span style={{ color: "#00aaaa" }}>K: {d.kie.k}　</span>
                        <span style={{ color: "#aa00aa" }}>I: {d.kie.i}　</span>
                        <span style={{ color: "#aaaa00" }}>E: {d.kie.e}</span>
                      </div>
                    )}
                    </div>
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
                  </div>
                ))}
              </ul>

            ) : (
              <p style={{ fontSize: "12px", color: "#999" }}>尚無相關日記</p>
            )}
          </div>
        </div>
      </div>
      <p style={{ textAlign: "center" }}>Prototype v1-1.0</p>
    </div>
  );
}

export default App;
