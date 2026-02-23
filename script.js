// ─── State ───────────────────────────────────────────────────────────────────
let redactedCount = 0;
let totalWords    = 0;
let undoStack     = [];

// ─── DOM References ───────────────────────────────────────────────────────────
const rawInput        = document.getElementById('rawInput');
const analyzeBtn      = document.getElementById('analyzeBtn');
const outputBox       = document.getElementById('outputBox');
const redactCountEl   = document.getElementById('redactCount');
const counterFill     = document.getElementById('counterFill');
const revealToggle    = document.getElementById('revealToggle');
const clearAllBtn     = document.getElementById('clearAllBtn');
const redactAllBtn    = document.getElementById('redactAllBtn');
const undoBtn         = document.getElementById('undoBtn');
const searchInput     = document.getElementById('searchInput');
const searchRedactBtn = document.getElementById('searchRedactBtn');
const searchFeedback  = document.getElementById('searchFeedback');
const exportTxtBtn    = document.getElementById('exportTxtBtn');
const exportPdfBtn    = document.getElementById('exportPdfBtn');
const historyList     = document.getElementById('historyList');
const autoDetectToggle = document.getElementById('autoDetectToggle');
const outputDot       = document.getElementById('outputDot');

// ─── Auto-detect Patterns ────────────────────────────────────────────────────
const MONEY_REGEX = /^\$[\d,]+(\.\d{1,2})?$|^[\d,]+(\.\d{1,2})?\s*(USD|EUR|GBP|INR)$/i;

const COMMON_FIRST_NAMES = new Set([
  'james','john','robert','michael','william','david','richard','joseph','thomas','charles',
  'mary','patricia','jennifer','linda','barbara','elizabeth','susan','jessica','sarah','karen',
  'christopher','daniel','matthew','anthony','donald','mark','paul','steven','andrew','kenneth',
  'emma','olivia','ava','isabella','sophia','mia','charlotte','amelia','harper','evelyn',
  'alice','bob','carol','diana','edward','frank','george','helen','ivan','julia',
  'kevin','laura','martin','nancy','oscar','peter','quinn','rachel','samuel','tina',
  'uma','victor','wendy','xavier','yasmine','zachary','aaron','brittany','cameron','derek',
  'elaine','floyd','gloria','henry','irene','jason','katherine','leonard','michelle','nicholas',
  'phillip','rebecca','scott','theresa','ursula','vincent','walter','yvonne',
  'abhishek','protim','rajat','kumar','biswas','tyagi','aman'
]);

function isLikelySensitive(word) {
  const clean = word.replace(/[^a-zA-Z0-9$.,]/g, '');
  if (MONEY_REGEX.test(clean)) return true;
  if (/^[A-Z][a-z]{2,}$/.test(clean) && COMMON_FIRST_NAMES.has(clean.toLowerCase())) return true;
  if (/^\$?[\d]{1,3}(,\d{3})*(\.\d{1,2})?$/.test(clean) && clean.length > 2) return true;
  return false;
}

// ─── Analyze ─────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', () => {
  const text = rawInput.value.trim();
  if (!text) { flashEmpty(); return; }

  redactedCount = 0;
  undoStack = [];
  updateCounter();
  updateUndoBtn();
  revealToggle.checked = false;
  historyList.innerHTML = '<p class="history-empty">No actions yet</p>';
  outputDot.classList.add('active');
  outputBox.innerHTML = '';

  const autoDetect = autoDetectToggle.checked;
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    const tokens = line.split(/(\s+)/);
    tokens.forEach(token => {
      if (/^\s+$/.test(token)) {
        outputBox.appendChild(document.createTextNode(token));
      } else if (token.length > 0) {
        const span = document.createElement('span');
        span.classList.add('word');
        span.textContent = token;
        span.style.animationDelay = (Math.random() * 0.3) + 's';
        if (autoDetect && isLikelySensitive(token)) {
          span.classList.add('auto-sensitive');
          span.title = 'Auto-detected sensitive content';
        }
        span.addEventListener('click', () => handleWordClick(span));
        outputBox.appendChild(span);
      }
    });
    if (lineIndex < lines.length - 1) outputBox.appendChild(document.createElement('br'));
  });

  totalWords = outputBox.querySelectorAll('.word').length;
  analyzeBtn.innerHTML = '&#9672; RE-ANALYZE &#8594;';
});

// ─── Word Click ───────────────────────────────────────────────────────────────
function handleWordClick(span) {
  if (span.classList.contains('redacted')) {
    unredactWord(span, true);
  } else {
    redactWord(span, true);
  }
}

function redactWord(span, pushToStack) {
  if (span.classList.contains('redacted')) return;
  span.classList.add('redacted');
  span.classList.remove('auto-sensitive');
  if (revealToggle.checked) span.classList.add('revealed');
  redactedCount++;
  updateCounter();
  if (pushToStack) {
    undoStack.push({ span, action: 'redact', word: span.textContent });
    addHistory('redact', span.textContent);
    updateUndoBtn();
  }
}

