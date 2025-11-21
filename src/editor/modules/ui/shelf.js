/**
 * プロジェクト本棚UI
 */

import { setGameData } from '../core/state.js';
import { normalizeGameData, randomTagColor } from '../utils/data.js';

/**
 * プロジェクト本棚を開く
 */
export function openProjectShelf() {
    console.log("⭐ openProjectShelf called");
    const modal = document.getElementById("project-shelf-modal");
    const list = document.getElementById("project-shelf-list");
    
    if (!modal || !list) {
        console.warn("⭐ Project shelf modal not found");
        return;
    }
    
    modal.style.display = "flex";
    list.innerHTML = "";
    
    // localStorage からプロジェクト一覧を取得
    try {
        const saved = JSON.parse(localStorage.getItem("projects") || "[]");
        
        if (saved.length === 0) {
            list.innerHTML = "<p style='text-align:center; color:#718096;'>保存されたプロジェクトがありません。</p>";
            return;
        }
        
        saved.forEach((project, index) => {
            const card = document.createElement("div");
            card.style.cssText = "background:#fff; padding:15px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); cursor:pointer; transition:transform 0.2s;";
            card.onmouseenter = () => card.style.transform = "translateY(-2px)";
            card.onmouseleave = () => card.style.transform = "translateY(0)";
            
            const tagsHtml = (project.tags || []).map(tag => {
                const color = randomTagColor(tag);
                return `<span style="display:inline-block; background:${color}; padding:3px 8px; border-radius:4px; font-size:0.8em; margin:2px;">${tag}</span>`;
            }).join("");
            
            card.innerHTML = `
                <h3 style="margin:0 0 10px; color:#2d3748;">${project.name || project.filename}</h3>
                <p style="color:#718096; font-size:0.9em; margin:5px 0;">${project.updated_at ? new Date(project.updated_at).toLocaleString('ja-JP') : ''}</p>
                <div style="margin-top:10px;">${tagsHtml}</div>
                <button class="btn" style="margin-top:10px; width:100%;">▶ 開く</button>
            `;
            
            const openBtn = card.querySelector("button");
            openBtn.onclick = (e) => {
                e.stopPropagation();
                if (project.data) {
                    const normalized = normalizeGameData(project.data);
                    setGameData(normalized);
                    // UI更新はグローバル関数を使用（後でモジュール化）
                    if (typeof window.updateUI === 'function') {
                        window.updateUI();
                    }
                    closeProjectShelf();
                }
            };
            
            list.appendChild(card);
        });
    } catch (e) {
        console.error("プロジェクト一覧の読み込みに失敗:", e);
        list.innerHTML = "<p style='text-align:center; color:#e53e3e;'>プロジェクト一覧の読み込みに失敗しました。</p>";
    }
}

/**
 * プロジェクト本棚を閉じる
 */
export function closeProjectShelf() {
    console.log("⭐ closeProjectShelf called");
    const modal = document.getElementById("project-shelf-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

// 後方互換性のため window にも公開（段階的に削除予定）
if (typeof window !== 'undefined') {
    window.openProjectShelf = openProjectShelf;
    window.closeProjectShelf = closeProjectShelf;
}

