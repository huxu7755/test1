/* reminders.js — 提醒事项 CRUD 操作 */
'use strict';

var ReminderManager = (function(){
  function uid(){ return 'r'+Date.now()+Math.random().toString(36).slice(2,8); }

  function todayStr(){ return new Date().toISOString().split('T')[0]; }

  function getDateStr(off){
    var d = new Date();
    d.setDate(d.getDate() + off);
    return d.toISOString().split('T')[0];
  }

  function fmtDate(date, time){
    if(!date) return '';
    var d = new Date(date + (time ? 'T'+time : 'T00:00'));
    var ts = todayStr();
    var pre = '';
    if(date === ts) pre = '今天';
    else if(date === getDateStr(1)) pre = '明天';
    else if(date === getDateStr(-1)) pre = '昨天';
    else pre = (d.getMonth()+1) + '月' + d.getDate() + '日';
    if(time) pre += ' ' + time.slice(0,5);
    return pre;
  }

  function getFiltered(D){
    var list = D.reminders.slice();
    var ts = todayStr();
    // View
    if(D.view === 'today') list = list.filter(function(r){ return !r.completed && r.date === ts; });
    else if(D.view === 'scheduled') list = list.filter(function(r){ return !r.completed && r.date; });
    else if(D.view === 'completed') list = list.filter(function(r){ return r.completed; });
    else list = list.filter(function(r){ return !r.completed; });
    // Category (when not completed)
    if(D.view !== 'completed'){
      if(D.cat === 'today') list = list.filter(function(r){ return r.date === ts; });
      else if(D.cat === 'important') list = list.filter(function(r){ return r.priority === 'high'; });
      else if(D.cat === 'flagged') list = list.filter(function(r){ return r.flagged; });
    }
    // List filter
    if(D.listFilterId) list = list.filter(function(r){ return r.listId === D.listFilterId; });
    // Search
    if(D.search){
      var q = D.search.toLowerCase();
      list = list.filter(function(r){
        return r.title.toLowerCase().indexOf(q) !== -1
          || ((r.notes||'').toLowerCase().indexOf(q) !== -1)
          || ((r.location||'').toLowerCase().indexOf(q) !== -1)
          || ((r.tag||'').toLowerCase().indexOf(q) !== -1);
      });
    }
    return list;
  }

  function saveReminder(D, formData){
    var title = formData.title;
    if(!title) return false;
    var dt = formData.dateTime;
    var date = dt ? dt.split('T')[0] : '';
    var time = dt ? dt.split('T')[1] : '';
    var editId = formData.editId;
    var rem = {
      id: editId || uid(),
      title: title,
      date: date,
      time: time,
      location: formData.location,
      tag: formData.tag,
      notes: formData.notes,
      flagged: formData.flagged,
      priority: formData.priority,
      listId: formData.listId,
      completed: false,
      createdAt: editId ? (D.reminders.find(function(r){ return r.id===editId; }) || {}).createdAt || new Date().toISOString() : new Date().toISOString()
    };
    if(editId){
      var idx = D.reminders.findIndex(function(r){ return r.id === editId; });
      if(idx >= 0) D.reminders[idx] = rem;
    } else {
      D.reminders.unshift(rem);
    }
    return true;
  }

  function toggleComplete(D, id){
    var r = D.reminders.find(function(r){ return r.id === id; });
    if(r){
      r.completed = !r.completed;
      r.completedAt = r.completed ? new Date().toISOString() : null;
    }
  }

  return {
    uid: uid,
    todayStr: todayStr,
    getDateStr: getDateStr,
    fmtDate: fmtDate,
    getFiltered: getFiltered,
    saveReminder: saveReminder,
    toggleComplete: toggleComplete
  };
})();
