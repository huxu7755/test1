/* backup.js — 本地备份恢复模块 */
'use strict';

var BackupManager = (function(){
  var AUTO_KEY = 'auto_backups';
  var MAX_AUTO_BACKUPS = 5;
  var LAST_BACKUP_KEY = 'last_backup_time';

  // 导出备份（触发下载）
  function exportData(data){
    var json = JSON.stringify({ reminders: data.reminders, lists: data.lists, exportedAt: new Date().toISOString() }, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var d = new Date();
    var ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    a.download = 'reminders-backup-'+ds+'.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 导入备份（读取文件）
  function importFile(file, callback){
    var reader = new FileReader();
    reader.onload = function(e){
      try {
        var data = JSON.parse(e.target.result);
        if(!data.reminders || !data.lists) throw new Error('Invalid format');
        callback(null, data);
      } catch(err){ callback(err, null); }
    };
    reader.readAsText(file);
  }

  // 自动备份
  function autoBackup(data){
    var backups = getAutoBackups();
    var backup = {
      reminders: data.reminders,
      lists: data.lists,
      time: new Date().toISOString()
    };
    backups.unshift(backup);
    if(backups.length > MAX_AUTO_BACKUPS) backups = backups.slice(0, MAX_AUTO_BACKUPS);
    localStorage.setItem(AUTO_KEY, JSON.stringify(backups));
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  }

  function getAutoBackups(){
    try { return JSON.parse(localStorage.getItem(AUTO_KEY)) || []; } catch(e){ return []; }
  }

  function getLastBackupTime(){
    var t = localStorage.getItem(LAST_BACKUP_KEY);
    if(!t) return null;
    return new Date(t);
  }

  function formatLastBackup(){
    var d = getLastBackupTime();
    if(!d) return '尚未备份';
    var now = new Date();
    var diff = Math.floor((now - d) / (60*60*1000));
    if(diff < 1) return '刚刚备份';
    if(diff < 24) return diff+'小时前备份';
    return Math.floor(diff/24)+'天前备份';
  }

  return {
    exportData: exportData,
    importFile: importFile,
    autoBackup: autoBackup,
    getLastBackupTime: getLastBackupTime,
    formatLastBackup: formatLastBackup
  };
})();
