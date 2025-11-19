// 互換ローダー: 既存の大規模スクリプトを読み込むまでの暫定措置
(function loadLegacyEditor() {
    var script = document.createElement('script');
    script.src = '../../editor.js'; // 既存ルートの実体を読み込む
    script.defer = true;
    document.head.appendChild(script);
})();
