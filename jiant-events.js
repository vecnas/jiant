jiant.module("jiant-events", function() {

  this.singleton();

  function _bindEvents(appRoot, events) {
    $.each(events, function(name, spec) {
      bindEvent(spec);
    });
  }

  function bindEvent(spec) {
    const bus = $({});
    spec.listenersCount = 0;
    spec.fire = function() {
      bus.trigger("e.event", arguments);
    };
    spec.on = function (cb) {
      spec.listenersCount++;
      const handler = function () {
        const args = [...arguments];
        args.splice(0, 1);
        cb && cb.apply(cb, args);
      };
      bus.on("e.event", handler);
      return handler;
    };
    spec.once = function (cb) {
      const handler = spec.on(function () {
        spec.off(handler);
        cb.apply(cb, arguments);
      });
    };
    spec.off = function (handler) {
      if (jiant.DEV_MODE && (arguments.length === 0 || !handler)) {
        jiant.logInfo("Event.off called without handler, unsubscribing all event handlers, check code if it is unintentionally",
            jiant.getStackTrace());
      }
      spec.listenersCount--;
      return bus.off("e.event", handler);
    };
    return spec;
  }

  jiant.bindEvent = bindEvent;

  return {
    apply: function(appRoot, tree) {
      _bindEvents(appRoot, tree.events);
    }
  };

});