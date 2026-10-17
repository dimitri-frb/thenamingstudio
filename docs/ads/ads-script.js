// Name Name — daily spend push to the admin dashboard.
//
// Where it goes: Google Ads → Tools → Bulk actions → Scripts → + → paste this,
// authorize, then schedule it DAILY (any morning hour). Each run re-sends the
// last 30 days, so corrections and late clicks heal themselves and the first
// run backfills a month of history.
//
// Before saving: replace ADS_KEY below with the real key (it lives in the
// Cloudflare Worker's secrets, never in this public repo).

var ENDPOINT = "https://naming-studio-api.kairosfund.workers.dev";
var ADS_KEY = "PASTE_KEY_HERE";
var DAYS_BACK = 30;

function main() {
  var tz = AdsApp.currentAccount().getTimeZone();
  var days = [];
  for (var i = 0; i < DAYS_BACK; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var ymd = Utilities.formatDate(d, tz, "yyyyMMdd");
    var iso = Utilities.formatDate(d, tz, "yyyy-MM-dd");
    var it = AdsApp.campaigns().withCondition("Status IN [ENABLED, PAUSED]").get();
    while (it.hasNext()) {
      var c = it.next();
      var s = c.getStatsFor(ymd, ymd);
      if (!s.getImpressions() && !s.getCost()) continue;
      days.push({
        date: iso,
        channel: "Google Ads",
        campaign: c.getName(),
        cost: s.getCost(),
        clicks: s.getClicks(),
        impressions: s.getImpressions(),
      });
    }
  }
  var r = UrlFetchApp.fetch(ENDPOINT, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ phase: "adspush", key: ADS_KEY, payload: { days: days } }),
    muteHttpExceptions: true,
  });
  Logger.log("Sent " + days.length + " day-rows → " + r.getResponseCode() + " " + r.getContentText());
}
