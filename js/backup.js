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
        <h2>Export Backup</h2>
        <div class="form-group">
          <label>Copy this JSON text to save your data:</label>
          <textarea class="backup-textarea" readonly>${escapeHtml(json)}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" onclick="Backup.exportToFile();document.getElementById('modal-overlay').classList.remove('open')">Download JSON File</button>
          <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Close</button>
        </div>
      </div>
    `;
    overlay.classList.add('open');
  }

  function showImportDialog() {
    const overlay = document.getElementById('modal-overlay');
    overlay.innerHTML = `
      <div class="modal-content">
        <h2>Import Backup</h2>
        <div class="form-group">
          <label>Choose a backup file:</label>
          <input type="file" id="import-file-input" accept=".json" style="width:100%">
        </div>
        <p style="text-align:center;color:var(--text-secondary);margin:8px 0">or paste JSON:</p>
        <div class="form-group">
          <textarea class="backup-textarea" id="import-textarea" placeholder="Paste backup JSON here..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" onclick="Backup.doImportText()">Import from Text</button>
          <button class="btn-primary" onclick="Backup.doImportFile()">Import from File</button>
          <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancel</button>
        </div>
      </div>
    `;
    overlay.classList.add('open');
  }

  function doImportText() {
    const textarea = document.getElementById('import-textarea');
    if (!textarea || !textarea.value.trim()) {
      alert('Please paste JSON data first.');
      return;
    }
    const success = importFromText(textarea.value);
    if (success) {
      document.getElementById('modal-overlay').classList.remove('open');
      Views.refresh();
      Views.renderSidebar();
      alert('Data imported successfully!');
    } else {
      alert('Invalid backup data. Please check the JSON format.');
    }
  }

  function doImportFile() {
    const input = document.getElementById('import-file-input');
    if (!input || !input.files[0]) {
      alert('Please select a file first.');
      return;
    }
    importFromFile(input.files[0]).then(success => {
      if (success) {
        document.getElementById('modal-overlay').classList.remove('open');
        Views.refresh();
        Views.renderSidebar();
        alert('Data imported successfully!');
      } else {
        alert('Invalid backup file.');
      }
    }).catch(() => {
      alert('Failed to read file.');
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { exportToFile, importFromFile, importFromText, showExportDialog, showImportDialog, doImportText, doImportFile };
})();
