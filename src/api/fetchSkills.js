// api/fetchSkills.js

export async function fetchSkills() {
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
      mergedChildren: [],
    };
  });

  // 建立 parent-child 關聯
  const roots = [];
  Object.values(map).forEach((s) => {
    if (s.parentId && map[s.parentId]) {
      if (s.isMerged) {
        map[s.parentId].mergedChildren.push(s);
      } else {
        map[s.parentId].children.push(s);
      }
    } else {
      roots.push(s);
    }
  });

  return { roots, map };
}
