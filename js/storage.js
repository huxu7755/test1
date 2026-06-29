/* storage.js - Data persistence layer using localStorage */

const Storage = (() => {
  const STORAGE_KEY = 'iosRemindersData';
  const TRASH_KEY = 'iosRemindersTrash';
  const SETTINGS_KEY = 'iosRemindersSettings';
  const TRASH_DAYS = 30;

  const defaultData = {
    lists: [
      { id: 'list_1', name: 'Reminders', color: '#ff9500', icon: 'list', order: 0 },
      { id: 'list_2', name: 'Work', color: '#007aff', icon: 'briefcase', order: 1 },
      { id: 'list_3', name: 'Personal', color: '#34c759', icon: 'person', order: 2 }
    ],
    reminders: [
      { id: 'rem_1', listId: 'list_1', title: 'Buy groceries', notes: 'Milk, eggs, bread', url: '', dueDate: '', dueTime: '', isFlagged: true, priority: 1, tags: ['shopping'], image: null, hasLocation: false, hasMessaging: false, completed: false, completedAt: null, createdAt: Date.now(), order: 0 },
      { id: 'rem_2', listId: 'list_2', title: 'Finish quarterly report', notes: 'Due by Friday', url: 'https://docs.example.com', dueDate: '2026-06-30', dueTime: '17:00', isFlagged: false, priority: 2, tags: ['work', 'urgent'], image: null, hasLocation: false, hasMessaging: true, completed: false, completedAt: null, createdAt: Date.now() - 86400000, order: 1 },
      { id: 'rem_3', listId: 'list_1', title: 'Call dentist', notes: '', url: '', dueDate: '2026-07-03', dueTime: '10:00', isFlagged: false, priority: 1, tags: ['health'], image: null, hasLocation: false, hasMessaging: false, completed: false, completedAt: null, createdAt: Date.now() - 172800000, order: 2 }
    ]
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lists && data.reminders) return data;
      }
    } catch (e) { /* corrupted, use default */ }
    save(defaultData);
    return JSON.parse(JSON.stringify(defaultData));
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { defaultListId: 'list_1' };
    } catch (e) { return { defaultListId: 'list_1' }; }
  }

  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  function getTrash() {
    try {
      const raw = localStorage.getItem(TRASH_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveTrash(trash) {
    localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
  }

  function moveToTrash(reminder) {
    const trash = getTrash();
    trash.push({
      ...reminder,
      deletedAt: Date.now()
    });
    saveTrash(trash);
  }

  function cleanTrash() {
    const now = Date.now();
    const trash = getTrash().filter(item => {
      return (now - item.deletedAt) < (TRASH_DAYS * 24 * 60 * 60 * 1000);
    });
    saveTrash(trash);
    return trash;
  }

  function restoreFromTrash(reminderId) {
    let trash = getTrash();
    const idx = trash.findIndex(r => r.id === reminderId);
    if (idx === -1) return null;
    const restored = trash[idx];
    trash.splice(idx, 1);
    saveTrash(trash);
    return restored;
  }

  function exportData() {
    const data = load();
    const trash = getTrash();
    const settings = getSettings();
    return JSON.stringify({ data, trash, settings, exportedAt: new Date().toISOString() }, null, 2);
  }

  function importData(jsonStr) {
    try {
      const imported = JSON.parse(jsonStr);
      if (imported.data && imported.data.lists && imported.data.reminders) {
        save(imported.data);
        if (imported.trash) saveTrash(imported.trash);
        if (imported.settings) saveSettings(imported.settings);
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  function generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  // Auto-clean trash on load
  cleanTrash();

  return { load, save, getSettings, saveSettings, getTrash, saveTrash, moveToTrash, cleanTrash, restoreFromTrash, exportData, importData, generateId };
})();
