jiant.module("jiant-events", function() {

  this.singleton();

  var perAppBus = {};

  function _bindEvents(appRoot, events, appId) {
    perAppBus[appId] = $({});
    $.each(events, function(name, spec) {
      events[name].listenersCount = 0;
      events[name].fire = function() {
        perAppBus[appId].trigger(name + ".event", arguments);
      };
      events[name].on = function (cb) {
        events[name].listenersCount++;
        var handler = function () {
          var args = [...arguments];
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        };
        perAppBus[appId].on(name + ".event", handler);
        return handler;
      };
      events[name].once = function (cb) {
        var handler = events[name].on(function() {
          events[name].off(handler);
          cb.apply(cb, arguments);
        });
      };
      events[name].off = function (handler) {
        if (jiant.DEV_MODE && (arguments.length === 0 || !handler)) {
          jiant.logInfo("Event.off called without handler, unsubscribing all event handlers, check code if it is unintentionally",
              jiant.getStackTrace());
        }
        events[name].listenersCount--;
        return perAppBus[appId].off(name + ".event", handler);
      };
      // each(listeners, function(i, l) {l.boundEvent && l.boundEvent(appRoot, events, name, events[name])});
    });
  }

  return {
    apply: function(appRoot) {
      _bindEvents(appRoot, appRoot.events, appRoot.id);
    }
  };

});