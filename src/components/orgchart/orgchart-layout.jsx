import { NODE_DIMS, GAPS, PAGE_SIZE } from './orgchart-config';

/**
 * Recursively computes absolute positions for nodes and SVG connector lines.
 * Returns { width, height, nodes: [{id,x,y,isSelf,level}], lines, extraButtons }
 */
export function layoutTree(nodeId, isSelf, level, maxLevel, getChildren, expandedSet, pageMap, mode) {
  if (level > maxLevel) return { width: 0, nodes: [], lines: [], extraButtons: [], height: 0 };

  const { w: NW, h: NH } = NODE_DIMS[mode];
  const { h: HG, v: VG } = GAPS[mode];

  const allChildren = getChildren(nodeId);
  const isExpanded = expandedSet.has(nodeId);
  const page = pageMap[nodeId] || 1;
  const visibleChildren = isExpanded ? allChildren.slice(0, page * PAGE_SIZE) : [];
  const hasMore = isExpanded && allChildren.length > visibleChildren.length;

  if (visibleChildren.length === 0) {
    return { width: NW, nodes: [{ id: nodeId, x: 0, y: 0, isSelf, level }], lines: [], extraButtons: [], height: NH };
  }

  const childLayouts = visibleChildren.map(child =>
    layoutTree(child.id, false, level + 1, maxLevel, getChildren, expandedSet, pageMap, mode)
  ).filter(cl => cl.width > 0);

  if (childLayouts.length === 0) {
    return { width: NW, nodes: [{ id: nodeId, x: 0, y: 0, isSelf, level }], lines: [], extraButtons: [], height: NH };
  }

  const totalChildW = childLayouts.reduce((s, cl) => s + cl.width, 0) + HG * (childLayouts.length - 1);
  const totalWidth = Math.max(NW, totalChildW);

  const parentX = (totalWidth - NW) / 2;
  const parentCenterX = parentX + NW / 2;
  const barY = NH + VG / 2;
  const childY = NH + VG;

  let offsetX = (totalWidth - totalChildW) / 2;
  const nodes = [{ id: nodeId, x: parentX, y: 0, isSelf, level }];
  const lines = [];
  const extraButtons = [];

  // Vertical stem from parent bottom to bar
  lines.push({ x1: parentCenterX, y1: NH, x2: parentCenterX, y2: barY });

  childLayouts.forEach((cl) => {
    const childCenterX = offsetX + cl.width / 2;
    // Vertical from bar down to child top
    lines.push({ x1: childCenterX, y1: barY, x2: childCenterX, y2: childY });
    cl.nodes.forEach(n => nodes.push({ ...n, x: n.x + offsetX, y: n.y + childY }));
    cl.lines.forEach(l => lines.push({ x1: l.x1 + offsetX, y1: l.y1 + childY, x2: l.x2 + offsetX, y2: l.y2 + childY }));
    cl.extraButtons.forEach(b => extraButtons.push({ ...b, x: b.x + offsetX, y: b.y + childY }));
    offsetX += cl.width + HG;
  });

  // Horizontal bar connecting first and last child
  if (childLayouts.length > 1) {
    const firstCX = (totalWidth - totalChildW) / 2 + childLayouts[0].width / 2;
    const lastCX = (totalWidth - totalChildW) / 2 + totalChildW - childLayouts[childLayouts.length - 1].width / 2;
    lines.push({ x1: firstCX, y1: barY, x2: lastCX, y2: barY });
  }

  // "Show more" pagination button
  if (hasMore) {
    const childMaxY = Math.max(...childLayouts.flatMap(cl => cl.nodes.map(n => n.y)), 0);
    extraButtons.push({
      nodeId,
      x: parentCenterX - 40,
      y: childY + childMaxY + NH + 6,
      shown: visibleChildren.length,
      total: allChildren.length,
    });
  }

  const childMaxY = Math.max(...childLayouts.flatMap(cl => cl.nodes.map(n => n.y)), 0);
  return { width: totalWidth, nodes, lines, extraButtons, height: childY + childMaxY + NH };
}