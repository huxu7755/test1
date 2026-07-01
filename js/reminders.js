/* reminders.js - Reminder CRUD and queries */

const ReminderManager = (() => {
  let reminders = [];
  let deletedReminders = []; // Soft-delete: stored for 30 days

  function loadData(data) {
    reminders = data.reminders || [];
    deletedReminders = data.deletedReminders || [];
    // Clean expired soft-deletes (older than 30 days)
    const now = Date.now();
    deletedReminders = deletedReminders.filter(r => now - r.deletedAt < 30 * 24 * 60 * 60 * 1000);
  }

  function save() {
    Storage.updateReminders(reminders, deletedReminders);
  }

  function getReminders(listId) {
    return reminders.filter(r => r.listId === listId && !r.completed);
  }

  function getReminder(id) {
    return reminders.find(r => r.id === id) || null;
  }

  function getAllReminders() {
    return reminders.filter(r => !r.completed);
  }

  function getTodaysReminders() {
    const today = formatDateStr(new Date());
    return reminders.filter(r => !r.completed && r.dueDate === today);
  }

  function getScheduledReminders() {
    return reminders.filter(r => !r.completed && r.dueDate).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate) || (a.dueTime || '').localeCompare(b.dueTime || '');
    });
  }

  function getFlaggedReminders() {
    return reminders.filter(r => !r.completed && r.isFlagged);
  }

  function getCompletedReminders(listId) {
    if (listId === null || listId === undefined) {
      return reminders.filter(r => r.completed);
    }
    return reminders.filter(r => r.completed && r.listId === listId);
  }

  function getRecentlyDeleted() {
    return [...deletedReminders].sort((a, b) => b.deletedAt - a.deletedAt);
  }

  function getAllTags() {
    const tagSet = new Set();
    reminders.filter(r => !r.completed).forEach(r => {
      if (r.tags) r.tags.forEach(t => tagSet.add(t));
    });
    return [...tagSet].sort();
  }

  function getViewCounts() {
    const today = formatDateStr(new Date());
    const allActive = reminders.filter(r => !r.completed);
    const todays = allActive.filter(r => r.dueDate === today);
    const scheduled = allActive.filter(r => r.dueDate);
    const flagged = allActive.filter(r => r.isFlagged);
    const completed = reminders.filter(r => r.completed);

    return {
      today: todays.length,
      scheduled: scheduled.length,
      all: allActive.length,
      flagged: flagged.length,
      completed: completed.length
    };
  }

  function createReminder(listId, title, extraFields) {
    const now = Date.now();
    const r = {
      id: 'rem_' + now + '_' + Math.random().toString(36).substr(2, 6),
      listId,
      title,
      notes: '',
      url: '',
      dueDate: '',
      dueTime: '',
      isFlagged: false,
      priority: 0,
      tags: [],
      completed: false,
      completedAt: null,
      hasLocation: false,
      locationAddress: '',
      hasMessaging: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      ...extraFields
    };
    reminders.push(r);
    save();
    return r.id;
  }

  function updateReminder(id, fields) {
    const r = reminders.find(r => r.id === id);
    if (!r) return null;
    Object.assign(r, fields, { updatedAt: Date.now() });
    save();
    return r;
  }

  function toggleComplete(id) {
    const r = reminders.find(r => r.id === id);
    if (!r) return null;
    if (r.completed) {
      r.completed = false;
      r.completedAt = null;
    } else {
      r.completed = true;
      r.completedAt = Date.now();
    }
    r.updatedAt = Date.now();
    save();
    return r;
  }

  function toggleFlag(id) {
    const r = reminders.find(r => r.id === id);
    if (!r) return null;
    r.isFlagged = !r.isFlagged;
    r.updatedAt = Date.now();
    save();
    return r;
  }

  function deleteReminder(id) {
    const idx = reminders.findIndex(r => r.id === id);
    if (idx === -1) return false;
    const [deleted] = reminders.splice(idx, 1);
    deleted.deletedAt = Date.now();
    deletedReminders.push(deleted);
    save();
    return true;
  }

  function restoreReminder(id) {
    const idx = deletedReminders.findIndex(r => r.id === id);
    if (idx === -1) return false;
    const [restored] = deletedReminders.splice(idx, 1);
    restored.deletedAt = null;
    restored.updatedAt = Date.now();
    reminders.push(restored);
    save();
    return true;
  }

  function permanentlyDeleteReminder(id) {
    deletedReminders = deletedReminders.filter(r => r.id !== id);
    save();
  }

  function deleteRemindersByList(listId) {
    const toDelete = reminders.filter(r => r.listId === listId);
    reminders = reminders.filter(r => r.listId !== listId);
    toDelete.forEach(r => {
      r.deletedAt = Date.now();
    });
    deletedReminders.push(...toDelete);
    save();
  }

  function clearCompleted(listId) {
    if (listId) {
      const toDelete = reminders.filter(r => r.listId === listId && r.completed);
      reminders = reminders.filter(r => !(r.listId === listId && r.completed));
      toDelete.forEach(r => {
        r.deletedAt = Date.now();
      });
      deletedReminders.push(...toDelete);
    } else {
      const toDelete = reminders.filter(r => r.completed);
      reminders = reminders.filter(r => !r.completed);
      toDelete.forEach(r => {
        r.deletedAt = Date.now();
      });
      deletedReminders.push(...toDelete);
    }
    save();
  }

  function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getRemindersByDate(dateStr) {
    return reminders.filter(r => !r.completed && r.dueDate === dateStr);
  }

  return {
    loadData, getReminders, getReminder, getAllReminders,
    getTodaysReminders, getScheduledReminders, getFlaggedReminders, getCompletedReminders,
    getRecentlyDeleted, getAllTags, getViewCounts, getRemindersByDate,
    createReminder, updateReminder, toggleComplete, toggleFlag,
    deleteReminder, restoreReminder, permanentlyDeleteReminder,
    deleteRemindersByList, clearCompleted,
    save
  };
})();
