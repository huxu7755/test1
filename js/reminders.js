/* reminders.js - Reminder CRUD operations */

const ReminderManager = (() => {
  function getReminders(listId) {
    const data = Storage.load();
    const reminders = listId
      ? data.reminders.filter(r => r.listId === listId && !r.completed)
      : data.reminders.filter(r => !r.completed);
    return reminders.sort((a, b) => a.order - b.order);
  }

  function getReminder(id) {
    const data = Storage.load();
    return data.reminders.find(r => r.id === id) || null;
  }

  function createReminder(listId, title) {
    const data = Storage.load();
    const reminders = data.reminders.filter(r => r.listId === listId);
    const reminder = {
      id: Storage.generateId('rem'),
      listId,
      title: title || 'New Reminder',
      notes: '',
      url: '',
      dueDate: '',
      dueTime: '',
      isFlagged: false,
      priority: 0, /* 0=none, 1=low, 2=medium, 3=high */
      tags: [],
      image: null,
      hasLocation: false,
      hasMessaging: false,
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
      order: reminders.length
    };
    data.reminders.push(reminder);
    Storage.save(data);
    return reminder;
  }

  function updateReminder(id, updates) {
    const data = Storage.load();
    const reminder = data.reminders.find(r => r.id === id);
    if (!reminder) return null;
    Object.assign(reminder, updates);
    if (updates.completed === true) reminder.completedAt = Date.now();
    if (updates.completed === false) reminder.completedAt = null;
    Storage.save(data);
    return reminder;
  }

  function toggleComplete(id) {
    const r = getReminder(id);
    if (!r) return null;
    return updateReminder(id, { completed: !r.completed, completedAt: r.completed ? null : Date.now() });
  }

  function toggleFlag(id) {
    const r = getReminder(id);
    if (!r) return null;
    return updateReminder(id, { isFlagged: !r.isFlagged });
  }

  function deleteReminder(id) {
    const data = Storage.load();
    const reminder = data.reminders.find(r => r.id === id);
    if (!reminder) return false;
    Storage.moveToTrash(reminder);
    data.reminders = data.reminders.filter(r => r.id !== id);
    Storage.save(data);
    return true;
  }

  function getTodaysReminders() {
    const today = new Date().toISOString().split('T')[0];
    const data = Storage.load();
    return data.reminders.filter(r => r.dueDate === today && !r.completed)
      .sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || ''));
  }

  function getScheduledReminders() {
    const data = Storage.load();
    return data.reminders.filter(r => r.dueDate && !r.completed)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime || '').localeCompare(b.dueTime || ''));
  }

  function getAllReminders() {
    const data = Storage.load();
    return data.reminders.filter(r => !r.completed).sort((a, b) => a.order - b.order);
  }

  function getFlaggedReminders() {
    const data = Storage.load();
    return data.reminders.filter(r => r.isFlagged && !r.completed)
      .sort((a, b) => a.order - b.order);
  }

  function getCompletedReminders(listId) {
    const data = Storage.load();
    return (listId
      ? data.reminders.filter(r => r.listId === listId && r.completed)
      : data.reminders.filter(r => r.completed)
    ).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }

  function getRemindersByDate(dateStr) {
    const data = Storage.load();
    return data.reminders.filter(r => r.dueDate === dateStr);
  }

  function searchReminders(query, listId) {
    const q = query.toLowerCase();
    const data = Storage.load();
    let results = data.reminders;
    if (listId) results = results.filter(r => r.listId === listId);
    return results.filter(r => {
      return r.title.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q));
    });
  }

  function filterReminders(listId, filters) {
    let reminders = getReminders(listId);
    if (filters.search) {
      reminders = searchReminders(filters.search, listId);
    }
    if (filters.priority !== undefined && filters.priority !== '') {
      reminders = reminders.filter(r => r.priority === parseInt(filters.priority));
    }
    if (filters.flagged) {
      reminders = reminders.filter(r => r.isFlagged);
    }
    if (filters.tag) {
      reminders = reminders.filter(r => r.tags.includes(filters.tag));
    }
    if (filters.dateFrom) {
      reminders = reminders.filter(r => r.dueDate >= filters.dateFrom);
    }
    return reminders;
  }

  function getAllTags() {
    const data = Storage.load();
    const tagSet = new Set();
    data.reminders.forEach(r => r.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }

  function getRecentlyDeleted() {
    const trash = Storage.getTrash();
    const now = Date.now();
    return trash.filter(item => (now - item.deletedAt) < (30 * 24 * 60 * 60 * 1000));
  }

  function restoreReminder(id) {
    const restored = Storage.restoreFromTrash(id);
    if (!restored) return null;
    const data = Storage.load();
    const { deletedAt, ...clean } = restored;
    data.reminders.push(clean);
    Storage.save(data);
    return clean;
  }

  function clearCompleted(listId) {
    const data = Storage.load();
    const completed = listId
      ? data.reminders.filter(r => r.listId === listId && r.completed)
      : data.reminders.filter(r => r.completed);
    completed.forEach(r => Storage.moveToTrash(r));
    data.reminders = data.reminders.filter(r => !completed.includes(r));
    Storage.save(data);
    return completed.length;
  }

  return {
    getReminders, getReminder, createReminder, updateReminder,
    toggleComplete, toggleFlag, deleteReminder,
    getTodaysReminders, getScheduledReminders, getAllReminders,
    getFlaggedReminders, getCompletedReminders, getRemindersByDate,
    searchReminders, filterReminders, getAllTags,
    getRecentlyDeleted, restoreReminder, clearCompleted
  };
})();
