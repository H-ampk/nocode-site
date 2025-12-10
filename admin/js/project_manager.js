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
    const list = document.getElementById("projectList") || document.getElementById("project-list");
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

        const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('ja-JP') : '不明';
        const questionCount = p.statistics?.total_questions ?? 0;
        
        card.innerHTML = `
            ${thumbnailHTML}
            <span class="favorite-star ${isFav ? 'favorited' : ''}" data-id="${escapeHtml(projectId)}">${isFav ? '★' : '☆'}</span>
            <h4>${escapeHtml(p.name || p.title || "無題プロジェクト")}</h4>
            <p style="color:#999; font-size:0.9em;">${escapeHtml(p.filename || p.id || "")}</p>
            <div class="project-meta" style="color:#999; font-size:0.9em; margin-top:8px;">
                作成: ${createdDate} / 問題数: ${questionCount}
            </div>
            ${p.updated_at ? `<p style="color:#999; font-size:0.9em;">更新日：${new Date(p.updated_at).toLocaleString('ja-JP')}</p>` : ''}
            ${p.category ? `<p style="color:#aaa; font-size:0.85em;">カテゴリ: ${escapeHtml(p.category)}</p>` : ''}
            <div class="tag-area">${tagHTML || '<span style="color:#999;">タグなし</span>'}</div>
            <button class="open-btn" data-filename="${escapeHtml(p.filename || p.id || "")}">開く</button>
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
                const projectId = p.id || p.filename || this.dataset.filename;
                if (projectId) {
                    openEditor(projectId);
                } else if (p.data) {
                    // フォールバック: 既存の方式
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
            const projectId = p.id || p.filename;
            if (projectId) {
                openEditor(projectId);
            } else if (p.data) {
                // フォールバック: 既存の方式
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
// プロジェクトリスト描画（新仕様対応）
// =======================
function renderProjectList(list) {
    const root = document.getElementById("projectList") || document.getElementById("project-list");
    if (!root) {
        // フォールバック: 既存のrenderProjectCardsを使用
        allProjects = list;
        renderProjectCards(list);
        initTagFilter();
        initSearch();
        return;
    }
    
    root.innerHTML = "";

    if (list.length === 0) {
        root.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">プロジェクトが見つかりません。</p>';
        return;
    }

    list.forEach(p => {
        const div = document.createElement("div");
        div.className = "project-card";

        const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('ja-JP') : '不明';
        const questionCount = p.statistics?.total_questions ?? 0;

        div.innerHTML = `
            <div>
                <div class="project-title">${escapeHtml(p.name || p.title || "無題プロジェクト")}</div>
                <div class="project-meta" style="color:#999; font-size:0.9em; margin-top:8px;">
                    作成: ${createdDate} / 問題数: ${questionCount}
                </div>
            </div>
            <button onclick="openEditor('${escapeHtml(p.id)}')" class="btn-primary">開く</button>
        `;

        root.appendChild(div);
    });
    
    // フィルタと検索も初期化
    initTagFilter();
    initSearch();
}

// =======================
// エディタを開く
// =======================
function openEditor(id) {
    window.location.href = `/src/editor/editor.html?project=${id}`;
}

// =======================
// 初期化
// =======================
function initProjectList() {
    // APIからプロジェクト一覧を読み込む
    loadProjects().then(() => {
        initTagFilter();
        initSearch();
    }).catch(e => {
        console.error("プロジェクト一覧の初期化に失敗:", e);
        // フォールバック: localStorageから読み込む
        try {
            const projects = JSON.parse(localStorage.getItem("projects") || "[]");
            allProjects = projects;
            renderProjectCards(projects);
            initTagFilter();
            initSearch();
        } catch (e2) {
            console.error("localStorageからの読み込みにも失敗:", e2);
        }
    });
}

// HTMLエスケープ
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =======================
// プロジェクト一覧読み込み（API）
// =======================
async function loadProjects() {
    try {
        const res = await fetch("/api/project/list");
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const list = await res.json();
        allProjects = list;
        renderProjectCards(list);
    } catch (error) {
        console.error("プロジェクト一覧の読み込みに失敗:", error);
        // フォールバック: localStorageから読み込む
        try {
            const projects = JSON.parse(localStorage.getItem("projects") || "[]");
            allProjects = projects;
            renderProjectCards(projects);
        } catch (e) {
            console.error("localStorageからの読み込みにも失敗:", e);
        }
    }
}

// =======================
// 新規プロジェクト作成（API）
// =======================
async function createNewProject(name) {
    const base = name.trim();
    if (!base) {
        alert("プロジェクト名を入力してください");
        return;
    }

    try {
        const res = await fetch("/api/project/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: base })
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("✅ プロジェクトを作成しました:", data);
        
        // プロジェクト一覧を再読み込み
        await loadProjects();
        
        // editor に遷移
        window.location.href = `/src/editor/editor.html?project=${data.id}`;
    } catch (error) {
        console.error("プロジェクト作成に失敗:", error);
        alert("プロジェクトの作成に失敗しました: " + error.message);
    }
}

// --- モーダル制御 ---
function initNewProjectButton() {
    const modal = document.getElementById("createProjectModal");
    const openBtn = document.getElementById("createProjectBtn");
    const cancelBtn = document.getElementById("cancelProjectBtn");
    const confirmBtn = document.getElementById("confirmProjectBtn");
    const projectNameInput = document.getElementById("projectNameInput");

    if (!modal || !openBtn || !cancelBtn || !confirmBtn || !projectNameInput) {
        console.warn("新規プロジェクト作成モーダルの要素が見つかりません");
        return;
    }

    openBtn.onclick = () => {
        projectNameInput.value = "";
        modal.style.display = "flex";
        // フォーカスを入力欄に移動
        setTimeout(() => projectNameInput.focus(), 100);
    };

    cancelBtn.onclick = () => {
        modal.style.display = "none";
    };

    confirmBtn.onclick = () => {
        const name = projectNameInput.value.trim();
        if (!name) {
            alert("プロジェクト名を入力してください");
            return;
        }

        createNewProject(name);
        modal.style.display = "none";
    };

    // ESCキーでモーダルを閉じる
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
            modal.style.display = "none";
        }
    });

    // モーダル外クリックで閉じる
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

// =======================
// 旧データ削除ボタンのイベントハンドラー
// =======================
function initCleanLegacyButton() {
    const cleanBtn = document.getElementById("cleanLegacyBtn");
    if (!cleanBtn) {
        console.warn("cleanLegacyBtn が見つかりません");
        return;
    }
    
    cleanBtn.onclick = async () => {
        if (!confirm("旧データを削除し、新仕様のファイルだけ自動生成します。\n本当に実行しますか？")) {
            return;
        }
        
        try {
            const res = await fetch("/api/dev/clean-all-legacy", { method: "POST" });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const out = await res.json();
            alert("旧データ削除と整備が完了しました");
            // プロジェクト一覧を再読み込み
            await loadProjects();
        } catch (error) {
            console.error("旧データ削除に失敗:", error);
            alert("旧データの削除に失敗しました: " + error.message);
        }
    };
}

// DOMContentLoaded で初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initProjectList();
        initNewProjectButton();
        initCleanLegacyButton();
    });
} else {
    initProjectList();
    initNewProjectButton();
    initCleanLegacyButton();
}

