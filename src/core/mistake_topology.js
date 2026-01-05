/**
 * Mistake Topology - 誤答パストポロジー分析
 * 
 * 誤答時のpath遷移を用いて「迷いの構造」を可視化する
 */

/**
 * 誤答ログからパストポロジーグラフを構築
 * @param {Array} logs - ログエントリの配列
 * @returns {Object} グラフ構造（nodes, edges）
 */
export function buildMistakeTopology(logs) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 誤答のみをフィルタリング
  const mistakeLogs = logs.filter(log => {
    return log.correct === false || 
           (log.selected && log.selected.correct === false);
  });

  if (mistakeLogs.length === 0) {
    return { nodes: [], edges: [] };
  }

  // ノード（ユニークなpath状態）とエッジ（遷移）を構築
  const nodeMap = new Map(); // nodeId -> {id, label, frequency, avgResponseTime, avgPathLength, concepts}
  const edgeMap = new Map(); // "from->to" -> {from, to, weight, frequency}

  mistakeLogs.forEach(log => {
    const path = log.path || (log.clicks ? log.clicks.map(c => c.choiceId || c.id) : []);
    if (!Array.isArray(path) || path.length === 0) return;

    const concepts = log.conceptTags || log.concept_tags || [];
    const responseTime = log.response_time || log.response_time_ms || log.reaction_time || 0;
    const pathLength = path.length;

    // ノードを追加/更新
    path.forEach((nodeId, index) => {
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          label: nodeId,
          frequency: 0,
          responseTimes: [],
          pathLengths: [],
          concepts: new Set()
        });
      }

      const node = nodeMap.get(nodeId);
      node.frequency++;
      if (responseTime > 0) {
        node.responseTimes.push(responseTime);
      }
      node.pathLengths.push(pathLength);
      concepts.forEach(concept => node.concepts.add(concept));
    });

    // エッジを追加/更新（path[i] -> path[i+1]）
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edgeKey = `${from}->${to}`;

      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          from: from,
          to: to,
          weight: 0,
          frequency: 0
        });
      }

      const edge = edgeMap.get(edgeKey);
      edge.weight++;
      edge.frequency++;
    }
  });

  // ノード配列を生成（メトリクスを計算）
  const nodes = Array.from(nodeMap.values()).map(node => {
    const avgResponseTime = node.responseTimes.length > 0
      ? node.responseTimes.reduce((s, v) => s + v, 0) / node.responseTimes.length
      : 0;
    const avgPathLength = node.pathLengths.length > 0
      ? node.pathLengths.reduce((s, v) => s + v, 0) / node.pathLengths.length
      : 0;

    return {
      id: node.id,
      label: node.label,
      frequency: node.frequency,
      avgResponseTime: avgResponseTime,
      avgPathLength: avgPathLength,
      concepts: Array.from(node.concepts)
    };
  });

  // エッジ配列を生成
  const edges = Array.from(edgeMap.values());

  return { nodes, edges };
}

/**
 * グラフ構造を正規化（可視化用に調整）
 * @param {Object} graph - buildMistakeTopology()の結果
 * @returns {Object} 正規化されたグラフ構造
 */
export function normalizeTopologyGraph(graph) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return graph;
  }

  // ノードの頻度の最大値を取得（サイズ正規化用）
  const maxFrequency = Math.max(...graph.nodes.map(n => n.frequency));
  
  // エッジの重みの最大値を取得（太さ正規化用）
  const maxWeight = graph.edges.length > 0 
    ? Math.max(...graph.edges.map(e => e.weight))
    : 1;

  // ノードを正規化
  const normalizedNodes = graph.nodes.map(node => ({
    ...node,
    normalizedFrequency: maxFrequency > 0 ? node.frequency / maxFrequency : 0,
    size: Math.max(20, Math.min(60, 20 + (node.frequency / maxFrequency) * 40)) // 20-60pxの範囲
  }));

  // エッジを正規化
  const normalizedEdges = graph.edges.map(edge => ({
    ...edge,
    normalizedWeight: maxWeight > 0 ? edge.weight / maxWeight : 0,
    width: Math.max(1, Math.min(5, 1 + (edge.weight / maxWeight) * 4)) // 1-5pxの範囲
  }));

  return {
    nodes: normalizedNodes,
    edges: normalizedEdges
  };
}




