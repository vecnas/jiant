jiant.module("jiant-events", function({jiant}) {

  this.singleton();

  function _bindEvents(appRoot, events) {
    for (const name in events) {
      bindEvent(events[name]);
    }
  }

  function bindEvent(spec) {
    const bus = new EventTarget(), evtName = "e.event";
    spec.listenersCount = 0;
    spec.fire = function() {
      bus.dispatchEvent(new CustomEvent(evtName, {"detail": arguments}));
    };
    spec.on = function (cb) {
      spec.listenersCount++;
      const handler = function (evt) {
        const args = [...evt.detail];
        cb && cb.apply(cb, args);
      };
      bus.addEventListener(evtName, handler);
      return handler;
    };
    spec.once = function (cb) {
      const handler = spec.on(function () {
        spec.off(handler);
        cb.apply(cb, arguments);
      });
    };
    spec.off = function (handler) {
      spec.listenersCount--;
      return bus.removeEventListener(evtName, handler);
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