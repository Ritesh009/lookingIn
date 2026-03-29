var T={"google-analytics.com":"Google","googletagmanager.com":"Google","doubleclick.net":"Google","googlesyndication.com":"Google","googleadservices.com":"Google","googleapis.com":"Google","facebook.com":"Meta","facebook.net":"Meta","connect.facebook.net":"Meta","analytics.tiktok.com":"TikTok","ads.tiktok.com":"TikTok","clarity.ms":"Microsoft","bat.bing.com":"Microsoft","hotjar.com":"Hotjar","static.hotjar.com":"Hotjar","linkedin.com":"LinkedIn","snap.licdn.com":"LinkedIn","amazon-adsystem.com":"Amazon","criteo.com":"Criteo","mixpanel.com":"Other","amplitude.com":"Other","newrelic.com":"Other","segment.io":"Other","adobedtm.com":"Adobe"};
function gc(url){try{var h=new URL(url).hostname.replace(/^www\./,"");if(T[h])return T[h];for(var k of Object.keys(T)){if(h.endsWith("."+k))return T[k];}}catch(e){}return null;}
chrome.webRequest.onBeforeRequest.addListener(function(d){
  if(d.type==="main_frame")return;
  var co=gc(d.url);if(!co)return;
  var ph="";try{ph=new URL(d.initiator||"").hostname;}catch(e){}
  if(!ph&&d.tabId>0){chrome.tabs.get(d.tabId,function(t){if(!chrome.runtime.lastError&&t&&t.url){try{var h=new URL(t.url).hostname;if(h)save(co,h);}catch(e){}}});return;}
  if(ph)save(co,ph);
},{ urls: ["<all_urls>"] });
function save(co,ph){
  chrome.storage.local.get("li").then(function(r){
    var d=r.li||{t:{},n:0,s:{},h:[],ts:Date.now()};
    if(!d.t[co])d.t[co]={n:0,s:[]};
    d.t[co].n++;
    if(d.t[co].s.indexOf(ph)<0)d.t[co].s.push(ph);
    d.n++;d.s[ph]=(d.s[ph]||0)+1;
    d.h.unshift({c:co,p:ph,t:Date.now()});
    if(d.h.length>50)d.h.pop();
    return chrome.storage.local.set({li:d});
  }).then(function(){
    chrome.action.setBadgeText({text:d.n>99?"99+":String(d.n)});
    chrome.action.setBadgeBackgroundColor({color:"#ff4e4e"});
  }).catch(function(e){console.log("save error",e);});
}
chrome.runtime.onMessage.addListener(function(msg,s,cb){
  if(msg.t==="get"){chrome.storage.local.get("li").then(function(r){var d=r.li||{t:{},n:0,s:{},h:[],ts:Date.now()};var list=Object.keys(d.t).map(function(k){return{company:k,count:d.t[k].n,sites:d.t[k].s.length};}).sort(function(a,b){return b.count-a.count;});cb({n:d.n,s:Object.keys(d.s).length,list:list,h:d.h.slice(0,8),ts:d.ts});});return true;}
  if(msg.t==="reset"){chrome.storage.local.remove("li").then(function(){chrome.action.setBadgeText({text:""});cb({ok:true});});return true;}
});
