/* views.js — 视图渲染（今天/全部/计划/完成 各视图） */
'use strict';

var ReminderView = (function(){
  var D;

  function init(dataRef){ D = dataRef; }

  function esc(s){
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function updateHeader(){
    var list = ReminderManager.getFiltered(D);
    document.getElementById('headerCount').textContent = list.length ? '('+list.length+')' : '';
  }

  function renderLists(){
    var el = document.getElementById('listsSection');
    var html = '<div class="section-sub">我的列表</div>';
    D.lists.forEach(function(l){
      var cnt = D.reminders.filter(function(r){ return r.listId===l.id && !r.completed; }).length;
      html += '<div class="list-item-w" onclick="filterByList(\''+l.id+'\')">'+
        '<div class="list-icon-sq" style="background:'+l.color+'">'+l.icon+'</div>'+
        '<span class="list-name-txt">'+esc(l.name)+'</span>'+
        '<span class="list-count-num">'+cnt+'</span>'+
        '<button class="list-edit-btn" onclick="event.stopPropagation();editList(\''+l.id+'\')">&#8942;</button>'+
      '</div>';
    });
    el.innerHTML = html;
    // Update list select in reminder modal
    var sel = document.getElementById('rList');
    if(sel) sel.innerHTML = D.lists.map(function(l){ return '<option value="'+l.id+'">'+l.icon+' '+l.name+'</option>'; }).join('');
  }

  function renderReminders(){
    var container = document.getElementById('reminderList');
    var empty = document.getElementById('emptyState');
    var reminders = ReminderManager.getFiltered(D);
    if(!reminders.length){ container.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    var html = '';
    var ts = ReminderManager.todayStr();
    // Group by date when in all/scheduled view with no filters
    if((D.view==='all'||D.view==='scheduled')&&D.cat==='all'&&!D.listFilterId&&!D.search){
      var grouped = {};
      reminders.forEach(function(r){ var k = r.date||''; if(!grouped[k])grouped[k]=[]; grouped[k].push(r); });
      var keys = Object.keys(grouped).sort();
      keys.forEach(function(k){
        if(k){
          var lbl = k;
          if(k===ts) lbl='今天';
          else if(k===ReminderManager.getDateStr(1)) lbl='明天';
          else if(k===ReminderManager.getDateStr(-1)) lbl='昨天';
          else { var d=new Date(k+'T00:00'); lbl=(d.getMonth()+1)+'月'+d.getDate()+'日'; }
          html += '<div class="section-hd">'+lbl+'</div>';
        }
        grouped[k].forEach(function(r){ html += renderItem(r); });
      });
    } else {
      reminders.forEach(function(r){ html += renderItem(r); });
    }
    container.innerHTML = html;
  }

  function renderItem(r){
    var list = D.lists.find(function(l){ return l.id===r.listId; });
    var lc = list ? list.color : '#007aff';
    var cc = r.completed ? 'checked' : '';
    var com = r.completed ? ' completed' : '';
    var flag = r.flagged ? '<span class="reminder-flag">🚩 </span>' : '';
    var prioMark = r.priority==='high' ? ' <span style="color:var(--red);font-weight:700;">!!!</span>' : '';
    return '<div class="reminder-item'+com+'" onclick="toggleComplete(\''+r.id+'\')">'+
      '<div class="check-circle '+cc+'"></div>'+
      '<div class="reminder-content">'+
        '<div class="reminder-title">'+flag+esc(r.title)+prioMark+'</div>'+
        '<div class="reminder-meta">'+
          (r.date?'<span>'+ReminderManager.fmtDate(r.date,r.time)+'</span>':'')+
          (r.location?'<span>📍 '+esc(r.location)+'</span>':'')+
          (r.tag?'<span class="reminder-tag">'+esc(r.tag)+'</span>':'')+
          (r.notes?'<span style="color:var(--gray);">📝</span>':'')+
        '</div>'+
      '</div>'+
      '<div class="list-dot" style="background:'+lc+'"></div>'+
    '</div>';
  }

  function renderWidget(){
    var card = document.getElementById('widgetCard');
    var content = document.getElementById('widgetContent');
    var footer = document.getElementById('widgetFooter');
    var todayReminders = D.reminders.filter(function(r){ return !r.completed && r.date===ReminderManager.todayStr(); });
    if(!todayReminders.length){ card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    var show = todayReminders.slice(0,4);
    content.innerHTML = show.map(function(r){
      var l = D.lists.find(function(l){ return l.id===r.listId; });
      return '<div class="widget-card-item"><span class="dot" style="background:'+(l?l.color:'#fff')+'"></span>'+esc(r.title)+'</div>';
    }).join('');
    var remaining = todayReminders.length - show.length;
    footer.textContent = remaining>0 ? '还有 '+remaining+' 项...' : '共 '+todayReminders.length+' 项';
  }

  return {
    init: init,
    updateHeader: updateHeader,
    renderLists: renderLists,
    renderReminders: renderReminders,
    renderItem: renderItem,
    renderWidget: renderWidget
  };
})();
