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
<div style={{ flex: "3", position: "relative", background: "#000" }}>
  <svg
    width="800"
    height="800"
    style={{ background: "#000" }}
    onClick={handleBackgroundClick}
  >
    {/* 畫線 */}
    {placedNodes.map(
      (node) =>
        node.parentId && (
          <line
            key={`${node.id}-line`}
            x1={placedNodes.find((n) => n.id === node.parentId)?.x}
            y1={placedNodes.find((n) => n.id === node.parentId)?.y}
            x2={node.x}
            y2={node.y}
            stroke="#666"
            strokeWidth="4"
          />
        )
    )}

    {/* 畫點 + 文字 */}
    {placedNodes.map((node) => (
      <g key={node.id}>
        <circle
          cx={node.x}
          cy={node.y}
          r="16"
          fill={node.level === 1 ? "#999999" : node.level === 2 ? "#666666" : "#333333"}
          stroke="white"
          strokeWidth="1"
          style={{
            transition: "transform 0.2s ease",
            cursor: "pointer",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveSkill(node);
          }}
        />
        {/* 技能名稱移到圓圈下方 */}
        <text
          x={node.x}
          y={node.y + 40}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
          pointerEvents="none"
        >
          {node.name}
        </text>
      </g>
    ))}
  </svg>
</div>

{/* 右側資訊欄 */}
<div
  style={{
    width: "300px",
    borderLeft: "1px solid #333",
    padding: "10px",
    background: "#111",   // 深色背景
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
      background: "#1f2937", // 深灰
      border: "1px solid #333",
      borderRadius: "8px",
    }}
  >
    {activeSkill ? (
      <>
        <h3 style={{ marginTop: 0, color: "#fff" }}>{activeSkill.name}</h3>
        <p style={{ fontSize: "12px", color: "#bbb" }}>
          {activeSkill.description || "尚無描述"}
        </p>
        {activeSkill.level === 3 && activeSkill.children.length > 0 && (
          <ul style={{ fontSize: "12px", paddingLeft: "16px", color: "#ddd" }}>
            {activeSkill.children.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
      </>
    ) : (
      <p style={{ fontSize: "12px", color: "#666" }}>點擊技能以查看詳細資訊</p>
    )}
  </div>

  {/* 日記區 */}
  <div>
    <h2 style={{ color: "#fff" }}>日記區</h2>
    <p style={{ fontSize: "12px", color: "#999" }}>
      這裡將顯示與技能相關的日記內容（之後串 API）
    </p>
    <ul style={{ color: "#ddd" }}>
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
