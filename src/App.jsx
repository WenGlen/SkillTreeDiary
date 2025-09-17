import { useEffect, useState, useMemo } from "react";
import { fetchSkills } from "./api/fetchSkills";
import { fetchDiarys } from "./api/fetchDiarys";
import {
  placeNodes,
  calcSkillEIK,
  getRadius,
  getLevelFromMap,
  getNonMergedDescendants,
  getStrokeColor,
} from "./utils/calcUtils";
import { SkillTree, DiaryPanel } from "./components/UIComponents";

function App() {
  // === 狀態管理 ===
  const [roots, setRoots] = useState([]);
  const [placedNodes, setPlacedNodes] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);
  const [diarys, setDiarys] = useState([]);
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);

  // === skillsMap（方便快速查父子） ===
  const skillsMap = useMemo(() => {
    const map = {};
    const build = (nodes, parentId = null) => {
      nodes.forEach((n) => {
        map[n.id] = { ...n, parentId };
        if (n.children) build(n.children, n.id);
        if (n.mergedChildren) build(n.mergedChildren, n.id);
      });
    };
    build(roots);
    return map;
  }, [roots]);

  // === 抓技能資料 ===
  useEffect(() => {
    async function loadSkills() {
      const data = await fetchSkills(); // 這裡會回傳處理好的 skills 結構
      setRoots(data.roots);
      setPlacedNodes(placeNodes(data.roots, 1, 0, 2 * Math.PI));
    }
    loadSkills();
  }, []);

  // === 抓日記資料 ===
  useEffect(() => {
    async function loadDiarys() {
      const data = await fetchDiarys(); // 這裡會回傳整理好的 diary 陣列
      setDiarys(data);
    }
    loadDiarys();
  }, []);

  // === 過濾目前技能相關日記 ===
  const relatedDiarys =
    activeSkill && diarys.length > 0
      ? diarys.filter((d) => d.skills.includes(activeSkill.id))
      : [];

  return (
    
    <div>
 <h1 className="text-center">Skill Tree Diary</h1>

    {/* 主體容器 */}
    <div className="flex flex-row">
      {/* 左側空白區 */}
      <div className="w-[40px]"></div>

        {/* 技能樹區 */}
        <SkillTree
          roots={roots}
          placedNodes={placedNodes}
          diarys={diarys}
          activeSkill={activeSkill}
          setActiveSkill={setActiveSkill}
        />

        {/* 日記區 */}
        <DiaryPanel
          activeSkill={activeSkill}
          diarys={relatedDiarys}
          expandedDiaryId={expandedDiaryId}
          setExpandedDiaryId={setExpandedDiaryId}
          skillsMap={skillsMap}
          roots={roots}
        />
      </div>

      <p className="text-center">Prototype v0.4-1</p>
    </div>
  );
}

export default App;
