import { useEffect, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import skillImg from './img/skill.png';
import dairyImg from './img/dairy.png';
import SettingsModal from "./SettingsModal";

async function queryNotionDB(apiKey, dbId, body = {}) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
  return res.json();
}


function App() {
  const isApiMode = window.location.pathname.startsWith("/api");
  
  const [showSettings, setShowSettings] = useState(false);// 狀態：是否顯示設定彈窗
  const [roots, setRoots] = useState([]);
  const [placedNodes, setPlacedNodes] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);
  const [diarys, setDiarys] = useState([]);
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  
  console.log("pathname:", window.location.pathname, "isApiMode?", isApiMode);
  // 第一次進入 API 模式且沒設定，就自動打開設定窗
  useEffect(() => {
    if (isApiMode) {
      const hasKey = !!localStorage.getItem("notion_api_key");
      const hasSkills = !!localStorage.getItem("skills_db_id");
      const hasDiarys = !!localStorage.getItem("diarys_db_id");
      setShowSettings(true); // 🚀 一開始就強制打開
      //if (!hasKey || !hasSkills || !hasDiarys) setShowSettings(true);
      
    }
  }, [isApiMode]);




// === 抓技能 DB ===
useEffect(() => {
  async function fetchSkills() {
    try {
      let json;

      if (isApiMode) {
        // 使用者模式 → 打你的 proxy
        const apiKey = localStorage.getItem("notion_api_key");
        const skillsDbId = localStorage.getItem("skills_db_id");
        if (!apiKey || !skillsDbId) return;

        const res = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: apiKey, databaseId: skillsDbId }),
        });
        json = await res.json();
      } else {
        // 展示模式 → 用固定的 token/db
        const res = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: localStorage.getItem("notion_token"),
            databaseId: localStorage.getItem("notion_skills_db"),
          }),
        });
        json = await res.json();
      }

      console.log("技能 JSON：", json);

      const map = {};
      json.results.forEach((item) => {
        const props = item.properties;
        const id = item.id;
        const parentId = props?.["Parent-Skill"]?.relation?.[0]?.id || null;

        map[id] = {
          id,
          name: props?.["Skill-Name"]?.title?.[0]?.plain_text || "未命名",
          description: (props?.["Skill-Description"]?.rich_text?.[0]?.plain_text || "").trim(),
          parentId,
          isMerged: props?.["Merge-State"]?.checkbox || false,
          children: [],
          mergedChildren: [],
        };
      });

      const rootsTemp = [];
      Object.values(map).forEach((s) => {
        if (s.parentId && map[s.parentId]) {
          if (s.isMerged) map[s.parentId].mergedChildren.push(s);
          else map[s.parentId].children.push(s);
        } else {
          rootsTemp.push(s);
        }
      });

      setRoots(rootsTemp);
      const placed = placeNodes(rootsTemp, 1, 0, 2 * Math.PI);
      setPlacedNodes(placed);
    } catch (e) {
      console.error(e);
    }
  }

  fetchSkills();
}, [isApiMode]);


