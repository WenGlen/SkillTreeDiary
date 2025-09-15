import { useEffect, useState } from "react";

function App() {
  const [roots, setRoots] = useState([]);
  const [placedNodes, setPlacedNodes] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("https://skill-tree-diary.vercel.app/api/skills");
      const json = await res.json();

      // 建立 map
      const skillsMap = {};
      json.results.forEach((item) => {
        const id = item.id;
        const parentId = item.properties?.["Parent-Skill"]?.relation?.[0]?.id || null;
        const description =
          item.properties?.[" Skill-Description"]?.rich_text?.[0]?.plain_text || "";

        const skill = {
          id,
          name: item.properties?.["Skill-Name"]?.title?.[0]?.plain_text || "未命名",
          parentId,
          description,
          children: [],
        };

        skillsMap[id] = skill;
      });

      // 建立 parent-child 關係
      const rootsTemp = [];
      Object.values(skillsMap).forEach((skill) => {
        if (skill.parentId && skillsMap[skill.parentId]) {
          skillsMap[skill.parentId].children.push(skill);
        } else {
          rootsTemp.push(skill);
        }
      });

      setRoots(rootsTemp);

      // 放置位置
      const placed = placeNodes(rootsTemp, 1, 0, 2 * Math.PI, skillsMap);
      setPlacedNodes(placed);
    }
    fetchData();
  }, []);

  const centerX = 400;
  const centerY = 400;
  const radiusStep = 120;

  // 遞迴排位置（最多到第三層）
  const placeNodes = (nodes, level, startAngle, endAngle, map) => {
    if (level > 3) return [];
    const placed = [];
    const angleStep = (endAngle - startAngle) / nodes.length;

    nodes.forEach((node, index) => {
      const angle = startAngle + angleStep * (index + 0.5);
      const radius = level * radiusStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const placedNode = { ...node, x, y, angle, level };
      placed.push(placedNode);

      if (node.children.length > 0) {
        const childPlaced = placeNodes(
          node.children,
          level + 1,
          startAngle + angleStep * index,
          startAngle + angleStep * (index + 1),
          map
        );
        placed.push(...childPlaced);
      }
    });

    return placed;
  };

  // 處理點擊背景（空白處）關閉視窗
  const handleBackgroundClick = (e) => {
    if (e.target.tagName === "svg") {
      setActiveSkill(null);
    }
  };

  return (
    <div style={{ display: "flex" }}>
      {/* 左側技能盤 */}
      <div style={{ flex: "3", position: "relative" }}>
        <svg
          width="800"
          height="800"
          style={{ border: "1px solid #ccc" }}
          onClick={handleBackgroundClick}
        >
          {/* 畫線 (child → parent) */}
          {placedNodes.map(
            (node) =>
              node.parentId && (
                <line
                  key={`${node.id}-line`}
                  x1={placedNodes.find((n) => n.id === node.parentId)?.x}
                  y1={placedNodes.find((n) => n.id === node.parentId)?.y}
                  x2={node.x}
                  y2={node.y}
                  stroke="#999"
                  strokeWidth="2"
                />
              )
          )}

          {/* 畫點 */}
          {placedNodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="28"
                fill={node.level === 1 ? "#4f46e5" : node.level === 2 ? "#16a34a" : "#dc2626"}
                stroke="white"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s ease",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation(); // 防止冒泡觸發背景關閉
                  setActiveSkill(node);
                }}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="11"
                pointerEvents="none" // 文字不阻擋點擊圓形
              >
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 右側資訊欄 */}
{/* 右側資訊欄 */}
<div
  style={{
    width: "300px",           // 固定寬度，避免彈跳
    borderLeft: "1px solid #ddd",
    padding: "10px",
    background: "#f9fafb",
    display: "flex",
    flexDirection: "column",
  }}
>
  {/* 技能說明區 */}
  <div
    style={{
      minHeight: "200px",     // 固定高度，避免隨文字增減跳動
      marginBottom: "20px",
      padding: "10px",
      background: "white",
      border: "1px solid #ccc",
      borderRadius: "8px",
      flexShrink: 0,
    }}
  >
    {activeSkill ? (
      <>
        <h3 style={{ marginTop: 0 }}>{activeSkill.name}</h3>
        <p style={{ fontSize: "12px", color: "#555" }}>
          {activeSkill.description || "尚無描述"}
        </p>
        {/* 只有第三層顯示子技能 */}
        {activeSkill.level === 3 && activeSkill.children.length > 0 && (
          <ul style={{ fontSize: "12px", paddingLeft: "16px" }}>
            {activeSkill.children.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
      </>
    ) : (
      <p style={{ fontSize: "12px", color: "#999" }}>點擊技能以查看詳細資訊</p>
    )}
  </div>

  {/* 日記區 */}
  <div style={{ flex: 1 }}>
    <h2>日記區</h2>
    <p style={{ fontSize: "12px", color: "#666" }}>
      這裡將顯示與技能相關的日記內容（之後串 API）
    </p>
    <ul>
      <li>日記 1</li>
      <li>日記 2</li>
      <li>日記 3</li>
    </ul>
  </div>
</div>

    </div>
  );
}

export default App;
