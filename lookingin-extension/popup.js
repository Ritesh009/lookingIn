var COLORS = {
‘Google’: ‘#ff4e4e’, ‘Meta’: ‘#4ea8ff’, ‘TikTok’: ‘#ff6eb4’,
‘Microsoft’: ‘#00aaff’, ‘Twitter/X’: ‘#1d9bf0’, ‘LinkedIn’: ‘#0a66c2’,
‘Hotjar’: ‘#ffc107’, ‘Amazon’: ‘#ff9900’, ‘Other’: ‘#7a8799’
};

var REPORT_URL = ‘https://ritesh009.github.io/LookingIn/’;

function timeAgo(ts) {
var diff = Math.floor((Date.now() - ts) / 1000);
if (diff < 60) return diff + ‘s ago’;
if (diff < 3600) return Math.floor(diff / 60) + ‘m ago’;
return Math.floor(diff / 3600) + ‘h ago’;
}

function render(stats) {
var from = new Date(stats.start).toLocaleDateString(‘en-US’, { month: ‘short’, day: ‘numeric’ });
var to   = new Date().toLocaleDateString(‘en-US’, { month: ‘short’, day: ‘numeric’ });
document.getElementById(‘dateRange’).textContent = from + ’ – ’ + to;

var hitEl = document.getElementById(‘hitNum’);

if (!stats.total || stats.total === 0) {
hitEl.textContent = ‘0’;
document.getElementById(‘hitLabel’).textContent = ‘trackers detected’;
document.getElementById(‘hitSub’).style.display = ‘none’;
document.getElementById(‘content’).innerHTML =
‘<div class="empty"><div class="empty-icon">👁</div><div class="empty-title">LookingIn is watching</div><div class="empty-body">Browse normally and trackers will appear here.</div></div>’;
return;
}

// Animate number
var n = 0;
var step = Math.max(1, Math.floor(stats.total / 30));
var timer = setInterval(function() {
n = Math.min(n + step, stats.total);
hitEl.textContent = n;
if (n >= stats.total) clearInterval(timer);
}, 20);

document.getElementById(‘sitesNum’).textContent = stats.sites;

var html = ‘’;

if (stats.trackers.length > 0) {
var maxCount = stats.trackers[0].count;
html += ‘<div class="section-label">Who's watching</div>’;
for (var i = 0; i < Math.min(stats.trackers.length, 5); i++) {
var t = stats.trackers[i];
var color = COLORS[t.company] || COLORS[‘Other’];
var pct = Math.round((t.count / maxCount) * 100);
html += ‘<div class="tracker-row">’ +
‘<span class="t-dot" style="background:' + color + '"></span>’ +
‘<span class="t-name">’ + t.company + ‘</span>’ +
‘<div class="t-bar-wrap">’ +
‘<div class="t-bar-track"><div class="t-bar-fill" id="bar' + i + '" style="width:0%;background:' + color + '"></div></div>’ +
‘<div class="t-count">’ + t.count + ’ × · ’ + t.sites + ’ site’ + (t.sites !== 1 ? ‘s’ : ‘’) + ‘</div>’ +
‘</div></div>’;
}
}

if (stats.history && stats.history.length > 0) {
html += ‘<div class="divider"></div><div class="section-label">Just now</div>’;
for (var j = 0; j < Math.min(stats.history.length, 4); j++) {
var h = stats.history[j];
html += ‘<div class="recent-row">’ +
‘<span class="r-company">’ + h.company + ‘</span>’ +
‘<span class="r-page">’ + h.page + ‘</span>’ +
‘<span class="r-time">’ + timeAgo(h.time) + ‘</span>’ +
‘</div>’;
}
}

document.getElementById(‘content’).innerHTML = html;

// Animate bars
setTimeout(function() {
for (var k = 0; k < Math.min(stats.trackers.length, 5); k++) {
(function(idx) {
setTimeout(function() {
var bar = document.getElementById(‘bar’ + idx);
if (bar) {
var p = Math.round((stats.trackers[idx].count / stats.trackers[0].count) * 100);
bar.style.width = p + ‘%’;
}
}, idx * 60);
})(k);
}
}, 50);
}

// Load stats
chrome.runtime.sendMessage({ type: ‘GET’ }, function(stats) {
if (chrome.runtime.lastError || !stats) {
document.getElementById(‘hitNum’).textContent = ‘!’;
document.getElementById(‘content’).innerHTML =
‘<div class="empty"><div class="empty-title">Error loading data</div><div class="empty-body">’ +
(chrome.runtime.lastError ? chrome.runtime.lastError.message : ‘No response’) + ‘</div></div>’;
return;
}
render(stats);

document.getElementById(‘reportBtn’).addEventListener(‘click’, function() {
var payload = {
totalBlocked: stats.total,
sitesVisited: stats.sites,
startDate: stats.start,
trackers: stats.trackers,
history: stats.history,
source: ‘extension’
};
var url = REPORT_URL + ‘#data=’ + btoa(JSON.stringify(payload));
chrome.tabs.create({ url: url });
window.close();
});
});

document.getElementById(‘resetBtn’).addEventListener(‘click’, function() {
if (!confirm(‘Reset all data?’)) return;
chrome.runtime.sendMessage({ type: ‘RESET’ }, function() {
chrome.runtime.sendMessage({ type: ‘GET’ }, render);
});
});