/* calendar.js - Calendar view component */

const Calendar = (() => {
  let currentDate = new Date();
  let selectedDate = null;

  function init() {
    currentDate = new Date();
    selectedDate = null;
    render();
  }

  function render() {
    const section = document.getElementById('calendar-section');
    if (!section) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let html = `<div class="cal-header">
      <button class="cal-nav" onclick="Calendar.prevMonth()">&lt;</button>
      <span class="cal-month">${monthNames[month]} ${year}</span>
      <button class="cal-nav" onclick="Calendar.nextMonth()">&gt;</button>
    </div>`;

    html += '<div class="cal-grid">';
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(d => { html += `<div class="cal-day-header">${d}</div>`; });

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      html += `<div class="cal-day other-month">${d}</div>`;
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let cls = 'cal-day';
      if (dateStr === todayStr) cls += ' today';
      if (selectedDate === dateStr) cls += ' selected';

      const reminders = ReminderManager.getRemindersByDate(dateStr);
      if (reminders.length > 0) cls += ' has-reminders';

      html += `<div class="${cls}" onclick="Calendar.selectDate('${dateStr}')" title="${reminders.length} reminder(s)">${d}</div>`;
    }

    // Next month filler
    const remaining = 42 - (firstDay + daysInMonth); // 6 rows x 7 cols
    for (let d = 1; d <= remaining && d <= 14; d++) {
      html += `<div class="cal-day other-month">${d}</div>`;
    }

    html += '</div>';
    section.innerHTML = html;
  }

  function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
  }

  function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
  }

  function selectDate(dateStr) {
    selectedDate = selectedDate === dateStr ? null : dateStr;
    render();
    if (selectedDate) {
      Views.showDateFilter(dateStr);
    } else {
      Views.refresh();
    }
  }

  function toggle() {
    const section = document.getElementById('calendar-section');
    if (section) {
      section.classList.toggle('visible');
      if (section.classList.contains('visible')) {
        render();
      }
    }
  }

  return { init, render, prevMonth, nextMonth, selectDate, toggle };
})();