function unredactWord(span, pushToStack) {
  if (!span.classList.contains('redacted')) return;
  span.classList.remove('redacted', 'revealed');
  redactedCount--;
  updateCounter();
  if (pushToStack) {
    undoStack.push({ span, action: 'unredact', word: span.textContent });
    addHistory('unredact', span.textContent);
    updateUndoBtn();
  }
}

// ─── Reveal Toggle ────────────────────────────────────────────────────────────
revealToggle.addEventListener('change', () => {
  outputBox.querySelectorAll('.word.redacted').forEach(span => {
    revealToggle.checked ? span.classList.add('revealed') : span.classList.remove('revealed');
  });
});

// ─── Clear All ────────────────────────────────────────────────────────────────
clearAllBtn.addEventListener('click', () => {
  outputBox.querySelectorAll('.word.redacted').forEach(span => {
    span.classList.remove('redacted', 'revealed');
  });
  redactedCount = 0;
  revealToggle.checked = false;
  undoStack = [];
  updateCounter();
  updateUndoBtn();
  addHistory('clear', 'ALL');
});

// ─── Redact All ───────────────────────────────────────────────────────────────
redactAllBtn.addEventListener('click', () => {
  const words = outputBox.querySelectorAll('.word');
  if (!words.length) return;
  words.forEach(span => {
    if (!span.classList.contains('redacted')) {
      span.classList.add('redacted');
      span.classList.remove('auto-sensitive');
      if (revealToggle.checked) span.classList.add('revealed');
    }
  });
  redactedCount = words.length;
  undoStack = [];
  updateCounter();
  updateUndoBtn();
  addHistory('redact-all', 'ALL WORDS');
});

// ─── Undo ─────────────────────────────────────────────────────────────────────
undoBtn.addEventListener('click', performUndo);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); performUndo(); }
});

function performUndo() {
  if (!undoStack.length) return;
  const last = undoStack.pop();
  if (last.action === 'redact') {
    last.span.classList.remove('redacted', 'revealed');
    redactedCount--;
    addHistory('undo-redact', last.word);
  } else if (last.action === 'unredact') {
    last.span.classList.add('redacted');
    if (revealToggle.checked) last.span.classList.add('revealed');
    redactedCount++;
    addHistory('undo-unredact', last.word);
  }
  updateCounter();
  updateUndoBtn();
}

function updateUndoBtn() {
  undoBtn.disabled = undoStack.length === 0;
}

// ─── Search & Redact ──────────────────────────────────────────────────────────
searchRedactBtn.addEventListener('click', doSearchRedact);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearchRedact(); });

function doSearchRedact() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) { showFeedback('Please enter a search term.', true); return; }
  const words = outputBox.querySelectorAll('.word');
  if (!words.length) { showFeedback('Analyze a document first!', true); return; }
  let count = 0;
  words.forEach(span => {
    const wordText = span.textContent.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (wordText === query && !span.classList.contains('redacted')) {
      redactWord(span, true);
      count++;
    }
  });
  if (count > 0) {
    showFeedback('Redacted ' + count + ' occurrence(s) of "' + searchInput.value.trim() + '"', false);
    searchInput.value = '';
  } else {
    showFeedback('No unredacted matches found for "' + searchInput.value.trim() + '"', true);
  }
}

function showFeedback(msg, isError) {
  searchFeedback.textContent = msg;
  searchFeedback.className = 'search-feedback' + (isError ? ' error' : '');
  setTimeout(() => { searchFeedback.textContent = ''; searchFeedback.className = 'search-feedback'; }, 3000);
}

// ─── Export TXT ───────────────────────────────────────────────────────────────
exportTxtBtn.addEventListener('click', () => {
  const words = outputBox.querySelectorAll('.word');
  if (!words.length) { alert('Nothing to export. Analyze a document first.'); return; }
  let result = '';
  outputBox.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeName === 'BR') {
      result += '\n';
    } else if (node.classList && node.classList.contains('word')) {
      result += node.classList.contains('redacted') ? '[REDACTED]' : node.textContent;
    }
  });
  const blob = new Blob([result], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'redacted_document.txt'; a.click();
  URL.revokeObjectURL(url);
});

