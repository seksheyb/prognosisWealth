/* Prognosis Wealth — static rebuild interactivity
   Replaces the original Next.js client runtime with lightweight vanilla JS:
   - sticky header background on scroll
   - mobile navigation menu
   - fully interactive financial calculators (SIP / Retirement / Wealth Goal / EMI)
*/
(function () {
  "use strict";

  /* ---------------- Header scroll state ---------------- */
  var header = document.querySelector("header");
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 8) header.classList.add("pw-scrolled");
      else header.classList.remove("pw-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- Mobile menu ---------------- */
  var burger = document.querySelector('button[aria-label="toggle menu"]');
  if (burger && header) {
    var links = [
      ["index.html", "Home"],
      ["about.html", "About"],
      ["services.html", "Services"],
      ["insights.html", "Insights"],
      ["calculators.html", "Calculators"],
      ["contact.html", "Contact"]
    ];
    var menu = document.createElement("div");
    menu.className = "pw-mobile-menu";
    var here = (location.pathname.split("/").pop() || "index.html");
    if (here === "") here = "index.html";
    menu.innerHTML =
      links
        .map(function (l) {
          var active = l[0] === here ? ' style="background:#f1f5f9;color:#0f172a"' : "";
          return '<a href="' + l[0] + '"' + active + ">" + l[1] + "</a>";
        })
        .join("") +
      '<a class="pw-mm-cta" href="contact.html">Start Investing</a>';
    header.appendChild(menu);
    burger.addEventListener("click", function () {
      menu.classList.toggle("open");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") menu.classList.remove("open");
    });
  }

  /* ---------------- Decode Cloudflare-obfuscated emails ---------------- */
  (function decodeEmails() {
    function cf(enc) {
      var out = "", key = parseInt(enc.substr(0, 2), 16);
      for (var i = 2; i < enc.length; i += 2) out += String.fromCharCode(parseInt(enc.substr(i, 2), 16) ^ key);
      return out;
    }
    Array.prototype.forEach.call(document.querySelectorAll(".__cf_email__"), function (el) {
      var enc = el.getAttribute("data-cfemail");
      if (!enc) return;
      var email = cf(enc);
      el.textContent = email;
      if (el.tagName === "A") el.setAttribute("href", "mailto:" + email);
    });
  })();

  /* ---------------- Fill decorative dashboard charts ---------------- */
  /* The original used recharts (client-rendered). Replace the empty containers
     with lightweight static SVGs so the dashboard mockups look complete. */
  (function fillDecorativeCharts() {
    var containers = document.querySelectorAll(".recharts-responsive-container");
    if (!containers.length) return;
    var ALLOC = [
      { label: "Equity", v: 55, c: "#0A0A0A" },
      { label: "Debt", v: 22, c: "#404040" },
      { label: "Gold", v: 12, c: "#737373" },
      { label: "Cash", v: 11, c: "#A3A3A3" }
    ];
    function multiDonut(segs) {
      var total = segs.reduce(function (s, x) { return s + x.v; }, 0) || 1;
      var r = 46, c = 2 * Math.PI * r, acc = 0, ring = "";
      segs.forEach(function (s) {
        var len = (s.v / total) * c;
        ring +=
          '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + s.c +
          '" stroke-width="16" stroke-dasharray="' + len.toFixed(1) + " " + (c - len).toFixed(1) +
          '" stroke-dashoffset="' + (-acc).toFixed(1) + '" transform="rotate(-90 60 60)"/>';
        acc += len;
      });
      return '<svg viewBox="0 0 120 120" style="height:100%;width:auto;display:block;margin:0 auto">' + ring + "</svg>";
    }
    function sparkline(up) {
      // gently rising area sparkline
      var pts = up
        ? [22, 20, 24, 19, 26, 23, 30, 28, 34, 31, 38, 36, 44]
        : [44, 40, 42, 36, 34, 30, 31, 26, 24, 22, 19, 17, 12];
      var W = 300, H = 70, n = pts.length;
      var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
      var x = function (i) { return (i * W) / (n - 1); };
      var y = function (v) { return H - 6 - ((v - min) / (max - min || 1)) * (H - 12); };
      var line = "", area = "M0 " + H + " ";
      pts.forEach(function (v, i) {
        line += (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1) + " ";
        area += "L" + x(i).toFixed(1) + " " + y(v).toFixed(1) + " ";
      });
      area += "L" + W + " " + H + " Z";
      return (
        '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" style="width:100%;height:100%">' +
        '<defs><linearGradient id="pwSpark" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#0A0A0A" stop-opacity="0.18"/>' +
        '<stop offset="100%" stop-color="#0A0A0A" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#pwSpark)"/>' +
        '<path d="' + line + '" fill="none" stroke="#0A0A0A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>"
      );
    }
    Array.prototype.forEach.call(containers, function (el) {
      // Parent height class disambiguates: h-24 = allocation donut, else area sparkline.
      var parentClass = (el.parentElement && el.parentElement.className) || "";
      el.style.width = "100%";
      el.style.height = "100%";
      if (/\bh-24\b/.test(parentClass)) el.innerHTML = multiDonut(ALLOC);
      else el.innerHTML = sparkline(true);
    });
  })();

  /* ---------------- Calculators ---------------- */
  var root = document.getElementById("pw-calc-root");
  if (!root) return;

  function formatINR(n) {
    if (!isFinite(n)) return "₹ 0";
    var abs = Math.abs(n);
    if (abs >= 1e7) return "₹ " + (n / 1e7).toFixed(2) + " Cr";
    if (abs >= 1e5) return "₹ " + (n / 1e5).toFixed(2) + " L";
    return "₹ " + Math.round(n).toLocaleString("en-IN");
  }

  var INK = "#0A0A0A", GREY = "#525252", GREY2 = "#A3A3A3";

  /* ---- chart builders (inline SVG) ---- */
  function areaChart(series) {
    // series: [{year, invested, value}]
    if (!series.length) return "";
    var W = 520, H = 210, pad = 8;
    var maxV = Math.max.apply(null, series.map(function (s) { return s.value; })) || 1;
    var n = series.length;
    var x = function (i) { return pad + (i * (W - 2 * pad)) / Math.max(n - 1, 1); };
    var y = function (v) { return H - pad - (v / maxV) * (H - 2 * pad); };
    function path(key, close) {
      var d = "";
      series.forEach(function (s, i) { d += (i ? "L" : "M") + x(i).toFixed(1) + " " + y(s[key]).toFixed(1) + " "; });
      if (close) d += "L" + x(n - 1).toFixed(1) + " " + (H - pad) + " L" + x(0).toFixed(1) + " " + (H - pad) + " Z";
      return d;
    }
    return (
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" class="w-full h-full">' +
      '<defs><linearGradient id="pwGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#0A0A0A" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="#0A0A0A" stop-opacity="0.02"/></linearGradient></defs>' +
      '<path d="' + path("value", true) + '" fill="url(#pwGrad)"/>' +
      '<path d="' + path("value", false) + '" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="' + path("invested", false) + '" fill="none" stroke="' + GREY2 + '" stroke-width="2" stroke-dasharray="4 4"/>' +
      "</svg>"
    );
  }

  function donut(a, b, ca, cb) {
    var total = a + b || 1, frac = a / total;
    var r = 52, c = 2 * Math.PI * r, off = c * frac;
    return (
      '<svg viewBox="0 0 140 140" class="h-full w-auto mx-auto">' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + cb + '" stroke-width="20"/>' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + ca + '" stroke-width="20" ' +
      'stroke-dasharray="' + off.toFixed(1) + " " + (c - off).toFixed(1) + '" transform="rotate(-90 70 70)" stroke-linecap="butt"/>' +
      "</svg>"
    );
  }

  /* ---- calculator definitions ---- */
  var TABS = [
    {
      id: "sip", label: "SIP", icon: iconTrendingUp(),
      fields: [
        { key: "monthly", label: "Monthly investment", min: 500, max: 500000, step: 500, suffix: "₹", val: 15000 },
        { key: "years", label: "Investment period", min: 1, max: 40, step: 1, suffix: "yr", val: 15 },
        { key: "rate", label: "Expected return (p.a.)", min: 1, max: 25, step: 0.5, suffix: "%", val: 12 }
      ],
      compute: function (v) {
        var n = v.years * 12, r = v.rate / 100 / 12;
        var fv = v.monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        var invested = v.monthly * n;
        var series = [];
        for (var yX = 1; yX <= v.years; yX++) {
          var nn = yX * 12;
          series.push({ year: yX, invested: v.monthly * nn, value: v.monthly * ((Math.pow(1 + r, nn) - 1) / r) * (1 + r) });
        }
        return {
          stats: [
            { label: "Invested", value: invested, grad: "from-slate-700 to-slate-900" },
            { label: "Returns", value: fv - invested, grad: "from-zinc-800 to-zinc-500" },
            { label: "Final Value", value: fv, grad: "from-zinc-900 to-zinc-600" }
          ],
          series: series,
          breakdown: { a: invested, b: fv - invested, la: "Invested", lb: "Returns" }
        };
      }
    },
    {
      id: "retire", label: "Retirement", icon: iconWallet(),
      fields: [
        { key: "age", label: "Current age", min: 18, max: 59, step: 1, suffix: "yr", val: 30 },
        { key: "retireAge", label: "Retirement age", min: 19, max: 75, step: 1, suffix: "yr", val: 60 },
        { key: "monthlyExp", label: "Monthly expenses today", min: 10000, max: 500000, step: 1000, suffix: "₹", val: 60000 },
        { key: "inflation", label: "Inflation", min: 2, max: 10, step: 0.5, suffix: "%", val: 6 },
        { key: "rate", label: "Pre-retirement return", min: 6, max: 20, step: 0.5, suffix: "%", val: 12 },
        { key: "postRate", label: "Post-retirement return", min: 4, max: 12, step: 0.5, suffix: "%", val: 7 }
      ],
      compute: function (v) {
        var postYears = 25;
        var yearsToRetire = Math.max(v.retireAge - v.age, 1);
        var futureMonthlyExp = v.monthlyExp * Math.pow(1 + v.inflation / 100, yearsToRetire);
        var realRate = (1 + v.postRate / 100) / (1 + v.inflation / 100) - 1;
        var corpus = (futureMonthlyExp * 12 * (1 - Math.pow(1 + realRate, -postYears))) / realRate;
        var n = yearsToRetire * 12, mr = v.rate / 100 / 12;
        var sip = (corpus * mr) / ((Math.pow(1 + mr, n) - 1) * (1 + mr));
        var series = [], invested = sip * n;
        for (var yX = 1; yX <= yearsToRetire; yX++) {
          var nn = yX * 12;
          series.push({ year: v.age + yX, invested: sip * nn, value: sip * ((Math.pow(1 + mr, nn) - 1) / mr) * (1 + mr) });
        }
        return {
          stats: [
            { label: "Monthly SIP needed", value: sip, grad: "from-zinc-900 to-zinc-600" },
            { label: "Corpus at " + v.retireAge, value: corpus, grad: "from-slate-700 to-slate-900" },
            { label: "Future monthly expense", value: futureMonthlyExp, grad: "from-zinc-800 to-zinc-500" }
          ],
          series: series,
          breakdown: { a: invested, b: Math.max(corpus - invested, 0), la: "Invested", lb: "Growth" }
        };
      }
    },
    {
      id: "goal", label: "Wealth Goal", icon: iconTarget(),
      fields: [
        { key: "goal", label: "Wealth goal", min: 100000, max: 100000000, step: 50000, suffix: "₹", val: 5000000 },
        { key: "years", label: "Time horizon", min: 1, max: 40, step: 1, suffix: "yr", val: 10 },
        { key: "rate", label: "Expected return", min: 4, max: 20, step: 0.5, suffix: "%", val: 12 },
        { key: "existing", label: "Existing investments", min: 0, max: 100000000, step: 10000, suffix: "₹", val: 0 }
      ],
      compute: function (v) {
        var n = v.years * 12, r = v.rate / 100 / 12;
        var fvExisting = v.existing * Math.pow(1 + v.rate / 100, v.years);
        var need = Math.max(v.goal - fvExisting, 0);
        var sip = (need * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
        var series = [], invested = sip * n + v.existing;
        for (var yX = 1; yX <= v.years; yX++) {
          var nn = yX * 12;
          var sv = sip * ((Math.pow(1 + r, nn) - 1) / r) * (1 + r);
          var ev = v.existing * Math.pow(1 + v.rate / 100, yX);
          series.push({ year: yX, invested: sip * nn + v.existing, value: sv + ev });
        }
        return {
          stats: [
            { label: "Monthly SIP needed", value: sip, grad: "from-zinc-900 to-zinc-600" },
            { label: "Gap to fund", value: need, grad: "from-slate-700 to-slate-900" },
            { label: "Existing grows to", value: fvExisting, grad: "from-zinc-800 to-zinc-500" }
          ],
          series: series,
          breakdown: { a: invested, b: Math.max(v.goal - invested, 0), la: "Invested", lb: "Returns" }
        };
      }
    },
    {
      id: "emi", label: "EMI", icon: iconHouse(),
      fields: [
        { key: "principal", label: "Loan amount", min: 50000, max: 50000000, step: 50000, suffix: "₹", val: 2500000 },
        { key: "rate", label: "Interest rate", min: 4, max: 20, step: 0.1, suffix: "%", val: 8.5 },
        { key: "tenure", label: "Tenure", min: 1, max: 30, step: 1, suffix: "yr", val: 20 }
      ],
      compute: function (v) {
        var n = v.tenure * 12, r = v.rate / 100 / 12;
        var emi = (v.principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        var total = emi * n, interest = total - v.principal;
        // outstanding balance over time
        var series = [], bal = v.principal;
        series.push({ year: 0, invested: 0, value: v.principal });
        for (var yX = 1; yX <= v.tenure; yX++) {
          for (var m = 0; m < 12; m++) { bal = bal * (1 + r) - emi; }
          series.push({ year: yX, invested: 0, value: Math.max(bal, 0) });
        }
        return {
          stats: [
            { label: "Monthly EMI", value: emi, grad: "from-zinc-900 to-zinc-600" },
            { label: "Total interest", value: interest, grad: "from-zinc-800 to-zinc-500" },
            { label: "Total payment", value: total, grad: "from-slate-700 to-slate-900" }
          ],
          series: series,
          chartTitle: "Outstanding balance",
          breakdown: { a: v.principal, b: interest, la: "Principal", lb: "Interest" }
        };
      }
    }
  ];

  /* ---- render tab bar ---- */
  var tabBar = document.createElement("div");
  tabBar.setAttribute("role", "tablist");
  tabBar.className =
    "items-center justify-center text-muted-foreground bg-slate-100 p-1.5 rounded-2xl h-auto inline-flex flex-wrap gap-1";
  var panelWrap = document.createElement("div");
  panelWrap.className = "mt-8";
  root.appendChild(tabBar);
  root.appendChild(panelWrap);

  var state = {};
  TABS.forEach(function (t) {
    state[t.id] = {};
    t.fields.forEach(function (f) { state[t.id][f.key] = f.val; });
  });
  var active = TABS[0].id;

  TABS.forEach(function (t) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.tab = t.id;
    btn.className =
      "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all rounded-xl px-4 py-2.5 text-slate-600";
    btn.innerHTML = t.icon + '<span class="ml-2">' + t.label + "</span>";
    btn.addEventListener("click", function () { active = t.id; render(); });
    tabBar.appendChild(btn);
  });

  function fieldRow(tabId, f) {
    var v = state[tabId][f.key];
    return (
      '<div>' +
      '<div class="flex items-center justify-between">' +
      '<label class="text-sm font-medium text-slate-700">' + f.label + "</label>" +
      '<div class="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200">' +
      '<input type="number" class="pw-num" data-tab="' + tabId + '" data-key="' + f.key +
      '" data-kind="num" value="' + v + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '"/>' +
      '<span class="text-xs text-slate-500">' + f.suffix + "</span></div></div>" +
      '<input type="range" class="pw-range" data-tab="' + tabId + '" data-key="' + f.key +
      '" data-kind="range" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + v + '"/>' +
      '<div class="flex justify-between text-[11px] text-slate-400 mt-1.5"><span>' +
      compactNum(f.min) + "</span><span>" + compactNum(f.max) + "</span></div></div>"
    );
  }

  function compactNum(x) {
    if (x >= 1e7) return (x / 1e7) + "Cr";
    if (x >= 1e5) return (x / 1e5) + "L";
    if (x >= 1e3) return (x / 1e3) + "k";
    return x;
  }

  function render() {
    // tab buttons active state
    Array.prototype.forEach.call(tabBar.children, function (b) {
      if (b.dataset.tab === active) {
        b.className =
          "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all rounded-xl px-4 py-2.5 bg-white shadow text-slate-900";
      } else {
        b.className =
          "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all rounded-xl px-4 py-2.5 text-slate-600";
      }
    });

    var t = TABS.filter(function (x) { return x.id === active; })[0];
    var v = state[active];
    var res = t.compute(v);
    var statGrid = res.stats
      .map(function (s) {
        return (
          '<div class="card-soft p-5"><div class="text-xs uppercase tracking-wider text-slate-500">' +
          s.label + '</div><div class="mt-1 text-2xl font-extrabold bg-gradient-to-r ' + s.grad +
          ' bg-clip-text text-transparent">' + formatINR(s.value) + "</div></div>"
        );
      })
      .join("");

    panelWrap.innerHTML =
      '<div class="grid lg:grid-cols-2 gap-5">' +
      '<div class="card-soft p-6 space-y-6">' +
      t.fields.map(function (f) { return fieldRow(active, f); }).join("") +
      "</div>" +
      '<div class="space-y-5">' +
      '<div class="grid grid-cols-3 gap-3">' + statGrid + "</div>" +
      '<div class="card-soft p-5"><div class="text-sm font-semibold text-slate-900">' +
      (res.chartTitle || "Wealth growth projection") +
      '</div><div class="h-56 mt-2">' + areaChart(res.series) + "</div></div>" +
      '<div class="card-soft p-5"><div class="text-sm font-semibold text-slate-900">Breakdown</div>' +
      '<div class="h-44 mt-2">' + donut(res.breakdown.a, res.breakdown.b, INK, GREY) + "</div>" +
      '<div class="grid grid-cols-2 gap-2 text-sm mt-2">' +
      '<div class="flex items-center justify-between"><span class="flex items-center gap-2">' +
      '<span class="h-2.5 w-2.5 rounded-full" style="background:' + INK + '"></span>' + res.breakdown.la +
      '</span><span class="font-semibold text-slate-900">' + formatINR(res.breakdown.a) + "</span></div>" +
      '<div class="flex items-center justify-between"><span class="flex items-center gap-2">' +
      '<span class="h-2.5 w-2.5 rounded-full" style="background:' + GREY + '"></span>' + res.breakdown.lb +
      '</span><span class="font-semibold text-slate-900">' + formatINR(res.breakdown.b) + "</span></div>" +
      "</div></div></div></div>";

    // wire inputs
    Array.prototype.forEach.call(panelWrap.querySelectorAll("[data-kind]"), function (el) {
      el.addEventListener("input", function () {
        var tab = el.dataset.tab, key = el.dataset.key;
        var num = parseFloat(el.value);
        if (isNaN(num)) return;
        state[tab][key] = num;
        // keep retirement retireAge > age sane
        if (tab === "retire") {
          if (state.retire.retireAge <= state.retire.age) state.retire.retireAge = state.retire.age + 1;
        }
        render();
      });
    });
  }

  render();

  /* ---- lucide-style icons ---- */
  function svg(inner) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">' +
      inner + "</svg>"
    );
  }
  function iconTrendingUp() { return svg('<path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path>'); }
  function iconWallet() { return svg('<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>'); }
  function iconTarget() { return svg('<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>'); }
  function iconHouse() { return svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>'); }
})();
