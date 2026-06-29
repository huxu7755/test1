/* views.js - UI rendering and view management */

const Views = (() => {
  let currentView = 'today'; /* today, scheduled, all, flagged, completed, list, recently-deleted */
  let currentListId = null;
  let currentFilters = { search: '', priority: '', flagged: false, tag: '' };
  let currentDetailId = null;
  let dateFilter = null;

  /* === View Constants === */
  const VIEWS = [
    { id: 'today', label: 'Today', icon: 'today', iconClass: 'today', iconText: new Date().getDate().toString() },
    { id: 'scheduled', label: 'Scheduled', icon: 'scheduled', iconClass: 'scheduled', iconText: '\u{1F4C5}' },
    { id: 'all', label: 'All', icon: 'all', iconClass: 'all', iconText: '\u{1F4CB}' },
    { id: 'flagged', label: 'Flagged', icon: 'flagged', iconClass: 'flagged', iconText: '\u{1F6A9}' },
    { id: 'completed', label: 'Completed', icon: 'completed', iconClass: 'completed', iconText: '\u{2713}' }
  ];

  const PRIORITY_LABELS = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };
  const PRIORITY_CLASSES = { 1: 'low', 2: 'medium', 3: 'high' };

  /* === Sidebar Rendering === */
  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const lists = ListManager.getLists();
    const settings = Storage.getSettings();

    let html = '<div class="sidebar-header">iCloud</div>';
    html += '<ul class="view-list">';

    VIEWS.forEach(v => {
      const active = (currentView === v.id && !currentListId) ? ' active' : '';
      let iconHtml = '';
      if (v.id === 'today') {
        iconHtml = `<span class="view-icon today">${v.iconText}</span>`;
      } else {
        iconHtml = `<span class="view-icon ${v.iconClass}">${v.iconText}</span>`;
      }
      html += `<li class="${active}" data-view="${v.id}" onclick="Views.switchView('${v.id}')">${iconHtml}${v.label}</li>`;
    });

    html += '</ul>';
    html += '<div class="sidebar-header">My Lists</div>';
    html += '<div class="list-section">';

    lists.forEach(list => {
      const active = (currentView === 'list' && currentListId === list.id) ? ' active' : '';
      const reminderCount = ReminderManager.getReminders(list.id).length;
      html += `<div class="list-item${active}" data-list="${list.id}" onclick="Views.switchToList('${list.id}')">
        <span class="list-icon" style="background:${list.color}">${getIconChar(list.icon)}</span>
        <span>${escapeHtml(list.name)}</span>
        <span class="list-count">${reminderCount}</span>
      </div>`;
    });

    html += '</div>';
    html += `<div class="add-list-btn" onclick="App.showAddListModal()">
      <span style="font-size:18px;margin-right:10px;color:var(--blue)">+</span> Add List
    </div>`;

    sidebar.innerHTML = html;
  }

  /* === Main Content Rendering === */
  function refresh() {
    renderHeader();
    renderToolbar();
    renderReminderList();
    renderQuickAdd();
  }

  function renderHeader() {
    const header = document.getElementById('main-header');
    if (!header) return;

    let title = 'Reminders';
    if (currentView === 'today') title = 'Today';
    else if (currentView === 'scheduled') title = 'Scheduled';
    else if (currentView === 'all') title = 'All';
    else if (currentView === 'flagged') title = 'Flagged';
    else if (currentView === 'completed') title = 'Completed';
    else if (currentView === 'list' && currentListId) {
      const list = ListManager.getList(currentListId);
      title = list ? list.name : 'List';
    } else if (currentView === 'recently-deleted') title = 'Recently Deleted';

    header.innerHTML = `
      <h1>${escapeHtml(title)}</h1>
      <div class="header-actions">
        <button class="header-btn" onclick="Calendar.toggle()" title="Calendar">&#x1F4C5;</button>
        <button class="header-btn" onclick="Backup.showExportDialog()" title="Backup">&#x2B07;</button>
        <button class="header-btn" onclick="Backup.showImportDialog()" title="Restore">&#x2B06;</button>
        <button class="header-btn" onclick="App.showSettings()" title="Settings">&#x2699;</button>
      </div>
    `;
  }

  function renderToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    const tags = ReminderManager.getAllTags();
    let tagOptions = '<option value="">All Tags</option>';
    tags.forEach(t => { tagOptions += `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`; });

    toolbar.innerHTML = `
      <input type="search" id="search-input" placeholder="Search" value="${escapeHtml(currentFilters.search)}" oninput="Views.onSearch(this.value)">
      <select id="priority-filter" onchange="Views.onPriorityFilter(this.value)">
        <option value="">All Priorities</option>
        <option value="3" ${currentFilters.priority === '3' ? 'selected' : ''}>High</option>
        <option value="2" ${currentFilters.priority === '2' ? 'selected' : ''}>Medium</option>
        <option value="1" ${currentFilters.priority === '1' ? 'selected' : ''}>Low</option>
      </select>
      <select id="tag-filter" onchange="Views.onTagFilter(this.value)">
        ${tagOptions}
      </select>
      <button class="toolbar-btn" onclick="Views.onToggleFlagged()" title="Filter Flagged" style="color:${currentFilters.flagged ? 'var(--orange)' : 'var(--gray)'}">&#x1F6A9;</button>
    `;
  }

  function renderReminderList() {
    const listContainer = document.getElementById('reminder-list');
    if (!listContainer) return;

    let reminders;
    if (currentView === 'recently-deleted') {
      reminders = ReminderManager.getRecentlyDeleted();
      listContainer.innerHTML = renderDeletedList(reminders);
      return;
    }

    reminders = getRemindersForView();
    reminders = applyFilters(reminders);

    if (reminders.length === 0) {
      listContainer.innerHTML = `<div class="empty-state">
        <div class="empty-icon">&#x1F4AD;</div>
        <div>No reminders</div>
      </div>`;
      return;
    }

    let html = '';
    if (currentView === 'scheduled') {
      // Group by date
      const grouped = {};
      reminders.forEach(r => {
        const d = r.dueDate || 'No Date';
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(r);
      });
      Object.keys(grouped).sort().forEach(date => {
        html += `<div style="padding:8px 16px;font-size:13px;font-weight:700;color:var(--text-secondary);background:var(--bg)">${formatDate(date)}</div>`;
        grouped[date].forEach(r => { html += renderReminderItem(r); });
      });
    } else {
      reminders.forEach(r => { html += renderReminderItem(r); });
    }

    listContainer.innerHTML = html;
  }

  function renderReminderItem(r) {
    const completed = r.completed ? ' completed' : '';
    const listColor = ListManager.getListColor(r.listId);

    let subtitleParts = [];
    if (r.dueDate) subtitleParts.push(formatDate(r.dueDate) + (r.dueTime ? ' ' + formatTime(r.dueTime) : ''));
    if (r.notes) subtitleParts.push(r.notes.substring(0, 50));
    if (r.url) subtitleParts.push(r.url.substring(0, 30));
    const subtitle = subtitleParts.join(' | ');

    let badges = '';
    if (r.isFlagged) badges += '<span class="badge badge-flag">!</span>';
    if (r.priority >= 2) badges += `<span class="badge badge-priority-${PRIORITY_CLASSES[r.priority] || 'low'}">${PRIORITY_LABELS[r.priority]}</span>`;

    let tagsHtml = '';
    if (r.tags.length > 0) {
      tagsHtml = '<div class="reminder-tags">' + r.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') + '</div>';
    }

    let priorityDots = '';
    if (r.priority > 0) {
      priorityDots = `<span class="priority-dot ${PRIORITY_CLASSES[r.priority]}"></span>`;
    }

    return `<div class="reminder-item${completed}" data-id="${r.id}" onclick="Views.openDetail('${r.id}')">
      <div class="check-circle" onclick="event.stopPropagation();Views.toggleReminderComplete('${r.id}')">&#x2713;</div>
      <div class="reminder-content">
        <div class="reminder-title">${priorityDots}${escapeHtml(r.title)}</div>
        ${subtitle ? `<div class="reminder-subtitle">${subtitle}</div>` : ''}
        ${tagsHtml}
      </div>
      <div class="reminder-badges">${badges}</div>
    </div>`;
  }

  function renderDeletedList(reminders) {
    if (reminders.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">&#x1F5D1;</div><div>No recently deleted items</div></div>`;
    }
    let html = '<div id="recently-deleted-section">';
    reminders.forEach(r => {
      const daysLeft = Math.max(0, Math.ceil((r.deletedAt + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));
      html += `<div class="deleted-item">
        <span>${escapeHtml(r.title)}</span>
        <span class="days-left">${daysLeft}d left</span>
        <button class="header-btn" onclick="event.stopPropagation();Views.restoreReminder('${r.id}')">Restore</button>
      </div>`;
    });
    html += '</div>';
    return html;
  }

  function renderQuickAdd() {
    const qa = document.getElementById('quick-add');
    if (!qa) return;
    if (currentView === 'recently-deleted' || currentView === 'completed') {
      qa.style.display = 'none';
      return;
    }
    qa.style.display = 'flex';
    qa.innerHTML = `
      <span class="quick-add-icon">+</span>
      <input type="text" id="quick-add-input" placeholder="New Reminder" onkeydown="Views.onQuickAdd(event)">
    `;
  }

  /* === Detail Panel === */
  function openDetail(id) {
    const r = ReminderManager.getReminder(id);
    if (!r) return;
    currentDetailId = id;

    const panel = document.getElementById('detail-panel');
    if (!panel) return;

    const lists = ListManager.getLists();
    let listOptions = lists.map(l =>
      `<option value="${l.id}" ${l.id === r.listId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`
    ).join('');

    const priorityOptions = [0, 1, 2, 3].map(p =>
      `<option value="${p}" ${r.priority === p ? 'selected' : ''}>${PRIORITY_LABELS[p]}</option>`
    ).join('');

    let imageSection = '';
    if (r.image) {
      imageSection = `<div class="detail-section">
        <img class="detail-image-preview" src="${r.image}" alt="Attachment">
        <div class="detail-image-actions">
          <button onclick="Views.removeImage()">Remove Image</button>
        </div>
      </div>`;
    }

    panel.innerHTML = `
      <div class="detail-header">
        <h2>Details</h2>
        <button class="detail-close" onclick="Views.closeDetail()">Done</button>
      </div>
      <div class="detail-section">
        <div class="detail-field">
          <input type="text" value="${escapeHtml(r.title)}" id="detail-title" placeholder="Title" onchange="Views.updateDetailField('title', this.value)">
        </div>
        <div class="detail-field">
          <textarea id="detail-notes" placeholder="Notes" onchange="Views.updateDetailField('notes', this.value)">${escapeHtml(r.notes)}</textarea>
        </div>
        <div class="detail-field">
          <input type="url" value="${escapeHtml(r.url)}" id="detail-url" placeholder="URL" onchange="Views.updateDetailField('url', this.value)">
        </div>
      </div>
      <div class="detail-section">
        <h3>Organization</h3>
        <div class="detail-field">
          <label>List</label>
          <select id="detail-list" onchange="Views.updateDetailField('listId', this.value)">${listOptions}</select>
        </div>
        <div class="detail-field">
          <label>Priority</label>
          <select id="detail-priority" onchange="Views.updateDetailField('priority', parseInt(this.value))">${priorityOptions}</select>
        </div>
        <div class="detail-field">
          <label>Flag</label>
          <div class="toggle-switch ${r.isFlagged ? 'on' : ''}" id="detail-flag" onclick="Views.toggleDetailFlag()"></div>
        </div>
      </div>
      <div class="detail-section">
        <h3>Date & Time</h3>
        <div class="detail-field">
          <label>Date</label>
          <input type="date" value="${r.dueDate}" id="detail-date" onchange="Views.updateDetailField('dueDate', this.value)">
        </div>
        <div class="detail-field">
          <label>Time</label>
          <input type="time" value="${r.dueTime}" id="detail-time" onchange="Views.updateDetailField('dueTime', this.value)">
        </div>
      </div>
      <div class="detail-section">
        <h3>Tags</h3>
        <div class="detail-tags-input" id="detail-tags-container">
          ${r.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}<span class="remove-tag" onclick="Views.removeTag('${escapeHtml(t)}')">&times;</span></span>`).join('')}
          <input type="text" id="detail-tag-input" placeholder="Add tag..." onkeydown="Views.onTagKeydown(event)">
        </div>
      </div>
      <div class="detail-section">
        <h3>Location & People</h3>
        <div class="detail-toggle">
          <span>Location Reminder</span>
          <div class="toggle-switch ${r.hasLocation ? 'on' : ''}" id="detail-location" onclick="Views.toggleDetailLocation()"></div>
        </div>
        <div class="detail-toggle">
          <span>When Messaging</span>
          <div class="toggle-switch ${r.hasMessaging ? 'on' : ''}" id="detail-messaging" onclick="Views.toggleDetailMessaging()"></div>
        </div>
      </div>
      <div class="detail-section">
        <h3>Image</h3>
        ${imageSection}
        <button class="header-btn" onclick="Views.addImage()" style="display:block;width:100%;margin-top:8px">
          ${r.image ? 'Change Image' : 'Add Image'}
        </button>
      </div>
      <button class="detail-delete-btn" onclick="Views.deleteCurrentReminder()">Delete Reminder</button>
    `;

    panel.classList.add('open');
  }

  function closeDetail() {
    currentDetailId = null;
    const panel = document.getElementById('detail-panel');
    if (panel) panel.classList.remove('open');
    refresh();
    renderSidebar();
  }

  function updateDetailField(field, value) {
    if (!currentDetailId) return;
    ReminderManager.updateReminder(currentDetailId, { [field]: value });
  }

  function toggleDetailFlag() {
    if (!currentDetailId) return;
    const r = ReminderManager.toggleFlag(currentDetailId);
    if (r) {
      const el = document.getElementById('detail-flag');
      if (el) el.classList.toggle('on', r.isFlagged);
    }
  }

  function toggleDetailLocation() {
    if (!currentDetailId) return;
    const r = ReminderManager.getReminder(currentDetailId);
    ReminderManager.updateReminder(currentDetailId, { hasLocation: !r.hasLocation });
    const el = document.getElementById('detail-location');
    if (el) el.classList.toggle('on', !r.hasLocation);
  }

  function toggleDetailMessaging() {
    if (!currentDetailId) return;
    const r = ReminderManager.getReminder(currentDetailId);
    ReminderManager.updateReminder(currentDetailId, { hasMessaging: !r.hasMessaging });
    const el = document.getElementById('detail-messaging');
    if (el) el.classList.toggle('on', !r.hasMessaging);
  }

  function onTagKeydown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const input = event.target;
      const tag = input.value.trim();
      if (tag && currentDetailId) {
        const r = ReminderManager.getReminder(currentDetailId);
        if (r && !r.tags.includes(tag)) {
          r.tags.push(tag);
          ReminderManager.updateReminder(currentDetailId, { tags: r.tags });
          openDetail(currentDetailId);
        }
      }
    }
  }

  function removeTag(tag) {
    if (!currentDetailId) return;
    const r = ReminderManager.getReminder(currentDetailId);
    if (r) {
      r.tags = r.tags.filter(t => t !== tag);
      ReminderManager.updateReminder(currentDetailId, { tags: r.tags });
      openDetail(currentDetailId);
    }
  }

  function addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (!file || !currentDetailId) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        ReminderManager.updateReminder(currentDetailId, { image: ev.target.result });
        openDetail(currentDetailId);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function removeImage() {
    if (!currentDetailId) return;
    ReminderManager.updateReminder(currentDetailId, { image: null });
    openDetail(currentDetailId);
  }

  function deleteCurrentReminder() {
    if (!currentDetailId) return;
    ReminderManager.deleteReminder(currentDetailId);
    currentDetailId = null;
    document.getElementById('detail-panel').classList.remove('open');
    refresh();
    renderSidebar();
  }

  /* === View Switching === */
  function switchView(viewId) {
    currentView = viewId;
    currentListId = null;
    currentFilters = { search: '', priority: '', flagged: false, tag: '' };
    dateFilter = null;
    refresh();
    renderSidebar();
  }

  function switchToList(listId) {
    currentView = 'list';
    currentListId = listId;
    currentFilters = { search: '', priority: '', flagged: false, tag: '' };
    dateFilter = null;
    refresh();
    renderSidebar();
  }

  /* === Filtering === */
  function getRemindersForView() {
    switch (currentView) {
      case 'today': return ReminderManager.getTodaysReminders();
      case 'scheduled': return ReminderManager.getScheduledReminders();
      case 'all': return ReminderManager.getAllReminders();
      case 'flagged': return ReminderManager.getFlaggedReminders();
      case 'completed': return ReminderManager.getCompletedReminders(currentListId);
      case 'list': return currentListId ? ReminderManager.getReminders(currentListId) : [];
      default: return [];
    }
  }

  function applyFilters(reminders) {
    if (dateFilter) {
      reminders = reminders.filter(r => r.dueDate === dateFilter);
    }
    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      reminders = reminders.filter(r =>
        r.title.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q)
      );
    }
    if (currentFilters.priority !== '' && currentFilters.priority !== undefined) {
      reminders = reminders.filter(r => r.priority === parseInt(currentFilters.priority));
    }
    if (currentFilters.flagged) {
      reminders = reminders.filter(r => r.isFlagged);
    }
    if (currentFilters.tag) {
      reminders = reminders.filter(r => r.tags.includes(currentFilters.tag));
    }
    return reminders;
  }

  function onSearch(value) {
    currentFilters.search = value;
    renderReminderList();
  }

  function onPriorityFilter(value) {
    currentFilters.priority = value;
    renderReminderList();
  }

  function onTagFilter(value) {
    currentFilters.tag = value;
    renderReminderList();
  }

  function onToggleFlagged() {
    currentFilters.flagged = !currentFilters.flagged;
    renderToolbar();
    renderReminderList();
  }

  function showDateFilter(dateStr) {
    dateFilter = dateStr;
    refresh();
  }

  /* === Actions === */
  function toggleReminderComplete(id) {
    ReminderManager.toggleComplete(id);
    refresh();
    renderSidebar();
  }

  function onQuickAdd(event) {
    if (event.key !== 'Enter') return;
    const input = event.target;
    const title = input.value.trim();
    if (!title) return;
    const listId = currentListId || Storage.getSettings().defaultListId || ListManager.getLists()[0]?.id;
    if (!listId) return;
    ReminderManager.createReminder(listId, title);
    input.value = '';
    refresh();
    renderSidebar();
  }

  function restoreReminder(id) {
    ReminderManager.restoreReminder(id);
    refresh();
    renderSidebar();
  }

  /* === Settings Panel === */
  function showSettings() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;

    const trashCount = ReminderManager.getRecentlyDeleted().length;

    panel.innerHTML = `
      <h2>Settings <button class="detail-close" onclick="Views.hideSettings()">Done</button></h2>
      <div class="settings-section">
        <h3>Data</h3>
        <button class="settings-btn" onclick="Backup.showExportDialog();Views.hideSettings()">Export Backup (JSON)</button>
        <button class="settings-btn" onclick="Backup.showImportDialog();Views.hideSettings()">Import Backup</button>
        <button class="settings-btn" onclick="Views.switchView('recently-deleted');Views.hideSettings()">Recently Deleted (${trashCount})</button>
        ${currentListId ? `<button class="settings-btn danger" onclick="Views.clearCompletedInList()">Clear Completed in List</button>` : ''}
        ${currentListId ? `<button class="settings-btn danger" onclick="Views.deleteCurrentList()">Delete List</button>` : ''}
      </div>
      <div class="settings-section">
        <h3>About</h3>
        <p style="font-size:13px;color:var(--text-secondary)">iOS Reminders Clone v1.0<br>PWA-enabled • Local storage<br>No data leaves your device</p>
      </div>
    `;
    panel.classList.add('open');
  }

  function hideSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) panel.classList.remove('open');
  }

  function clearCompletedInList() {
    if (!currentListId) return;
    ReminderManager.clearCompleted(currentListId);
    hideSettings();
    refresh();
    renderSidebar();
  }

  function deleteCurrentList() {
    if (!currentListId) return;
    const list = ListManager.getList(currentListId);
    if (!list) return;
    if (confirm(`Delete list "${list.name}" and all its reminders?`)) {
      ListManager.deleteList(currentListId);
      currentListId = null;
      currentView = 'all';
      hideSettings();
      refresh();
      renderSidebar();
    }
  }

  /* === Helpers === */
  function formatDate(dateStr) {
    if (!dateStr || dateStr === 'No Date') return dateStr || '';
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    } catch (e) { return dateStr; }
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    } catch (e) { return timeStr; }
  }

  function getIconChar(icon) {
    const icons = { list: '\u{1F4CB}', briefcase: '\u{1F4BC}', person: '\u{1F464}', home: '\u{1F3E0}', heart: '\u{2764}', star: '\u{2B50}', book: '\u{1F4D6}', flag: '\u{1F6A9}' };
    return icons[icon] || '\u{1F4CB}';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    renderSidebar, refresh, renderHeader, renderReminderList, renderToolbar,
    switchView, switchToList,
    openDetail, closeDetail, updateDetailField, toggleDetailFlag,
    toggleDetailLocation, toggleDetailMessaging, onTagKeydown, removeTag,
    addImage, removeImage, deleteCurrentReminder,
    onSearch, onPriorityFilter, onTagFilter, onToggleFlagged,
    toggleReminderComplete, onQuickAdd, restoreReminder,
    showSettings, hideSettings, clearCompletedInList, deleteCurrentList,
    showDateFilter, formatDate, formatTime, escapeHtml
  };
})();
