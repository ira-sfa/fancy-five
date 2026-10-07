(function () {
  "use strict";

  var D = window.FANCY_FIVE_DICTIONARY || new Set();
  var P = window.FANCY_FIVE_PUZZLES || [];

  var $ = function (id) {
    return document.getElementById(id);
  };

  var STORAGE = "wffFancyFiveLaunchV1";

  function dateKey(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  var today = dateKey(new Date());

  var puzzle =
    P.find(function (x) {
      return x.date === today;
    }) ||
    P.filter(function (x) {
      return x.date <= today;
    }).slice(-1)[0] ||
    P[0];

  if (!puzzle) {
    $("ff-message").textContent = "No puzzle is scheduled.";
    return;
  }
``