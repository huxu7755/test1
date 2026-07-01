/* backup.js - Backup, restore, and auto-backup */

const Backup = (() => {
  function showExportDialog() {
    const data = Storage.exportData();
    const json = JSON.stringify(data, null, 2);

    // Try file download first
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reminders_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        try {
          const data = JSON.parse(ev.target.result);
          const ok = Storage.importData(data);
          if (ok) {
            alert('导入成功！请刷新页面以查看数据。');
            location.reload();
          } else {
            alert('导入失败，数据格式不正确。');
          }
        } catch (ex) {
          alert('导入失败：' + ex.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function autoBackupEnabled() {
    const settings = Storage.loadSettings();
    return settings.autoBackup || false;
  }

  function setAutoBackup(enabled) {
    const settings = Storage.loadSettings();
    settings.autoBackup = enabled;
    if (enabled) {
      settings.lastBackup = Date.now();
    }
    Storage.saveSettings(settings);

    if (enabled) {
      scheduleAutoBackup();
    } else {
      clearAutoBackup();
    }
  }

  // Auto-backup: every 24h, keep last 5
  function performAutoBackup() {
    const settings = Storage.loadSettings();
    if (!settings.autoBackup) return;

    try {
      const data = Storage.exportData();
      data._autoBackup = true;
      data._backupTime = Date.now();
      const json = JSON.stringify(data);

      const backups = getAutoBackupList();
      backups.push({ time: data._backupTime, json });
      if (backups.length > 5) {
        backups.splice(0, backups.length - 5);
      }
      localStorage.setItem('reminders_auto_backups', JSON.stringify(backups));

      settings.lastBackup = data._backupTime;
      Storage.saveSettings(settings);
    } catch (e) {
      console.error('Auto-backup failed:', e);
    }
  }

  function getAutoBackupList() {
    try {
      const raw = localStorage.getItem('reminders_auto_backups');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  let autoBackupInterval = null;

  function scheduleAutoBackup() {
    // Clear existing interval before creating a new one
    if (autoBackupInterval) clearInterval(autoBackupInterval);
    // Check every hour; if last backup > 24h, perform backup
    autoBackupInterval = setInterval(() => {
      const settings = Storage.loadSettings();
      if (settings.autoBackup && Date.now() - settings.lastBackup > 24 * 60 * 60 * 1000) {
        performAutoBackup();
      }
    }, 60 * 60 * 1000);
  }

  function clearAutoBackup() {
    if (autoBackupInterval) {
      clearInterval(autoBackupInterval);
      autoBackupInterval = null;
    }
  }

  // Start auto-backup if enabled on load
  const settings = Storage.loadSettings();
  if (settings.autoBackup) {
    scheduleAutoBackup();
  }

  return {
    showExportDialog, showImportDialog,
    autoBackupEnabled, setAutoBackup
  };
})();
