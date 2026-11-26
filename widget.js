<!-- ALL 4 ONE player widget: paste this whole block where you want the player -->
<div id="all4one-widget"></div>
(function () {
  // ---- SETTINGS ----
  var FEED = "podcast.xml";;
  var THEME = "auto";        // "auto", "light" or "dark"
  var ACCENT = "#e63946";    // accent colour (buttons, current episode)
  var PAGE = 25;             // episodes shown at a time
  // ------------------

  var host = document.getElementById("all4one-widget");
  var root = host.attachShadow({ mode: "open" });   // isolates the widget from your site's CSS
  var dark = THEME === "dark" || (THEME === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var C = dark
    ? { bg: "#121214", card: "#1e1e23", text: "#f1f1f4", muted: "#9c9ca8", line: "#303038" }
    : { bg: "#ffffff", card: "#f3f3f6", text: "#16161a", muted: "#6b6b76", line: "#dedee5" };

  root.innerHTML =
    '<style>' +
    ':host{display:block}' +
    '*{box-sizing:border-box}' +
    '.w{background:' + C.bg + ';color:' + C.text + ';font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:4px}' +
    '.player{display:flex;gap:18px;flex-wrap:wrap;background:' + C.card + ';border-radius:18px;padding:18px}' +
    '.cover{width:150px;height:150px;border-radius:12px;object-fit:cover;background:' + C.line + ';flex:none}' +
    '.main{flex:1;min-width:240px;display:flex;flex-direction:column;gap:12px;justify-content:center}' +
    '.show{color:' + C.muted + ';font-size:13px;text-transform:uppercase;letter-spacing:.06em}' +
    '.title{font-size:19px;font-weight:700;margin:0}' +
    '.bar{display:flex;align-items:center;gap:10px}' +
    '.bar span{color:' + C.muted + ';font-size:12px;min-width:42px;font-variant-numeric:tabular-nums}' +
    'input[type=range]{flex:1;accent-color:' + ACCENT + ';height:24px}' +
    '.ctl{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
    'button,select,.dl{font:inherit;color:' + C.text + ';background:' + C.bg + ';border:1px solid ' + C.line + ';border-radius:999px;padding:8px 14px;cursor:pointer;text-decoration:none}' +
    'button:hover,.dl:hover{border-color:' + ACCENT + '}' +
    '#play{background:' + ACCENT + ';border-color:' + ACCENT + ';color:#fff;width:56px;height:56px;padding:0;font-size:22px}' +
    '.sp{flex:1}' +
    '#search{width:100%;margin:18px 0 8px;padding:11px 16px;border:1px solid ' + C.line + ';border-radius:12px;background:' + C.bg + ';color:' + C.text + ';font:inherit}' +
    'ul{list-style:none;margin:0;padding:0}' +
    'li{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:11px 8px;border-bottom:1px solid ' + C.line + ';cursor:pointer;border-radius:8px}' +
    'li:hover{background:' + C.card + '}' +
    'li.on .t{color:' + ACCENT + ';font-weight:700}' +
    '.tl{flex-basis:100%;white-space:pre-wrap;color:' + C.muted + ';font-size:13px;line-height:1.5;padding:8px 0 6px 54px;max-height:340px;overflow:auto;cursor:text}' +
    '.n{color:' + C.muted + ';min-width:42px;font-variant-numeric:tabular-nums}' +
    '.t{flex:1}' +
    '.d{color:' + C.muted + ';font-size:12px;white-space:nowrap}' +
    '#more{display:block;margin:16px auto}' +
    '.msg{color:' + C.muted + ';padding:16px 0}' +
    '</style>' +
    '<div class="w">' +
    '<div class="player">' +
    '<img class="cover" id="cover" alt="">' +
    '<div class="main">' +
    '<div class="show" id="show">ALL 4 ONE</div>' +
    '<p class="title" id="title">Loading…</p>' +
    '<div class="bar"><span id="cur">0:00</span><input type="range" id="seek" min="0" max="1000" value="0"><span id="dur">0:00</span></div>' +
    '<div class="ctl">' +
    '<button id="back" title="Back 15 seconds">↺ 15</button>' +
    '<button id="play" title="Play / Pause">▶</button>' +
    '<button id="fwd" title="Forward 30 seconds">30 ↻</button>' +
    '<select id="speed" title="Speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>' +
    '<span class="sp"></span>' +
    '<a class="dl" id="dl" href="#" target="_blank" rel="noopener" download>⬇ Download</a>' +
    '</div></div></div>' +
    '<input id="search" type="search" placeholder="Search by number or title…">' +
    '<ul id="list"></ul><p class="msg" id="msg">Loading episodes…</p>' +
    '<button id="more" style="display:none">Show more</button>' +
    '</div>';

  var $ = function (id) { return root.getElementById(id); };
  var audio = new Audio();
  audio.preload = "none";
  var eps = [], view = [], shown = 0, current = -1;

  function fmt(s) {
    if (!isFinite(s)) return "0:00";
    s = Math.floor(s);
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x;
  }
  function tag(node, name) {
    var e = node.getElementsByTagName(name)[0];
    return e ? e.textContent : "";
  }

  function select(i, autoplay) {
    var ep = eps[i];
    if (!ep) return;
    if (i === current && audio.src) { if (audio.paused) audio.play(); else audio.pause(); return; }
    current = i;
    audio.src = ep.url;
    audio.playbackRate = parseFloat($("speed").value);
    $("title").textContent = ep.title;
    $("dl").href = ep.url;
    try {
      var pos = parseFloat(localStorage.getItem("a4o:" + ep.url));
      if (pos > 5) audio.addEventListener("loadedmetadata", function f() {
        audio.currentTime = pos; audio.removeEventListener("loadedmetadata", f);
      });
    } catch (e) {}
    if (autoplay) audio.play();
    mark();
  }

  function clean(html, title) {
    var s = (html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n");
    s = new DOMParser().parseFromString(s, "text/html").body.textContent || "";
    s = s.replace(/\n{3,}/g, "\n\n").trim();
    return s === title.trim() ? "" : s;
  }

  function mark() {
    var items = $("list").children;
    for (var k = 0; k < items.length; k++) {
      var on = (+items[k].getAttribute("data-i") === current);
      items[k].className = on ? "on" : "";
      var old = items[k].querySelector(".tl");
      if (old) old.remove();
      if (on && eps[current] && eps[current].desc) {
        var tl = document.createElement("div");
        tl.className = "tl";
        tl.textContent = eps[current].desc;
        tl.onclick = function (e) { e.stopPropagation(); };
        items[k].appendChild(tl);
      }
    }
  }

  function render(reset) {
    var list = $("list");
    if (reset) { list.innerHTML = ""; shown = 0; }
    var end = Math.min(shown + PAGE, view.length);
    for (; shown < end; shown++) {
      var ep = view[shown], li = document.createElement("li");
      li.setAttribute("data-i", eps.indexOf(ep));
      var n = document.createElement("span"); n.className = "n"; n.textContent = ep.num ? "#" + ep.num : "";
      var t = document.createElement("span"); t.className = "t"; t.textContent = ep.title;
      var d = document.createElement("span"); d.className = "d"; d.textContent = ep.date;
      li.appendChild(n); li.appendChild(t); li.appendChild(d);
      li.onclick = (function (i) { return function () { select(i, true); }; })(eps.indexOf(ep));
      list.appendChild(li);
    }
    $("more").style.display = shown < view.length ? "" : "none";
    $("msg").textContent = view.length ? "" : "No episode found.";
    mark();
  }

  $("search").oninput = function () {
    var q = this.value.trim().toLowerCase().replace("#", "");
    view = eps.filter(function (e) {
      return !q || e.title.toLowerCase().indexOf(q) > -1 || String(e.num) === q;
    });
    render(true);
  };
  $("more").onclick = function () { render(false); };
  $("play").onclick = function () {
    if (current < 0 && eps.length) select(0, true);
    else if (audio.paused) audio.play(); else audio.pause();
  };
  $("back").onclick = function () { audio.currentTime = Math.max(0, audio.currentTime - 15); };
  $("fwd").onclick = function () { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 30); };
  $("speed").onchange = function () { audio.playbackRate = parseFloat(this.value); };
  $("seek").oninput = function () {
    if (audio.duration) audio.currentTime = audio.duration * this.value / 1000;
  };

  audio.onplay = function () { $("play").textContent = "❚❚"; };
  audio.onpause = function () { $("play").textContent = "▶"; };
  audio.onloadedmetadata = function () { $("dur").textContent = fmt(audio.duration); };
  audio.ontimeupdate = function () {
    $("cur").textContent = fmt(audio.currentTime);
    if (audio.duration) $("seek").value = audio.currentTime / audio.duration * 1000;
    try {
      if (current >= 0 && Math.floor(audio.currentTime) % 5 === 0)
        localStorage.setItem("a4o:" + eps[current].url, audio.currentTime);
    } catch (e) {}
  };
  audio.onended = function () { if (current + 1 < eps.length) select(current + 1, true); };

  fetch(FEED)
    .then(function (r) { return r.text(); })
    .then(function (txt) {
      var xml = new DOMParser().parseFromString(txt, "application/xml");
      var img = xml.getElementsByTagName("itunes:image")[0];
      if (img) $("cover").src = img.getAttribute("href");
      $("show").textContent = tag(xml.getElementsByTagName("channel")[0], "title") || "ALL 4 ONE";
      var items = xml.getElementsByTagName("item");
      for (var i = 0; i < items.length; i++) {
        var enc = items[i].getElementsByTagName("enclosure")[0];
        if (!enc) continue;
        var dt = new Date(tag(items[i], "pubDate"));
        eps.push({
          title: tag(items[i], "title"),
          desc: clean(tag(items[i], "description"), tag(items[i], "title")),
          url: enc.getAttribute("url"),
          num: parseInt(tag(items[i], "itunes:episode"), 10) || 0,
          date: isNaN(dt) ? "" : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        });
      }
      view = eps.slice();
      render(true);
      if (eps.length) select(0, false);
    })
    .catch(function () { $("msg").textContent = "Could not load the episodes."; });
})();
