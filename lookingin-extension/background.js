// Known tracker domains — sourced from EasyPrivacy & open tracker lists
// Organised by company so we can show human-readable names in the report

const TRACKER_COMPANIES = {
‘Google’: [
‘google-analytics.com’,
‘googletagmanager.com’,
‘googletagservices.com’,
‘doubleclick.net’,
‘googlesyndication.com’,
‘google.com/ads’,
‘googleadservices.com’,
‘googleapis.com’,
‘gstatic.com’,
‘google-analytics.com’,
‘urchin.com’,
‘ssl.google-analytics.com’,
],
‘Meta’: [
‘facebook.com’,
‘facebook.net’,
‘connect.facebook.net’,
‘instagram.com’,
‘graph.facebook.com’,
‘an.facebook.com’,
‘pixel.facebook.com’,
],
‘TikTok’: [
‘analytics.tiktok.com’,
‘ads.tiktok.com’,
‘tiktok.com’,
‘byteoversea.com’,
‘ibytedtos.com’,
‘ipstatp.com’,
‘muscdn.com’,
‘tiktokv.com’,
],
‘Microsoft’: [
‘clarity.ms’,
‘bat.bing.com’,
‘ads.microsoft.com’,
‘c.bing.com’,
‘a.bing.com’,
‘msn.com’,
‘scorecardresearch.com’,
],
‘Twitter/X’: [
‘platform.twitter.com’,
‘ads-twitter.com’,
‘analytics.twitter.com’,
‘t.co’,
‘syndication.twitter.com’,
],
‘LinkedIn’: [
‘linkedin.com’,
‘licdn.com’,
‘snap.licdn.com’,
‘dc.ads.linkedin.com’,
],
‘Hotjar’: [
‘hotjar.com’,
‘static.hotjar.com’,
‘vars.hotjar.com’,
‘script.hotjar.com’,
],
‘Amazon’: [
‘amazon-adsystem.com’,
‘fls-na.amazon.com’,
‘images-na.ssl-images-amazon.com’,
‘aax-us-east.amazon-adsystem.com’,
],
‘Criteo’: [
‘criteo.com’,
‘criteo.net’,
‘emailretargeting.com’,
‘hlserve.com’,
‘inventoryplanner.com’,
],
‘TradeDesk’: [
‘adsrvr.org’,
‘casalemedia.com’,
‘rubiconproject.com’,
‘openx.net’,
‘openx.com’,
],
‘Oracle’: [
‘bluekai.com’,
‘bkrtx.com’,
‘addthis.com’,
‘addthisedge.com’,
‘eloqua.com’,
],
‘Outbrain’: [
‘outbrain.com’,
‘zemanta.com’,
‘outbrainimg.com’,
],
‘Taboola’: [
‘taboola.com’,
‘taboolasyndication.com’,
‘taboolasyndication.com’,
],
‘Quantcast’: [
‘quantserve.com’,
‘quantcount.com’,
‘choice.quantcast.com’,
],
‘Nielsen’: [
‘scorecardresearch.com’,
‘imrworldwide.com’,
‘imrdata.com’,
],
‘Other’: [
‘adnxs.com’,
‘pubmatic.com’,
‘AppNexus’,
‘moatads.com’,
‘nr-data.net’,
‘newrelic.com’,
‘mixpanel.com’,
‘segment.io’,
‘segment.com’,
‘amplitude.com’,
‘intercom.io’,
‘intercomcdn.com’,
‘fullstory.com’,
‘logrocket.com’,
‘mouseflow.com’,
‘crazyegg.com’,
‘optimizely.com’,
‘moengage.com’,
‘braze.com’,
‘klaviyo.com’,
]
};

// Flat lookup map: domain → company name
const TRACKER_MAP = {};
for (const [company, domains] of Object.entries(TRACKER_COMPANIES)) {
for (const domain of domains) {
TRACKER_MAP[domain] = company;
}
}

// Check if a URL belongs to a known tracker
// Returns company name or null
function matchTracker(url) {
try {
const host = new URL(url).hostname.replace(/^www./, ‘’);
// Exact match
if (TRACKER_MAP[host]) return TRACKER_MAP[host];
// Subdomain match — check if host ends with any known tracker domain
for (const domain of Object.keys(TRACKER_MAP)) {
if (host.endsWith(’.’ + domain) || host === domain) {
return TRACKER_MAP[domain];
}
}
return null;
} catch {
return null;
}
}

