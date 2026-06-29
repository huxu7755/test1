/* storage.js — 双层存储桥接层（localStorage + Android 原生） */
'use strict';

var ReminderStorage = (function(){
  var KEY = 'reminders_v2';
  return {
    getItem: function(){
      // 优先从 Android 原生存储读取
      if(typeof window.AndroidStorage !== 'undefined' && window.AndroidStorage.loadData){
        try {
          var v = window.AndroidStorage.loadData(KEY);
          if(v) return v;
        } catch(e){}
      }
      // 回退到 localStorage
      return localStorage.getItem(KEY);
    },
    setItem: function(value){
      localStorage.setItem(KEY, value);
      if(typeof window.AndroidStorage !== 'undefined' && window.AndroidStorage.saveData){
        try { window.AndroidStorage.saveData(KEY, value); } catch(e){}
      }
    }
  };
})();
