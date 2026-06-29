/* views.js — 视图渲染 */
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
    var total = D.reminders.filter(function(r){ return !r.deleted && !r.completed; }).length;
    document.getElementById('headerCount').textContent = total ? '('+total+')' : '';
  }

  // ── 快捷入口卡片 ──
  function renderQuickCards(){
    var el = document.getElementById('quickCards');
    if(!el) return;
    var ts = ReminderManager.todayStr();
    var todayC = D.reminders.filter(function(r){ return !r.deleted && !r.completed && r.date===ts; }).length;
    var scheduledC = D.reminders.filter(function(r){ return !r.deleted && !r.completed && r.date; }).length;
    var allC = D.reminders.filter(function(r){ return !r.deleted && !r.completed; }).length;
    var flaggedC = D.reminders.filter(function(r){ return !r.deleted && !r.completed && r.flagged; }).length;
    var completedC = D.reminders.filter(function(r){ return r.completed && !r.deleted; }).length;

    var cards = [
      {view:'today', label:'今天', count:todayC, color:'#007aff'},
      {view:'scheduled', label:'计划', count:scheduledC, color:'#ff6b81'},
      {view:'all', label:'全部', count:allC, color:'#1c1c1e'},
      {view:'flagged', label:'旗标', count:flaggedC, color:'#ff9500'},
      {view:'completed', label:'完成', count:completedC, color:'#5ac8fa', isCheck:true}
    ];

    var activeView = D.view;
    if(activeView==='deleted') activeView='all';

    var html = cards.map(function(c){
      var active = activeView===c.view?' active':'';
      var cntHtml = c.isCheck ? '<span class="qc-check">✓</span>' : '<span class="qc-count">'+c.count+'</span>';
      return '<div class="quick-card'+active+'" onclick="switchView(\''+c.view+'\')" style="background:'+c.color+'">'+
        '<span class="qc-label">'+c.label+'</span>'+cntHtml+'</div>';
    }).join('');

    el.innerHTML = html;
  }

  // ── 标签筛选 ──
  function renderTags(){
    var el = document.getElementById('tagFilters');
    if(!el) return;
    var tags = ReminderManager.getAllTags(D);
    var tagKeys = Object.keys(tags);
    if(!tagKeys.length){ el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    var active = D.tagFilter || '';
    var html = '<span class="tag-label">标签</span><span class="tag-arrow">↓</span>';
    html += '<span class="tag-btn'+(active===''?' active':'')+'" onclick="filterByTag(\'\')">所有标签</span>';
    tagKeys.forEach(function(t){
      html += '<span class="tag-btn'+(active===t?' active':'')+'" onclick="filterByTag(\''+esc(t)+'\')">#'+esc(t)+'</span>';
    });
    el.innerHTML = html;
  }

  // ── 建议列表 ──
  function renderSuggestList(){
    var el = document.getElementById('suggestList');
    if(!el) return;
    if(D.lists.length >= 1) { el.classList.add('hidden'); return; }
    // 只在不满足条件时显示
    if(D.lists.length > 0) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = '<div class="suggest-item" onclick="quickCreateList(\'日常采购\',\'购物清单\',\'🛒\',\'#34c759\')">'+
      '<span class="suggest-icon">🛒</span>'+
      '<span class="suggest-text">建议列表：日常采购 自动分类项目</span>'+
      '<span class="suggest-plus">+</span></div>';
  }

  // ── 列表渲染 ──
  function renderLists(){
    var el = document.getElementById('listsSection');
    var html = '';
    D.lists.forEach(function(l){
      var cnt = D.reminders.filter(function(r){ return r.listId===l.id && !r.completed && !r.deleted; }).length;
      html += '<div class="list-item-w" id="listItem-'+l.id+'">'+
        '<div class="list-swipe-bg"><span class="swipe-btn-edit" onclick="event.stopPropagation();editList(\''+l.id+'\')">编辑</span><span class="swipe-btn-del" onclick="event.stopPropagation();deleteListConfirm(\''+l.id+'\')">删除</span></div>'+
        '<div class="list-item-inner" onclick="filterByList(\''+l.id+'\')">'+
        '<div class="list-icon-sq" style="background:'+l.color+'">'+l.icon+'</div>'+
        '<span class="list-name-txt">'+esc(l.name)+'</span>'+
        '<span class="list-count-num">'+cnt+'</span>'+
        '<span class="list-arrow">&gt;</span>'+
        '</div></div>';
    });
    el.innerHTML = html;
    // 绑定左滑
    bindListSwipe(el);
    // Update list select in modal
    var sel = document.getElementById('rList');
    if(sel) sel.innerHTML = D.lists.map(function(l){ return '<option value="'+l.id+'">'+l.icon+' '+l.name+'</option>'; }).join('');
  }

  function bindListSwipe(el){
    var touchStartX = 0, touchStartY = 0, swipedItem = null;
    el.addEventListener('touchstart', function(e){
      var inner = e.target.closest('.list-item-inner');
      if(!inner) return;
      swipedItem = inner.closest('.list-item-w');
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },{passive:true});
    el.addEventListener('touchend', function(e){
      if(!swipedItem) return;
      var dx = (e.changedTouches[0]?e.changedTouches[0].clientX:touchStartX) - touchStartX;
      // 关闭其他打开的
      el.querySelectorAll('.list-item-w.swiped').forEach(function(item){
        if(item !== swipedItem) item.classList.remove('swiped');
      });
      if(dx < -40 && Math.abs(dx) > 30) swipedItem.classList.add('swiped');
      else if(dx > 40) swipedItem.classList.remove('swiped');
      swipedItem = null;
    });
    el.addEventListener('click', function(e){
      if(!e.target.closest('.swipe-btn-edit') && !e.target.closest('.swipe-btn-del')){
        el.querySelectorAll('.list-item-w.swiped').forEach(function(item){ item.classList.remove('swiped'); });
      }
    });
  }

  // ── 提醒事项渲染 ──
  function renderReminders(){
    var container = document.getElementById('reminderList');
    var empty = document.getElementById('emptyState');
    var reminders = ReminderManager.getFiltered(D);
    if(!reminders.length){ container.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    var html = '';
    var ts = ReminderManager.todayStr();
    if(D.view==='deleted'){
      html += '<div class="section-hd deleted-hd">最近删除</div>';
      html += '<div class="deleted-info">'+getDeletedSummary()+'</div>';
      reminders.forEach(function(r){ html += renderDeletedItem(r); });
    } else if((D.view==='all'||D.view==='scheduled')&&D.cat==='all'&&!D.listFilterId&&!D.tagFilter&&!D.search){
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
    // 绑定左滑删除
    bindSwipeDelete(container);
  }

  function renderItem(r){
    var list = D.lists.find(function(l){ return l.id===r.listId; });
    var lc = list ? list.color : '#007aff';
    var cc = r.completed ? 'checked' : '';
    var com = r.completed ? ' completed' : '';
    var flag = r.flagged ? '<span class="reminder-flag">🚩 </span>' : '';
    var prioMark = r.priority==='high' ? ' <span style="color:var(--red);font-weight:700;">!!!</span>' : '';
    var imgHtml = r.image ? '<span class="reminder-img-tag">📷</span>' : '';
    return '<div class="reminder-item'+com+'" id="rItem-'+r.id+'">'+
      '<div class="rm-swipe-bg"><span class="swipe-btn-del" onclick="event.stopPropagation();softDeleteReminder(\''+r.id+'\')">删除</span></div>'+
      '<div class="rm-item-inner" onclick="editReminder(\''+r.id+'\')">'+
      '<div class="check-circle '+cc+'" onclick="event.stopPropagation();toggleCompleteAnimated(\''+r.id+'\',this)"></div>'+
      '<div class="reminder-content">'+
        '<div class="reminder-title">'+flag+esc(r.title)+prioMark+'</div>'+
        '<div class="reminder-meta">'+
          (r.date?'<span>'+ReminderManager.fmtDate(r.date,r.time)+'</span>':'')+
          (r.location?'<span>📍 '+esc(r.location)+'</span>':'')+
          (r.tag?'<span class="reminder-tag">'+esc(r.tag)+'</span>':'')+
          imgHtml+
          (r.notes?'<span style="color:var(--gray);">📝</span>':'')+
        '</div>'+
      '</div>'+
      '<div class="list-dot" style="background:'+lc+'"></div>'+
      '</div></div>';
  }

  function renderDeletedItem(r){
    var days = ReminderManager.getDaysUntilClean(r.deletedAt);
    return '<div class="reminder-item deleted-item">'+
      '<div class="reminder-content">'+
        '<div class="reminder-title">'+esc(r.title)+'</div>'+
        '<div class="reminder-meta">'+days+'天后自动清除</div>'+
      '</div>'+
      '<button class="btn-restore" onclick="restoreReminder(\''+r.id+'\')">恢复</button>'+
      '<button class="btn-perm-del" onclick="permanentlyDeleteReminder(\''+r.id+'\')">删除</button>'+
    '</div>';
  }

  function getDeletedSummary(){
    var count = D.reminders.filter(function(r){ return r.deleted; }).length;
    return count+'个项目，30天后自动清除';
  }

  function bindSwipeDelete(container){
    var touchStartX = 0, swipedItem = null;
    container.addEventListener('touchstart', function(e){
      var inner = e.target.closest('.rm-item-inner');
      if(!inner) return;
      swipedItem = inner.closest('.reminder-item');
      touchStartX = e.touches[0].clientX;
    },{passive:true});
    container.addEventListener('touchend', function(e){
      if(!swipedItem) return;
      var dx = (e.changedTouches[0]?e.changedTouches[0].clientX:touchStartX) - touchStartX;
      container.querySelectorAll('.reminder-item.swiped').forEach(function(item){
        if(item !== swipedItem) item.classList.remove('swiped');
      });
      if(dx < -40 && Math.abs(dx) > 30) swipedItem.classList.add('swiped');
      else if(dx > 40) swipedItem.classList.remove('swiped');
      swipedItem = null;
    });
    container.addEventListener('click', function(e){
      if(!e.target.closest('.swipe-btn-del')){
        container.querySelectorAll('.reminder-item.swiped').forEach(function(item){ item.classList.remove('swiped'); });
      }
    });
  }

  function renderWidget(){
    var card = document.getElementById('widgetCard');
    var content = document.getElementById('widgetContent');
    var footer = document.getElementById('widgetFooter');
    var todayReminders = D.reminders.filter(function(r){ return !r.completed && !r.deleted && r.date===ReminderManager.todayStr(); });
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

  // ── 图标网格 ──
  function renderIconGrid(selectedIcon){
    var el = document.getElementById('iconGrid');
    if(!el) return;
    var html = '';
    ListManager.icons.forEach(function(icon){
      var sel = icon===selectedIcon?' selected':'';
      html += '<span class="icon-grid-item'+sel+'" onclick="selectIcon(\''+icon+'\',this)">'+icon+'</span>';
    });
    el.innerHTML = html;
  }

  return {
    init: init, updateHeader: updateHeader,
    renderQuickCards: renderQuickCards, renderTags: renderTags,
    renderSuggestList: renderSuggestList, renderLists: renderLists,
    renderReminders: renderReminders, renderItem: renderItem,
    renderWidget: renderWidget, renderIconGrid: renderIconGrid
  };
})();
