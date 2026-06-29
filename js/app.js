/* app.js — 主应用逻辑 */
'use strict';

var App = (function(){
  var D = {
    reminders: [], lists: [],
    view: 'today', cat: 'all', search: '', tagFilter: '',
    selectedPrio: 'none', selectedColor: '#007aff', selectedIcon: '📋',
    calYear: null, calMonth: null, showCalendar: false, listFilterId: null,
    sortBy: 'manual', showDeleteView: false
  };

  function load(){
    try {
      var s = ReminderStorage.getItem();
      if(s){
        var p = JSON.parse(s);
        D.reminders = p.reminders || [];
        D.lists = p.lists || [];
      }
    } catch(e){}
    ListManager.initDefaultLists(D);
    // 清理过期删除
    ReminderManager.cleanExpiredDeleted(D);
  }

  function save(){
    ReminderStorage.setItem(JSON.stringify({reminders: D.reminders, lists: D.lists}));
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
      var lb = localStorage.getItem('last_backup_time');
      if(!lb || (Date.now() - new Date(lb).getTime() > 24*60*60*1000)){
        BackupManager.autoBackup({ reminders: D.reminders, lists: D.lists });
      }
    }
  }

  function renderCalendarView(){
    document.getElementById('calendarPanel').innerHTML = CalendarManager.render(D.reminders);
  }

  // ── View Switching ──
  function switchView(v){
    D.view = v; D.listFilterId = null; D.tagFilter = '';
    D.showCalendar = false; toggleCalendarOff();
    updateQuickCardsActive(v);
    render();
  }

  function updateQuickCardsActive(v){
    document.querySelectorAll('.quick-card').forEach(function(c){ c.classList.remove('active'); });
    document.querySelectorAll('.view-tab').forEach(function(t){ t.classList.remove('active'); });
    var tab = document.querySelector('[data-view="'+v+'"]');
    if(tab) tab.classList.add('active');
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
    updateQuickCardsActive('all');
    render();
  }

  function filterByTag(tag){
    D.tagFilter = tag; D.listFilterId = null; D.cat = 'all';
    render();
  }

  function onSearch(){
    D.search = document.getElementById('searchInput').value;
    D.listFilterId = null; D.tagFilter = '';
    render();
  }

  // ── Toggle Complete ──
  function toggleComplete(id){ ReminderManager.toggleComplete(D, id); render(); }
  function toggleCompleteAnimated(id, el){
    if(el){ el.classList.add('check-anim'); setTimeout(function(){ el.classList.remove('check-anim'); },300); }
    ReminderManager.toggleComplete(D, id); render();
  }

  // ── Reminder CRUD ──
  function saveReminder(){
    var title = document.getElementById('rTitle').value.trim();
    if(!title){ alert('请输入标题'); return; }
    var imageData = document.getElementById('rImage').dataset.value || '';
    var imageRemoved = document.getElementById('rImage').dataset.imageRemoved === 'true';
    var formData = {
      title: title, dateTime: document.getElementById('rDateTime').value,
      location: document.getElementById('rLocationToggle').checked ? document.getElementById('rLocation').value.trim() : '',
      tag: document.getElementById('rTag').value, notes: document.getElementById('rNotes').value.trim(),
      flagged: document.getElementById('rFlagged').checked,
      messageReminder: document.getElementById('rMessageReminder').checked,
      listId: document.getElementById('rList').value || D.lists[0].id,
      editId: document.getElementById('rEditId').value,
      priority: D.selectedPrio, image: imageData, imageRemoved: imageRemoved
    };
    ReminderManager.saveReminder(D, formData);
    closeModal('reminderModal'); render();
  }

  function editReminder(id){
    var r = D.reminders.find(function(r){ return r.id === id; });
    if(!r) return;
    document.getElementById('reminderModalTitle').textContent = '编辑提醒事项';
    document.getElementById('rTitle').value = r.title;
    document.getElementById('rDateTime').value = (r.date||'')+(r.time?'T'+r.time:'');
    document.getElementById('rLocationToggle').checked = !!r.location;
    var locInput = document.getElementById('rLocation');
    if(r.location){ locInput.classList.remove('hidden'); locInput.value = r.location; }
    else { locInput.classList.add('hidden'); locInput.value = ''; }
    document.getElementById('rMessageReminder').checked = r.messageReminder||false;
    document.getElementById('rTag').value = r.tag||'';
    document.getElementById('rNotes').value = r.notes||'';
    document.getElementById('rFlagged').checked = r.flagged||false;
    document.getElementById('rEditId').value = r.id;
    D.selectedPrio = r.priority||'none'; resetPrioBtns();
    var pb = document.querySelector('#prioBtns [data-prio="'+(r.priority||'none')+'"]');
    if(pb) pb.classList.add('selected');
    // 图像预览
    var imgEl = document.getElementById('rImagePreview');
    var imgInput = document.getElementById('rImage');
    if(r.image){ imgInput.dataset.value = r.image; imgInput.dataset.imageRemoved = 'false'; imgEl.innerHTML = '<img src="'+r.image+'" class="img-preview-thumb">'; imgEl.classList.remove('hidden'); }
    else { imgInput.dataset.value = ''; imgInput.dataset.imageRemoved = 'false'; imgEl.innerHTML = ''; imgEl.classList.add('hidden'); }
    document.getElementById('reminderModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    // 删除按钮
    document.getElementById('btnDeleteReminder').classList.remove('hidden');
    setTimeout(function(){ document.getElementById('rTitle').focus(); },300);
  }

  function softDeleteReminder(id){ ReminderManager.softDelete(D, id); render(); }
  function restoreReminder(id){ ReminderManager.restore(D, id); render(); }
  function permanentlyDeleteReminder(id){
    if(!confirm('确定永久删除？此操作无法撤销。')) return;
    ReminderManager.permanentlyDelete(D, id); render();
  }

  function showDeleteView(){
    D.view = 'deleted'; D.showCalendar = false; toggleCalendarOff();
    updateQuickCardsActive('all'); render();
  }

  // ── 排序 ──
  function sortReminders(mode){ D.sortBy = mode; render(); }

  // ── 更多菜单 ──
  function showMoreMenu(){
    var el = document.getElementById('moreMenu');
    if(el.classList.contains('hidden')){ el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); }
  }
  function hideMoreMenu(){ document.getElementById('moreMenu').classList.add('hidden'); }

  // ── Calendar ──
  function toggleCalendar(){
    D.showCalendar = !D.showCalendar;
    var btn = document.getElementById('calToggleBtn');
    btn.textContent = D.showCalendar ? '列表' : '日历';
    var els = ['calendarPanel','widgetCard','listsSection','reminderList','searchWrap','tagFilters','emptyState','quickCards','suggestList','recentDelete'];
    if(D.showCalendar){
      els.forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.add('hidden'); });
      document.getElementById('calendarPanel').classList.remove('hidden');
      CalendarManager.reset(); renderCalendarView();
    } else {
      els.forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.remove('hidden'); });
      document.getElementById('calendarPanel').classList.add('hidden');
      render();
    }
  }
  function toggleCalendarOff(){
    D.showCalendar = false;
    document.getElementById('calToggleBtn').textContent = '日历';
    document.getElementById('calendarPanel').classList.add('hidden');
    var restoreEls = ['quickCards','searchWrap','tagFilters','suggestList','widgetCard','listsSection','recentDelete','reminderList','emptyState'];
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
    var h = CalendarManager.renderDayDetail(ds, D.reminders);
    var old = dd.querySelector('.cal-selected-panel');
    if(old) old.remove();
    dd.insertAdjacentHTML('beforeend', h);
  }

  // ── Modals ──
  function showNewReminderModal(){
    document.getElementById('reminderModalTitle').textContent = '新建提醒事项';
    document.getElementById('rTitle').value = '';
    document.getElementById('rDateTime').value = '';
    document.getElementById('rLocationToggle').checked = false;
    document.getElementById('rLocation').classList.add('hidden');
    document.getElementById('rLocation').value = '';
    document.getElementById('rMessageReminder').checked = false;
    document.getElementById('rTag').value = '';
    document.getElementById('rNotes').value = '';
    document.getElementById('rFlagged').checked = false;
    document.getElementById('rEditId').value = '';
    document.getElementById('btnDeleteReminder').classList.add('hidden');
    document.getElementById('rImagePreview').innerHTML = ''; document.getElementById('rImagePreview').classList.add('hidden');
    document.getElementById('rImage').dataset.value = '';
    document.getElementById('rImage').dataset.imageRemoved = 'false';
    document.getElementById('btnRemoveImg').classList.add('hidden');
    D.selectedPrio = 'none'; resetPrioBtns();
    var noneBtn = document.querySelector('#prioBtns [data-prio="none"]');
    if(noneBtn) noneBtn.classList.add('selected');
    document.getElementById('reminderModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    setTimeout(function(){ document.getElementById('rTitle').focus(); },300);
  }

  function showNewListModal(){
    document.getElementById('listModalTitle').textContent = '新建列表';
    document.getElementById('lName').value = '';
    document.getElementById('lType').value = '标准';
    document.getElementById('lEditId').value = '';
    D.selectedColor = '#007aff'; D.selectedIcon = '📋';
    resetColorDots(); var dot = document.querySelector('#colorRow [data-color="#007aff"]');
    if(dot) dot.classList.add('selected');
    ReminderView.renderIconGrid('📋');
    document.getElementById('listModal').classList.remove('hidden');
  }

  function editList(id){
    var l = D.lists.find(function(l){ return l.id === id; });
    if(!l) return;
    document.getElementById('listModalTitle').textContent = '编辑列表';
    document.getElementById('lName').value = l.name;
    document.getElementById('lType').value = l.type;
    document.getElementById('lEditId').value = id;
    D.selectedColor = l.color; D.selectedIcon = l.icon;
    resetColorDots(); var dot = document.querySelector('#colorRow [data-color="'+l.color+'"]');
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
    document.getElementById(id).classList.add('hidden');
    document.getElementById('fab').classList.remove('hidden');
    hideMoreMenu();
    if(id==='reminderModal') document.getElementById('btnDeleteReminder').classList.add('hidden');
  }
  function closeModalOutside(e, id){
    if(e.target === document.getElementById(id)) closeModal(id);
  }

  function selPrio(el){ resetPrioBtns(); el.classList.add('selected'); D.selectedPrio = el.dataset.prio; }
  function resetPrioBtns(){ document.querySelectorAll('#prioBtns .prio-btn').forEach(function(b){ b.classList.remove('selected'); }); }
  function selColor(el){ resetColorDots(); el.classList.add('selected'); D.selectedColor = el.dataset.color; }
  function resetColorDots(){ document.querySelectorAll('#colorRow .color-dot').forEach(function(d){ d.classList.remove('selected'); }); }

  function saveList(){
    var name = document.getElementById('lName').value.trim();
    if(!name){ alert('请输入列表名称'); return; }
    ListManager.saveList(D, name, document.getElementById('lType').value, D.selectedIcon, D.selectedColor, document.getElementById('lEditId').value);
    closeModal('listModal'); render();
  }

  // ── 图像处理 ──
  function handleImageInput(input){
    var file = input.files[0];
    if(!file) return;
    if(file.size > 5*1024*1024){ alert('图片不能超过5MB'); return; }
    var reader = new FileReader();
    reader.onload = function(e){
      document.getElementById('rImage').dataset.value = e.target.result;
      document.getElementById('rImage').dataset.imageRemoved = 'false';
      var preview = document.getElementById('rImagePreview');
      preview.innerHTML = '<img src="'+e.target.result+'" class="img-preview-thumb">';
      preview.classList.remove('hidden');
      document.getElementById('btnRemoveImg').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function removeImage(){
    document.getElementById('rImage').dataset.value = '';
    document.getElementById('rImage').dataset.imageRemoved = 'true';
    var preview = document.getElementById('rImagePreview');
    preview.innerHTML = ''; preview.classList.add('hidden');
    document.getElementById('rImageFile').value = '';
    document.getElementById('btnRemoveImg').classList.add('hidden');
  }

  // ── 快捷工具栏 ──
  function focusField(fieldId){
    var el = document.getElementById(fieldId);
    if(el) { el.scrollIntoView({behavior:'smooth'}); el.focus(); }
  }

  // ── 位置开关 ──
  function toggleLocationField(){
    var on = document.getElementById('rLocationToggle').checked;
    var input = document.getElementById('rLocation');
    if(on){ input.classList.remove('hidden'); input.focus(); }
    else { input.classList.add('hidden'); input.value = ''; }
  }

  // ── 列表详情 ──
  var currentDetailListId = null;

  function showListDetail(id){
    var l = D.lists.find(function(l){ return l.id === id; });
    if(!l) return;
    currentDetailListId = id;
    document.getElementById('listDetailTitle').textContent = l.icon + ' ' + l.name;
    var reminders = D.reminders.filter(function(r){ return r.listId === id && !r.deleted && !r.completed; });
    var html = '';
    reminders.forEach(function(r){ html += ReminderView.renderItem(r); });
    document.getElementById('listDetailContent').innerHTML = html || '<div class="empty-state"><div class="empty-state-title">暂无提醒事项</div></div>';
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
      '<button class="more-menu-item" onclick="sortReminders(\'date\');closeModal(\'listDetailModal\');document.querySelector(\'.modal-overlay[style*=\\'z-index: 400\\']\')&&document.body.removeChild(document.querySelector(\'.modal-overlay[style*=\\'z-index: 400\\']\'));" style="font-size:15px;padding:14px 16px;">按日期排序</button>',
      '<button class="more-menu-item" onclick="sortReminders(\'priority\');closeModal(\'listDetailModal\')" style="font-size:15px;padding:14px 16px;">按优先级排序</button>',
      '<button class="more-menu-item" onclick="sortReminders(\'created\');closeModal(\'listDetailModal\')" style="font-size:15px;padding:14px 16px;">按创建时间排序</button>',
      '<button class="more-menu-item danger" onclick="deleteListConfirm(\''+currentDetailListId+'\');closeModal(\'listDetailModal\')" style="font-size:15px;padding:14px 16px;">删除列表</button>'
    ];
    overlay.innerHTML = '<div class="modal-sheet" style="max-width:300px;margin:auto;border-radius:var(--radius-xl);" onclick="event.stopPropagation()"><div style="padding:8px 0;">'+items.join('')+'</div></div>';
    document.body.appendChild(overlay);
  }

  // ── 列表排序 ──
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
    if(canUp) items.push('<button class="more-menu-item" onclick="moveListUp(\''+id+'\');document.body.removeChild(document.querySelector(\'.modal-overlay[style*=\\'z-index: 400\\']\'));" style="font-size:15px;padding:14px 16px;">⬆️ 上移</button>');
    if(canDown) items.push('<button class="more-menu-item" onclick="moveListDown(\''+id+'\');document.body.removeChild(document.querySelector(\'.modal-overlay[style*=\\'z-index: 400\\']\'));" style="font-size:15px;padding:14px 16px;">⬇️ 下移</button>');
    if(!canUp && !canDown) items.push('<div style="padding:14px 16px;font-size:14px;color:var(--text3);text-align:center;">无法移动</div>');
    overlay.innerHTML = '<div class="modal-sheet" style="max-width:300px;margin:auto;border-radius:var(--radius-xl);" onclick="event.stopPropagation()"><div style="padding:8px 0;">'+items.join('')+'</div></div>';
    document.body.appendChild(overlay);
  }

  // ── Init ──
  function init(){
    ReminderView.init(D);
    load();
    render();
    // 点击空白关闭更多菜单
    document.addEventListener('click', function(e){
      if(!e.target.closest('#moreMenu') && !e.target.closest('#moreBtn')){
        hideMoreMenu();
      }
    });
  }

  // ── Global Exposure ──
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
  }

  // ── Settings ──
  function showSettings(){
    document.getElementById('settingsModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    document.getElementById('lastBackupTime').textContent = '上次备份：'+BackupManager.formatLastBackup();
    var cfg = SyncManager.getConfig();
    if(cfg){
      document.getElementById('syncServer').value = cfg.server;
      document.getElementById('syncUser').value = cfg.user;
      document.getElementById('syncPass').value = cfg.pass;
      SyncManager.updateStatus('已配置服务器');
    } else {
      SyncManager.updateStatus('未配置同步');
    }
    var autoOn = localStorage.getItem('auto_backup_on') === 'true';
    document.getElementById('autoBackupToggle').checked = autoOn;
  }

  function exportBackup(){
    BackupManager.exportData({ reminders: D.reminders, lists: D.lists });
  }

  function importBackup(input){
    var file = input.files[0];
    if(!file) return;
    if(!confirm('恢复备份将覆盖当前所有数据，确定继续？')) { input.value=''; return; }
    BackupManager.importFile(file, function(err, data){
      if(err){ alert('备份文件无效'); input.value=''; return; }
      D.reminders = data.reminders;
      D.lists = data.lists;
      render();
      alert('数据已恢复');
      input.value = '';
    });
  }

  function toggleAutoBackup(){
    var on = document.getElementById('autoBackupToggle').checked;
    localStorage.setItem('auto_backup_on', on ? 'true' : 'false');
    if(on) BackupManager.autoBackup({ reminders: D.reminders, lists: D.lists });
  }

  function saveSyncConfig(){
    var server = document.getElementById('syncServer').value.trim();
    var user = document.getElementById('syncUser').value.trim();
    var pass = document.getElementById('syncPass').value.trim();
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

  function syncNow(){
    var cfg = SyncManager.getConfig();
    if(!cfg){ alert('请先配置同步服务器'); return; }
    SyncManager.sync(cfg, { reminders: D.reminders, lists: D.lists }, function(err, merged){
      if(err){ return; }
      if(merged){
        D.reminders = merged.reminders;
        D.lists = merged.lists;
        render();
      }
    });
  }

  return { init: init, expose: expose };
})();

App.init();
App.expose();
