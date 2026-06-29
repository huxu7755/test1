/* app.js — 主应用逻辑 */
'use strict';

var App = (function(){
  var D = {
    reminders: [], lists: [],
    view: 'today', cat: 'all', search: '', tagFilter: '',
    selectedPrio: 'none', selectedColor: '#007aff', selectedIcon: '📋',
    calYear: null, calMonth: null, showCalendar: false, listFilterId: null,
    sortBy: 'manual'
  };

  function load(){
    try {
      var s = ReminderStorage.getItem();
      if(s){
        var p = JSON.parse(s);
        D.reminders = p.reminders || [];
        D.lists = p.lists || [];
      }
    } catch(e){ console.warn('加载数据失败:', e); }
    ListManager.initDefaultLists(D);
    ReminderManager.cleanExpiredDeleted(D);
  }

  function save(){
    try {
      ReminderStorage.setItem(JSON.stringify({reminders: D.reminders, lists: D.lists}));
    } catch(e){ console.warn('保存数据失败:', e); }
  }

  function render(){
    ReminderView.updateHeader();
    ReminderView.renderQuickCards();
    ReminderView.renderSuggestList();
    ReminderView.renderTags();
    ReminderView.renderLists();
    ReminderView.renderReminders();
    ReminderView.renderWidget();
    if(D.showCalendar) renderCalendarView();
    save();
    if(localStorage.getItem('auto_backup_on') === 'true'){
      try {
        var lb = localStorage.getItem('last_backup_time');
        if(!lb || (Date.now() - new Date(lb).getTime() > 24*60*60*1000)){
          BackupManager.autoBackup({ reminders: D.reminders, lists: D.lists });
        }
      } catch(e){}
    }
  }

  function renderCalendarView(){
    var el = document.getElementById('calendarPanel');
    if(el) el.innerHTML = CalendarManager.render(D.reminders);
  }

  function switchView(v){
    D.view = v; D.listFilterId = null; D.tagFilter = '';
    D.showCalendar = false; toggleCalendarOff();
    render();
  }

  function filterByCategory(cat, el){
    D.cat = cat; D.listFilterId = null; D.tagFilter = '';
    resetCatTags(); if(el) el.classList.add('active');
    render();
  }

  function resetCatTags(){
    document.querySelectorAll('.cat-tag').forEach(function(t){ t.classList.remove('active'); });
    var allEl = document.querySelector('[data-cat="all"]');
    if(allEl) allEl.classList.add('active');
  }

  function filterByList(lid){
    D.view = 'all'; D.cat = 'all'; D.listFilterId = lid; D.tagFilter = '';
    D.showCalendar = false; toggleCalendarOff();
    render();
  }

  function filterByTag(tag){
    D.tagFilter = tag; D.listFilterId = null; D.cat = 'all';
    render();
  }

  function onSearch(){
    var input = document.getElementById('searchInput');
    D.search = input ? input.value : '';
    D.listFilterId = null; D.tagFilter = '';
    render();
  }

  function toggleComplete(id){ ReminderManager.toggleComplete(D, id); render(); }

  function toggleCompleteAnimated(id, el){
    if(el){ el.classList.add('check-anim'); setTimeout(function(){ el.classList.remove('check-anim'); },300); }
    ReminderManager.toggleComplete(D, id); render();
  }

  // ── Reminder CRUD ──
  function saveReminder(){
    var titleEl = document.getElementById('rTitle');
    var title = titleEl ? titleEl.value.trim() : '';
    if(!title){ alert('请输入标题'); return; }

    var imageEl = document.getElementById('rImage');
    var imageData = imageEl ? (imageEl.dataset.value || '') : '';
    var imageRemoved = imageEl ? imageEl.dataset.imageRemoved === 'true' : false;

    var listId = '';
    var rListEl = document.getElementById('rList');
    if(rListEl && rListEl.value){
      listId = rListEl.value;
    } else if(D.lists.length > 0){
      listId = D.lists[0].id;
    }

    var formData = {
      title: title,
      dateTime: getElVal('rDateTime'),
      location: (getElChecked('rLocationToggle') ? getElVal('rLocation') : ''),
      tag: getElVal('rTag'),
      notes: getElVal('rNotes'),
      flagged: getElChecked('rFlagged'),
      messageReminder: getElChecked('rMessageReminder'),
      listId: listId,
      editId: getElVal('rEditId'),
      priority: D.selectedPrio,
      image: imageData,
      imageRemoved: imageRemoved
    };
    ReminderManager.saveReminder(D, formData);
    closeModal('reminderModal'); render();
  }

  function getElVal(id){ var el = document.getElementById(id); return el ? el.value : ''; }
  function getElChecked(id){ var el = document.getElementById(id); return el ? el.checked : false; }

  function editReminder(id){
    var r = D.reminders.find(function(r){ return r.id === id; });
    if(!r) return;
    document.getElementById('reminderModalTitle').textContent = '编辑提醒事项';
    setElVal('rTitle', r.title);
    setElVal('rDateTime', (r.date||'')+(r.time?'T'+r.time:''));
    setElChecked('rLocationToggle', !!r.location);
    var locInput = document.getElementById('rLocation');
    if(r.location && locInput){ locInput.classList.remove('hidden'); locInput.value = r.location; }
    else if(locInput){ locInput.classList.add('hidden'); locInput.value = ''; }
    setElChecked('rMessageReminder', r.messageReminder||false);
    setElVal('rTag', r.tag||'');
    setElVal('rNotes', r.notes||'');
    setElChecked('rFlagged', r.flagged||false);
    setElVal('rEditId', r.id);
    // 设置列表选择
    if(r.listId){
      var sel = document.getElementById('rList');
      if(sel) sel.value = r.listId;
    }
    D.selectedPrio = r.priority||'none'; resetPrioBtns();
    var pb = document.querySelector('#prioBtns [data-prio="'+(r.priority||'none')+'"]');
    if(pb) pb.classList.add('selected');
    var imgEl = document.getElementById('rImagePreview');
    var imgInput = document.getElementById('rImage');
    var btnRemove = document.getElementById('btnRemoveImg');
    if(r.image){
      if(imgInput){ imgInput.dataset.value = r.image; imgInput.dataset.imageRemoved = 'false'; }
      if(imgEl){ imgEl.innerHTML = '<img src="'+r.image+'" class="img-preview-thumb">'; imgEl.classList.remove('hidden'); }
      if(btnRemove) btnRemove.classList.remove('hidden');
    } else {
      if(imgInput){ imgInput.dataset.value = ''; imgInput.dataset.imageRemoved = 'false'; }
      if(imgEl){ imgEl.innerHTML = ''; imgEl.classList.add('hidden'); }
      if(btnRemove) btnRemove.classList.add('hidden');
    }
    document.getElementById('reminderModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    document.getElementById('btnDeleteReminder').classList.remove('hidden');
    setTimeout(function(){ var t = document.getElementById('rTitle'); if(t) t.focus(); },300);
  }

  function setElVal(id, val){ var el = document.getElementById(id); if(el) el.value = val; }
  function setElChecked(id, val){ var el = document.getElementById(id); if(el) el.checked = val; }

  function softDeleteReminder(id){ ReminderManager.softDelete(D, id); render(); }
  function restoreReminder(id){ ReminderManager.restore(D, id); render(); }
  function permanentlyDeleteReminder(id){
    if(!confirm('确定永久删除？此操作无法撤销。')) return;
    ReminderManager.permanentlyDelete(D, id); render();
  }

  function showDeleteView(){
    D.view = 'deleted'; D.showCalendar = false; toggleCalendarOff();
    render();
  }

  function sortReminders(mode){ D.sortBy = mode; render(); }

  function showMoreMenu(){
    var el = document.getElementById('moreMenu');
    if(el.classList.contains('hidden')) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
  function hideMoreMenu(){
    var el = document.getElementById('moreMenu');
    if(el) el.classList.add('hidden');
  }

  // ── Calendar ──
  function toggleCalendar(){
    D.showCalendar = !D.showCalendar;
    var btn = document.getElementById('calToggleBtn');
    if(btn) btn.textContent = D.showCalendar ? '列表' : '日历';
    var toggleEls = ['quickCards','searchWrap','tagFilters','suggestList','widgetCard','listsSection','recentDelete','completedEntry','reminderList','emptyState'];
    var calPanel = document.getElementById('calendarPanel');
    if(D.showCalendar){
      toggleEls.forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.add('hidden'); });
      if(calPanel) calPanel.classList.remove('hidden');
      CalendarManager.reset(); renderCalendarView();
    } else {
      toggleEls.forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.remove('hidden'); });
      if(calPanel) calPanel.classList.add('hidden');
      render();
    }
  }

  function toggleCalendarOff(){
    D.showCalendar = false;
    var btn = document.getElementById('calToggleBtn');
    if(btn) btn.textContent = '日历';
    var calPanel = document.getElementById('calendarPanel');
    if(calPanel) calPanel.classList.add('hidden');
    var restoreEls = ['quickCards','searchWrap','tagFilters','suggestList','widgetCard','listsSection','completedEntry','recentDelete','reminderList','emptyState'];
    restoreEls.forEach(function(id){
      var e = document.getElementById(id);
      if(e) e.classList.remove('hidden');
    });
  }

  function calNav(dir){ CalendarManager.navigate(dir); renderCalendarView(); }

  function calDayClick(ds, el){
    document.querySelectorAll('.cal-day.selected').forEach(function(e){ e.classList.remove('selected'); });
    if(el) el.classList.add('selected');
    var dd = document.getElementById('calDateDetail');
    var h = CalendarManager.renderDayDetail(ds, D.reminders, ReminderView.renderItem);
    var old = dd.querySelector('.cal-selected-panel');
    if(old) old.remove();
    dd.insertAdjacentHTML('beforeend', h);
  }

  // ── Modals ──
  function showNewReminderModal(){
    document.getElementById('reminderModalTitle').textContent = '新建提醒事项';
    setElVal('rTitle', '');
    setElVal('rDateTime', '');
    setElChecked('rLocationToggle', false);
    var locEl = document.getElementById('rLocation');
    if(locEl){ locEl.classList.add('hidden'); locEl.value = ''; }
    setElChecked('rMessageReminder', false);
    setElVal('rTag', '');
    setElVal('rNotes', '');
    setElChecked('rFlagged', false);
    setElVal('rEditId', '');
    document.getElementById('btnDeleteReminder').classList.add('hidden');
    var imgPreview = document.getElementById('rImagePreview');
    if(imgPreview){ imgPreview.innerHTML = ''; imgPreview.classList.add('hidden'); }
    var imgInput = document.getElementById('rImage');
    if(imgInput){ imgInput.dataset.value = ''; imgInput.dataset.imageRemoved = 'false'; }
    var btnRemove = document.getElementById('btnRemoveImg');
    if(btnRemove) btnRemove.classList.add('hidden');
    var fileInput = document.getElementById('rImageFile');
    if(fileInput) fileInput.value = '';
    D.selectedPrio = 'none'; resetPrioBtns();
    var noneBtn = document.querySelector('#prioBtns [data-prio="none"]');
    if(noneBtn) noneBtn.classList.add('selected');
    document.getElementById('reminderModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    setTimeout(function(){ var t = document.getElementById('rTitle'); if(t) t.focus(); },300);
  }

  function showNewListModal(){
    document.getElementById('listModalTitle').textContent = '新建列表';
    setElVal('lName', '');
    var typeEl = document.getElementById('lType');
    if(typeEl) typeEl.value = '标准';
    setElVal('lEditId', '');
    D.selectedColor = '#007aff'; D.selectedIcon = '📋';
    resetColorDots();
    var dot = document.querySelector('#colorRow [data-color="#007aff"]');
    if(dot) dot.classList.add('selected');
    ReminderView.renderIconGrid('📋');
    document.getElementById('listModal').classList.remove('hidden');
  }

  function editList(id){
    var l = D.lists.find(function(l){ return l.id === id; });
    if(!l) return;
    document.getElementById('listModalTitle').textContent = '编辑列表';
    setElVal('lName', l.name);
    var typeEl = document.getElementById('lType');
    if(typeEl) typeEl.value = l.type;
    setElVal('lEditId', id);
    D.selectedColor = l.color; D.selectedIcon = l.icon;
    resetColorDots();
    var dot = document.querySelector('#colorRow [data-color="'+l.color+'"]');
    if(dot) dot.classList.add('selected');
    ReminderView.renderIconGrid(l.icon);
    document.getElementById('listModal').classList.remove('hidden');
  }

  function deleteListConfirm(id){
    if(!confirm('确定删除此列表？列表中的提醒事项不会删除。')) return;
    ListManager.deleteList(D, id); render();
  }

  function selectIcon(icon, el){
    D.selectedIcon = icon;
    document.querySelectorAll('.icon-grid-item').forEach(function(i){ i.classList.remove('selected'); });
    if(el) el.classList.add('selected');
  }

  function quickCreateList(name, type, icon, color){
    ListManager.saveList(D, name, type, icon, color);
    render();
  }

  function closeModal(id){
    var el = document.getElementById(id);
    if(el) el.classList.add('hidden');
    var fab = document.getElementById('fab');
    if(fab) fab.classList.remove('hidden');
    hideMoreMenu();
    if(id==='reminderModal'){
      var btnDel = document.getElementById('btnDeleteReminder');
      if(btnDel) btnDel.classList.add('hidden');
    }
  }

  function closeModalOutside(e, id){
    if(e.target === document.getElementById(id)) closeModal(id);
  }

  function selPrio(el){ resetPrioBtns(); el.classList.add('selected'); D.selectedPrio = el.dataset.prio; }
  function resetPrioBtns(){ document.querySelectorAll('#prioBtns .prio-btn').forEach(function(b){ b.classList.remove('selected'); }); }
  function selColor(el){ resetColorDots(); el.classList.add('selected'); D.selectedColor = el.dataset.color; }
  function resetColorDots(){ document.querySelectorAll('#colorRow .color-dot').forEach(function(d){ d.classList.remove('selected'); }); }

  function saveList(){
    var nameEl = document.getElementById('lName');
    var name = nameEl ? nameEl.value.trim() : '';
    if(!name){ alert('请输入列表名称'); return; }
    var typeEl = document.getElementById('lType');
    var type = typeEl ? typeEl.value : '标准';
    var editId = getElVal('lEditId');
    ListManager.saveList(D, name, type, D.selectedIcon, D.selectedColor, editId);
    closeModal('listModal'); render();
  }

  function handleImageInput(input){
    var file = input.files[0];
    if(!file) return;
    if(file.size > 5*1024*1024){ alert('图片不能超过5MB'); return; }
    var reader = new FileReader();
    reader.onload = function(e){
      var imgInput = document.getElementById('rImage');
      if(imgInput){ imgInput.dataset.value = e.target.result; imgInput.dataset.imageRemoved = 'false'; }
      var preview = document.getElementById('rImagePreview');
      if(preview){ preview.innerHTML = '<img src="'+e.target.result+'" class="img-preview-thumb">'; preview.classList.remove('hidden'); }
      var btnRemove = document.getElementById('btnRemoveImg');
      if(btnRemove) btnRemove.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function removeImage(){
    var imgInput = document.getElementById('rImage');
    if(imgInput){ imgInput.dataset.value = ''; imgInput.dataset.imageRemoved = 'true'; }
    var preview = document.getElementById('rImagePreview');
    if(preview){ preview.innerHTML = ''; preview.classList.add('hidden'); }
    var fileInput = document.getElementById('rImageFile');
    if(fileInput) fileInput.value = '';
    var btnRemove = document.getElementById('btnRemoveImg');
    if(btnRemove) btnRemove.classList.add('hidden');
  }

  function focusField(fieldId){
    var el = document.getElementById(fieldId);
    if(el) { el.scrollIntoView({behavior:'smooth'}); el.focus(); }
  }

  function toggleLocationField(){
    var on = document.getElementById('rLocationToggle');
    var input = document.getElementById('rLocation');
    if(!on || !input) return;
    if(on.checked){ input.classList.remove('hidden'); input.focus(); }
    else { input.classList.add('hidden'); input.value = ''; }
  }

  // ── 列表详情 ──
  var currentDetailListId = null;

  function showListDetail(id){
    var l = D.lists.find(function(l){ return l.id === id; });
    if(!l) return;
    currentDetailListId = id;
    document.getElementById('listDetailTitle').textContent = (l.icon||'') + ' ' + l.name;
    var reminders = D.reminders.filter(function(r){ return r.listId === id && !r.deleted && !r.completed; });
    var html = '';
    reminders.forEach(function(r){ html += ReminderView.renderItem(r); });
    var content = document.getElementById('listDetailContent');
    if(content) content.innerHTML = html || '<div class="empty-state"><div class="empty-state-title">暂无提醒事项</div></div>';
    document.getElementById('listDetailModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
  }

  function exportListData(){
    var l = D.lists.find(function(l){ return l.id === currentDetailListId; });
    if(!l) return;
    var reminders = D.reminders.filter(function(r){ return r.listId === currentDetailListId; });
    var data = { list: l, reminders: reminders, exportedAt: new Date().toISOString() };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (l.name || 'list') + '-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showListMoreMenu(){
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '400';
    overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };
    var items = [
      '<button class="more-menu-item" style="font-size:15px;padding:14px 16px;" id="listSortDate">按日期排序</button>',
      '<button class="more-menu-item" style="font-size:15px;padding:14px 16px;" id="listSortPriority">按优先级排序</button>',
      '<button class="more-menu-item" style="font-size:15px;padding:14px 16px;" id="listSortCreated">按创建时间排序</button>',
      '<button class="more-menu-item danger" style="font-size:15px;padding:14px 16px;" id="listDeleteBtn">删除列表</button>'
    ];
    overlay.innerHTML = '<div class="modal-sheet" style="max-width:300px;margin:auto;border-radius:var(--radius-xl);" onclick="event.stopPropagation()"><div style="padding:8px 0;">'+items.join('')+'</div></div>';
    document.body.appendChild(overlay);

    document.getElementById('listSortDate').onclick = function(){
      sortReminders('date'); closeModal('listDetailModal'); document.body.removeChild(overlay);
    };
    document.getElementById('listSortPriority').onclick = function(){
      sortReminders('priority'); closeModal('listDetailModal'); document.body.removeChild(overlay);
    };
    document.getElementById('listSortCreated').onclick = function(){
      sortReminders('created'); closeModal('listDetailModal'); document.body.removeChild(overlay);
    };
    document.getElementById('listDeleteBtn').onclick = function(){
      deleteListConfirm(currentDetailListId);
      closeModal('listDetailModal');
      document.body.removeChild(overlay);
    };
  }

  function moveListUp(id){ ListManager.moveList(D, id, -1); render(); }
  function moveListDown(id){ ListManager.moveList(D, id, 1); render(); }

  function showListSortMenu(id){
    var idx = D.lists.findIndex(function(l){ return l.id === id; });
    var canUp = idx > 0, canDown = idx < D.lists.length - 1;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '400';
    overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };
    var items = [];
    if(canUp) items.push('<button class="more-menu-item" style="font-size:15px;padding:14px 16px;" id="moveUpBtn">上移</button>');
    if(canDown) items.push('<button class="more-menu-item" style="font-size:15px;padding:14px 16px;" id="moveDownBtn">下移</button>');
    if(!canUp && !canDown) items.push('<div style="padding:14px 16px;font-size:14px;color:var(--text3);text-align:center;">无法移动</div>');
    overlay.innerHTML = '<div class="modal-sheet" style="max-width:300px;margin:auto;border-radius:var(--radius-xl);" onclick="event.stopPropagation()"><div style="padding:8px 0;">'+items.join('')+'</div></div>';
    document.body.appendChild(overlay);
    if(canUp) document.getElementById('moveUpBtn').onclick = function(){ moveListUp(id); document.body.removeChild(overlay); };
    if(canDown) document.getElementById('moveDownBtn').onclick = function(){ moveListDown(id); document.body.removeChild(overlay); };
  }

  // ── Settings ──
  function showSettings(){
    document.getElementById('settingsModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    var lbEl = document.getElementById('lastBackupTime');
    if(lbEl) lbEl.textContent = '上次备份：'+BackupManager.formatLastBackup();
    var cfg = SyncManager.getConfig();
    if(cfg){
      setElVal('syncServer', cfg.server);
      setElVal('syncUser', cfg.user);
      setElVal('syncPass', cfg.pass);
      SyncManager.updateStatus('已配置服务器');
    } else {
      setElVal('syncServer', '');
      setElVal('syncUser', '');
      setElVal('syncPass', '');
      SyncManager.updateStatus('未配置同步');
    }
    var autoOn = localStorage.getItem('auto_backup_on') === 'true';
    setElChecked('autoBackupToggle', autoOn);
  }

  function exportBackup(){
    BackupManager.exportData({ reminders: D.reminders, lists: D.lists });
  }

  function importBackup(input){
    var file = input.files[0];
    if(!file) return;
    if(!confirm('恢复备份将覆盖当前所有数据，确定继续？')) { input.value=''; return; }
    BackupManager.importFile(file, function(err, data){
      if(err){ alert('备份文件无效: '+(err.message||err)); input.value=''; return; }
      D.reminders = data.reminders;
      D.lists = data.lists;
      render();
      alert('数据已恢复');
      input.value = '';
    });
  }

  function toggleAutoBackup(){
    var toggle = document.getElementById('autoBackupToggle');
    var on = toggle ? toggle.checked : false;
    try { localStorage.setItem('auto_backup_on', on ? 'true' : 'false'); } catch(e){}
    if(on) BackupManager.autoBackup({ reminders: D.reminders, lists: D.lists });
  }

  function saveSyncConfig(){
    var server = getElVal('syncServer');
    var user = getElVal('syncUser');
    var pass = getElVal('syncPass');
    if(!server || !user || !pass){ alert('请填写完整的服务器信息'); return; }
    SyncManager.saveConfig(server, user, pass);
    SyncManager.updateStatus('已保存，正在测试连接...');
    SyncManager.sync(SyncManager.getConfig(), { reminders: D.reminders, lists: D.lists }, function(err, merged){
      if(err){ SyncManager.updateStatus('连接失败: '+err); return; }
      if(merged){
        D.reminders = merged.reminders;
        D.lists = merged.lists;
        render();
      }
    });
  }

  function restoreRemindersData(data){
    D.reminders = data.reminders || [];
    D.lists = data.lists || [];
    render();
  }

  function importBackupFromText(){
    BackupManager.importBackupFromText();
  }

  function syncNow(){
    var cfg = SyncManager.getConfig();
    if(!cfg){ alert('请先配置同步服务器'); return; }
    SyncManager.sync(cfg, { reminders: D.reminders, lists: D.lists }, function(err, merged){
      if(err) return;
      if(merged){
        D.reminders = merged.reminders;
        D.lists = merged.lists;
        render();
      }
    });
  }

  // ── Init ──
  function init(){
    ReminderView.init(D);
    load();
    render();
    document.addEventListener('click', function(e){
      if(!e.target.closest('#moreMenu') && !e.target.closest('#moreBtn')){
        hideMoreMenu();
      }
    });
  }

  // ── Expose to window ──
  function expose(){
    window.switchView = switchView;
    window.filterByCategory = filterByCategory;
    window.filterByList = filterByList;
    window.filterByTag = filterByTag;
    window.onSearch = onSearch;
    window.toggleComplete = toggleComplete;
    window.toggleCompleteAnimated = toggleCompleteAnimated;
    window.toggleCalendar = toggleCalendar;
    window.calNav = calNav;
    window.calDayClick = calDayClick;
    window.showNewReminderModal = showNewReminderModal;
    window.editReminder = editReminder;
    window.softDeleteReminder = softDeleteReminder;
    window.restoreReminder = restoreReminder;
    window.permanentlyDeleteReminder = permanentlyDeleteReminder;
    window.showDeleteView = showDeleteView;
    window.sortReminders = sortReminders;
    window.showMoreMenu = showMoreMenu;
    window.hideMoreMenu = hideMoreMenu;
    window.showNewListModal = showNewListModal;
    window.editList = editList;
    window.deleteListConfirm = deleteListConfirm;
    window.selectIcon = selectIcon;
    window.quickCreateList = quickCreateList;
    window.closeModal = closeModal;
    window.closeModalOutside = closeModalOutside;
    window.selPrio = selPrio;
    window.selColor = selColor;
    window.saveReminder = saveReminder;
    window.saveList = saveList;
    window.handleImageInput = handleImageInput;
    window.removeImage = removeImage;
    window.focusField = focusField;
    window.toggleLocationField = toggleLocationField;
    window.showListDetail = showListDetail;
    window.exportListData = exportListData;
    window.showListMoreMenu = showListMoreMenu;
    window.moveListUp = moveListUp;
    window.moveListDown = moveListDown;
    window.showListSortMenu = showListSortMenu;
    window.toggleTagFold = function(){ ReminderView.toggleTagFold(); };
    window.showSettings = showSettings;
    window.exportBackup = exportBackup;
    window.importBackup = importBackup;
    window.toggleAutoBackup = toggleAutoBackup;
    window.saveSyncConfig = saveSyncConfig;
    window.syncNow = syncNow;
    window.importBackupFromText = importBackupFromText;
    window.restoreRemindersData = restoreRemindersData;
  }

  return { init: init, expose: expose };
})();

App.init();
App.expose();
