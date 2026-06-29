/* storage.js — 双层存储桥接层（localStorage + Android 原生） */
'use strict';

var ReminderStorage = (function(){
  var KEY = 'reminders_v3';
  return {
    getItem: function(){
      if(typeof window.AndroidStorage !== 'undefined' && window.AndroidStorage.loadData){
        try { var v = window.AndroidStorage.loadData(KEY); if(v) return v; } catch(e){}
      }
      try {
        var v = localStorage.getItem(KEY);
        if(!v) v = localStorage.getItem('reminders_v2');
        return v;
      } catch(e) { return null; }
    },
    setItem: function(value){
      try { localStorage.setItem(KEY, value); } catch(e){}
      if(typeof window.AndroidStorage !== 'undefined' && window.AndroidStorage.saveData){
        try { window.AndroidStorage.saveData(KEY, value); } catch(e){}
      }
    }
  };
})();
