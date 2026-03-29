// LookingIn background.js
var TRACKERS = {
“google-analytics.com”: “Google”,
“googletagmanager.com”: “Google”,
“doubleclick.net”: “Google”,
“facebook.com”: “Meta”,
“facebook.net”: “Meta”,
“connect.facebook.net”: “Meta”,
“analytics.tiktok.com”: “TikTok”,
“clarity.ms”: “Microsoft”,
“bat.bing.com”: “Microsoft”,
“hotjar.com”: “Hotjar”,
“linkedin.com”: “LinkedIn”,
“amazon-adsystem.com”: “Amazon”,
“mixpanel.com”: “Other”,
“amplitude.com”: “Other”,
“newrelic.com”: “Other”
};

function getCompany(url) {
try {
var host = new URL(url).hostname.replace(/^www./, “”);
if (TRACKERS[host]) return TRACKERS[host];
var keys = Object.keys(TRACKERS);
for (var i = 0; i < keys.length; i++) {
if (host.endsWith(”.” + keys[i])) return TRACKERS[keys[i]];
}
} catch(e) {}
return null;
}

chrome.webRequest.onBeforeRequest.addListener(
function(details) {
var company = getCompany(details.url);
if (!company) return;

```
var pageHost = "";
try {
  pageHost = new URL(details.initiator || "").hostname;
} catch(e) {}
if (!pageHost) return;

chrome.storage.local.get("li", function(r) {
  var d = r.li || { t: {}, n: 0, s: {}, h: [], ts: Date.now() };
  if (!d.t[company]) d.t[company] = { n: 0, s: [] };
  d.t[company].n++;
  if (d.t[company].s.indexOf(pageHost) < 0) d.t[company].s.push(pageHost);
  d.n++;
  d.s[pageHost] = (d.s[pageHost] || 0) + 1;
  d.h.unshift({ c: company, p: pageHost, t: Date.now() });
  if (d.h.length > 50) d.h.pop();
  chrome.storage.local.set({ li: d });
  chrome.action.setBadgeText({ text: d.n > 99 ? "99+" : String(d.n) });
  chrome.action.setBadgeBackgroundColor({ color: "#ff4e4e" });
});
```

},
{ urls: [”<all_urls>”] }
);

chrome.runtime.onMessage.addListener(function(msg, sender, cb) {
if (msg.t === “get”) {
chrome.storage.local.get(“li”, function(r) {
var d = r.li || { t: {}, n: 0, s: {}, h: [], ts: Date.now() };
var list = Object.keys(d.t).map(function(k) {
return { company: k, count: d.t[k].n, sites: d.t[k].s.length };
}).sort(function(a, b) { return b.count - a.count; });
cb({ n: d.n, s: Object.keys(d.s).length, list: list, h: d.h.slice(0,8), ts: d.ts });
});
return true;
}
if (msg.t === “reset”) {
chrome.storage.local.remove(“li”, function() {
chrome.action.setBadgeText({ text: “” });
cb({ ok: true });
});
return true;
}
});