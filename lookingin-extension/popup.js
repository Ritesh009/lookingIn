// LookingIn popup.js
var C = { Google: “#ff4e4e”, Meta: “#4ea8ff”, TikTok: “#ff6eb4”, Microsoft: “#00aaff”, LinkedIn: “#0a66c2”, Hotjar: “#ffc107”, Amazon: “#ff9900”, Other: “#7a8799” };

function ago(ts) {
var d = Math.floor((Date.now() - ts) / 1000);
if (d < 60) return d + “s ago”;
if (d < 3600) return Math.floor(d/60) + “m ago”;
return Math.floor(d/3600) + “h ago”;
}

chrome.runtime.sendMessage({ t: “get” }, function(s) {
if (chrome.runtime.lastError || !s) {
document.getElementById(“num”).textContent = “ERR”;
document.getElementById(“body”).textContent = chrome.runtime.lastError ? chrome.runtime.lastError.message : “no response”;
return;
}

document.getElementById(“num”).textContent = s.n || 0;
document.getElementById(“sites”).textContent = s.s || 0;

var html = “”;
for (var i = 0; i < s.list.length && i < 5; i++) {
var t = s.list[i];
var col = C[t.company] || C.Other;
html += “<div class=row><span class=dot style=background:” + col + “></span><span class=name>” + t.company + “</span><span class=cnt>” + t.count + “x / “ + t.sites + “ sites</span></div>”;
}
if (s.h && s.h.length) {
html += “<div class=label>Recent</div>”;
for (var j = 0; j < s.h.length && j < 4; j++) {
html += “<div class=row><span class=co>” + s.h[j].c + “</span><span class=pg>” + s.h[j].p + “</span><span class=tm>” + ago(s.h[j].t) + “</span></div>”;
}
}
document.getElementById(“body”).innerHTML = html || “<div class=empty>Browse normally to see trackers</div>”;

document.getElementById(“report”).onclick = function() {
var url = “https://ritesh009.github.io/LookingIn/#data=” + btoa(JSON.stringify({ totalBlocked: s.n, sitesVisited: s.s, startDate: s.ts, trackers: s.list, history: s.h, source: “extension” }));
chrome.tabs.create({ url: url });
window.close();
};
});

document.getElementById(“reset”).onclick = function() {
if (!confirm(“Reset?”)) return;
chrome.runtime.sendMessage({ t: “reset” }, function() { location.reload(); });
};