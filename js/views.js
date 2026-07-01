/* views.js - UI rendering and view management */

const Views = (() => {
  let currentView = 'today'; /* today, scheduled, all, flagged, completed, list, recently-deleted */
  let currentListId = null;
  let currentFilters = { search: '', priority: '', flagged: false, tag: '' };
  let currentDetailId = null;
  let dateFilter = null;
  let tagsExpanded = false;

  /* === View Constants === */
  const VIEWS = [
    { id: 'today', label: '今天', iconClass: 'today', iconText: new Date().getDate().toString() },
    { id: 'scheduled', label: '计划', iconClass: 'scheduled', iconText: '\u{1F4C5}' },
    { id: 'all', label: '全部', iconClass: 'all', iconText: '\u{1F4CB}' },
    { id: 'flagged', label: '旗标', iconClass: 'flagged', iconText: '\u{1F6A9}' },
    { id: 'completed', label: '已完成', iconClass: 'completed', iconText: '\u2713' }
  ];

  const PRIORITY_LABELS = { 0: '无', 1: '低', 2: '中', 3: '高' };
  const PRIORITY_CLASSES = { 1: 'low', 2: 'medium', 3: 'high' };

  /* === Sidebar Rendering === */
  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const lists = ListManager.getLists();
    const counts = ReminderManager.getViewCounts();

    let html = '<div class="sidebar-header">提醒事项</div>';
    html += '<ul class="view-list">';

    VIEWS.forEach(v => {
      const active = (currentView === v.id && !currentListId) ? ' active' : '';
      const count = counts[v.id] || 0;
      let iconHtml = '';
      if (v.id === 'today') {
        iconHtml = `<span class="view-icon today">${v.iconText}</span>`;
      } else {
        iconHtml = `<span class="view-icon ${v.iconClass}">${v.iconText}</span>`;
      }
      html += `<li class="${active}" data-view="${v.id}" onclick="Views.switchView('${v.id}')">${iconHtml}${v.label}<span style="margin-left:auto;font-size:13px;color:var(--text-secondary)">${count || ''}</span></li>`;
    });

    html += '</ul>';
    html += '<div class="sidebar-header">我的列表</div>';
    html += '<div class="list-section">';

    lists.forEach(list => {
      const active = (currentView === 'list' && currentListId === list.id) ? ' active' : '';
      const reminderCount = ReminderManager.getReminders(list.id).length;
      html += `<div class="list-item${active}" data-list="${list.id}" 
        onclick="Views.switchToList('${list.id}')"
        oncontextmenu="event.preventDefault();App.showListContextMenu(event, '${list.id}')">
        <span class="list-icon" style="background:${list.color}">${getIconChar(list.icon)}</span>
        <span>${escapeHtml(list.name)}</span>
        <span class="list-count">${reminderCount}</span>
      </div>`;
    });

    html += '</div>';
    html += `<div class="add-list-btn" onclick="App.showAddListModal()">
      <span style="font-size:18px;margin-right:10px;color:var(--blue)">+</span> 新建列表
    </div>`;

    // Recently deleted link at bottom
    const trashCount = ReminderManager.getRecentlyDeleted().length;
    if (trashCount > 0) {
      html += `<div style="padding:8px 16px;margin-top:8px;border-top:1px solid var(--separator)">
        <div style="font-size:13px;color:var(--text-secondary);cursor:pointer" onclick="Views.switchView('recently-deleted')">
          最近删除 (${trashCount})
        </div>
      </div>`;
    }

    sidebar.innerHTML = html;
  }

  /* === Main Content Rendering === */
  function refresh() {
    renderHeader();
    renderToolbar();
    renderTagChips();
    renderQuickCards();
    renderReminderList();
  }

  function renderHeader() {
    const titleEl = document.getElementById('header-title');
    const actionsEl = document.getElementById('header-actions');
    if (!titleEl || !actionsEl) return;

    let title = '提醒事项';
    if (currentView === 'today') title = '今天';
    else if (currentView === 'scheduled') title = '计划';
    else if (currentView === 'all') title = '全部';
    else if (currentView === 'flagged') title = '旗标';
    else if (currentView === 'completed') title = '已完成';
    else if (currentView === 'list' && currentListId) {
      const list = ListManager.getList(currentListId);
      title = list ? list.name : '列表';
    } else if (currentView === 'recently-deleted') title = '最近删除';

    titleEl.textContent = title;

    actionsEl.innerHTML = `
      <button class="header-btn" onclick="Calendar.toggle()" title="日历">&#x1F4C5;</button>
      <button class="header-btn" onclick="App.showSettings()" title="设置">&#x2699;</button>
    `;
  }

  function renderToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    toolbar.innerHTML = `
      <input type="search" id="search-input" placeholder="搜索" value="${escapeHtml(currentFilters.search)}" oninput="Views.onSearch(this.value)">
      <select id="priority-filter" onchange="Views.onPriorityFilter(this.value)">
        <option value="">全部优先级</option>
        <option value="3" ${currentFilters.priority === '3' ? 'selected' : ''}>高</option>
        <option value="2" ${currentFilters.priority === '2' ? 'selected' : ''}>中</option>
        <option value="1" ${currentFilters.priority === '1' ? 'selected' : ''}>低</option>
      </select>
      <button class="toolbar-btn" onclick="Views.onToggleFlagged()" title="筛选旗标" style="color:${currentFilters.flagged ? 'var(--orange)' : 'var(--gray)'}">&#x1F6A9;</button>
    `;
  }

  function renderTagChips() {
    const chipsBar = document.getElementById('tag-chips-bar');
    if (!chipsBar) return;
    if (currentView === 'recently-deleted' || currentView === 'completed') {
      chipsBar.style.display = 'none';
      return;
    }

    const tags = ReminderManager.getAllTags();
    if (tags.length === 0) { chipsBar.style.display = 'none'; return; }

    chipsBar.style.display = 'flex';
    const maxVisible = tagsExpanded ? tags.length : 3;
    const visibleTags = tags.slice(0, maxVisible);
    const hiddenCount = tags.length - maxVisible;

    let html = visibleTags.map(t => {
      const active = currentFilters.tag === t ? ' active' : '';
      return `<button class="tag-chip-btn${active}" onclick="Views.onTagChipClick('${escapeHtml(t)}')">${escapeHtml(t)}</button>`;
    }).join('');

    if (hiddenCount > 0) {
      html += `<button class="tag-more-btn" onclick="Views.toggleTagsExpand()">+${hiddenCount} 更多</button>`;
    }
    if (tagsExpanded && tags.length > 3) {
      html += `<button class="tag-more-btn" onclick="Views.toggleTagsExpand()">收起</button>`;
    }

    chipsBar.innerHTML = html;
  }

  function toggleTagsExpand() {
    tagsExpanded = !tagsExpanded;
    renderTagChips();
  }

  function onTagChipClick(tag) {
    if (currentFilters.tag === tag) {
      currentFilters.tag = '';
    } else {
      currentFilters.tag = tag;
    }
    renderTagChips();
    renderReminderList();
  }

  /* === Quick Cards === */
  function renderQuickCards() {
    const container = document.getElementById('quick-cards');
    if (!container) return;

    const calSection = document.getElementById('calendar-section');
    const calVisible = calSection && calSection.classList.contains('visible');

    // Hide quick cards when calendar is visible or in special views
    if (calVisible || currentView === 'recently-deleted' || currentView === 'completed') {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';

    const counts = ReminderManager.getViewCounts();

    const cards = [
      { id: 'today', label: '今天', iconClass: 'today', iconText: new Date().getDate().toString(), count: counts.today },
      { id: 'scheduled', label: '计划', iconClass: 'scheduled', iconText: '\u{1F4C5}', count: counts.scheduled },
      { id: 'all', label: '全部', iconClass: 'all', iconText: '\u{1F4CB}', count: counts.all },
      { id: 'flagged', label: '旗标', iconClass: 'flagged', iconText: '\u{1F6A9}', count: counts.flagged },
      { id: 'completed', label: '已完成', iconClass: 'completed', iconText: '\u2713', count: counts.completed }
    ];

    let html = '<div class="quick-cards-grid">';
    cards.forEach(c => {
      const active = (currentView === c.id && !currentListId) ? ' active' : '';
      html += `<div class="quick-card${active}" onclick="Views.switchView('${c.id}')">
        <div class="card-icon ${c.iconClass}">${c.iconText}</div>
        <div class="card-count">${c.count}</div>
        <div class="card-label">${c.label}</div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  /* === Reminder List === */
  function renderReminderList() {
    const listContainer = document.getElementById('reminder-list');
    if (!listContainer) return;

    // Hide new-reminder-btn in certain views
    const newBtn = document.getElementById('new-reminder-btn');
    if (newBtn) {
      newBtn.style.display = (currentView === 'recently-deleted' || currentView === 'completed') ? 'none' : 'flex';
    }

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
        <div>暂无提醒事项</div>
      </div>`;
      return;
    }

    let html = '';
    if (currentView === 'scheduled') {
      const grouped = {};
      reminders.forEach(r => {
        const d = r.dueDate || '暂未安排';
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

    return `<div class="reminder-item${completed}" data-id="${r.id}">
      <div class="swipe-content" onclick="Views.openDetail('${r.id}')">
        <div class="check-circle" onclick="event.stopPropagation();Views.toggleReminderComplete('${r.id}')">&#x2713;</div>
        <div class="reminder-content">
          <div class="reminder-title">${priorityDots}${escapeHtml(r.title)}</div>
          ${subtitle ? `<div class="reminder-subtitle">${subtitle}</div>` : ''}
          ${tagsHtml}
        </div>
        <div class="reminder-badges">${badges}</div>
      </div>
    </div>`;
  }

  function renderDeletedList(reminders) {
    if (reminders.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">&#x1F5D1;</div><div>暂无最近删除项</div></div>`;
    }
    let html = '<div id="recently-deleted-section">';
    reminders.forEach(r => {
      const daysLeft = Math.max(0, Math.ceil((r.deletedAt + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));
      html += `<div class="deleted-item">
        <span>${escapeHtml(r.title)}</span>
        <span class="days-left">${daysLeft} 天后删除</span>
        <button class="header-btn" onclick="Views.restoreReminder('${r.id}')">恢复</button>
      </div>`;
    });
    html += '</div>';
    return html;
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
        <img class="detail-image-preview" src="${r.image}" alt="附件">
        <div class="detail-image-actions">
          <button onclick="Views.removeImage()">移除图像</button>
        </div>
      </div>`;
    }

    panel.innerHTML = `
      <div class="detail-header">
        <h2>详细信息</h2>
        <button class="detail-close" onclick="Views.closeDetail()">完成</button>
      </div>
      <div class="detail-section">
        <div class="detail-field">
          <input type="text" value="${escapeHtml(r.title)}" id="detail-title" placeholder="标题" onchange="Views.updateDetailField('title', this.value)">
        </div>
        <div class="detail-field">
          <textarea id="detail-notes" placeholder="备注" onchange="Views.updateDetailField('notes', this.value)">${escapeHtml(r.notes)}</textarea>
        </div>
        <div class="detail-field">
          <input type="url" value="${escapeHtml(r.url)}" id="detail-url" placeholder="链接" onchange="Views.updateDetailField('url', this.value)">
        </div>
      </div>
      <div class="detail-section">
        <h3>组织</h3>
        <div class="detail-field">
          <label>列表</label>
          <select id="detail-list" onchange="Views.updateDetailField('listId', this.value)">${listOptions}</select>
        </div>
        <div class="detail-field">
          <label>优先级</label>
          <select id="detail-priority" onchange="Views.updateDetailField('priority', parseInt(this.value))">${priorityOptions}</select>
        </div>
        <div class="detail-field">
          <label>旗标</label>
          <div class="toggle-switch ${r.isFlagged ? 'on' : ''}" id="detail-flag" onclick="Views.toggleDetailFlag()"></div>
        </div>
      </div>
      <div class="detail-section">
        <h3>日期与时间</h3>
        <div class="detail-field">
          <label>日期</label>
          <input type="date" value="${r.dueDate}" id="detail-date" onchange="Views.updateDetailField('dueDate', this.value)">
        </div>
        <div class="detail-field">
          <label>时间</label>
          <input type="time" value="${r.dueTime}" id="detail-time" onchange="Views.updateDetailField('dueTime', this.value)">
        </div>
      </div>
      <div class="detail-section">
        <h3>标签</h3>
        <div class="detail-tags-input" id="detail-tags-container">
          ${r.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}<span class="remove-tag" onclick="Views.removeTag('${escapeHtml(t)}')">&times;</span></span>`).join('')}
          <input type="text" id="detail-tag-input" placeholder="添加标签..." onkeydown="Views.onTagKeydown(event)">
        </div>
      </div>
      <div class="detail-section">
        <h3>位置与人物</h3>
        <div class="detail-toggle">
          <span>位置提醒</span>
          <div class="toggle-switch ${r.hasLocation ? 'on' : ''}" id="detail-location" onclick="Views.toggleDetailLocation()"></div>
        </div>
        ${r.hasLocation ? `<div style="padding:4px 0"><input type="text" value="${escapeHtml(r.locationAddress || '')}" id="detail-location-addr" placeholder="输入地址..." style="width:100%;border:none;outline:none;font-size:15px;background:transparent" onchange="Views.updateDetailField('locationAddress', this.value)"></div>` : ''}
        <div class="detail-toggle">
          <span>发信息时</span>
          <div class="toggle-switch ${r.hasMessaging ? 'on' : ''}" id="detail-messaging" onclick="Views.toggleDetailMessaging()"></div>
        </div>
        ${r.hasMessaging ? `<div style="padding:4px 0;font-size:12px;color:var(--text-secondary)">接收信息时获取提醒</div>` : ''}
      </div>
      <div class="detail-section">
        <h3>图像</h3>
        ${imageSection}
        <button class="header-btn" onclick="Views.addImage()" style="display:block;width:100%;margin-top:8px">
          ${r.image ? '更换图像' : '添加图像'}
        </button>
      </div>
      <button class="detail-delete-btn" onclick="Views.deleteCurrentReminder()">删除提醒</button>
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
    renderReminderList();
    renderSidebar();
  }

  function toggleDetailFlag() {
    if (!currentDetailId) return;
    const r = ReminderManager.toggleFlag(currentDetailId);
    if (r) {
      const el = document.getElementById('detail-flag');
      if (el) el.classList.toggle('on', r.isFlagged);
    }
    renderReminderList();
    renderSidebar();
  }

  function toggleDetailLocation() {
    if (!currentDetailId) return;
    const r = ReminderManager.getReminder(currentDetailId);
    ReminderManager.updateReminder(currentDetailId, { hasLocation: !r.hasLocation });
    openDetail(currentDetailId);
  }

  function toggleDetailMessaging() {
    if (!currentDetailId) return;
    const r = ReminderManager.getReminder(currentDetailId);
    ReminderManager.updateReminder(currentDetailId, { hasMessaging: !r.hasMessaging });
    openDetail(currentDetailId);
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

  /* === New Reminder Modal (Full Form) === */
  function showNewReminderModal(reminderId) {
    // Can be used for both new and edit
    const r = reminderId ? ReminderManager.getReminder(reminderId) : null;
    const overlay = document.getElementById('modal-overlay');
    const lists = ListManager.getLists();
    const defaultListId = currentListId || (lists[0] ? lists[0].id : '');

    let listOptions = lists.map(l =>
      `<option value="${l.id}" ${(r ? r.listId : defaultListId) === l.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`
    ).join('');

    const title = r ? r.title : '';
    const notes = r ? r.notes : '';
    const urlVal = r ? r.url : '';
    const dueDate = r ? r.dueDate : '';
    const dueTime = r ? r.dueTime : '';
    const isFlagged = r ? r.isFlagged : false;
    const priority = r ? r.priority : 0;
    const tags = r ? r.tags : [];
    const hasLocation = r ? r.hasLocation : false;
    const locationAddress = r ? r.locationAddress || '' : '';
    const hasMessaging = r ? r.hasMessaging : false;
    const image = r ? r.image : null;
    nrmImageData = image;

    const priorityOptions = [0, 1, 2, 3].map(p =>
      `<option value="${p}" ${priority === p ? 'selected' : ''}>${PRIORITY_LABELS[p]}</option>`
    ).join('');

    overlay.id = 'new-reminder-modal';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${r ? '编辑提醒' : '新建提醒'}</h2>
          <button class="btn-done" onclick="Views.saveNewReminder('${reminderId || ''}')">完成</button>
        </div>
        <div class="modal-body">
          <!-- Title -->
          <div class="form-row">
            <input type="text" id="nrm-title" placeholder="标题" value="${escapeHtml(title)}" style="flex:1;font-size:16px;font-weight:500">
          </div>

          <!-- Notes -->
          <div class="form-row">
            <textarea id="nrm-notes" placeholder="备注" style="flex:1;min-height:36px">${escapeHtml(notes)}</textarea>
          </div>

          <!-- URL -->
          <div class="form-row">
            <input type="url" id="nrm-url" placeholder="URL 链接" value="${escapeHtml(urlVal)}" style="flex:1">
          </div>

          <!-- Organization -->
          <div class="form-section"><h3>组织</h3></div>
          <div class="form-row">
            <label>标签</label>
            <div class="inline-tags" id="nrm-tags-container">
              ${tags.map(t => `<span class="tag-chip">${escapeHtml(t)}<span class="remove-tag" onclick="Views.removeNrmTag('${escapeHtml(t)}')">&times;</span></span>`).join('')}
              <input type="text" id="nrm-tag-input" placeholder="添加标签..." onkeydown="Views.onNrmTagKeydown(event)">
            </div>
          </div>
          <div class="form-row">
            <label>旗标</label>
            <div class="toggle-switch ${isFlagged ? 'on' : ''}" id="nrm-flag" onclick="this.classList.toggle('on')" style="margin-left:auto"></div>
          </div>
          <div class="form-row">
            <label>优先级</label>
            <select id="nrm-priority">${priorityOptions}</select>
          </div>

          <!-- Date & Time -->
          <div class="form-section"><h3>日期与时间</h3></div>
          <div class="form-row">
            <label>日期</label>
            <input type="date" id="nrm-date" value="${dueDate}">
          </div>
          <div class="form-row">
            <label>时间</label>
            <input type="time" id="nrm-time" value="${dueTime}">
          </div>

          <!-- Location & People -->
          <div class="form-section"><h3>地点与人物</h3></div>
          <div class="form-toggle">
            <div class="toggle-label">&#x1F4CD; 位置提醒</div>
            <div class="toggle-switch ${hasLocation ? 'on' : ''}" id="nrm-location" onclick="Views.toggleNrmLocation()"></div>
          </div>
          <div id="nrm-location-addr-row" class="toggle-subfield" style="display:${hasLocation ? 'block' : 'none'}">
            <input type="text" id="nrm-location-addr" placeholder="输入地址..." value="${escapeHtml(locationAddress)}">
          </div>
          <div class="form-toggle">
            <div class="toggle-label">&#x1F4AC; 发信息时</div>
            <div class="toggle-switch ${hasMessaging ? 'on' : ''}" id="nrm-messaging" onclick="Views.toggleNrmMessaging()"></div>
          </div>
          <div id="nrm-messaging-desc" class="toggle-subfield" style="display:${hasMessaging ? 'block' : 'none'};font-size:12px;color:var(--text-secondary)">
            接收信息时获取提醒
          </div>

          <!-- Image -->
          <div class="form-section"><h3>图像</h3></div>
          <div id="nrm-image-preview">
            ${image ? `<img style="width:100%;max-height:200px;object-fit:cover;border-radius:8px" src="${image}">` : ''}
          </div>
          <button class="header-btn" onclick="Views.pickNrmImage()" style="display:block;width:100%;margin-top:8px;padding:8px">
            ${image ? '更换图像' : '添加图像'}
          </button>
          <input type="file" id="nrm-image-file" accept="image/*" style="display:none" onchange="Views.onNrmImagePicked(event)">

          <!-- List Selector -->
          <div class="form-section"><h3>列表</h3></div>
          <div class="form-row">
            <select id="nrm-list" style="flex:1">${listOptions}</select>
          </div>
        </div>
      </div>
    `;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Click backdrop to close
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        nrmImageData = null;
        overlay.classList.remove('open');
        overlay.id = 'modal-overlay';
        document.body.style.overflow = '';
      }
    };

    setTimeout(() => {
      const titleInput = document.getElementById('nrm-title');
      if (titleInput) titleInput.focus();
    }, 150);
  }

  let nrmImageData = null;

  function pickNrmImage() {
    document.getElementById('nrm-image-file').click();
  }

  function onNrmImagePicked(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      nrmImageData = ev.target.result;
      const preview = document.getElementById('nrm-image-preview');
      if (preview) {
        preview.innerHTML = `<img style="width:100%;max-height:200px;object-fit:cover;border-radius:8px" src="${nrmImageData}">`;
      }
    };
    reader.readAsDataURL(file);
  }

  function toggleNrmLocation() {
    const el = document.getElementById('nrm-location');
    el.classList.toggle('on');
    const row = document.getElementById('nrm-location-addr-row');
    row.style.display = el.classList.contains('on') ? 'block' : 'none';
  }

  function toggleNrmMessaging() {
    const el = document.getElementById('nrm-messaging');
    el.classList.toggle('on');
    const desc = document.getElementById('nrm-messaging-desc');
    desc.style.display = el.classList.contains('on') ? 'block' : 'none';
  }

  function onNrmTagKeydown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const input = event.target;
      const tag = input.value.trim();
      if (!tag) return;
      const container = document.getElementById('nrm-tags-container');
      if (container) {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${escapeHtml(tag)}<span class="remove-tag" onclick="Views.removeNrmTag('${escapeHtml(tag)}')">&times;</span>`;
        container.insertBefore(chip, input);
        input.value = '';
      }
    }
  }

  function removeNrmTag(tag) {
    const container = document.getElementById('nrm-tags-container');
    if (!container) return;
    const chips = container.querySelectorAll('.tag-chip');
    chips.forEach(c => {
      if (c.textContent.replace('×', '').trim() === tag) c.remove();
    });
  }

  function saveNewReminder(reminderId) {
    const title = document.getElementById('nrm-title')?.value.trim();
    if (!title) return;

    const notes = document.getElementById('nrm-notes')?.value || '';
    const urlVal = document.getElementById('nrm-url')?.value || '';
    const dueDate = document.getElementById('nrm-date')?.value || '';
    const dueTime = document.getElementById('nrm-time')?.value || '';
    const isFlagged = document.getElementById('nrm-flag')?.classList.contains('on') || false;
    const priority = parseInt(document.getElementById('nrm-priority')?.value || '0');
    const listId = document.getElementById('nrm-list')?.value || '';
    const hasLocation = document.getElementById('nrm-location')?.classList.contains('on') || false;
    const locationAddress = document.getElementById('nrm-location-addr')?.value || '';
    const hasMessaging = document.getElementById('nrm-messaging')?.classList.contains('on') || false;

    // Collect tags from chips
    const tagContainer = document.getElementById('nrm-tags-container');
    const tags = [];
    if (tagContainer) {
      tagContainer.querySelectorAll('.tag-chip').forEach(c => {
        const t = c.textContent.replace('×', '').trim();
        if (t) tags.push(t);
      });
    }

    const fields = { notes, url: urlVal, dueDate, dueTime, isFlagged, priority, tags, hasLocation, locationAddress, hasMessaging, image: nrmImageData };

    if (reminderId) {
      ReminderManager.updateReminder(reminderId, fields);
    } else {
      if (!listId) return;
      ReminderManager.createReminder(listId, title, fields);
    }

    nrmImageData = null;
    const overlay = document.getElementById('new-reminder-modal');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.id = 'modal-overlay';
      document.body.style.overflow = '';
    }
    refresh();
    renderSidebar();
  }

  /* === View Switching === */
  function switchView(viewId) {
    currentView = viewId;
    currentListId = null;
    currentFilters = { search: '', priority: '', flagged: false, tag: '' };
    dateFilter = null;
    tagsExpanded = false;
    refresh();
    renderSidebar();
    // Close sidebar on mobile
    App.closeSidebar();
  }

  function switchToList(listId) {
    // Toggle: if already viewing this list, go back to all
    if (currentView === 'list' && currentListId === listId) {
      currentView = 'all';
      currentListId = null;
    } else {
      currentView = 'list';
      currentListId = listId;
    }
    currentFilters = { search: '', priority: '', flagged: false, tag: '' };
    dateFilter = null;
    tagsExpanded = false;
    refresh();
    renderSidebar();
    App.closeSidebar();
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

  function restoreReminder(id) {
    ReminderManager.restoreReminder(id);
    refresh();
    renderSidebar();
  }

  function deleteReminderById(id) {
    ReminderManager.deleteReminder(id);
    refresh();
    renderSidebar();
  }

  /* === Settings Panel === */
  function showSettings() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;

    const trashCount = ReminderManager.getRecentlyDeleted().length;
    const autoBackup = Backup.autoBackupEnabled();

    panel.innerHTML = `
      <h2>设置 <button class="detail-close" onclick="Views.hideSettings()">完成</button></h2>
      <div class="settings-section">
        <h3>数据</h3>
        <button class="settings-btn" onclick="Backup.showExportDialog();Views.hideSettings()">导出备份 (JSON)</button>
        <button class="settings-btn" onclick="Backup.showImportDialog();Views.hideSettings()">导入备份</button>
        <button class="settings-btn" onclick="Views.switchView('recently-deleted');Views.hideSettings()">最近删除 (${trashCount})</button>
      </div>

      <div class="settings-section">
        <h3>自动备份</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">自动备份</div>
            <div class="settings-desc">每 24 小时自动备份，保留最近 5 份</div>
          </div>
          <div class="toggle-switch ${autoBackup ? 'on' : ''}" id="auto-backup-toggle" onclick="Views.toggleAutoBackup()"></div>
        </div>
      </div>

      <div class="settings-section">
        <h3>云同步</h3>
        <div class="webdav-section">
          <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">WebDAV 同步配置 (即将推出)</p>
          <input type="text" placeholder="WebDAV 服务器地址" disabled>
          <input type="text" placeholder="用户名" disabled>
          <input type="password" placeholder="密码" disabled>
        </div>
      </div>

      ${currentListId ? `<div class="settings-section">
        <button class="settings-btn danger" onclick="Views.clearCompletedInList()">清除列表中的已完成</button>
        <button class="settings-btn danger" onclick="Views.deleteCurrentList()">删除列表</button>
      </div>` : ''}

      <div class="settings-section">
        <h3>关于</h3>
        <p style="font-size:13px;color:var(--text-secondary)">提醒事项 v2.0<br>支持 PWA · 本地存储<br>数据不会离开您的设备</p>
      </div>
    `;
    panel.classList.add('open');
  }

  function toggleAutoBackup() {
    const el = document.getElementById('auto-backup-toggle');
    if (!el) return;
    const enabled = !el.classList.contains('on');
    el.classList.toggle('on', enabled);
    Backup.setAutoBackup(enabled);
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
    if (confirm(`确定删除列表 "${list.name}" 及其所有提醒事项？`)) {
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
    if (!dateStr || dateStr === 'No Date' || dateStr === '暂未安排') return dateStr || '';
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) return '今天';
      if (date.toDateString() === tomorrow.toDateString()) return '明天';

      const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return `${months[date.getMonth()]}${date.getDate()}日 ${days[date.getDay()]}`;
    } catch (e) { return dateStr; }
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? '下午' : '上午';
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    } catch (e) { return timeStr; }
  }

  function getIconChar(icon) {
    const icons = {
      list: '\u{1F4CB}', briefcase: '\u{1F4BC}', person: '\u{1F464}', home: '\u{1F3E0}',
      heart: '\u2764', star: '\u2B50', book: '\u{1F4D6}', flag: '\u{1F6A9}',
      calendar: '\u{1F4C5}', check: '\u2705', clock: '\u{1F552}', money: '\u{1F4B0}',
      gift: '\u{1F381}', phone: '\u{1F4DE}', mail: '\u{1F4E7}', note: '\u{1F3B5}',
      cart: '\u{1F6D2}', food: '\u{1F354}', coffee: '\u2615', airplane: '\u2708',
      car: '\u{1F697}', bike: '\u{1F6B2}', train: '\u{1F686}', bus: '\u{1F68C}',
      hospital: '\u{1F3E5}', school: '\u{1F3EB}', bank: '\u{1F3E6}', hotel: '\u{1F3E8}',
      sport: '\u26BD', game: '\u{1F3AE}', art: '\u{1F3A8}', camera: '\u{1F4F7}',
      tv: '\u{1F4FA}', laptop: '\u{1F4BB}', key: '\u{1F511}', lock: '\u{1F512}',
      bulb: '\u{1F4A1}', fire: '\u{1F525}', water: '\u{1F4A7}', leaf: '\u{1F33F}',
      sun: '\u2600', moon: '\u{1F319}', cloud: '\u2601', umbrella: '\u2614',
      bell: '\u{1F514}', pin: '\u{1F4CC}', tools: '\u{1F6E0}', pill: '\u{1F48A}'
    };
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
    renderQuickCards, renderTagChips, toggleTagsExpand, onTagChipClick,
    switchView, switchToList,
    openDetail, closeDetail, updateDetailField, toggleDetailFlag,
    toggleDetailLocation, toggleDetailMessaging, onTagKeydown, removeTag,
    addImage, removeImage, deleteCurrentReminder,
    showNewReminderModal, saveNewReminder, pickNrmImage, onNrmImagePicked,
    toggleNrmLocation, toggleNrmMessaging, onNrmTagKeydown, removeNrmTag,
    onSearch, onPriorityFilter, onToggleFlagged,
    toggleReminderComplete, restoreReminder, deleteReminderById,
    showSettings, toggleAutoBackup, hideSettings, clearCompletedInList, deleteCurrentList,
    showDateFilter, formatDate, formatTime, escapeHtml, getIconChar
  };
})();
