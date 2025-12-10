/**
 * 反応時間マップ可視化機能（Cytoscape.js使用）
 */

/**
 * 迷いマップ（RT × 誤答トポロジー）を描画する
 * @param {HTMLElement} container - 描画先のコンテナ要素
 * @param {Object} graph - Concept Graphオブジェクト { nodes: [], edges: [] }
 * @param {Object} rtScores - 概念ごとの反応時間統計 { concept: { meanRT, varianceRT, hesitation } }
 */
export async function drawRTMap(container, graph, rtScores) {
  // Cytoscape.jsを動的にインポート
  const cytoscape = await import("https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.esm.min.js");
  const cy = cytoscape.default || cytoscape;

  const elements = [];

  // ノードを追加
  graph.nodes.forEach(n => {
    const rt = rtScores[n.id]?.hesitation || 0;

    elements.push({
      data: {
        id: n.id,
        label: n.id,
        hesitation: rt,
        meanRT: rtScores[n.id]?.meanRT || 0,
        varianceRT: rtScores[n.id]?.varianceRT || 0
      }
    });
  });

  // エッジを追加
  graph.edges.forEach(e => {
    elements.push({
      data: {
        id: `${e.from}__${e.to}`,
        source: e.from,
        target: e.to
      }
    });
  });

  // 最大hesitation値を計算（色のスケール用）
  const maxHesitation = Math.max(
    ...Object.values(rtScores).map(r => r?.hesitation || 0),
    2000 // デフォルト最大値
  );

  // Cytoscapeインスタンスを作成
  const cyInstance = cy({
    container: container,
    elements: elements,
    layout: { 
      name: "cose",
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 30,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
    },
    style: [
      {
        selector: "node",
        style: {
          "background-color": function( ele ) {
            const hesitation = ele.data("hesitation") || 0;
            // hesitation値に応じて色を変更（0=青、2000=オレンジ）
            if (hesitation === 0) return "#e8f3ff";
            if (hesitation < 500) return "#cce6ff";
            if (hesitation < 1000) return "#ffcc99";
            if (hesitation < 1500) return "#ffaa66";
            return "#ff9900";
          },
          "label": function( ele ) {
            const label = ele.data("label");
            const hesitation = ele.data("hesitation") || 0;
            const meanRT = ele.data("meanRT") || 0;
            return `${label}\n${Math.round(hesitation)}ms`;
          },
          "font-size": "12px",
          "text-valign": "center",
          "text-halign": "center",
          "color": "#333",
          "border-width": 2,
          "border-color": "#666",
          "width": "80px",
          "height": "80px",
          "shape": "round-rectangle"
        }
      },
      {
        selector: "node[hesitation > 0]",
        style: {
          "border-width": 3,
          "border-color": "#ff6600"
        }
      },
      {
        selector: "edge",
        style: {
          "line-color": "#ccc",
          "width": 1,
          "target-arrow-color": "#ccc",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier"
        }
      }
    ]
  });

  return cyInstance;
}