// ── Storage helpers ──────────────────────────────────────────────────────────

async function getStore() {
const result = await chrome.storage.local.get(‘lookingin’);
return result.lookingin || {
trackers: {},      // { company: { count, sites: Set, lastSeen } }
totalBlocked: 0,
sitesVisited: {},  // { hostname: count }
startDate: Date.now(),
history: [],       // last 100 detections for the report
};
}

async function saveStore(store) {
// Sets aren’t JSON serialisable — convert before saving
const serialisable = {
…store,
trackers: Object.fromEntries(
Object.entries(store.trackers).map(([k, v]) => [
k,
{ …v, sites: Array.from(v.sites || []) }
])
)
};
await chrome.storage.local.set({ lookingin: serialisable });
}

async function loadStore() {
const store = await getStore();
// Rehydrate sites Sets
for (const [company, data] of Object.entries(store.trackers)) {
data.sites = new Set(Array.isArray(data.sites) ? data.sites : []);
}
return store;
}

// ── Request interception ─────────────────────────────────────────────────────

chrome.webRequest.onBeforeRequest.addListener(
async (details) => {
const company = matchTracker(details.url);
if (!company) return;

```
// Get the originating page hostname
let pageHost = 'unknown';
try {
  if (details.initiator) {
    pageHost = new URL(details.initiator).hostname;
  } else if (details.documentUrl) {
    pageHost = new URL(details.documentUrl).hostname;
  }
} catch {}

// Skip if the tracker is the same as the page (first-party)
const trackerHost = new URL(details.url).hostname;
if (pageHost === trackerHost || pageHost === 'unknown') return;

const store = await loadStore();

// Update tracker entry
if (!store.trackers[company]) {
  store.trackers[company] = { count: 0, sites: new Set(), lastSeen: null };
}
store.trackers[company].count++;
store.trackers[company].sites.add(pageHost);
store.trackers[company].lastSeen = Date.now();

// Update totals
store.totalBlocked++;
store.sitesVisited[pageHost] = (store.sitesVisited[pageHost] || 0) + 1;

// Append to history (keep last 200)
store.history.unshift({
  company,
  tracker: new URL(details.url).hostname,
  page: pageHost,
  time: Date.now(),
});
if (store.history.length > 200) store.history.length = 200;

await saveStore(store);

// Update badge
chrome.action.setBadgeText({ text: store.totalBlocked > 99 ? '99+' : String(store.totalBlocked) });
chrome.action.setBadgeBackgroundColor({ color: '#ff4e4e' });
```

},
{ urls: [’<all_urls>’] },
[]
);

// ── Reset on browser startup ─────────────────────────────────────────────────
// Keep a 30-day rolling window

chrome.runtime.onStartup.addListener(async () => {
const store = await loadStore();
const thirtyDays = 30 * 24 * 60 * 60 * 1000;
if (Date.now() - store.startDate > thirtyDays) {
await chrome.storage.local.set({
lookingin: {
trackers: {},
totalBlocked: 0,
sitesVisited: {},
startDate: Date.now(),
history: [],
}
});
chrome.action.setBadgeText({ text: ‘’ });
}
});

// ── Message handler (popup asks for data) ───────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
if (msg.type === ‘GET_STATS’) {
loadStore().then(store => {
const trackerList = Object.entries(store.trackers)
.map(([company, data]) => ({
company,
count: data.count,
sites: data.sites.size,
lastSeen: data.lastSeen,
}))
.sort((a, b) => b.count - a.count);

```
  sendResponse({
    totalBlocked: store.totalBlocked,
    sitesVisited: Object.keys(store.sitesVisited).length,
    trackers: trackerList,
    history: store.history.slice(0, 10),
    startDate: store.startDate,
  });
});
return true; // keep channel open for async
```

}

if (msg.type === ‘RESET’) {
chrome.storage.local.set({
lookingin: {
trackers: {},
totalBlocked: 0,
sitesVisited: {},
startDate: Date.now(),
history: [],
}
}).then(() => {
chrome.action.setBadgeText({ text: ‘’ });
sendResponse({ ok: true });
});
return true;
}
});