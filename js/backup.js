/* backup.js — 本地备份恢复模块 */
'use strict';

var BackupManager = (function(){
  var AUTO_KEY = 'auto_backups';
  var MAX_AUTO_BACKUPS = 5;
  var LAST_BACKUP_KEY = 'last_backup_time';

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

    if(typeof window.AndroidStorage !== 'undefined' && window.AndroidStorage.saveData){
      try { window.AndroidStorage.saveData('backup_'+ds, json); } catch(e){}
    }

    showBackupText(json, ds);
  }

  function showBackupText(json, ds){
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:20px;width:90%;max-width:400px;max-height:70vh;overflow:auto;';
    var escapedJson = json.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    box.innerHTML = '<div style="font-weight:700;font-size:18px;margin-bottom:12px;">备份已导出</div>'+
      '<div style="font-size:13px;color:#666;margin-bottom:8px;">文件: reminders-backup-'+ds+'.json</div>'+
      '<div style="font-size:13px;color:#666;margin-bottom:8px;">如果下载未开始，请复制下面的文本手动保存：</div>'+
      '<textarea readonly style="width:100%;height:150px;font-size:11px;font-family:monospace;border:1px solid #ddd;border-radius:8px;padding:8px;resize:none;" onclick="this.select()">'+escapedJson+'</textarea>'+
      '<button style="margin-top:10px;width:100%;padding:12px;background:#007aff;color:#fff;border:none;border-radius:10px;font-size:16px;cursor:pointer;" id="copyBackupBtn">复制备份文本</button>'+
      '<button style="margin-top:8px;width:100%;padding:12px;background:#eee;border:none;border-radius:10px;font-size:16px;cursor:pointer;" id="closeBackupBtn">关闭</button>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById('copyBackupBtn').onclick = function(){
      var ta = box.querySelector('textarea');
      navigator.clipboard.writeText(ta.value).then(function(){
        this.textContent = '已复制!';
      }.bind(this)).catch(function(){
        ta.select();
        this.textContent = '已选中(请手动复制)';
      }.bind(this));
    };
    document.getElementById('closeBackupBtn').onclick = function(){ document.body.removeChild(overlay); };
  }

  function importFile(file, callback){
    var reader = new FileReader();
    reader.onload = function(e){
      try {
        var data = JSON.parse(e.target.result);
        if(!data.reminders || !Array.isArray(data.reminders) || !data.lists || !Array.isArray(data.lists)){
          throw new Error('Invalid format');
        }
        callback(null, data);
      } catch(err){ callback(err, null); }
    };
    reader.onerror = function(){ callback(new Error('读取文件失败'), null); };
    reader.readAsText(file);
  }

  function importBackupFromText(){
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:20px;width:90%;max-width:400px;max-height:70vh;overflow:auto;';
    box.innerHTML = '<div style="font-weight:700;font-size:18px;margin-bottom:12px;">从文本恢复备份</div>'+
      '<div style="font-size:13px;color:#666;margin-bottom:8px;">请粘贴之前导出的备份 JSON 文本：</div>'+
      '<textarea id="backupTextInput" style="width:100%;height:200px;font-size:11px;font-family:monospace;border:1px solid #ddd;border-radius:8px;padding:8px;resize:none;" placeholder="粘贴 JSON 备份数据..."></textarea>'+
      '<button id="importBackupConfirmBtn" style="margin-top:10px;width:100%;padding:12px;background:#007aff;color:#fff;border:none;border-radius:10px;font-size:16px;cursor:pointer;">恢复数据</button>'+
      '<button id="importBackupCancelBtn" style="margin-top:8px;width:100%;padding:12px;background:#eee;border:none;border-radius:10px;font-size:16px;cursor:pointer;">取消</button>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('importBackupConfirmBtn').onclick = function(){
      var t = document.getElementById('backupTextInput').value;
      try {
        var d = JSON.parse(t);
        if(!d.reminders || !Array.isArray(d.reminders) || !d.lists || !Array.isArray(d.lists)) throw new Error();
        if(!confirm('恢复备份将覆盖当前所有数据，确定继续？')) return;
        if(typeof window.restoreRemindersData === 'function'){
          window.restoreRemindersData(d);
          document.body.removeChild(overlay);
        }
      } catch(e){ alert('无效的备份数据格式，请检查 JSON 是否完整'); }
    };
    document.getElementById('importBackupCancelBtn').onclick = function(){ document.body.removeChild(overlay); };
  }

  function autoBackup(data){
    var backups = getAutoBackups();
    var backup = { reminders: data.reminders, lists: data.lists, time: new Date().toISOString() };
    backups.unshift(backup);
    if(backups.length > MAX_AUTO_BACKUPS) backups = backups.slice(0, MAX_AUTO_BACKUPS);
    try { localStorage.setItem(AUTO_KEY, JSON.stringify(backups)); } catch(e){}
    try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch(e){}
  }

  function getAutoBackups(){
    try { return JSON.parse(localStorage.getItem(AUTO_KEY)) || []; } catch(e){ return []; }
  }

  function getLastBackupTime(){
    try { var t = localStorage.getItem(LAST_BACKUP_KEY); return t ? new Date(t) : null; } catch(e){ return null; }
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
    importBackupFromText: importBackupFromText,
    autoBackup: autoBackup,
    getLastBackupTime: getLastBackupTime,
    formatLastBackup: formatLastBackup
  };
})();
