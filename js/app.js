/* app.js - Main entry point and event bindings */

const App = (() => {
  function init() {
    // Load data (triggers default creation if needed)
    Storage.load();

    // Render initial UI
    Views.renderSidebar();
    Views.refresh();
    Calendar.init();

    // Global click to close panels when clicking outside
    document.addEventListener('click', (e) => {
      const detailPanel = document.getElementById('detail-panel');
      const settingsPanel = document.getElementById('settings-panel');
      const modalOverlay = document.getElementById('modal-overlay');

      // Close detail panel
      if (detailPanel && detailPanel.classList.contains('open')) {
        if (!detailPanel.contains(e.target) && !e.target.closest('.reminder-item') && !e.target.closest('#detail-panel')) {
          Views.closeDetail();
        }
      }

      // Close settings panel
      if (settingsPanel && settingsPanel.classList.contains('open')) {
        if (!settingsPanel.contains(e.target) && !e.target.closest('#settings-panel') && !e.target.closest('.header-btn')) {
          Views.hideSettings();
        }
      }

      // Close modal overlay
      if (modalOverlay && modalOverlay.classList.contains('open')) {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove('open');
        }
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Views.closeDetail();
        Views.hideSettings();
        document.getElementById('modal-overlay').classList.remove('open');
      }
      // Cmd+N to add new reminder
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        const input = document.getElementById('quick-add-input');
        if (input) input.focus();
      }
      // Cmd+F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const search = document.getElementById('search-input');
        if (search) search.focus();
      }
    });

    console.log('iOS Reminders Clone initialized');
  }

  /* === List Management Modals === */
  function showAddListModal() {
    const overlay = document.getElementById('modal-overlay');
    const colors = ListManager.LIST_COLORS;

    let colorDots = colors.map((c, i) =>
      `<span class="color-dot${i === 0 ? ' selected' : ''}" style="background:${c}" data-color="${c}" onclick="App.selectColor(this)"></span>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-content">
        <h2>新建列表</h2>
        <div class="form-group">
          <label>名称</label>
          <input type="text" id="new-list-name" placeholder="列表名称" autofocus>
        </div>
        <div class="form-group">
          <label>颜色</label>
          <div class="color-picker">${colorDots}</div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">取消</button>
          <button class="btn-primary" onclick="App.createList()">创建</button>
        </div>
      </div>
    `;
    overlay.classList.add('open');

    setTimeout(() => {
      const nameInput = document.getElementById('new-list-name');
      if (nameInput) nameInput.focus();
    }, 100);
  }

  function showEditListModal(listId) {
    const list = ListManager.getList(listId);
    if (!list) return;

    const overlay = document.getElementById('modal-overlay');
    const colors = ListManager.LIST_COLORS;

    let colorDots = colors.map(c =>
      `<span class="color-dot${c === list.color ? ' selected' : ''}" style="background:${c}" data-color="${c}" onclick="App.selectColor(this)"></span>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-content">
        <h2>编辑列表</h2>
        <div class="form-group">
          <label>名称</label>
          <input type="text" id="edit-list-name" value="${Views.escapeHtml(list.name)}" autofocus>
        </div>
        <div class="form-group">
          <label>颜色</label>
          <div class="color-picker">${colorDots}</div>
        </div>
        <div class="modal-actions">
          <button class="btn-danger" onclick="App.deleteListConfirm('${listId}')">删除列表</button>
          <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">取消</button>
          <button class="btn-primary" onclick="App.updateList('${listId}')">保存</button>
        </div>
      </div>
    `;
    overlay.classList.add('open');
  }

  function selectColor(el) {
    const dots = el.parentElement.querySelectorAll('.color-dot');
    dots.forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
  }

  function getSelectedColor() {
    const dot = document.querySelector('.color-dot.selected');
    return dot ? dot.dataset.color : ListManager.LIST_COLORS[0];
  }

  function createList() {
    const name = document.getElementById('new-list-name')?.value.trim() || '新建列表';
    const color = getSelectedColor();
    ListManager.createList(name, color, 'list');
    document.getElementById('modal-overlay').classList.remove('open');
    Views.renderSidebar();
  }

  function updateList(listId) {
    const name = document.getElementById('edit-list-name')?.value.trim();
    if (!name) return;
    const color = getSelectedColor();
    ListManager.updateList(listId, { name, color });
    document.getElementById('modal-overlay').classList.remove('open');
    Views.renderSidebar();
    Views.refresh();
  }

  function deleteListConfirm(listId) {
    const list = ListManager.getList(listId);
    if (!list) return;
    if (confirm(`确定要永久删除列表 "${list.name}" 吗？`)) {
      ListManager.deleteList(listId);
      document.getElementById('modal-overlay').classList.remove('open');
      Views.renderSidebar();
      Views.switchView('all');
    }
  }

  function showSettings() {
    Views.showSettings();
  }

  return {
    init, showAddListModal, showEditListModal, selectColor, getSelectedColor,
    createList, updateList, deleteListConfirm, showSettings
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