// === 抓日記 DB ===
useEffect(() => {
  async function fetchDiarys() {
    try {
      let json;

      if (isApiMode) {
        const apiKey = localStorage.getItem("notion_api_key");
        const diarysDbId = localStorage.getItem("diarys_db_id");
        if (!apiKey || !diarysDbId) return;

        const res = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: apiKey, databaseId: diarysDbId }),
        });
        json = await res.json();
      } else {
        const res = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: localStorage.getItem("notion_token"),
            databaseId: localStorage.getItem("notion_diarys_db"),
          }),
        });
        json = await res.json();
      }

      console.log("日記 JSON：", json);

      const mapped = json.results.map((item) => {
        const props = item.properties;
        const eikStr = props["E-I-K"]?.rich_text?.[0]?.plain_text ?? "0-0-0";
        const [e = 0, i = 0, k = 0] = eikStr.split("-").map((s) => Number(String(s).trim()) || 0);

        return {
          id: item.id,
          slug: props["diary-slug"]?.rich_text?.[0]?.plain_text || "",
          title: props["Title"]?.title?.[0]?.plain_text || "未命名",
          content: (props["Content"]?.rich_text ?? []).map((t) => t.plain_text).join("\n"),
          date: props["Created Date"]?.created_time || "",
          eik: { e, i, k },
          linkName: props["Link-Name"]?.rich_text?.[0]?.plain_text || "",
          linkUrl: props["Link-URL"]?.url || "",
          skills: (props["Skills"]?.relation ?? []).map((rel) => rel.id),
          invisible: !!props["Invisible"]?.checkbox,
        };
      });

      setDiarys(mapped.filter((d) => !d.invisible));
    } catch (e) {
      console.error(e);
    }
  }

  fetchDiarys();
}, [isApiMode]);


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
      <h1 style={{ textAlign: "center", marginTop: "20px",marginBottom: "20px" }}>Skill Tree Diary</h1>
      {/* 右上角設定按鈕（只在 API 模式顯示）*/}
      {isApiMode && (
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: "fixed", top: 10, right: 10,
            background: "transparent", border: "none",
            color: "#fff", fontSize: 20, cursor: "pointer", zIndex: 1100
          }}
          title="Notion API 設定"
        >
          ⚙️
        </button>
      )}
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} />

      
      <div style={{ width: "100vw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", }}>
      <div style={{display: "flex" }}>
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
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "12px",
                          color: "#ccc",
                          lineHeight: "1.5",
                        }}
                      >
                        <ReactMarkdown>{d.content || "（沒有內容）"}</ReactMarkdown>
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
      <p style={{ textAlign: "center" ,color: "#999" }}>Prototype v1-2.2</p>
    

      {/* 左下角的「？」按鈕 */}
      <button
        onClick={() => setShowHelp(true)}
        className="help-button"
        style={{
          position: "fixed",
          bottom: "40px",
          left: "40px",
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          fontSize: "16px",
          fontWeight: "bold",
          zIndex: 2000, // 確保在最上層
        }}
      >
      ?
      </button>

      {/* 說明彈窗 */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowHelp(false)} // 點遮罩關閉
        >
          <div
            style={{
              width: "900px",
              maxWidth: "90%",
              background: "#1f2937",
              color: "white",
              padding: "40px",
              borderRadius: "8px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()} // 防止點內容關閉
          >
            {/* 關閉按鈕 */}
            <button
              onClick={() => setShowHelp(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
            {/* 說明內容 */}
            <div style={{ display:"flex", gap: "40px", }}>
              <div>
                <h2 >核心概念</h2>
                <p>
                  把學習日記長成一棵「技能樹」 🌳 <br />
                  每一篇日記就是一個技能點，累積後能清楚看到自己的知識版圖。
                </p>
                <br />
                <h2 >設計重點</h2>
                <ul>
                  <li>輕鬆紀錄：用日記代替長篇筆記，一次只記一個技能重點，不容易有「作業感」。</li>
                  <li>自訂地圖：技能可以自由命名、建立上下層關係，打造專屬的能力地圖。</li>
                  <li>多面向成長：用 K-I-E 指標（知識 / 想法 / 經驗），避免只停在「聽懂」而沒有「實作」或「思考」。</li>
                </ul>
                <br />
                <h2 >操作說明</h2>
                <ul>
                  <li>圓圈大小會依據 E-I-K 值增減。<br />外框顏色反映 E-I-K 組合。</li>
                  <li>點擊左側的技能節點，可以查看右側說明與日記。<br />點擊空白處可清除選取。</li>
                  <li>「整合技能」與「細化技能」只會出現在說明欄，不會在技能盤畫出。</li>
                  <li>點擊「日記區」的日記可以展開日記內容。</li>
                </ul>
              </div>

              <div style={{flex: 1, paddingRight: "20px",borderRight: "1px solid #566",}}></div>

              <div>
                <h2> Notion 畫面示意</h2>
                <h3>  技能資料庫 </h3>
                <img src={skillImg} alt="" style={{width: "400px", height: "auto",}}/>
                <br /><br />
                <h3>  日記資料庫 </h3>
                <img src={dairyImg} alt="" style={{width: "400px", height: "auto",}}/>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );  // UI 的 return 尾巴
}

export default App;
