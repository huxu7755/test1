/* storage.js - localStorage persistence */

const Storage = (() => {
  const STORAGE_KEY = 'reminders_data';
  const SETTINGS_KEY = 'reminders_settings';

  // Internal registry for module data
  let _reminders = [];
  let _deletedReminders = [];
  let _lists = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        _lists = data.lists || [];
        _reminders = data.reminders || [];
        _deletedReminders = data.deletedReminders || [];

        ListManager.loadLists(_lists);
        ReminderManager.loadData({ reminders: _reminders, deletedReminders: _deletedReminders });
      } else {
        ListManager.loadLists([]);
        ReminderManager.loadData({ reminders: [], deletedReminders: [] });
        _lists = ListManager.getLists();
        save();
      }
    } catch (e) {
      console.error('Storage load failed:', e);
      ListManager.loadLists([]);
      ReminderManager.loadData({ reminders: [], deletedReminders: [] });
    }
  }

  function persist() {
    try {
      const settings = loadSettings();
      const data = {
        lists: _lists,
        reminders: _reminders,
        deletedReminders: _deletedReminders,
        settings: settings,
        version: '2.0'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Storage persist failed:', e);
    }
  }

  function save() { persist(); }

  // Called by ReminderManager when data changes
  function updateReminders(reminders, deleted) {
    _reminders = reminders;
    _deletedReminders = deleted;
    persist();
  }

  // Called by ListManager when data changes
  function updateLists(lists) {
    _lists = lists;
    persist();
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { autoBackup: false, lastBackup: 0 };
    } catch {
      return { autoBackup: false, lastBackup: 0 };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function exportData() {
    const settings = loadSettings();
    return {
      lists: _lists,
      reminders: _reminders,
      deletedReminders: _deletedReminders,
      settings,
      version: '2.0',
      exportedAt: Date.now()
    };
  }

  function importData(data) {
    if (!data || typeof data !== 'object') return false;
    try {
      if (data.lists) {
        _lists = data.lists;
        ListManager.loadLists(_lists);
      }
      if (data.reminders !== undefined) {
        _reminders = data.reminders;
        _deletedReminders = data.deletedReminders || [];
        ReminderManager.loadData({ reminders: _reminders, deletedReminders: _deletedReminders });
      }
      if (data.settings) {
        saveSettings(data.settings);
      }
      persist();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  return { load, save, updateReminders, updateLists, loadSettings, saveSettings, exportData, importData };
})();
