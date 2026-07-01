/* lists.js - List management (create, edit, delete, reorder) */

const ListManager = (() => {
  const LIST_COLORS = [
    '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff',
    '#5856d6', '#af52de', '#ff2d55', '#00c7be', '#30b0c7',
    '#32ade6', '#8e8e93', '#a2845e'
  ];

  function getLists() {
    const data = Storage.load();
    return data.lists.sort((a, b) => a.order - b.order);
  }

  function getList(id) {
    const data = Storage.load();
    return data.lists.find(l => l.id === id);
  }

  function createList(name, color, icon) {
    const data = Storage.load();
    const list = {
      id: Storage.generateId('list'),
      name: name || '新建列表',
      color: color || LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)],
      icon: icon || 'list',
      order: data.lists.length
    };
    data.lists.push(list);
    Storage.save(data);
    return list;
  }

  function updateList(id, updates) {
    const data = Storage.load();
    const list = data.lists.find(l => l.id === id);
    if (!list) return null;
    Object.assign(list, updates);
    Storage.save(data);
    return list;
  }

  function deleteList(id) {
    const data = Storage.load();
    const idx = data.lists.findIndex(l => l.id === id);
    if (idx === -1) return false;
    data.lists.splice(idx, 1);
    data.reminders = data.reminders.filter(r => r.listId !== id);
    Storage.save(data);
    return true;
  }

  function reorderLists(orderedIds) {
    const data = Storage.load();
    orderedIds.forEach((id, i) => {
      const list = data.lists.find(l => l.id === id);
      if (list) list.order = i;
    });
    Storage.save(data);
  }

  function getListColor(listId) {
    const list = getList(listId);
    return list ? list.color : '#8e8e93';
  }

  function getListIcon(listId) {
    const list = getList(listId);
    return list ? list.icon : 'list';
  }

  return { LIST_COLORS, getLists, getList, createList, updateList, deleteList, reorderLists, getListColor, getListIcon };
})();
