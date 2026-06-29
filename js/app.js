/* app.js — 主应用逻辑（初始化、路由、事件绑定、模态框管理） */
'use strict';

var App = (function(){
  var D = {
    reminders: [],
    lists: [],
    view: 'today',
    cat: 'all',
    search: '',
    selectedPrio: 'none',
    selectedColor: '#007aff',
    calYear: null,
    calMonth: null,
    showCalendar: false,
    listFilterId: null
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
  }

  function save(){
    ReminderStorage.setItem(JSON.stringify({reminders: D.reminders, lists: D.lists}));
  }

  function render(){
    ReminderView.updateHeader();
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
    D.view = v;
    D.listFilterId = null;
    document.querySelectorAll('.view-tab').forEach(function(t){ t.classList.remove('active'); });
    var el = document.querySelector('[data-view="'+v+'"]');
    if(el) el.classList.add('active');
    if(v === 'completed'){
      document.getElementById('categoryTags').classList.add('hidden');
    } else {
      document.getElementById('categoryTags').classList.remove('hidden');
      D.cat = 'all';
      resetCatTags();
    }
    render();
  }

  function filterByCategory(cat, el){
    D.cat = cat;
    D.listFilterId = null;
    resetCatTags();
    if(el) el.classList.add('active');
    render();
  }

  function resetCatTags(){
    document.querySelectorAll('.cat-tag').forEach(function(t){ t.classList.remove('active'); });
    var allEl = document.querySelector('[data-cat="all"]');
    if(allEl) allEl.classList.add('active');
  }

  function filterByList(lid){
    D.view = 'all';
    D.cat = 'all';
    D.listFilterId = lid;
    D.showCalendar = false;
    toggleCalendarOff();
    document.querySelectorAll('.view-tab').forEach(function(t){ t.classList.remove('active'); });
    var allEl = document.querySelector('[data-view="all"]');
    if(allEl) allEl.classList.add('active');
    document.getElementById('categoryTags').classList.remove('hidden');
    resetCatTags();
    render();
  }

  function onSearch(){
    D.search = document.getElementById('searchInput').value;
    D.listFilterId = null;
    render();
  }

  function toggleComplete(id){
    ReminderManager.toggleComplete(D, id);
    render();
  }

  // ── Calendar ──
  function toggleCalendar(){
    D.showCalendar = !D.showCalendar;
    var btn = document.getElementById('calToggleBtn');
    btn.textContent = D.showCalendar ? '列表' : '日历';
    var cal = document.getElementById('calendarPanel');
    var widget = document.getElementById('widgetCard');
    var lists = document.getElementById('listsSection');
    var rl = document.getElementById('reminderList');
    var sw = document.getElementById('searchWrap');
    var ct = document.getElementById('categoryTags');
    var empty = document.getElementById('emptyState');

    if(D.showCalendar){
      cal.classList.remove('hidden');
      widget.classList.add('hidden');
      lists.classList.add('hidden');
      rl.classList.add('hidden');
      sw.classList.add('hidden');
      ct.classList.add('hidden');
      empty.classList.add('hidden');
      CalendarManager.reset();
      renderCalendarView();
    } else {
      cal.classList.add('hidden');
      widget.classList.remove('hidden');
      lists.classList.remove('hidden');
      rl.classList.remove('hidden');
      sw.classList.remove('hidden');
      ct.classList.remove('hidden');
      render();
    }
  }

  function toggleCalendarOff(){
    D.showCalendar = false;
    document.getElementById('calToggleBtn').textContent = '日历';
    document.getElementById('calendarPanel').classList.add('hidden');
    document.getElementById('widgetCard').classList.remove('hidden');
    document.getElementById('listsSection').classList.remove('hidden');
    document.getElementById('reminderList').classList.remove('hidden');
    document.getElementById('searchWrap').classList.remove('hidden');
    document.getElementById('categoryTags').classList.remove('hidden');
  }

  function calNav(dir){
    CalendarManager.navigate(dir);
    renderCalendarView();
  }

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
    D.selectedPrio = 'none';
    resetPrioBtns();
    var noneBtn = document.querySelector('#prioBtns [data-prio="none"]');
    if(noneBtn) noneBtn.classList.add('selected');
    document.getElementById('reminderModal').classList.remove('hidden');
    document.getElementById('fab').classList.add('hidden');
    setTimeout(function(){ document.getElementById('rTitle').focus(); }, 300);
  }

  function showNewListModal(){
    document.getElementById('listModalTitle').textContent = '新建列表';
    document.getElementById('lName').value = '';
    document.getElementById('lType').value = '标准';
    document.getElementById('lIcon').value = '📋';
    document.getElementById('lEditId').value = '';
    D.selectedColor = '#007aff';
    resetColorDots();
    var dot = document.querySelector('#colorRow [data-color="#007aff"]');
    if(dot) dot.classList.add('selected');
    document.getElementById('listModal').classList.remove('hidden');
  }

  function editList(id){
    var l = D.lists.find(function(l){ return l.id === id; });
    if(!l) return;
    document.getElementById('listModalTitle').textContent = '编辑列表';
    document.getElementById('lName').value = l.name;
    document.getElementById('lType').value = l.type;
    document.getElementById('lIcon').value = l.icon;
    document.getElementById('lEditId').value = id;
    D.selectedColor = l.color;
    resetColorDots();
    var dot = document.querySelector('#colorRow [data-color="'+l.color+'"]');
    if(dot) dot.classList.add('selected');
    document.getElementById('listModal').classList.remove('hidden');
  }

  function closeModal(id){
    document.getElementById(id).classList.add('hidden');
    document.getElementById('fab').classList.remove('hidden');
  }

  function closeModalOutside(e, id){
    if(e.target === document.getElementById(id)) closeModal(id);
  }

  function selPrio(el){
    resetPrioBtns();
    el.classList.add('selected');
    D.selectedPrio = el.dataset.prio;
  }

  function resetPrioBtns(){
    document.querySelectorAll('#prioBtns .prio-btn').forEach(function(b){ b.classList.remove('selected'); });
  }

  function selColor(el){
    resetColorDots();
    el.classList.add('selected');
    D.selectedColor = el.dataset.color;
  }

  function resetColorDots(){
    document.querySelectorAll('#colorRow .color-dot').forEach(function(d){ d.classList.remove('selected'); });
  }

  // ── Save Reminder ──
  function saveReminder(){
    var title = document.getElementById('rTitle').value.trim();
    if(!title){ alert('请输入标题'); return; }
    var formData = {
      title: title,
      dateTime: document.getElementById('rDateTime').value,
      location: document.getElementById('rLocation').value.trim(),
      tag: document.getElementById('rTag').value,
      notes: document.getElementById('rNotes').value.trim(),
      flagged: document.getElementById('rFlagged').checked,
      listId: document.getElementById('rList').value || D.lists[0].id,
      editId: document.getElementById('rEditId').value,
      priority: D.selectedPrio
    };
    ReminderManager.saveReminder(D, formData);
    closeModal('reminderModal');
    render();
  }

  // ── Save List ──
  function saveList(){
    var name = document.getElementById('lName').value.trim();
    if(!name){ alert('请输入列表名称'); return; }
    ListManager.saveList(D, name, document.getElementById('lType').value, document.getElementById('lIcon').value, D.selectedColor, document.getElementById('lEditId').value);
    closeModal('listModal');
    render();
  }

  // ── Init ──
  function init(){
    ReminderView.init(D);
    load();
    render();
  }

  // ── Global Exposure ──
  function expose(){
    window.switchView = switchView;
    window.filterByCategory = filterByCategory;
    window.filterByList = filterByList;
    window.onSearch = onSearch;
    window.toggleComplete = toggleComplete;
    window.toggleCalendar = toggleCalendar;
    window.calNav = calNav;
    window.calDayClick = calDayClick;
    window.showNewReminderModal = showNewReminderModal;
    window.showNewListModal = showNewListModal;
    window.editList = editList;
    window.closeModal = closeModal;
    window.closeModalOutside = closeModalOutside;
    window.selPrio = selPrio;
    window.selColor = selColor;
    window.saveReminder = saveReminder;
    window.saveList = saveList;
  }

  return {
    init: init,
    expose: expose
  };
})();

// Auto-init
App.init();
App.expose();
