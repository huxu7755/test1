/* app.js - Main entry point and event bindings */

const App = (() => {
  let contextMenuEl = null;

  function init() {
    Storage.load();
    Views.renderSidebar();
    Views.refresh();
    Calendar.init();

    // Global click to close panels
    document.addEventListener('click', (e) => {
      // Remove context menu
      if (contextMenuEl) {
        contextMenuEl.remove();
        contextMenuEl = null;
      }

      const detailPanel = document.getElementById('detail-panel');
      const settingsPanel = document.getElementById('settings-panel');
      const modalOverlay = document.getElementById('modal-overlay');

      if (detailPanel && detailPanel.classList.contains('open')) {
        if (!detailPanel.contains(e.target) && !e.target.closest('.reminder-item') && !e.target.closest('#detail-panel')) {
          Views.closeDetail();
        }
      }

      if (settingsPanel && settingsPanel.classList.contains('open')) {
        if (!settingsPanel.contains(e.target) && !e.target.closest('#settings-panel') && !e.target.closest('.header-btn')) {
          Views.hideSettings();
        }
      }

      if (modalOverlay && modalOverlay.classList.contains('open')) {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove('open');
          if (modalOverlay.id === 'new-reminder-modal') {
            modalOverlay.id = 'modal-overlay';
          }
        }
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Views.closeDetail();
        Views.hideSettings();
        document.getElementById('modal-overlay').classList.remove('open');
        closeSidebar();
        if (contextMenuEl) { contextMenuEl.remove(); contextMenuEl = null; }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        Views.showNewReminderModal();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const search = document.getElementById('search-input');
        if (search) search.focus();
      }
    });

    // Touch swipe detection for reminder items
    initSwipeToDelete();

    console.log('Reminders App v2.0 initialized');
  }

  /* === Sidebar Toggle === */
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      closeSidebar();
    } else {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
    }
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  /* === Swipe to Delete === */
  function initSwipeToDelete() {
    let startX = 0, currentX = 0, activeItem = null, isDragging = false;

    document.addEventListener('touchstart', (e) => {
      const swipeContent = e.target.closest('.swipe-content');
      if (!swipeContent) {
        resetSwipe();
        return;
      }
      startX = e.touches[0].clientX;
      activeItem = swipeContent;
      isDragging = true;
      activeItem.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging || !activeItem) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      if (diff > 0) return; // Only allow left swipe
      const clampedDiff = Math.max(diff, -120);
      activeItem.style.transform = `translateX(${clampedDiff}px)`;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!isDragging || !activeItem) return;
      activeItem.style.transition = 'transform 0.2s ease';
      const diff = currentX - startX;
      if (diff < -80) {
        // Show delete and confirm
        activeItem.style.transform = 'translateX(-100px)';
        showSwipeDeleteConfirm(activeItem);
      } else {
        activeItem.style.transform = 'translateX(0)';
      }
      isDragging = false;
      activeItem = null;
    });

    function resetSwipe() {
      if (activeItem) {
        activeItem.style.transition = 'transform 0.2s ease';
        activeItem.style.transform = 'translateX(0)';
      }
      activeItem = null;
      isDragging = false;
    }

    function showSwipeDeleteConfirm(swipeContent) {
      const parent = swipeContent.parentElement;
      const id = parent.dataset.id;
      if (!id) return;

      // Create delete button
      let btn = parent.querySelector('.swipe-delete-btn');
      if (!btn) {
        btn = document.createElement('button');
        btn.className = 'swipe-delete-btn';
        btn.textContent = '删除';
        btn.onclick = function(e) {
          e.stopPropagation();
          Views.deleteReminderById(id);
        };
        parent.appendChild(btn);
        parent.classList.add('swipe-container');
      }

      // Auto-hide after 3 seconds
      setTimeout(() => {
        if (swipeContent) {
          swipeContent.style.transition = 'transform 0.2s ease';
          swipeContent.style.transform = 'translateX(0)';
          const b = parent.querySelector('.swipe-delete-btn');
          if (b) b.remove();
          parent.classList.remove('swipe-container');
        }
      }, 3000);
    }
  }

  /* === List Management Modals === */
  function showAddListModal() {
    const overlay = document.getElementById('modal-overlay');
    const colors = ListManager.LIST_COLORS;
    const icons = ListManager.LIST_ICONS;

    let colorDots = colors.map((c, i) =>
      `<span class="color-dot${i === 0 ? ' selected' : ''}" style="background:${c}" data-color="${c}" onclick="App.selectColor(this)"></span>`
    ).join('');

    let iconGrid = '<div class="icon-grid">';
    icons.forEach((icon, i) => {
      iconGrid += `<div class="icon-cell${i === 0 ? ' selected' : ''}" data-icon="${icon.id}" onclick="App.selectIcon(this)" title="${icon.name}">${icon.char}</div>`;
    });
    iconGrid += '</div>';

    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h2>新建列表</h2>
        <div class="form-group">
          <label>名称</label>
          <input type="text" id="new-list-name" placeholder="列表名称" autofocus>
        </div>
        <div class="form-group">
          <label>图标</label>
          ${iconGrid}
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
  }

  function showEditListModal(listId) {
    const list = ListManager.getList(listId);
    if (!list) return;

    const overlay = document.getElementById('modal-overlay');
    const colors = ListManager.LIST_COLORS;
    const icons = ListManager.LIST_ICONS;

    let colorDots = colors.map(c =>
      `<span class="color-dot${c === list.color ? ' selected' : ''}" style="background:${c}" data-color="${c}" onclick="App.selectColor(this)"></span>`
    ).join('');

    let iconGrid = '<div class="icon-grid">';
    icons.forEach(icon => {
      iconGrid += `<div class="icon-cell${icon.id === list.icon ? ' selected' : ''}" data-icon="${icon.id}" onclick="App.selectIcon(this)" title="${icon.name}">${icon.char}</div>`;
    });
    iconGrid += '</div>';

    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h2>编辑列表</h2>
        <div class="form-group">
          <label>名称</label>
          <input type="text" id="edit-list-name" value="${Views.escapeHtml(list.name)}" autofocus>
        </div>
        <div class="form-group">
          <label>图标</label>
          ${iconGrid}
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

  function selectIcon(el) {
    const cells = el.parentElement.querySelectorAll('.icon-cell');
    cells.forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  function getSelectedColor() {
    const dot = document.querySelector('#modal-overlay .color-dot.selected');
    return dot ? dot.dataset.color : ListManager.LIST_COLORS[0];
  }

  function getSelectedIcon() {
    const cell = document.querySelector('#modal-overlay .icon-cell.selected');
    return cell ? cell.dataset.icon : 'list';
  }

  function createList() {
    const name = document.getElementById('new-list-name')?.value.trim() || '新建列表';
    const color = getSelectedColor();
    const icon = getSelectedIcon();
    ListManager.createList(name, color, icon);
    document.getElementById('modal-overlay').classList.remove('open');
    Views.renderSidebar();
  }

  function updateList(listId) {
    const name = document.getElementById('edit-list-name')?.value.trim();
    if (!name) return;
    const color = getSelectedColor();
    const icon = getSelectedIcon();
    ListManager.updateList(listId, { name, color, icon });
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

  /* === Long-Press Context Menu for Lists === */
  function showListContextMenu(event, listId) {
    event.preventDefault();
    event.stopPropagation();

    // Remove existing menu
    if (contextMenuEl) { contextMenuEl.remove(); contextMenuEl = null; }

    const list = ListManager.getList(listId);
    if (!list) return;

    const lists = ListManager.getLists();
    const idx = lists.findIndex(l => l.id === listId);

    contextMenuEl = document.createElement('div');
    contextMenuEl.className = 'context-menu';
    contextMenuEl.style.left = Math.min(event.clientX, window.innerWidth - 170) + 'px';
    contextMenuEl.style.top = Math.min(event.clientY, window.innerHeight - 200) + 'px';

    let html = '';
    html += `<div class="context-menu-item" onclick="App.showEditListModal('${listId}')">&#x270F;&#xFE0F; 编辑列表</div>`;
    if (idx > 0) {
      html += `<div class="context-menu-item" onclick="App.moveListUp('${listId}')">&#x2B06;&#xFE0F; 上移</div>`;
    }
    if (idx < lists.length - 1) {
      html += `<div class="context-menu-item" onclick="App.moveListDown('${listId}')">&#x2B07;&#xFE0F; 下移</div>`;
    }
    html += `<div class="context-menu-item danger" onclick="App.deleteListConfirm('${listId}')">&#x1F5D1;&#xFE0F; 删除列表</div>`;

    contextMenuEl.innerHTML = html;
    document.body.appendChild(contextMenuEl);
  }

  function moveListUp(listId) {
    const lists = ListManager.getLists();
    const idx = lists.findIndex(l => l.id === listId);
    if (idx <= 0) return;
    const orderedIds = lists.map(l => l.id);
    [orderedIds[idx - 1], orderedIds[idx]] = [orderedIds[idx], orderedIds[idx - 1]];
    ListManager.reorderLists(orderedIds);
    if (contextMenuEl) { contextMenuEl.remove(); contextMenuEl = null; }
    Views.renderSidebar();
    Views.refresh();
  }

  function moveListDown(listId) {
    const lists = ListManager.getLists();
    const idx = lists.findIndex(l => l.id === listId);
    if (idx >= lists.length - 1) return;
    const orderedIds = lists.map(l => l.id);
    [orderedIds[idx], orderedIds[idx + 1]] = [orderedIds[idx + 1], orderedIds[idx]];
    ListManager.reorderLists(orderedIds);
    if (contextMenuEl) { contextMenuEl.remove(); contextMenuEl = null; }
    Views.renderSidebar();
    Views.refresh();
  }

  function showSettings() {
    Views.showSettings();
  }

  return {
    init, toggleSidebar, closeSidebar,
    showAddListModal, showEditListModal, selectColor, selectIcon,
    getSelectedColor, getSelectedIcon,
    createList, updateList, deleteListConfirm,
    showListContextMenu, moveListUp, moveListDown,
    showSettings
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
