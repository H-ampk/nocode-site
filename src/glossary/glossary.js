/**
 * Glossary Editor - フォームベースの用語集編集機能
 */

import { callOllama } from "../core/ai.js";

(function (global) {
  'use strict';

  // 内部状態
  var terms = []; // term オブジェクトの配列
  var currentProjectId = 'default';
  var editingTermId = null; // 編集中の termId（null の場合は新規追加）

  // デフォルトの分野リスト
  var defaultDomains = ['心理学', '認知科学', '教育学', 'AI', '哲学'];

  /**
   * プロジェクトIDを取得する
   */
  function getProjectId() {
    try {
      var stored = localStorage.getItem('projectId');
      return stored || 'default';
    } catch (e) {
      return 'default';
    }
  }

  /**
   * Glossary JSON を読み込む
   * @param {string} projectId - プロジェクトID
   * @returns {Promise<Array>} terms 配列
   */
  function loadGlossary(projectId) {
    var path = '../../projects/' + projectId + '/glossary.json';
    
    return fetch(path, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          // ファイルが存在しない場合は空配列を返す
          return { terms: [] };
        }
        return response.json();
      })
      .then(function (data) {
        var termsArray = [];
        
        // terms 配列を取得（既存の構造に対応）
        if (data.terms && Array.isArray(data.terms)) {
          termsArray = data.terms;
        }
        // terms がオブジェクト形式の場合、配列に変換
        else if (data.terms && typeof data.terms === 'object') {
          termsArray = Object.keys(data.terms).map(function (key) {
            return data.terms[key];
          });
        }
        
        // 既存の構造（name, tags）を新しい構造（word, domains）に変換
        return termsArray.map(function (term) {
          var converted = Object.assign({}, term);
          
          // name → word の変換
          if (converted.name && !converted.word) {
            converted.word = converted.name;
          }
          
          // tags → domains の変換
          if (converted.tags && !converted.domains) {
            converted.domains = converted.tags;
          }
          
          // id がない場合は生成
          if (!converted.id) {
            converted.id = crypto.randomUUID();
          }
          
          // updatedAt がない場合は現在時刻を設定
          if (!converted.updatedAt) {
            converted.updatedAt = new Date().toISOString();
          }
          
          return converted;
        });
      })
      .catch(function (error) {
        console.warn('Glossary load failed:', error);
        return [];
      });
  }

  /**
   * 用語一覧を表示する
   */
  function renderTermList() {
    var listContainer = document.getElementById('termList');
    if (!listContainer) return;

    if (terms.length === 0) {
      listContainer.innerHTML = '<p style="color: #999; padding: 1rem;">用語がまだ追加されていません。</p>';
      return;
    }

    var html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
    
    terms.forEach(function (term) {
      var domainsText = term.domains && term.domains.length > 0 
        ? term.domains.join(', ') 
        : '（分野未設定）';
      
      var updatedAt = term.updatedAt 
        ? new Date(term.updatedAt).toLocaleString('ja-JP')
        : '（日時不明）';

      html += '<div class="term-item" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; background: white;">';
      html += '<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">';
      html += '<h3 style="margin: 0; font-size: 1.2em;">' + escapeHtml(term.word || '（用語名なし）') + '</h3>';
      html += '<div style="display: flex; gap: 0.5rem;">';
      html += '<button class="btn" onclick="GlossaryEditor.editTerm(\'' + escapeHtml(term.id) + '\')">編集</button>';
      html += '<button class="btn btn-danger" onclick="GlossaryEditor.deleteTerm(\'' + escapeHtml(term.id) + '\')">削除</button>';
      html += '</div>';
      html += '</div>';
      html += '<p style="margin: 0.5rem 0; color: #555;">' + escapeHtml(term.definition || '（説明なし）') + '</p>';
      html += '<div style="display: flex; gap: 1rem; font-size: 0.9em; color: #777;">';
      html += '<span>分野: ' + escapeHtml(domainsText) + '</span>';
      html += '<span>更新: ' + escapeHtml(updatedAt) + '</span>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    listContainer.innerHTML = html;
  }

  /**
   * HTMLエスケープ
   */
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * フォームをクリアする
   */
  function clearForm() {
    var wordInput = document.getElementById('termWord');
    var definitionTextarea = document.getElementById('termDefinition');
    var domainCheckboxes = document.querySelectorAll('input[name="domain"]:checked');
    
    if (wordInput) wordInput.value = '';
    if (definitionTextarea) definitionTextarea.value = '';
    domainCheckboxes.forEach(function (cb) { cb.checked = false; });
    
    // カスタム分野の入力もクリア
    var customDomainInput = document.getElementById('customDomain');
    if (customDomainInput) customDomainInput.value = '';
    
    editingTermId = null;
    
    // ボタンテキストを更新
    var addButton = document.getElementById('addTermButton');
    if (addButton) {
      addButton.textContent = '用語を追加';
    }
  }

  /**
   * 選択された分野を取得する
   */
  function getSelectedDomains() {
    var domains = [];
    
    // デフォルト分野のチェックボックス
    var checkedBoxes = document.querySelectorAll('input[name="domain"]:checked');
    checkedBoxes.forEach(function (cb) {
      if (cb.value) {
        domains.push(cb.value);
      }
    });
    
    // カスタム分野
    var customDomainInput = document.getElementById('customDomain');
    if (customDomainInput && customDomainInput.value.trim()) {
      var customDomain = customDomainInput.value.trim();
      if (domains.indexOf(customDomain) === -1) {
        domains.push(customDomain);
      }
    }
    
    return domains;
  }

  /**
   * 用語を追加する
   */
  function addTerm() {
    var wordInput = document.getElementById('termWord');
    var definitionTextarea = document.getElementById('termDefinition');
    
    if (!wordInput || !definitionTextarea) {
      alert('フォーム要素が見つかりません');
      return;
    }

    var word = wordInput.value.trim();
    var definition = definitionTextarea.value.trim();
    var domains = getSelectedDomains();

    if (!word) {
      alert('用語名を入力してください');
      return;
    }

    if (!definition) {
      alert('説明文を入力してください');
      return;
    }

    // 編集中の場合は上書き
    if (editingTermId) {
      var existingIndex = terms.findIndex(function (t) { return t.id === editingTermId; });
      if (existingIndex !== -1) {
        terms[existingIndex].word = word;
        terms[existingIndex].definition = definition;
        terms[existingIndex].domains = domains;
        terms[existingIndex].updatedAt = new Date().toISOString();
      }
    } else {
      // 新規追加
      var newTerm = {
        id: crypto.randomUUID(),
        word: word,
        definition: definition,
        domains: domains,
        updatedAt: new Date().toISOString()
      };
      terms.push(newTerm);
    }

    // フォームをクリアして一覧を更新
    clearForm();
    renderTermList();
  }

  /**
   * 用語を編集する
   * @param {string} termId - 編集する用語のID
   */
  function editTerm(termId) {
    var term = terms.find(function (t) { return t.id === termId; });
    if (!term) {
      alert('用語が見つかりません');
      return;
    }

    editingTermId = termId;

    // フォームに値を設定
    var wordInput = document.getElementById('termWord');
    var definitionTextarea = document.getElementById('termDefinition');
    
    if (wordInput) wordInput.value = term.word || '';
    if (definitionTextarea) definitionTextarea.value = term.definition || '';

    // 分野のチェックボックスを設定
    var domainCheckboxes = document.querySelectorAll('input[name="domain"]');
    domainCheckboxes.forEach(function (cb) {
      cb.checked = term.domains && term.domains.indexOf(cb.value) !== -1;
    });

    // カスタム分野を設定（デフォルト分野にない場合）
    var customDomainInput = document.getElementById('customDomain');
    var domainContainer = document.getElementById('domainCheckboxes');
    if (term.domains && domainContainer) {
      var customDomains = term.domains.filter(function (d) {
        return defaultDomains.indexOf(d) === -1;
      });
      
      // カスタム分野のチェックボックスを追加（存在しない場合）
      customDomains.forEach(function (domain) {
        var existingCheckbox = document.querySelector('input[name="domain"][value="' + escapeHtml(domain) + '"]');
        if (!existingCheckbox) {
          var label = document.createElement('label');
          label.style.display = 'block';
          label.style.margin = '0.3rem 0';
          
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.name = 'domain';
          checkbox.value = domain;
          checkbox.checked = true;
          
          var span = document.createElement('span');
          span.textContent = ' ' + domain;
          
          label.appendChild(checkbox);
          label.appendChild(span);
          domainContainer.appendChild(label);
        }
      });
      
      if (customDomainInput) {
        customDomainInput.value = '';
      }
    } else if (customDomainInput) {
      customDomainInput.value = '';
    }

    // ボタンテキストを更新
    var addButton = document.getElementById('addTermButton');
    if (addButton) {
      addButton.textContent = '用語を更新';
    }

    // フォームまでスクロール
    var formSection = document.getElementById('termForm');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * 用語を削除する
   * @param {string} termId - 削除する用語のID
   */
  function deleteTerm(termId) {
    if (!confirm('この用語を削除しますか？')) {
      return;
    }

    var index = terms.findIndex(function (t) { return t.id === termId; });
    if (index !== -1) {
      terms.splice(index, 1);
      renderTermList();
      
      // 編集中だった場合はフォームをクリア
      if (editingTermId === termId) {
        clearForm();
      }
    }
  }

  /**
   * Glossary JSON を保存する（ダウンロード）
   */
  function saveGlossary() {
    if (terms.length === 0) {
      alert('保存する用語がありません');
      return;
    }

    var glossaryData = {
      terms: terms
    };

    var blob = new Blob([JSON.stringify(glossaryData, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'glossary.json';
    a.click();
    URL.revokeObjectURL(a.href);
    
    alert('glossary.json をダウンロードしました。projects/' + currentProjectId + '/glossary.json を置き換えてください。');
  }

  /**
   * Glossary 自動生成（AI）
   * @param {string} term - 用語名
   * @returns {Promise<Object>} { definition, example, tags }
   */
  async function autoGenerateGlossary(term) {
    const prompt = `
あなたは教育AIです。以下の専門語の簡潔な説明を作ってください。
語: ${term}

出力形式は strict JSON:
{
  "definition": "60字以内の定義",
  "example": "概念を説明する短い例",
  "tags": ["#専門領域"]
}`;

    try {
      const jsonText = await callOllama("phi3:3.8b", prompt);
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Glossary自動生成エラー:', error);
      throw error;
    }
  }

  /**
   * カスタム分野を追加する
   */
  function addCustomDomain() {
    var customDomainInput = document.getElementById('customDomain');
    if (!customDomainInput) return;

    var inputValue = customDomainInput.value.trim();
    if (!inputValue) {
      alert('分野名を入力してください');
      return;
    }

    // カンマ区切りで複数の分野を分割
    var domainsToAdd = inputValue.split(',').map(function (d) {
      return d.trim();
    }).filter(function (d) {
      return d.length > 0;
    });

    if (domainsToAdd.length === 0) {
      return;
    }

    var domainContainer = document.getElementById('domainCheckboxes');
    if (!domainContainer) return;

    domainsToAdd.forEach(function (domain) {
      // 既にチェックボックスとして存在するか確認
      var existingCheckbox = document.querySelector('input[name="domain"][value="' + escapeHtml(domain) + '"]');
      if (existingCheckbox) {
        existingCheckbox.checked = true;
        return;
      }

      // 新しいチェックボックスを追加
      var label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '0.3rem 0';
      
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'domain';
      checkbox.value = domain;
      checkbox.checked = true;
      
      var span = document.createElement('span');
      span.textContent = ' ' + domain;
      
      label.appendChild(checkbox);
      label.appendChild(span);
      domainContainer.appendChild(label);
    });

    customDomainInput.value = '';
  }

  /**
   * 初期化
   */
  function init() {
    currentProjectId = getProjectId();
    
    // プロジェクトID表示を更新
    var projectIdDisplay = document.getElementById('currentProjectId');
    if (projectIdDisplay) {
      projectIdDisplay.textContent = currentProjectId;
    }

    // デフォルト分野のチェックボックスを生成
    var domainContainer = document.getElementById('domainCheckboxes');
    if (domainContainer) {
      defaultDomains.forEach(function (domain) {
        var label = document.createElement('label');
        label.style.display = 'block';
        label.style.margin = '0.3rem 0';
        
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'domain';
        checkbox.value = domain;
        
        var span = document.createElement('span');
        span.textContent = ' ' + domain;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        domainContainer.appendChild(label);
      });
    }

    // 既存の glossary.json を読み込む
    loadGlossary(currentProjectId)
      .then(function (loadedTerms) {
        terms = loadedTerms;
        renderTermList();
      })
      .catch(function (error) {
        console.error('Failed to load glossary:', error);
        terms = [];
        renderTermList();
      });

    // イベントリスナーを設定
    var addButton = document.getElementById('addTermButton');
    if (addButton) {
      addButton.addEventListener('click', addTerm);
    }

    var saveButton = document.getElementById('saveButton');
    if (saveButton) {
      saveButton.addEventListener('click', saveGlossary);
    }

    var addCustomDomainButton = document.getElementById('addCustomDomainButton');
    if (addCustomDomainButton) {
      addCustomDomainButton.addEventListener('click', addCustomDomain);
    }

    // Enter キーでカスタム分野を追加
    var customDomainInput = document.getElementById('customDomain');
    if (customDomainInput) {
      customDomainInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCustomDomain();
        }
      });
    }

    // AI自動生成ボタン
    var autoGenerateButton = document.getElementById('autoGenerateButton');
    if (autoGenerateButton) {
      autoGenerateButton.addEventListener('click', async function () {
        var wordInput = document.getElementById('termWord');
        var definitionTextarea = document.getElementById('termDefinition');
        
        if (!wordInput || !definitionTextarea) {
          alert('フォーム要素が見つかりません');
          return;
        }

        var term = wordInput.value.trim();
        if (!term) {
          alert('用語名を入力してください');
          return;
        }

        // ボタンを無効化してローディング表示
        autoGenerateButton.disabled = true;
        autoGenerateButton.textContent = '生成中...';

        try {
          var result = await autoGenerateGlossary(term);
          
          // 結果をフォームに反映
          if (result.definition) {
            definitionTextarea.value = result.definition;
          }
          
          // タグを分野として設定
          if (result.tags && Array.isArray(result.tags)) {
            // 既存のチェックボックスをクリア
            var domainCheckboxes = document.querySelectorAll('input[name="domain"]');
            domainCheckboxes.forEach(function (cb) {
              cb.checked = false;
            });
            
            // タグを分野として追加
            var domainContainer = document.getElementById('domainCheckboxes');
            if (domainContainer) {
              result.tags.forEach(function (tag) {
                // # を除去
                var domain = tag.replace(/^#/, '').trim();
                if (!domain) return;
                
                // 既存のチェックボックスを探す
                var existingCheckbox = document.querySelector('input[name="domain"][value="' + escapeHtml(domain) + '"]');
                if (existingCheckbox) {
                  existingCheckbox.checked = true;
                } else {
                  // 新しいチェックボックスを追加
                  var label = document.createElement('label');
                  label.style.display = 'block';
                  label.style.margin = '0.3rem 0';
                  
                  var checkbox = document.createElement('input');
                  checkbox.type = 'checkbox';
                  checkbox.name = 'domain';
                  checkbox.value = domain;
                  checkbox.checked = true;
                  
                  var span = document.createElement('span');
                  span.textContent = ' ' + domain;
                  
                  label.appendChild(checkbox);
                  label.appendChild(span);
                  domainContainer.appendChild(label);
                }
              });
            }
          }
          
          alert('自動生成が完了しました！\n\n定義: ' + (result.definition || '（なし）') + '\n例文: ' + (result.example || '（なし）'));
        } catch (error) {
          console.error('自動生成エラー:', error);
          alert('自動生成に失敗しました。\nエラー: ' + (error.message || '不明なエラー'));
        } finally {
          // ボタンを再有効化
          autoGenerateButton.disabled = false;
          autoGenerateButton.textContent = '🤖 AI自動生成';
        }
      });
    }
  }

  // グローバルに公開
  global.GlossaryEditor = {
    init: init,
    loadGlossary: loadGlossary,
    renderTermList: renderTermList,
    addTerm: addTerm,
    editTerm: editTerm,
    deleteTerm: deleteTerm,
    saveGlossary: saveGlossary,
    addCustomDomain: addCustomDomain,
    autoGenerateGlossary: autoGenerateGlossary
  };

})(window);

