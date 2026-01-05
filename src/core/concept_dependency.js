/**
 * Concept Dependency - 概念間の依存関係・誤答連鎖分析
 * 
 * 概念間の依存関係をネットワーク構造として生成する
 */

/**
 * ログから概念依存関係グラフを構築
 * @param {Array} logs - ログエントリの配列
 * @returns {Object} グラフ構造（nodes, edges）
 */
export function buildConceptDependencyGraph(logs) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return { nodes: [], edges: [] };
  }

  // ノードマップ（概念ごとの統計）
  const nodeMap = new Map(); // concept -> {id, correct_count, total_count, response_times}

  // エッジマップ（概念ペアの共起）
  const edgeMap = new Map(); // "concept1->concept2" -> {source, target, co_occurrence, error_bonus, weight}

  // 各ログを処理
  logs.forEach(log => {
    const concepts = log.conceptTags || log.concept_tags || [];
    if (!Array.isArray(concepts) || concepts.length === 0) return;

    const isCorrect = log.correct === true || 
                     (log.selected && log.selected.correct === true);
    const responseTime = log.response_time || log.response_time_ms || log.reaction_time || 0;

    // 同じ質問、同じパス内で共起する概念ペアを抽出
    // ここでは同じログエントリ内の概念をペアとして扱う
    concepts.forEach(concept => {
      // ノードを追加/更新
      if (!nodeMap.has(concept)) {
        nodeMap.set(concept, {
          id: concept,
          label: concept,
          correct_count: 0,
          total_count: 0,
          response_times: []
        });
      }

      const node = nodeMap.get(concept);
      node.total_count++;
      if (isCorrect) {
        node.correct_count++;
      }
      if (responseTime > 0) {
        node.response_times.push(responseTime);
      }
    });

    // 概念ペアを生成（同じ質問内で共起）
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const concept1 = concepts[i];
        const concept2 = concepts[j];
        
        // 無向グラフとして扱う（方向性の主張なし）
        // アルファベット順でソートして一意性を保つ
        const [source, target] = concept1 < concept2 
          ? [concept1, concept2] 
          : [concept2, concept1];
        
        const edgeKey = `${source}->${target}`;

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            source: source,
            target: target,
            co_occurrence: 0,
            error_bonus: 0,
            weight: 0
          });
        }

        const edge = edgeMap.get(edgeKey);
        edge.co_occurrence++;
        
        // 誤答時は+2ボーナス
        if (!isCorrect) {
          edge.error_bonus += 2;
        }
        
        // 重み = 共起回数 + 誤答ボーナス
        edge.weight = edge.co_occurrence + edge.error_bonus;
      }
    }
  });

  // ノード配列を生成（統計を計算）
  const nodes = Array.from(nodeMap.values()).map(node => {
    const correct_rate = node.total_count > 0 
      ? node.correct_count / node.total_count 
      : 0;
    const avg_response_time = node.response_times.length > 0
      ? node.response_times.reduce((s, v) => s + v, 0) / node.response_times.length
      : 0;

    return {
      id: node.id,
      label: node.label,
      correct_rate: correct_rate,
      avg_response_time: avg_response_time,
      total_count: node.total_count,
      correct_count: node.correct_count
    };
  });

  // エッジ配列を生成
  const edges = Array.from(edgeMap.values());

  return { nodes, edges };
}

/**
 * グラフ構造をJSON形式で保存用にフォーマット
 * @param {Object} graph - buildConceptDependencyGraph()の結果
 * @returns {Object} JSON形式のグラフ構造
 */
export function formatGraphForJSON(graph) {
  return {
    type: "concept_dependency_graph",
    version: "1.0",
    metadata: {
      generated_at: new Date().toISOString(),
      node_count: graph.nodes.length,
      edge_count: graph.edges.length
    },
    nodes: graph.nodes,
    edges: graph.edges
  };
}

/**
 * グラフ構造を正規化（可視化用に調整）
 * @param {Object} graph - buildConceptDependencyGraph()の結果
 * @returns {Object} 正規化されたグラフ構造
 */
export function normalizeConceptGraph(graph) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return graph;
  }

  // ノードの総出現回数の最大値を取得（サイズ正規化用）
  const maxCount = Math.max(...graph.nodes.map(n => n.total_count || 1));
  
  // エッジの重みの最大値を取得（太さ正規化用）
  const maxWeight = graph.edges.length > 0 
    ? Math.max(...graph.edges.map(e => e.weight || 1))
    : 1;

  // ノードを正規化
  const normalizedNodes = graph.nodes.map(node => ({
    ...node,
    size: Math.max(20, Math.min(60, 20 + ((node.total_count || 1) / maxCount) * 40)) // 20-60pxの範囲
  }));

  // エッジを正規化
  const normalizedEdges = graph.edges.map(edge => ({
    ...edge,
    normalizedWeight: maxWeight > 0 ? (edge.weight || 1) / maxWeight : 0,
    width: Math.max(1, Math.min(5, 1 + ((edge.weight || 1) / maxWeight) * 4)) // 1-5pxの範囲
  }));

  return {
    nodes: normalizedNodes,
    edges: normalizedEdges
  };
}




