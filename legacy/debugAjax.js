(function () {

  var logger = {
    ajaxCallStarted: function(app, uri, url, callData) {
      jiant.infop("!!. AJAX. call started: !!, to url !!, with params", app.id, uri, url);
      jiant.logInfo(callData);
    },
    ajaxCallCompleted: function(app, uri, url, callData, timeMs) {
      jiant.infop("!!. AJAX. call completed: !!, in !! ms", app.id, uri, timeMs);
    },
    ajaxCallResults: function(app, uri, url, callData, data) {
      jiant.infop("!!. AJAX. call results for call: !!, results are ", app.id, uri);
      jiant.logInfo(data);
    },
    ajaxCallError: function(app, uri, url, callData, timeMs, errorMessage, jqXHR) {
      jiant.infop("!!. AJAX. error for call: !!, time: !! ms, error is !!", app.id, uri, timeMs, errorMessage);
    }
  };
  jiant.addListener(logger);
})();
