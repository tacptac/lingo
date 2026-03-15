// ========== Lingo - 継続トラッカー ==========

(function () {
  'use strict';

  // ── Storage ──
  const STORAGE_KEY = 'lingo_habits';
  const DEBUG_OFFSET_KEY = 'lingo_debug_offset';

  function getDebugOffset() {
    return parseInt(localStorage.getItem(DEBUG_OFFSET_KEY) || '0', 10);
  }

  function setDebugOffset(days) {
    localStorage.setItem(DEBUG_OFFSET_KEY, String(days));
  }

  function loadHabits() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveHabits(habits) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }

  // ── Date Helpers ──
  function todayStr() {
    const d = new Date();
    d.setDate(d.getDate() + getDebugOffset());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function calcStreak(completedDates) {
    if (!completedDates || completedDates.length === 0) return 0;
    const sorted = [...completedDates].sort().reverse();
    const today = todayStr();
    const yesterday = dateStr(new Date(Date.now() - 86400000));

    // ストリークは今日か昨日から始まる必要がある
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev - curr) / 86400000;
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  function getContributionGrid() {
    // 直近5週間（35日）分のグリッドを生成
    // GitHub風: 列=週、行=曜日（日〜土）
    const today = new Date();
    today.setDate(today.getDate() + getDebugOffset());
    const todayDay = today.getDay(); // 0=日, 6=土
    // 今週の土曜日を最終列の最後にする
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - todayDay));
    // 5週間前の日曜日を開始にする
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 34); // 5週 = 35日

    const weeks = [];
    const current = new Date(startDate);
    let week = [];
    while (current <= endDate) {
      week.push(dateStr(current));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
      current.setDate(current.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);
    return weeks;
  }

  // ── Praise Messages ──
  const praiseMessages = {
    1: [
      { emoji: '🎉', message: '最初の一歩！\nすべてはここから始まる！' },
      { emoji: '✨', message: 'スタートを切ったね！\nその一歩が大事！' },
    ],
    3: [
      { emoji: '💪', message: '3日継続！\nいい調子だよ！' },
      { emoji: '🌟', message: '三日坊主を突破！\nすごい！' },
    ],
    7: [
      { emoji: '🔥', message: '1週間達成！\nもう習慣になってるね！' },
      { emoji: '🏆', message: '7日間連続！\n素晴らしい継続力！' },
    ],
    14: [
      { emoji: '🚀', message: '2週間突破！\n止まらないね！' },
      { emoji: '⭐', message: '14日連続！\nあなたは本物だ！' },
    ],
    21: [
      { emoji: '👑', message: '21日達成！\n習慣が定着したよ！' },
    ],
    30: [
      { emoji: '🎊', message: '1ヶ月達成！！\nあなたは最高にすごい！' },
    ],
    50: [
      { emoji: '💎', message: '50日継続！\n半端ない意志の力！' },
    ],
    100: [
      { emoji: '🏅', message: '100日達成！！！\n伝説レベル！' },
    ],
    365: [
      { emoji: '🌈', message: '1年間毎日継続！\nあなたは神！' },
    ],
    default: [
      { emoji: '🎯', message: 'いいね！\n今日もやりきった！' },
      { emoji: '💚', message: 'お見事！\n継続は力なり！' },
      { emoji: '🌸', message: '今日も頑張ったね！\n誇りに思うよ！' },
      { emoji: '⚡', message: 'ナイス！\nこの調子で行こう！' },
      { emoji: '🙌', message: 'やったね！\n毎日の積み重ねが大切！' },
      { emoji: '🌻', message: 'えらい！\n自分を褒めてあげてね！' },
    ],
  };

  function getPraise(streak) {
    const milestoneKeys = [1, 3, 7, 14, 21, 30, 50, 100, 365];
    let messages;
    if (milestoneKeys.includes(streak)) {
      messages = praiseMessages[streak];
    } else {
      messages = praiseMessages.default;
    }
    return messages[Math.floor(Math.random() * messages.length)];
  }

  function getMilestoneLabel(streak) {
    if (streak >= 365) return '伝説';
    if (streak >= 100) return 'マスター';
    if (streak >= 50) return 'エキスパート';
    if (streak >= 30) return '1ヶ月';
    if (streak >= 21) return '習慣化';
    if (streak >= 14) return '2週間';
    if (streak >= 7) return '1週間';
    if (streak >= 3) return '3日突破';
    return null;
  }

  // ── Vibration ──
  function vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  // ── Confetti ──
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame = null;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function createConfetti(count) {
    const colors = ['#58cc02', '#ff9600', '#ffcc00', '#ff4b4b', '#1cb0f6', '#ce82ff', '#ff6b9d'];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 50,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }
    if (!animFrame) animateConfetti();
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.rot += p.rotSpeed;
      p.opacity -= 0.005;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    particles = particles.filter((p) => p.opacity > 0 && p.y < canvas.height + 20);

    if (particles.length > 0) {
      animFrame = requestAnimationFrame(animateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      animFrame = null;
    }
  }

  // ── DOM References ──
  const btnShowForm = document.getElementById('btn-show-form');
  const addForm = document.getElementById('add-form');
  const habitInput = document.getElementById('habit-input');
  const emojiOptions = document.getElementById('emoji-options');
  const btnCancel = document.getElementById('btn-cancel');
  const btnSubmit = document.getElementById('btn-submit');
  const habitsList = document.getElementById('habits-list');
  const emptyState = document.getElementById('empty-state');
  const praiseOverlay = document.getElementById('praise-overlay');
  const praiseEmoji = document.getElementById('praise-emoji');
  const praiseStreak = document.getElementById('praise-streak');
  const praiseMessage = document.getElementById('praise-message');
  const btnPraiseClose = document.getElementById('btn-praise-close');

  let selectedEmoji = '📚';

  // ── Add Habit UI ──
  btnShowForm.addEventListener('click', () => {
    btnShowForm.classList.add('hidden');
    addForm.classList.remove('hidden');
    habitInput.focus();
  });

  btnCancel.addEventListener('click', () => {
    addForm.classList.add('hidden');
    btnShowForm.classList.remove('hidden');
    habitInput.value = '';
  });

  emojiOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    emojiOptions.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedEmoji = btn.dataset.emoji;
  });

  btnSubmit.addEventListener('click', addHabit);
  habitInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addHabit();
  });

  function addHabit() {
    const name = habitInput.value.trim();
    if (!name) {
      habitInput.focus();
      return;
    }

    const habits = loadHabits();
    habits.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      emoji: selectedEmoji,
      completedDates: [],
      createdAt: todayStr(),
    });
    saveHabits(habits);

    habitInput.value = '';
    addForm.classList.add('hidden');
    btnShowForm.classList.remove('hidden');

    // 絵文字選択リセット
    emojiOptions.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
    emojiOptions.querySelector('[data-emoji="📚"]').classList.add('selected');
    selectedEmoji = '📚';

    render();
  }

  // ── Delete Habit ──
  function deleteHabit(id) {
    if (!confirm('この習慣を削除しますか？\n※継続データもすべて消えます')) return;
    const habits = loadHabits().filter((h) => h.id !== id);
    saveHabits(habits);
    render();
  }

  // ── Rename Habit ──
  function renameHabit(id) {
    const habits = loadHabits();
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const newName = prompt('新しい名前を入力してください', habit.name);
    if (newName === null) return; // キャンセル
    const trimmed = newName.trim();
    if (!trimmed) return;
    habit.name = trimmed;
    saveHabits(habits);
    render();
  }

  // ── Complete Today ──
  function completeToday(id) {
    const habits = loadHabits();
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;

    const today = todayStr();
    if (habit.completedDates.includes(today)) return;

    habit.completedDates.push(today);
    saveHabits(habits);

    const streak = calcStreak(habit.completedDates);

    // 振動フィードバック
    vibrate([50, 30, 100]);

    // お祝い演出
    createConfetti(streak >= 7 ? 120 : 60);

    // 褒めモーダル表示
    const praise = getPraise(streak);
    showPraise(praise.emoji, streak, praise.message);

    render();
  }

  // ── Praise Modal ──
  function showPraise(emoji, streak, message) {
    praiseEmoji.textContent = emoji;
    praiseStreak.textContent = `${streak}日連続！`;
    praiseMessage.textContent = message;
    praiseOverlay.classList.remove('hidden');

    // 2回目の振動（モーダル表示時）
    setTimeout(() => vibrate([30, 50, 30, 50, 100]), 300);
  }

  btnPraiseClose.addEventListener('click', closePraise);
  praiseOverlay.addEventListener('click', (e) => {
    if (e.target === praiseOverlay) closePraise();
  });

  function closePraise() {
    praiseOverlay.classList.add('hidden');
  }

  // ── Render ──
  function render() {
    const habits = loadHabits();
    habitsList.innerHTML = '';

    if (habits.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    const today = todayStr();
    const grid = getContributionGrid();
    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

    habits.forEach((habit) => {
      const streak = calcStreak(habit.completedDates);
      const doneToday = habit.completedDates.includes(today);
      const milestone = getMilestoneLabel(streak);

      const card = document.createElement('div');
      card.className = `habit-card${doneToday ? ' completed-today' : ''}`;
      card.innerHTML = `
        <div class="habit-header">
          <div class="habit-info">
            <div class="habit-emoji">${escapeHtml(habit.emoji)}</div>
            <div>
              <div class="habit-name">
                ${escapeHtml(habit.name)}
                ${milestone ? `<span class="milestone-badge">${escapeHtml(milestone)}</span>` : ''}
              </div>
              <div class="habit-meta">開始: ${escapeHtml(habit.createdAt)}</div>
            </div>
          </div>
          <div class="habit-actions">
            <button class="btn-edit" data-id="${escapeHtml(habit.id)}" title="名前を変更">✏️</button>
            <button class="btn-delete" data-id="${escapeHtml(habit.id)}" title="削除">✕</button>
          </div>
        </div>

        <div class="streak-display ${streak === 0 ? 'streak-zero' : ''}">
          <div class="streak-count">
            <span class="streak-number">${streak}</span>
            <span class="streak-label">日連続</span>
          </div>
          <div class="grass-graph">
            <div class="grass-day-labels">
              ${dayLabels.map((l, i) => `<div class="grass-day-label">${i % 2 === 1 ? l : ''}</div>`).join('')}
            </div>
            <div class="grass-grid">
              ${grid.map((week) => `<div class="grass-week">${week.map((day) => {
                const filled = habit.completedDates.includes(day);
                const isToday = day === today;
                const isFuture = day > today;
                return `<div class="grass-cell${filled ? ' filled' : ''}${isToday ? ' today' : ''}${isFuture ? ' future' : ''}" title="${day}"></div>`;
              }).join('')}</div>`).join('')}
            </div>
          </div>
        </div>

        <div class="btn-check-wrapper">
          ${doneToday
            ? `<button class="btn-check done" disabled>
                <span class="check-icon">✓</span> 今日は完了！
              </button>`
            : `<button class="btn-check active" data-id="${escapeHtml(habit.id)}">
                <span class="check-icon">✓</span> 今日もやった！
              </button>`
          }
        </div>
      `;

      habitsList.appendChild(card);
    });

  }

  function handleListClick(e) {
    const checkBtn = e.target.closest('.btn-check.active');
    if (checkBtn) {
      completeToday(checkBtn.dataset.id);
      return;
    }
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      renameHabit(editBtn.dataset.id);
      return;
    }
    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      deleteHabit(deleteBtn.dataset.id);
    }
  }

  // ── Security: HTML escape ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  // ── Init ──
  habitsList.addEventListener('click', handleListClick);
  render();

  // ── Debug Panel ──
  const debugDate = document.getElementById('debug-date');
  const debugBack = document.getElementById('debug-back');
  const debugForward = document.getElementById('debug-forward');
  const debugReset = document.getElementById('debug-reset');

  function updateDebugDate() {
    const offset = getDebugOffset();
    debugDate.textContent = todayStr() + (offset !== 0 ? ` (${offset > 0 ? '+' : ''}${offset}日)` : '');
  }

  debugBack.addEventListener('click', () => {
    setDebugOffset(getDebugOffset() - 1);
    updateDebugDate();
    render();
  });

  debugForward.addEventListener('click', () => {
    setDebugOffset(getDebugOffset() + 1);
    updateDebugDate();
    render();
  });

  debugReset.addEventListener('click', () => {
    setDebugOffset(0);
    updateDebugDate();
    render();
  });

  updateDebugDate();
})();
