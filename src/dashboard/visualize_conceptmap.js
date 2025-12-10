/**
 * Concept Graph可視化機能（Cytoscape.js使用）
 */

/**
 * Concept Graphを描画する
 * @param {HTMLElement} container - 描画先のコンテナ要素
 * @param {Object} graph - Concept Graphオブジェクト { nodes: [], edges: [] }
 * @param {Object} scores - 概念ごとのミス回数 { concept: mistakeCount }
 */
export async function drawConceptGraph(container, graph, scores) {
  // Cytoscape.jsを動的にインポート
  const cytoscape = await import("https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.esm.min.js");
  const cy = cytoscape.default || cytoscape;

  const elements = [];

  // ノードを追加
  graph.nodes.forEach(n => {
    elements.push({
      data: {
        id: n.id,
        label: n.id,
        score: scores[n.id] || 0
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
            const score = ele.data("score") || 0;
            // スコアに応じて色を変更（0=青、10以上=赤）
            if (score === 0) return "#d0e6f7";
            if (score < 3) return "#ffcccc";
            if (score < 6) return "#ff9999";
            return "#ff4d4d";
          },
          "label": "data(label)",
          "font-size": "14px",
          "text-valign": "center",
          "text-halign": "center",
          "color": "#333",
          "border-width": 2,
          "border-color": "#666",
          "width": "60px",
          "height": "60px",
          "shape": "round-rectangle"
        }
      },
      {
        selector: "node[score > 0]",
        style: {
          "border-width": 3,
          "border-color": "#cc0000"
        }
      },
      {
        selector: "edge",
        style: {
          "width": 2,
          "line-color": "#aaa",
          "target-arrow-color": "#aaa",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier"
        }
      }
    ]
  });

  return cyInstance;
}

