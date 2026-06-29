/* calendar.js — 日历视图逻辑（含农历节气） */
'use strict';

var CalendarManager = (function(){
  var calYear = null;
  var calMonth = null;

  var TERMS = {
    '1-05':'小寒','1-20':'大寒','2-04':'立春','2-19':'雨水',
    '3-05':'惊蛰','3-20':'春分','4-05':'清明','4-20':'谷雨',
    '5-05':'立夏','5-21':'小满','6-05':'芒种','6-21':'夏至',
    '7-07':'小暑','7-22':'大暑','8-07':'立秋','8-23':'处暑',
    '9-08':'白露','9-23':'秋分','10-08':'寒露','10-23':'霜降',
    '11-07':'立冬','11-22':'小雪','12-07':'大雪','12-22':'冬至'
  };

  function getTerm(month, day){
    var candidates = [(month)+'-'+(day),(month)+'-'+(day-1),(month)+'-'+(day+1)];
    for(var i=0; i<candidates.length; i++){
      if(TERMS[candidates[i]]) return TERMS[candidates[i]];
    }
    return null;
  }

  function init(){
    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
  }

  function reset(){ calYear = null; calMonth = null; init(); }
  function getState(){ return { year: calYear, month: calMonth }; }
  function setState(y, m){ calYear = y; calMonth = m; }

  function navigate(dir){
    calMonth += dir;
    if(calMonth > 11){ calMonth = 0; calYear++; }
    if(calMonth < 0){ calMonth = 11; calYear--; }
  }

  function render(reminders){
    if(calYear === null) init();
    var y = calYear, m = calMonth;
    var now = new Date();
    var todayD = now.getDate(), todayM = now.getMonth(), todayY = now.getFullYear();
    var mn = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    var firstDay = new Date(y, m, 1).getDay();
    var dim = new Date(y, m+1, 0).getDate();
    var dipm = new Date(y, m, 0).getDate();
    var dhdrs = ['日','一','二','三','四','五','六'];

    var rdSet = {};
    (reminders||[]).filter(function(r){ return r.date && !r.completed && !r.deleted; }).forEach(function(r){ rdSet[r.date] = true; });

    var h = '<div class="cal-header"><span class="cal-month-label">'+y+'年 '+mn[m]+'</span><div class="cal-nav"><button class="cal-nav-btn" onclick="calNav(-1)">\u25c0</button><button class="cal-nav-btn" onclick="calNav(1)">\u25b6</button></div></div><div class="cal-grid">';

    dhdrs.forEach(function(d){ h += '<div class="cal-day-hdr">'+d+'</div>'; });

    for(var i=0; i<firstDay; i++){
      h += '<div class="cal-day other">'+(dipm-firstDay+i+1)+'</div>';
    }

    for(var d=1; d<=dim; d++){
      var ds = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      var isToday = (d===todayD && m===todayM && y===todayY);
      var hasR = rdSet[ds];
      var term = getTerm(m+1, d);
      var cls = ['cal-day'];
      if(isToday) cls.push('today');
      if(hasR) cls.push('has-reminder');
      var label = ''+d;
      if(term) label += '<span class="cal-term">'+term+'</span>';
      h += '<div class="'+cls.join(' ')+'" onclick="calDayClick(\''+ds+'\',this)">'+label+'</div>';
    }

    var total = firstDay + dim;
    var rem = total % 7 === 0 ? 0 : 7 - total % 7;
    for(var j=1; j<=rem; j++) h += '<div class="cal-day other">'+j+'</div>';

    h += '</div><div id="calDateDetail"></div>';
    return h;
  }

  function renderDayDetail(ds, reminders, renderItemFn){
    if(!renderItemFn) return '<div class="cal-selected-panel"><div class="cal-selected-title">'+ds+' 的提醒事项</div><div class="cal-selected-empty">加载中...</div></div>';
    var filtered = (reminders||[]).filter(function(r){ return r.date === ds && !r.completed && !r.deleted; });
    var h = '<div class="cal-selected-panel"><div class="cal-selected-title">'+ds+' 的提醒事项</div>';
    if(!filtered.length){
      h += '<div class="cal-selected-empty">暂无提醒事项</div>';
    } else {
      filtered.forEach(function(r){ h += renderItemFn(r); });
    }
    h += '</div>';
    return h;
  }

  return {
    init: init, reset: reset, getState: getState, setState: setState,
    navigate: navigate, render: render, renderDayDetail: renderDayDetail
  };
})();
