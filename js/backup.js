/* backup.js - JSON backup/export and restore/import */

const Backup = (() => {
  function exportToFile() {
    const json = Storage.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    a.href = url;
    a.download = `reminders_backup_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const success = Storage.importData(e.target.result);
          resolve(success);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function importFromText(text) {
    return Storage.importData(text);
  }

  function showExportDialog() {
    const json = Storage.exportData();
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal-content">
        <h2>导出备份</h2>
        <div class="form-group">
          <label>复制以下 JSON 文本以保存数据：</label>
          <textarea class="backup-textarea" readonly>${escapeHtml(json)}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" onclick="Backup.exportToFile();document.getElementById('modal-overlay').classList.remove('open')">下载 JSON 文件</button>
          <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">关闭</button>
        </div>
      </div>
    `;
    overlay.classList.add('open');
  }

  function showImportDialog() {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal-content">
        <h2>导入备份</h2>
        <div class="form-group">
          <label>选择备份文件：</label>
          <input type="file" id="import-file-input" accept=".json" style="width:100%">
        </div>
        <p style="text-align:center;color:var(--text-secondary);margin:8px 0">或粘贴 JSON：</p>
        <div class="form-group">
          <textarea class="backup-textarea" id="import-textarea" placeholder="在此粘贴备份 JSON..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" onclick="Backup.doImportText()">从文本导入</button>
          <button class="btn-primary" onclick="Backup.doImportFile()">从文件导入</button>
          <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">取消</button>
        </div>
      </div>
    `;
    overlay.classList.add('open');
  }

  function doImportText() {
    const textarea = document.getElementById('import-textarea');
    if (!textarea || !textarea.value.trim()) {
      alert('请先粘贴 JSON 数据。');
      return;
    }
    const success = importFromText(textarea.value);
    if (success) {
      document.getElementById('modal-overlay').classList.remove('open');
      Views.refresh();
      Views.renderSidebar();
      alert('数据导入成功！');
    } else {
      alert('无效的备份数据，请检查 JSON 格式。');
    }
  }

  function doImportFile() {
    const input = document.getElementById('import-file-input');
    if (!input || !input.files[0]) {
      alert('请先选择文件。');
      return;
    }
    importFromFile(input.files[0]).then(success => {
      if (success) {
        document.getElementById('modal-overlay').classList.remove('open');
        Views.refresh();
        Views.renderSidebar();
        alert('数据导入成功！');
      } else {
        alert('无效的备份文件。');
      }
    }).catch(() => {
      alert('读取文件失败。');
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { exportToFile, importFromFile, importFromText, showExportDialog, showImportDialog, doImportText, doImportFile };
})();
