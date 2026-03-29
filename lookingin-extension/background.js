// ── Tracker data (inlined from tracker-list.js) ──────────────────────────────

const TRACKER_COMPANIES = {
‘Google’:    [‘google-analytics.com’,‘googletagmanager.com’,‘googletagservices.com’,‘doubleclick.net’,‘googlesyndication.com’,‘googleadservices.com’,‘ssl.google-analytics.com’,‘urchin.com’],
‘Meta’:      [‘facebook.com’,‘facebook.net’,‘connect.facebook.net’,‘graph.facebook.com’,‘an.facebook.com’],
‘TikTok’:    [‘analytics.tiktok.com’,‘ads.tiktok.com’,‘byteoversea.com’,‘ibytedtos.com’,‘muscdn.com’],
‘Microsoft’: [‘clarity.ms’,‘bat.bing.com’,‘ads.microsoft.com’,‘c.bing.com’,‘msn.com’],
‘Twitter/X’: [‘platform.twitter.com’,‘ads-twitter.com’,‘analytics.twitter.com’,‘syndication.twitter.com’],
‘LinkedIn’:  [‘linkedin.com’,‘licdn.com’,‘snap.licdn.com’,‘dc.ads.linkedin.com’],
‘Hotjar’:    [‘hotjar.com’,‘static.hotjar.com’,‘vars.hotjar.com’,‘script.hotjar.com’],
‘Amazon’:    [‘amazon-adsystem.com’,‘fls-na.amazon.com’,‘aax-us-east.amazon-adsystem.com’],
‘Criteo’:    [‘criteo.com’,‘criteo.net’,‘hlserve.com’],
‘Oracle’:    [‘bluekai.com’,‘bkrtx.com’,‘addthis.com’,‘eloqua.com’],
‘Outbrain’:  [‘outbrain.com’,‘zemanta.com’],
‘Taboola’:   [‘taboola.com’,‘taboolasyndication.com’],
‘Quantcast’: [‘quantserve.com’,‘quantcount.com’],
‘Other’:     [‘adnxs.com’,‘pubmatic.com’,‘moatads.com’,‘mixpanel.com’,‘segment.io’,‘segment.com’,‘amplitude.com’,‘intercom.io’,‘fullstory.com’,‘logrocket.com’,‘mouseflow.com’,‘crazyegg.com’,‘optimizely.com’,‘newrelic.com’,‘nr-data.net’],
};

const TRACKER_MAP = {};
for (const [company, domains] of Object.entries(TRACKER_COMPANIES)) {
for (const domain of domains) TRACKER_MAP[domain] = company;
}

function matchTracker(url) {
try {
const host = new URL(url).hostname.replace(/^www./, ‘’);
if (TRACKER_MAP[host]) return TRACKER_MAP[host];
for (const domain of Object.keys(TRACKER_MAP)) {
if (host.endsWith(’.’ + domain) || host === domain) return TRACKER_MAP[domain];
}
return null;
} catch { return null; }
}

// ── Storage — simple flat structure, no Sets ─────────────────────────────────
// trackers: { company: { count, sites: [], lastSeen } }

const EMPTY_STORE = () => ({
trackers: {},
totalBlocked: 0,
sitesVisited: {},
startDate: Date.now(),
history: [],
});

async function getStore() {
const r = await chrome.storage.local.get(‘lookingin’);
return r.lookingin || EMPTY_STORE();
}

async function saveStore(store) {
await chrome.storage.local.set({ lookingin: store });
}

// ── Request interception ──────────────────────────────────────────────────────

chrome.webRequest.onBeforeRequest.addListener(
async (details) => {
const company = matchTracker(details.url);
if (!company) return;

```
let pageHost = '';
try {
  pageHost = new URL(details.initiator || details.documentUrl || '').hostname;
} catch {}
if (!pageHost || pageHost === new URL(details.url).hostname) return;

const store = await getStore();

// Update tracker entry — sites is always a plain Array
if (!store.trackers[company]) {
  store.trackers[company] = { count: 0, sites: [], lastSeen: null };
}
store.trackers[company].count++;
if (!store.trackers[company].sites.includes(pageHost)) {
  store.trackers[company].sites.push(pageHost);
}
store.trackers[company].lastSeen = Date.now();

store.totalBlocked++;
store.sitesVisited[pageHost] = (store.sitesVisited[pageHost] || 0) + 1;

store.history.unshift({ company, tracker: new URL(details.url).hostname, page: pageHost, time: Date.now() });
if (store.history.length > 200) store.history.length = 200;

await saveStore(store);

const badge = store.totalBlocked > 99 ? '99+' : String(store.totalBlocked);
chrome.action.setBadgeText({ text: badge });
chrome.action.setBadgeBackgroundColor({ color: '#ff4e4e' });
```

},
{ urls: [’<all_urls>’] }
);

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
if (msg.type === ‘GET_STATS’) {
getStore().then(store => {
const trackers = Object.entries(store.trackers)
.map(([company, data]) => ({
company,
count: data.count,
sites: Array.isArray(data.sites) ? data.sites.length : 0,
lastSeen: data.lastSeen,
}))
.sort((a, b) => b.count - a.count);

```
  sendResponse({
    totalBlocked: store.totalBlocked || 0,
    sitesVisited: Object.keys(store.sitesVisited || {}).length,
    trackers,
    history: store.history.slice(0, 50),
    startDate: store.startDate,
  });
});
return true;
```

}

if (msg.type === ‘RESET’) {
chrome.storage.local.set({ lookingin: EMPTY_STORE() }).then(() => {
chrome.action.setBadgeText({ text: ‘’ });
sendResponse({ ok: true });
});
return true;
}
});

// ── 30-day rolling reset ──────────────────────────────────────────────────────

chrome.runtime.onStartup.addListener(async () => {
const store = await getStore();
if (Date.now() - store.startDate > 30 * 24 * 60 * 60 * 1000) {
await chrome.storage.local.set({ lookingin: EMPTY_STORE() });
chrome.action.setBadgeText({ text: ‘’ });
}
});