// =======================
// タグカラー生成関数
// =======================
function randomTagColor(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

// =======================
// プロジェクトカード生成
// =======================
var allProjects = [];

function renderProjectCards(projects) {
    const list = document.getElementById("project-list");
    if (!list) return;
    
    list.innerHTML = "";

    if (projects.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">プロジェクトが見つかりません。</p>';
        return;
    }

    projects.forEach((p) => {
        const card = document.createElement("div");
        card.className = "project-card";
        
        const projectId = p.filename || p.name || "unknown";
        const isFav = isFavorited(projectId);

        const tagHTML = (p.tags || [])
            .map(t => {
                const color = randomTagColor(t);
                return `<span class="tag-pill" style="background: ${color};">${escapeHtml(t)}</span>`;
            })
            .join("");

        const thumbnailHTML = p.thumbnail 
            ? `<img src="${escapeHtml(p.thumbnail)}" class="thumbnail" alt="サムネイル" />`
            : "";

        card.innerHTML = `
            ${thumbnailHTML}
            <span class="favorite-star ${isFav ? 'favorited' : ''}" data-id="${escapeHtml(projectId)}">${isFav ? '★' : '☆'}</span>
            <h4>${escapeHtml(p.name || p.title || "無題プロジェクト")}</h4>
            <p style="color:#999; font-size:0.9em;">${escapeHtml(p.filename || "")}</p>
            <p style="color:#999; font-size:0.9em;">更新日：${new Date(p.updated_at || Date.now()).toLocaleString('ja-JP')}</p>
            ${p.category ? `<p style="color:#aaa; font-size:0.85em;">カテゴリ: ${escapeHtml(p.category)}</p>` : ''}
            <div class="tag-area">${tagHTML || '<span style="color:#999;">タグなし</span>'}</div>
            <button class="open-btn" data-filename="${escapeHtml(p.filename || "")}">開く</button>
        `;

        // お気に入りボタンのイベント
        const starBtn = card.querySelector(".favorite-star");
        if (starBtn) {
            starBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                toggleFavorite(projectId);
                renderProjectCards(projects);
            });
        }

        // 開くボタンのイベント
        const openBtn = card.querySelector(".open-btn");
        if (openBtn) {
            openBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                const filename = this.dataset.filename;
                if (p.data) {
                    localStorage.setItem("editor_current_project", JSON.stringify(p.data));
                    window.location.href = "../src/editor/editor.html?mode=edit";
                } else {
                    alert("プロジェクトデータが見つかりません。");
                }
            });
        }
        
        // カードクリックでも開く
        card.addEventListener("click", function(e) {
            if (e.target.classList.contains("favorite-star") || e.target.classList.contains("open-btn")) {
                return;
            }
            if (p.data) {
                localStorage.setItem("editor_current_project", JSON.stringify(p.data));
                window.location.href = "../src/editor/editor.html?mode=edit";
            }
        });

        list.appendChild(card);
    });
}

// =======================
// お気に入り機能
// =======================
function toggleFavorite(id) {
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
    if (favs.includes(id)) {
        localStorage.setItem("favorites", JSON.stringify(favs.filter(f => f !== id)));
    } else {
        favs.push(id);
        localStorage.setItem("favorites", JSON.stringify(favs));
    }
    renderProjectCards(allProjects);
}

function isFavorited(id) {
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
    return favs.includes(id);
}

// =======================
// タグ絞り込み
// =======================
function initTagFilter() {
    const filterInput = document.getElementById("filter-tags");
    if (!filterInput) return;

    filterInput.addEventListener("input", function() {
        applyFilters();
    });
}

// =======================
// 検索機能
// =======================
function initSearch() {
    const searchInput = document.getElementById("project-search");
    if (!searchInput) return;

    searchInput.addEventListener("input", function() {
        applyFilters();
    });
}

// =======================
// フィルタ適用
// =======================
function applyFilters() {
    const searchQuery = (document.getElementById("project-search")?.value || "").trim().toLowerCase();
    const tagQuery = (document.getElementById("filter-tags")?.value || "").trim().toLowerCase();
    
    let filtered = allProjects;
    
    // 検索フィルタ
    if (searchQuery) {
        filtered = filtered.filter(p => {
            const name = (p.name || p.title || "").toLowerCase();
            const filename = (p.filename || "").toLowerCase();
            const tags = (p.tags || []).join(" ").toLowerCase();
            return name.includes(searchQuery) || filename.includes(searchQuery) || tags.includes(searchQuery);
        });
    }
    
    // タグフィルタ
    if (tagQuery) {
        filtered = filtered.filter(p => {
            const tags = p.tags || [];
            return tags.some(t => t.toLowerCase().includes(tagQuery));
        });
    }
    
    renderProjectCards(filtered);
}

// =======================
// 初期化
// =======================
function initProjectList() {
    try {
        const projects = JSON.parse(localStorage.getItem("projects") || "[]");
        allProjects = projects;
        renderProjectCards(allProjects);
        initTagFilter();
        initSearch();
    } catch (e) {
        console.error("プロジェクト一覧の読み込みに失敗:", e);
    }
}

// HTMLエスケープ
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// DOMContentLoaded で初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProjectList);
} else {
    initProjectList();
}

