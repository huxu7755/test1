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
    var formData = {
      title: title, dateTime: document.getElementById('rDateTime').value,
      location: document.getElementById('rLocation').value.trim(),
      tag: document.getElementById('rTag').value, notes: document.getElementById('rNotes').value.trim(),
      flagged: document.getElementById('rFlagged').checked,
      listId: document.getElementById('rList').value || D.lists[0].id,
      editId: document.getElementById('rEditId').value,
      priority: D.selectedPrio, image: imageData
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
    document.getElementById('rLocation').value = r.location||'';
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
    if(r.image){ imgInput.dataset.value = r.image; imgEl.innerHTML = '<img src="'+r.image+'" class="img-preview-thumb">'; imgEl.classList.remove('hidden'); }
    else { imgInput.dataset.value = ''; imgEl.innerHTML = ''; imgEl.classList.add('hidden'); }
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
    var els = ['calendarPanel','widgetCard','listsSection','reminderList','searchWrap','categoryTags','tagFilters','emptyState','quickCards','quickToolbarWrap','recentDelete'];
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
    document.getElementById('rLocation').value = '';
    document.getElementById('rTag').value = '';
    document.getElementById('rNotes').value = '';
    document.getElementById('rFlagged').checked = false;
    document.getElementById('rEditId').value = '';
    document.getElementById('btnDeleteReminder').classList.add('hidden');
    document.getElementById('rImagePreview').innerHTML = ''; document.getElementById('rImagePreview').classList.add('hidden');
    document.getElementById('rImage').dataset.value = '';
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
      var preview = document.getElementById('rImagePreview');
      preview.innerHTML = '<img src="'+e.target.result+'" class="img-preview-thumb">';
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function removeImage(){
    document.getElementById('rImage').dataset.value = '';
    var preview = document.getElementById('rImagePreview');
    preview.innerHTML = ''; preview.classList.add('hidden');
    document.getElementById('rImageFile').value = '';
  }

  // ── 快捷工具栏 ──
  function focusField(fieldId){
    var el = document.getElementById(fieldId);
    if(el) { el.scrollIntoView({behavior:'smooth'}); el.focus(); }
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
  }

  return { init: init, expose: expose };
})();

App.init();
App.expose();
