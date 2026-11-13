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
