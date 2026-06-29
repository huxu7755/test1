/* sync.js — WebDAV 多端同步引擎 */
'use strict';

var SyncManager = (function(){
  var SYNC_KEY = 'sync_config';
  var REMOTE_FILE = 'reminders-data.json';

  function getConfig(){
    try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || null; } catch(e){ return null; }
  }

  function saveConfig(server, user, pass){
    var config = { server: server.replace(/\/+$/,''), user: user, pass: pass };
    localStorage.setItem(SYNC_KEY, JSON.stringify(config));
    return config;
  }

  function clearConfig(){
    localStorage.removeItem(SYNC_KEY);
  }

  function getAuthHeader(config){
    return 'Basic ' + btoa(config.user + ':' + config.pass);
  }

  // 上传数据到 WebDAV
  function upload(config, data, callback){
    var url = config.server + '/' + REMOTE_FILE;
    var json = JSON.stringify({ reminders: data.reminders, lists: data.lists, updatedAt: new Date().toISOString() });
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Authorization', getAuthHeader(config));
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function(){ callback(xhr.status >= 200 && xhr.status < 300 ? null : xhr.status, xhr.status); };
    xhr.onerror = function(){ callback('网络错误', 0); };
    xhr.send(json);
  }

  // 从 WebDAV 下载数据
  function download(config, callback){
    var url = config.server + '/' + REMOTE_FILE;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Authorization', getAuthHeader(config));
    xhr.onload = function(){
      if(xhr.status === 404){ callback(null, null); return; } // 远程无数据
      if(xhr.status >= 200 && xhr.status < 300){
        try { callback(null, JSON.parse(xhr.responseText)); } catch(e){ callback('解析失败', null); }
      } else { callback(xhr.status, null); }
    };
    xhr.onerror = function(){ callback('网络错误', 0); };
    xhr.send();
  }

  // 同步：先下载远程 → 合并 → 上传
  function sync(config, localData, callback){
    updateStatus('正在连接服务器...');
    download(config, function(err, remoteData){
      if(err && err !== 404){ updateStatus('同步失败: '+err); if(callback)callback(err); return; }
      if(!remoteData){
        // 远程无数据，直接上传本地
        updateStatus('首次同步，上传本地数据...');
        upload(config, localData, function(e){
          if(e) updateStatus('上传失败: '+e);
          else updateStatus('同步完成 ✓');
          if(callback)callback(e);
        });
        return;
      }
      // 比较时间戳决定合并方向
      var remoteTime = remoteData.updatedAt || '';
      var localTime = getLastLocalUpdate(localData);
      var merged;
      if(!localTime || remoteTime >= localTime){
        // 远程更新，以远程为准
        merged = { reminders: remoteData.reminders, lists: remoteData.lists };
        updateStatus('从服务器拉取数据...');
      } else {
        // 本地更新，以上传为准
        merged = { reminders: localData.reminders, lists: localData.lists };
        updateStatus('上传本地数据到服务器...');
      }
      upload(config, merged, function(e){
        if(e) updateStatus('同步失败: '+e);
        else updateStatus('同步完成 ✓');
        if(callback)callback(e, merged);
      });
    });
  }

  function getLastLocalUpdate(data){
    var all = (data.reminders||[]).concat([]);
    if(!all.length) return null;
    var latest = all.reduce(function(max, r){ var t = r.createdAt||''; return t>max?t:max; }, '');
    return latest;
  }

  function updateStatus(msg){
    var el = document.getElementById('syncStatus');
    if(el) el.textContent = msg;
  }

  return {
    getConfig: getConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    upload: upload,
    download: download,
    sync: sync,
    updateStatus: updateStatus
  };
})();
