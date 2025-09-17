// utils/calcUtils.js

const centerX = 400;
const centerY = 400;
const radiusStep = 120;

function placeNodes(skills, level, startAngle, endAngle, map) {
  const nodes = [];
  const angleStep = (endAngle - startAngle) / skills.length;

  skills.forEach((skill, index) => {
    const angle = startAngle + angleStep * (index + 0.5);
    const radius = level * radiusStep;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    nodes.push({ ...skill, level, x, y });

    if (skill.children?.length) {
      nodes.push(...placeNodes(skill.children, level + 1, angle - angleStep / 2, angle + angleStep / 2));
    }
    if (skill.mergedChildren?.length) {
      nodes.push(...placeNodes(skill.mergedChildren, level + 1, angle - angleStep / 2, angle + angleStep / 2));
    }
  });

  return nodes;
}

function calcSkillEIK(skillId, roots, diarys) {
  let totals = { e: 0, i: 0, k: 0 };

  const collect = (nodeId, nodes) => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        diarys.forEach((d) => {
          if (d.skills.includes(node.id) && d.eik) {
            totals.e += d.eik.e || 0;
            totals.i += d.eik.i || 0;
            totals.k += d.eik.k || 0;
          }
        });
        if (node.children) node.children.forEach((c) => collect(c.id, node.children));
        if (node.mergedChildren) node.mergedChildren.forEach((c) => collect(c.id, node.mergedChildren));
      } else {
        if (node.children) collect(skillId, node.children);
        if (node.mergedChildren) collect(skillId, node.mergedChildren);
      }
    }
  };

  collect(skillId, roots);
  return totals;
}

function getRadius(sum) {
  if (sum <= 0) return 1;
  return 1 + Math.sqrt(sum) * 2;
}

function getLevelFromMap(id, skillsMap) {
  let lvl = 0;
  let cur = skillsMap?.[id];
  while (cur) {
    lvl += 1;
    cur = skillsMap?.[cur.parentId];
  }
  return lvl;
}

function getNonMergedDescendants(node, skillsMap) {
  const out = [];
  function walk(n) {
    if (!n) return;
    (n.children || []).forEach((c) => {
      const full = skillsMap[c.id] || c;
      if (!full.isMerged) out.push(full);
      walk(full);
    });
    (n.mergedChildren || []).forEach((c) => {
      const full = skillsMap[c.id] || c;
      walk(full);
    });
  }
  walk(node);
  return out;
}

function getStrokeColor(e, i, k) {
  let r = 170, g = 170, b = 170;
  r += i * 1 + k * 1;
  g += e * 1 + k * 1;
  b += e * 1 + i * 1;
  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);
  return `rgb(${r}, ${g}, ${b})`;
}

// ✅ 統一 export
export {
  placeNodes,
  calcSkillEIK,
  getRadius,
  getLevelFromMap,
  getNonMergedDescendants,
  getStrokeColor,
};