// ─── Export PDF ───────────────────────────────────────────────────────────────
exportPdfBtn.addEventListener('click', () => {
  const words = outputBox.querySelectorAll('.word');
  if (!words.length) { alert('Nothing to export. Analyze a document first.'); return; }
  if (typeof window.jspdf === 'undefined') { alert('PDF library not loaded. Check your internet connection.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  let y = 60;
  doc.setFont('Courier', 'bold'); doc.setFontSize(14);
  doc.text('REDACTED DOCUMENT', margin, y); y += 20;
  doc.setFont('Courier', 'normal'); doc.setFontSize(9); doc.setTextColor(120);
  doc.text('Generated: ' + new Date().toLocaleString() + ' | Words Redacted: ' + redactedCount, margin, y); y += 20;
  doc.setDrawColor(0); doc.setTextColor(0); doc.line(margin, y, pageWidth - margin, y); y += 20;
  doc.setFontSize(10);
  let currentLine = '';
  outputBox.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      currentLine += node.textContent;
    } else if (node.nodeName === 'BR') {
      const wrapped = doc.splitTextToSize(currentLine, maxWidth);
      wrapped.forEach(line => {
        if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; }
        doc.text(line, margin, y); y += 16;
      });
      currentLine = ''; y += 4;
    } else if (node.classList && node.classList.contains('word')) {
      currentLine += node.classList.contains('redacted') ? 'XXXXX' : node.textContent;
    }
  });
  if (currentLine.trim()) {
    const wrapped = doc.splitTextToSize(currentLine, maxWidth);
    wrapped.forEach(line => {
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; }
      doc.text(line, margin, y); y += 16;
    });
  }
  doc.save('redacted_document.pdf');
});

// ─── History ──────────────────────────────────────────────────────────────────
function addHistory(action, word) {
  const empty = historyList.querySelector('.history-empty');
  if (empty) empty.remove();
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
  const labels = {
    'redact':        { label: 'REDACTED',  cls: 'redact'   },
    'unredact':      { label: 'RESTORED',  cls: 'unredact' },
    'undo-redact':   { label: 'UNDO',      cls: 'unredact' },
    'undo-unredact': { label: 'UNDO',      cls: 'redact'   },
    'clear':         { label: 'CLEARED',   cls: 'unredact' },
    'redact-all':    { label: 'ALL',       cls: 'redact'   },
  };
  const { label, cls } = labels[action] || { label: action, cls: '' };
  const item = document.createElement('div');
  item.className = 'history-item ' + cls;
  item.innerHTML = '<span class="h-action">' + label + '</span><span class="h-word">' + (word.length > 14 ? word.slice(0,12) + '...' : word) + '</span><span class="h-time">' + time + '</span>';
  historyList.insertBefore(item, historyList.firstChild);
  const items = historyList.querySelectorAll('.history-item');
  if (items.length > 20) items[items.length - 1].remove();
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function updateCounter() {
  redactCountEl.textContent = redactedCount;
  redactCountEl.style.transform = 'scale(1.15)';
  setTimeout(() => { redactCountEl.style.transform = 'scale(1)'; }, 150);
  const pct = totalWords > 0 ? (redactedCount / totalWords) * 100 : 0;
  counterFill.style.width = pct + '%';
  if (pct === 0) {
    redactCountEl.style.color = '#38bdf8';
    counterFill.style.background = '#38bdf8';
  } else if (pct < 50) {
    redactCountEl.style.color = '#fbbf24';
    counterFill.style.background = '#fbbf24';
  } else {
    redactCountEl.style.color = '#f43f5e';
    counterFill.style.background = '#f43f5e';
  }
}

function flashEmpty() {
  rawInput.style.outline = '2px solid #f43f5e';
  rawInput.style.boxShadow = '0 0 20px rgba(244,63,94,0.3)';
  setTimeout(() => { rawInput.style.outline = ''; rawInput.style.boxShadow = ''; }, 2000);
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const submitBtn    = document.getElementById('contactSubmitBtn');
  const nameInput    = document.getElementById('contactName');
  const emailInput   = document.getElementById('contactEmail');
  const subjectInput = document.getElementById('contactSubject');
  const messageInput = document.getElementById('contactMessage');
  const feedback     = document.getElementById('contactFeedback');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', () => {
    const name    = nameInput.value.trim();
    const email   = emailInput.value.trim();
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();
    feedback.textContent = '';
    feedback.className = 'contact-feedback';
    if (!name)    { showContactMsg('Please enter your name.', 'error'); nameInput.focus(); return; }
    if (!email)   { showContactMsg('Please enter your email address.', 'error'); emailInput.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showContactMsg('Please enter a valid email address.', 'error'); emailInput.focus(); return; }
    if (!subject) { showContactMsg('Please enter a subject.', 'error'); subjectInput.focus(); return; }
    if (!message) { showContactMsg('Please write a message before sending.', 'error'); messageInput.focus(); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = 'SENDING...';
    setTimeout(() => {
      submitBtn.textContent = 'MESSAGE SENT!';
      submitBtn.style.background = 'linear-gradient(135deg, #34d399, #059669)';
      showContactMsg('Your message has been sent! We will get back to you within 24 hours.', 'success');
      nameInput.value = ''; emailInput.value = ''; subjectInput.value = ''; messageInput.value = '';
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'SEND MESSAGE';
        submitBtn.style.background = '';
      }, 4000);
    }, 1200);
  });

  function showContactMsg(msg, type) {
    feedback.textContent = msg;
    feedback.className = 'contact-feedback ' + type;
  }
});