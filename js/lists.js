/* lists.js — 列表管理（创建/编辑/删除列表） */
'use strict';

var ListManager = (function(){
  var colors = ['#007aff','#ff3b30','#34c759','#ff9500','#af52de','#5ac8fa','#ffcc00'];

  function randColor(){ return colors[Math.floor(Math.random()*colors.length)]; }
  function lid(){ return 'l'+Date.now()+Math.random().toString(36).slice(2,8); }

  function initDefaultLists(D){
    if(!D.lists.length){
      D.lists=[
        {id:lid(),name:'提醒事项',type:'标准',color:'#007aff',icon:'📋'},
        {id:lid(),name:'工作',type:'工作',color:'#ff9500',icon:'💼'},
        {id:lid(),name:'购物清单',type:'购物清单',color:'#34c759',icon:'🛒'}
      ];
    }
  }

  function saveList(D, name, type, icon, color, editId){
    var list = {
      id: editId || lid(),
      name: name,
      type: type,
      color: color,
      icon: icon
    };
    if(editId){
      var idx = D.lists.findIndex(function(l){ return l.id === editId; });
      if(idx >= 0) D.lists[idx] = list;
    } else {
      D.lists.push(list);
    }
  }

  // 暴露给全局
  return {
    colors: colors,
    randColor: randColor,
    lid: lid,
    initDefaultLists: initDefaultLists,
    saveList: saveList
  };
})();
