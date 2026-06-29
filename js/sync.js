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
    try { localStorage.setItem(SYNC_KEY, JSON.stringify(config)); } catch(e){}
    return config;
  }

  function clearConfig(){
    try { localStorage.removeItem(SYNC_KEY); } catch(e){}
  }

  function getAuthHeader(config){
    return 'Basic ' + btoa(config.user + ':' + config.pass);
  }

  function upload(config, data, callback){
    var url = config.server + '/' + REMOTE_FILE;
    var json = JSON.stringify({ reminders: data.reminders, lists: data.lists, updatedAt: new Date().toISOString() });
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Authorization', getAuthHeader(config));
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = function(){ callback(xhr.status >= 200 && xhr.status < 300 ? null : xhr.status, xhr.status); };
    xhr.onerror = function(){ callback('网络错误', 0); };
    xhr.ontimeout = function(){ callback('连接超时', 0); };
    xhr.send(json);
  }

  function download(config, callback){
    var url = config.server + '/' + REMOTE_FILE;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Authorization', getAuthHeader(config));
    xhr.timeout = 15000;
    xhr.onload = function(){
      if(xhr.status === 404){ callback(null, null); return; }
      if(xhr.status >= 200 && xhr.status < 300){
        try { callback(null, JSON.parse(xhr.responseText)); } catch(e){ callback('解析失败', null); }
      } else { callback(xhr.status, null); }
    };
    xhr.onerror = function(){ callback('网络错误', 0); };
    xhr.ontimeout = function(){ callback('连接超时', 0); };
    xhr.send();
  }

  function sync(config, localData, callback){
    updateStatus('正在连接服务器...');
    download(config, function(err, remoteData){
      if(err && err !== 404){ updateStatus('同步失败: '+err); if(callback)callback(err); return; }
      if(!remoteData){
        updateStatus('首次同步，上传本地数据...');
        upload(config, localData, function(e){
          if(e) updateStatus('上传失败: '+e);
          else updateStatus('同步完成');
          if(callback)callback(e);
        });
        return;
      }
      var remoteTime = remoteData.updatedAt || '';
      var localTime = getLastLocalUpdate(localData);
      var merged;
      if(!localTime || remoteTime >= localTime){
        merged = { reminders: remoteData.reminders, lists: remoteData.lists };
        updateStatus('从服务器拉取数据...');
      } else {
        merged = { reminders: localData.reminders, lists: localData.lists };
        updateStatus('上传本地数据到服务器...');
      }
      upload(config, merged, function(e){
        if(e) updateStatus('同步失败: '+e);
        else updateStatus('同步完成');
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
