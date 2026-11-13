// Dashboard for "Which college town is the best deal?"
// Loads data/dashboard_data.json (made by scripts/build_dashboard_data.py) and
// computes every figure in the browser for the selected campus.
// The rules here match scripts/check_dashboard.py.

(function () {
  "use strict";

  var DATA_URL = "data/dashboard_data.json";
  var PRICE_MIN = 10000;
  var PRICE_MAX = 5000000;
  var ALL = "all";

  var numberFmt = new Intl.NumberFormat("en-US");
  var priceFmt = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0
  });
  var oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  var milesFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1, maximumFractionDigits: 1
  });

  function $(id) { return document.getElementById(id); }

  // Median of a list of numbers: the middle value, or the mean of the two
  // middle values when the count is even. Returns null for an empty list.
  function median(values) {
    if (values.length === 0) return null;
    var s = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function plural(n, one, many) {
    return numberFmt.format(n) + " " + (n === 1 ? one : many);
  }

  function compute(data, uniIndex) {
    var c = data.columns;
    var n = data.row_count;
    var prices = [], dom = [], miles = [];
    var sales = 0;
    for (var i = 0; i < n; i++) {
      if (uniIndex !== null && c.university[i] !== uniIndex) continue;
      sales++;
      var p = c.sale_price[i];
      if (p >= PRICE_MIN && p <= PRICE_MAX) prices.push(p);
      var d = c.days_on_market[i];
      if (d !== null) dom.push(d);
      miles.push(c.miles_to_campus[i]);
    }
    return {
      sales: sales,
      priceRows: prices.length,
      priceExcluded: sales - prices.length,
      medianPrice: median(prices),
      domRows: dom.length,
      domSkipped: sales - dom.length,
      medianDom: median(dom),
      medianMiles: median(miles)
    };
  }

  function render(data, value) {
    var uniIndex = value === ALL ? null : Number(value);
    var f = compute(data, uniIndex);
    var where = uniIndex === null ? "all campuses" : data.universities[uniIndex];

    $("value-sales").textContent = numberFmt.format(f.sales);
    $("note-sales").textContent = "Completed sales near " + where + ".";

    $("value-price").textContent = f.medianPrice === null ? "–" : priceFmt.format(f.medianPrice);
    $("note-price").textContent = "Of " + plural(f.priceRows, "sale", "sales") +
      " from $10,000 to $5,000,000; " + plural(f.priceExcluded, "sale", "sales") + " left out.";

    $("value-dom").textContent = f.medianDom === null ? "–" :
      oneDecimal.format(f.medianDom) + (f.medianDom === 1 ? " day" : " days");
    $("note-dom").textContent = "Of " + plural(f.domRows, "sale", "sales") + "; " +
      plural(f.domSkipped, "sale", "sales") + " skipped for a missing list or contract date.";

    $("value-miles").textContent = f.medianMiles === null ? "–" :
      milesFmt.format(f.medianMiles) + " mi";
    $("note-miles").textContent = "Straight-line distance, of all " +
      plural(f.sales, "sale", "sales") + ".";

    $("rule-price").textContent = "For " + where + ", this leaves out " +
      plural(f.priceExcluded, "sale", "sales") + " of " + numberFmt.format(f.sales) + ".";
    $("rule-dom").textContent = "For " + where + ", " +
      plural(f.domSkipped, "sale is", "sales are") + " skipped and " +
      plural(f.domRows, "sale is", "sales are") + " used.";

    renderCharts(data, uniIndex, where);
  }

  // ---------- Charts ----------
  // Chart.js is loaded from cdnjs in index.html. If it fails to load, the
  // chart titles and table views are still filled in from the data.

  var compactPrice = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1
  });
  var LOG_TICKS = [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000];
  var DISTANCE_BANDS = [
    { label: "Under 1 mile", min: 0, max: 1 },
    { label: "1 to under 2 miles", min: 1, max: 2 },
    { label: "2 to under 3 miles", min: 2, max: 3 },
    { label: "3 to under 5 miles", min: 3, max: 5 },
    { label: "5 to under 10 miles", min: 5, max: 10 },
    { label: "10 miles or more", min: 10, max: Infinity }
  ];
  var charts = { city: null, scatter: null, month: null };

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function shortMonth(ym) {
    var parts = ym.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
      .toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function nextMonth(ym) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) + 1;
    if (m === 13) { y++; m = 1; }
    return y + "-" + (m < 10 ? "0" : "") + m;
  }

  // Every month from the first to the last sale month in the whole dataset.
  // The first and last are partial: the data starts and ends inside them.
  function allMonths(data) {
    var months = data.columns.sale_month.filter(function (m) { return m !== null; }).sort();
    var out = [];
    if (!months.length) return out;
    for (var m = months[0]; m <= months[months.length - 1]; m = nextMonth(m)) out.push(m);
    return out;
  }

  function computeCharts(data, uniIndex, months) {
    var c = data.columns;
    var byCity = {}, points = [], monthCounts = {};
    months.forEach(function (m) { monthCounts[m] = 0; });
    for (var i = 0; i < data.row_count; i++) {
      if (uniIndex !== null && c.university[i] !== uniIndex) continue;
      var p = c.sale_price[i];
      if (p >= PRICE_MIN && p <= PRICE_MAX) {
        var city = data.cities[c.city[i]];
        (byCity[city] = byCity[city] || []).push(p);
        points.push({ x: c.miles_to_campus[i], y: p });
      }
      var m = c.sale_month[i];
      if (m !== null) monthCounts[m]++;
    }

    var cities = Object.keys(byCity).map(function (city) {
      return { city: city, median: median(byCity[city]), count: byCity[city].length };
    }).sort(function (a, b) { return b.median - a.median || a.city.localeCompare(b.city); });

    points.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    var bands = DISTANCE_BANDS.map(function (band) {
      var prices = points.filter(function (pt) { return pt.x >= band.min && pt.x < band.max; })
        .map(function (pt) { return pt.y; });
      return { label: band.label, count: prices.length, median: median(prices) };
    });
    var near = points.filter(function (pt) { return pt.x < 2; }).map(function (pt) { return pt.y; });
    var far = points.filter(function (pt) { return pt.x >= 5; }).map(function (pt) { return pt.y; });

    var monthRows = months.map(function (m, k) {
      return { month: m, count: monthCounts[m], partial: k === 0 || k === months.length - 1 };
    });
    return {
      cities: cities, points: points, bands: bands,
      nearMedian: median(near), farMedian: median(far),
      months: monthRows,
      monthTotal: monthRows.reduce(function (s, r) { return s + r.count; }, 0)
    };
  }

  function fillTable(id, headers, rows) {
    var table = $(id);
    table.textContent = "";
    var thead = table.createTHead().insertRow();
    headers.forEach(function (h) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = h.text;
      if (h.num) th.className = "num";
      thead.appendChild(th);
    });
    var tbody = table.createTBody();
    rows.forEach(function (row) {
      var tr = tbody.insertRow();
      row.forEach(function (cell, k) {
        var td = tr.insertCell();
        td.textContent = cell;
        if (headers[k].num) td.className = "num";
      });
    });
  }

  function chartTitles(r, where) {
    var t = {};
    if (r.cities.length > 1) {
      var top = r.cities[0], low = r.cities[r.cities.length - 1];
      t.city = top.city + " has the highest median sale price, " + priceFmt.format(top.median) +
        "; " + low.city + " has the lowest, " + priceFmt.format(low.median) + ".";
    } else if (r.cities.length === 1) {
      t.city = r.cities[0].city + " is the only city near this campus: median sale price " +
        priceFmt.format(r.cities[0].median) + ".";
    } else {
      t.city = "No sales in the price range.";
    }

    if (r.nearMedian !== null && r.farMedian !== null) {
      t.scatter = "Homes under 2 miles from campus sold for a median of " +
        priceFmt.format(r.nearMedian) + ", against " + priceFmt.format(r.farMedian) +
        " for homes 5 or more miles away.";
    } else if (r.nearMedian !== null) {
      t.scatter = "Homes under 2 miles from campus sold for a median of " +
        priceFmt.format(r.nearMedian) + "; no sales here are 5 or more miles away.";
    } else {
      t.scatter = "Sale price and miles to campus for " + where + ".";
    }

    var full = r.months.filter(function (m) { return !m.partial; });
    var busiest = full.reduce(function (best, m) { return !best || m.count > best.count ? m : best; }, null);
    t.month = busiest && busiest.count > 0 ?
      "The busiest full month was " + monthName(busiest.month) + ", with " +
        plural(busiest.count, "sale", "sales") + "." :
      "Sales per month for " + where + ".";
    return t;
  }

  // Draws each bar's value at its end, so the numbers do not depend on color.
  var barValueLabels = {
    id: "barValueLabels",
    afterDatasetsDraw: function (chart) {
      var ctx = chart.ctx;
      var meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.fillStyle = cssVar("--text-secondary");
      ctx.font = "12px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.textBaseline = "middle";
      meta.data.forEach(function (bar, k) {
        ctx.fillText(compactPrice.format(chart.data.datasets[0].data[k]), bar.x + 6, bar.y);
      });
      ctx.restore();
    }
  };

  function baseScale(title) {
    return {
      title: { display: true, text: title, color: cssVar("--text-secondary"), font: { size: 12 } },
      ticks: { color: cssVar("--text-secondary"), font: { size: 11 } },
      grid: { color: cssVar("--grid") },
      border: { color: cssVar("--axis") }
    };
  }

  function createCharts() {
    Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.color = cssVar("--text-secondary");
    var series = cssVar("--series-1");
    var surface = cssVar("--surface-card");
    var common = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } }
    };

    var xCity = baseScale("Median sale price (US dollars)");
    xCity.beginAtZero = true;
    xCity.ticks.callback = function (v) { return compactPrice.format(v); };
    xCity.ticks.maxRotation = 0;
    xCity.ticks.maxTicksLimit = window.innerWidth < 600 ? 4 : 8;
    var yCity = baseScale("City");
    yCity.title.display = false;
    yCity.grid = { display: false };
    yCity.ticks.color = cssVar("--text-primary");
    charts.city = new Chart($("chart-city"), {
      type: "bar",
      data: { labels: [], datasets: [{
        data: [], counts: [], backgroundColor: series, borderRadius: 4,
        borderSkipped: "start", maxBarThickness: 22
      }] },
      options: Object.assign({}, common, {
        indexAxis: "y",
        layout: { padding: { right: 56 } },
        scales: { x: xCity, y: yCity },
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: function (item) {
            return "Median " + priceFmt.format(item.raw) + " (" +
              plural(item.dataset.counts[item.dataIndex], "sale", "sales") + ")";
          }
        } } }
      }),
      plugins: [barValueLabels]
    });

    var xScatter = baseScale("Miles to campus (straight line)");
    xScatter.min = 0;
    var yScatter = baseScale("Sale price (US dollars, log scale)");
    yScatter.type = "logarithmic";
    yScatter.min = PRICE_MIN;
    yScatter.max = PRICE_MAX;
    yScatter.afterBuildTicks = function (scale) {
      scale.ticks = LOG_TICKS.map(function (v) { return { value: v }; });
    };
    yScatter.ticks.callback = function (v) { return compactPrice.format(v); };
    charts.scatter = new Chart($("chart-scatter"), {
      type: "scatter",
      data: { datasets: [{
        data: [], backgroundColor: cssVar("--series-1-fill"), borderWidth: 0,
        pointRadius: 1.6, pointHoverRadius: 5, pointHoverBackgroundColor: series,
        pointHoverBorderColor: surface, pointHoverBorderWidth: 2
      }] },
      options: Object.assign({}, common, {
        parsing: false,
        normalized: true,
        scales: { x: xScatter, y: yScatter },
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: function (item) {
            return priceFmt.format(item.raw.y) + ", " + milesFmt.format(item.raw.x) + " mi from campus";
          }
        } } }
      })
    });

    var xMonth = baseScale("Month the sale closed");
    xMonth.grid = { display: false };
    xMonth.ticks.maxRotation = 0;
    // Label every 3rd month (every 12th on a phone), and always the first and
    // last, so both partial months stay labelled.
    xMonth.ticks.autoSkip = false;
    xMonth.ticks.callback = function (value, index) {
      var last = this.chart.data.labels.length - 1;
      var step = this.chart.width < 600 ? 12 : 3;
      var show = index === 0 || index === last || (index % step === 0 && last - index >= step / 2);
      return show ? this.getLabelForValue(value) : null;
    };
    var yMonth = baseScale("Sales per month (count)");
    yMonth.beginAtZero = true;
    yMonth.ticks.precision = 0;
    charts.month = new Chart($("chart-month"), {
      type: "line",
      data: { labels: [], datasets: [{
        data: [], partial: [], borderColor: series, borderWidth: 2, tension: 0,
        pointRadius: function (ctx) { return ctx.dataset.partial[ctx.dataIndex] ? 4 : 2.5; },
        pointBackgroundColor: function (ctx) {
          return ctx.dataset.partial[ctx.dataIndex] ? surface : series;
        },
        pointBorderColor: series,
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointHitRadius: 10,
        segment: { borderDash: function (ctx) {
          var partial = ctx.chart.data.datasets[0].partial;
          return partial[ctx.p0DataIndex] || partial[ctx.p1DataIndex] ? [4, 4] : undefined;
        } }
      }] },
      options: Object.assign({}, common, {
        interaction: { mode: "index", intersect: false },
        scales: { x: xMonth, y: yMonth },
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          title: function (items) {
            var lbl = items[0].label;
            return Array.isArray(lbl) ? lbl.join(" ") : lbl;
          },
          label: function (item) { return plural(item.raw, "sale", "sales"); }
        } } }
      })
    });
  }

  function destroyCharts() {
    Object.keys(charts).forEach(function (k) {
      if (charts[k]) charts[k].destroy();
      charts[k] = null;
    });
  }

  var lastChartArgs = null;

  function renderCharts(data, uniIndex, where) {
    lastChartArgs = [data, uniIndex, where];
    var months = allMonths(data);
    var r = computeCharts(data, uniIndex, months);
    var t = chartTitles(r, where);

    $("title-city").textContent = t.city;
    $("title-scatter").textContent = t.scatter;
    $("title-month").textContent = t.month;
    $("subtitle-scatter").textContent = "Each dot is one sale from $10,000 to $5,000,000: " +
      plural(r.points.length, "dot", "dots") + ".";
    $("note-charts-price").textContent = "For " + where + ", that is " +
      plural(r.points.length, "sale", "sales") + ".";
    $("note-charts-month").textContent = "For " + where + ", it counts " +
      plural(r.monthTotal, "sale", "sales") + "; sales with no closing date are left out.";

    fillTable("table-city",
      [{ text: "City" }, { text: "Median sale price", num: true }, { text: "Sales used", num: true }],
      r.cities.map(function (x) { return [x.city, priceFmt.format(x.median), numberFmt.format(x.count)]; }));
    fillTable("table-scatter",
      [{ text: "Miles to campus" }, { text: "Sales", num: true }, { text: "Median sale price", num: true }],
      r.bands.map(function (b) {
        return [b.label, numberFmt.format(b.count), b.median === null ? "–" : priceFmt.format(b.median)];
      }));
    fillTable("table-month",
      [{ text: "Month" }, { text: "Sales", num: true }],
      r.months.map(function (m) {
        return [monthName(m.month) + (m.partial ? " (partial month)" : ""), numberFmt.format(m.count)];
      }));

    if (typeof window.Chart === "undefined") {
      var status = $("chart-status");
      status.textContent = "The charts could not be loaded. The numbers are still in each chart's table.";
      status.classList.add("error");
      return;
    }
    if (!charts.city) createCharts();

    $("box-city").style.height = Math.max(140, r.cities.length * 30 + 70) + "px";
    var cityDs = charts.city.data.datasets[0];
    charts.city.data.labels = r.cities.map(function (x) { return x.city; });
    cityDs.data = r.cities.map(function (x) { return x.median; });
    cityDs.counts = r.cities.map(function (x) { return x.count; });
    charts.city.options.scales.x.suggestedMax = r.cities.length ? r.cities[0].median * 1.05 : undefined;
    charts.city.resize();
    charts.city.update("none");

    charts.scatter.data.datasets[0].data = r.points;
    charts.scatter.update("none");

    var monthDs = charts.month.data.datasets[0];
    charts.month.data.labels = r.months.map(function (m) {
      return m.partial ? [shortMonth(m.month), "(partial)"] : shortMonth(m.month);
    });
    monthDs.data = r.months.map(function (m) { return m.count; });
    monthDs.partial = r.months.map(function (m) { return m.partial; });
    charts.month.update("none");
  }

  // Redraw with the other color set when the light or dark setting changes.
  if (window.matchMedia) {
    var scheme = window.matchMedia("(prefers-color-scheme: dark)");
    var onScheme = function () {
      if (!lastChartArgs || typeof window.Chart === "undefined") return;
      destroyCharts();
      renderCharts.apply(null, lastChartArgs);
    };
    if (scheme.addEventListener) scheme.addEventListener("change", onScheme);
  }

  // The campus is kept in the address (?campus=...) so a view can be linked.
  function readCampusFromUrl(data) {
    var name = new URLSearchParams(window.location.search).get("campus");
    var i = name ? data.universities.indexOf(name) : -1;
    return i >= 0 ? String(i) : ALL;
  }

  function writeCampusToUrl(data, value) {
    var url = new URL(window.location.href);
    if (value === ALL) url.searchParams.delete("campus");
    else url.searchParams.set("campus", data.universities[Number(value)]);
    window.history.replaceState(null, "", url);
  }

  function buildDropdown(data) {
    var select = $("campus");
    select.textContent = "";
    var all = document.createElement("option");
    all.value = ALL;
    all.textContent = "All campuses";
    select.appendChild(all);

    data.universities.forEach(function (uni, i) {
      var cities = Object.keys(data.city_universities).filter(function (city) {
        return data.city_universities[city].indexOf(uni) >= 0;
      }).map(function (city) { return city.split(",")[0]; });
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = uni + (cities.length ? " (" + cities.join(", ") + ")" : "");
      select.appendChild(opt);
    });

    select.value = readCampusFromUrl(data);
    select.disabled = false;
    select.addEventListener("change", function () {
      writeCampusToUrl(data, select.value);
      render(data, select.value);
    });
  }

  function monthName(ym) {
    var parts = ym.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
      .toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function fillIntro(data) {
    var months = data.columns.sale_month.filter(function (m) { return m !== null; }).sort();
    $("intro-sales").textContent = numberFmt.format(data.row_count) + " completed";
    $("intro-campuses").textContent = String(data.universities.length);
    if (months.length) {
      $("intro-range").textContent = ", closed from " + monthName(months[0]) +
        " to " + monthName(months[months.length - 1]);
    }
  }

  function showError(message) {
    var status = $("status");
    status.textContent = message;
    status.classList.add("error");
  }

  fetch(DATA_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      fillIntro(data);
      buildDropdown(data);
      render(data, $("campus").value);
      $("status").textContent = "";
    })
    .catch(function (err) {
      showError("Could not load the data (" + err.message + "). Try reloading the page.");
    });
})();
