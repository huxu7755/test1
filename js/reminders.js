/* reminders.js — 提醒事项 CRUD 操作 */
'use strict';

var ReminderManager = (function(){
  function uid(){ return 'r'+Date.now()+Math.random().toString(36).slice(2,8); }
  function todayStr(){ return new Date().toISOString().split('T')[0]; }
  function getDateStr(off){
    var d = new Date(); d.setDate(d.getDate() + off);
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
    // 最近删除视图
    if(D.view === 'deleted') {
      var deleted = D.reminders.filter(function(r){ return r.deleted; });
      return sortRemindersInternal(deleted, D.sortBy);
    }
    var list = D.reminders.slice().filter(function(r){ return !r.deleted; });
    var ts = todayStr();
    if(D.view === 'today') list = list.filter(function(r){ return !r.completed && r.date === ts; });
    else if(D.view === 'scheduled') list = list.filter(function(r){ return !r.completed && r.date; });
    else if(D.view === 'completed') list = list.filter(function(r){ return r.completed; });
    else if(D.view === 'flagged') list = list.filter(function(r){ return !r.completed && r.flagged; });
    else list = list.filter(function(r){ return !r.completed; });
    if(D.view !== 'completed'){
      if(D.cat === 'today') list = list.filter(function(r){ return r.date === ts; });
      else if(D.cat === 'important') list = list.filter(function(r){ return r.priority === 'high'; });
      else if(D.cat === 'flagged') list = list.filter(function(r){ return r.flagged; });
    }
    if(D.tagFilter) list = list.filter(function(r){ return r.tag === D.tagFilter; });
    if(D.listFilterId) list = list.filter(function(r){ return r.listId === D.listFilterId; });
    if(D.search){
      var q = D.search.toLowerCase();
      list = list.filter(function(r){
        return r.title.toLowerCase().indexOf(q) !== -1
          || ((r.notes||'').toLowerCase().indexOf(q) !== -1)
          || ((r.location||'').toLowerCase().indexOf(q) !== -1)
          || ((r.tag||'').toLowerCase().indexOf(q) !== -1);
      });
    }
    return sortRemindersInternal(list, D.sortBy);
  }

  function sortRemindersInternal(list, sortBy){
    if(!sortBy || sortBy === 'manual') return list;
    if(sortBy === 'date'){
      return list.sort(function(a,b){
        if(!a.date && !b.date) return 0;
        if(!a.date) return 1; if(!b.date) return -1;
        var da = a.date+(a.time||''), db = b.date+(b.time||'');
        return da.localeCompare(db);
      });
    }
    if(sortBy === 'priority'){
      var order = {high:0, medium:1, low:2, none:3};
      return list.sort(function(a,b){
        return (order[a.priority||'none']||3) - (order[b.priority||'none']||3);
      });
    }
    if(sortBy === 'created'){
      return list.sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
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
    var existing = editId ? D.reminders.find(function(r){ return r.id===editId; }) : null;
    var rem = {
      id: editId || uid(),
      title: title,
      date: date,
      time: time,
      location: formData.location,
      tag: formData.tag,
      notes: formData.notes,
      flagged: formData.flagged,
      messageReminder: formData.messageReminder,
      priority: formData.priority,
      listId: formData.listId,
      completed: existing ? existing.completed : false,
      deleted: existing ? existing.deleted : false,
      deletedAt: existing ? existing.deletedAt : null,
      image: formData.imageRemoved ? null : (formData.image || (existing ? existing.image : null)),
      createdAt: existing ? existing.createdAt || new Date().toISOString() : new Date().toISOString()
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
    if(r){ r.completed = !r.completed; r.completedAt = r.completed ? new Date().toISOString() : null; }
  }

  // 软删除
  function softDelete(D, id){
    var r = D.reminders.find(function(r){ return r.id === id; });
    if(r){ r.deleted = true; r.deletedAt = new Date().toISOString(); }
  }

  // 恢复
  function restore(D, id){
    var r = D.reminders.find(function(r){ return r.id === id; });
    if(r){ r.deleted = false; r.deletedAt = null; }
  }

  // 永久删除
  function permanentlyDelete(D, id){
    var idx = D.reminders.findIndex(function(r){ return r.id === id; });
    if(idx >= 0) D.reminders.splice(idx, 1);
  }

  // 清理过期删除（30天）
  function cleanExpiredDeleted(D){
    var cutoff = Date.now() - 30*24*60*60*1000;
    D.reminders = D.reminders.filter(function(r){
      if(!r.deleted) return true;
      if(!r.deletedAt) return true;
      return new Date(r.deletedAt).getTime() > cutoff;
    });
  }

  function getDeletedReminders(D){
    return D.reminders.filter(function(r){ return r.deleted; });
  }

  function getDaysUntilClean(deletedAt){
    if(!deletedAt) return 30;
    var elapsed = Date.now() - new Date(deletedAt).getTime();
    var remaining = Math.max(0, 30 - Math.floor(elapsed / (24*60*60*1000)));
    return remaining;
  }

  function getAllTags(D){
    var tags = {};
    D.reminders.forEach(function(r){
      if(!r.deleted && r.tag) tags[r.tag] = (tags[r.tag]||0)+1;
    });
    return tags;
  }

  return {
    uid: uid, todayStr: todayStr, getDateStr: getDateStr, fmtDate: fmtDate,
    getFiltered: getFiltered, saveReminder: saveReminder, toggleComplete: toggleComplete,
    softDelete: softDelete, restore: restore, permanentlyDelete: permanentlyDelete,
    cleanExpiredDeleted: cleanExpiredDeleted, getDeletedReminders: getDeletedReminders,
    getDaysUntilClean: getDaysUntilClean, getAllTags: getAllTags
  };
})();
