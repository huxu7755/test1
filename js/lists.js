/* lists.js - List management module */

const ListManager = (() => {
  const LIST_COLORS = [
    '#FF9500', '#FF3B30', '#007AFF', '#34C759', '#AF52DE',
    '#FF2D55', '#5856D6', '#00C7BE', '#FF9500', '#8E8E93',
    '#FFD60A', '#32D74B', '#BF5AF2'
  ];

  const LIST_ICONS = [
    { id: 'list', char: '\u{1F4CB}', name: '清单' },
    { id: 'briefcase', char: '\u{1F4BC}', name: '公文包' },
    { id: 'person', char: '\u{1F464}', name: '人物' },
    { id: 'home', char: '\u{1F3E0}', name: '住宅' },
    { id: 'heart', char: '\u2764', name: '爱心' },
    { id: 'star', char: '\u2B50', name: '星星' },
    { id: 'book', char: '\u{1F4D6}', name: '书籍' },
    { id: 'flag', char: '\u{1F6A9}', name: '旗帜' },
    { id: 'calendar', char: '\u{1F4C5}', name: '日历' },
    { id: 'check', char: '\u2705', name: '勾选' },
    { id: 'clock', char: '\u{1F552}', name: '时钟' },
    { id: 'money', char: '\u{1F4B0}', name: '金钱' },
    { id: 'gift', char: '\u{1F381}', name: '礼物' },
    { id: 'phone', char: '\u{1F4DE}', name: '电话' },
    { id: 'mail', char: '\u{1F4E7}', name: '邮件' },
    { id: 'note', char: '\u{1F3B5}', name: '音乐' },
    { id: 'cart', char: '\u{1F6D2}', name: '购物' },
    { id: 'food', char: '\u{1F354}', name: '食物' },
    { id: 'coffee', char: '\u2615', name: '咖啡' },
    { id: 'airplane', char: '\u2708', name: '飞机' },
    { id: 'car', char: '\u{1F697}', name: '汽车' },
    { id: 'bike', char: '\u{1F6B2}', name: '自行车' },
    { id: 'train', char: '\u{1F686}', name: '火车' },
    { id: 'bus', char: '\u{1F68C}', name: '公交' },
    { id: 'hospital', char: '\u{1F3E5}', name: '医院' },
    { id: 'school', char: '\u{1F3EB}', name: '学校' },
    { id: 'bank', char: '\u{1F3E6}', name: '银行' },
    { id: 'hotel', char: '\u{1F3E8}', name: '酒店' },
    { id: 'sport', char: '\u26BD', name: '运动' },
    { id: 'game', char: '\u{1F3AE}', name: '游戏' },
    { id: 'art', char: '\u{1F3A8}', name: '艺术' },
    { id: 'camera', char: '\u{1F4F7}', name: '相机' },
    { id: 'tv', char: '\u{1F4FA}', name: '电视' },
    { id: 'laptop', char: '\u{1F4BB}', name: '笔记本' },
    { id: 'key', char: '\u{1F511}', name: '钥匙' },
    { id: 'lock', char: '\u{1F512}', name: '锁' },
    { id: 'bulb', char: '\u{1F4A1}', name: '灯泡' },
    { id: 'fire', char: '\u{1F525}', name: '火焰' },
    { id: 'water', char: '\u{1F4A7}', name: '水滴' },
    { id: 'leaf', char: '\u{1F33F}', name: '叶子' },
    { id: 'sun', char: '\u2600', name: '太阳' },
    { id: 'moon', char: '\u{1F319}', name: '月亮' },
    { id: 'cloud', char: '\u2601', name: '云' },
    { id: 'umbrella', char: '\u2614', name: '雨伞' },
    { id: 'bell', char: '\u{1F514}', name: '铃铛' },
    { id: 'pin', char: '\u{1F4CC}', name: '图钉' },
    { id: 'tools', char: '\u{1F6E0}', name: '工具' },
    { id: 'pill', char: '\u{1F48A}', name: '药丸' }
  ];

  let lists = [];

  function loadLists(data) {
    lists = data || [];
    if (lists.length === 0) {
      lists = [
        { id: 'reminders', name: '提醒', color: '#FF9500', icon: 'list' },
        { id: 'work', name: '工作', color: '#007AFF', icon: 'briefcase' },
        { id: 'personal', name: '个人', color: '#34C759', icon: 'person' }
      ];
    }
  }

  function saveLists() {
    Storage.updateLists(lists);
  }

  function getLists() {
    return [...lists];
  }

  function getList(id) {
    return lists.find(l => l.id === id) || null;
  }

  function createList(name, color, icon) {
    const id = 'list_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    lists.push({ id, name, color, icon });
    saveLists();
    return id;
  }

  function updateList(id, updates) {
    const list = lists.find(l => l.id === id);
    if (!list) return;
    Object.assign(list, updates);
    saveLists();
  }

  function deleteList(id) {
    ReminderManager.deleteRemindersByList(id);
    lists = lists.filter(l => l.id !== id);
    saveLists();
  }

  function reorderLists(orderedIds) {
    const oldOrder = [...lists];
    lists.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
    saveLists();
  }

  return {
    LIST_COLORS, LIST_ICONS,
    loadLists, getLists, getList, createList, updateList, deleteList, reorderLists, saveLists
  };
})();
