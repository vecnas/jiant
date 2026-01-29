jiant.module("jiant-semaphores", function({jiant}) {

  this.singleton();

  function createEventBus() {
    const listeners = {};
    return {
      on: function(eventName, handler) {
        listeners[eventName] = listeners[eventName] || [];
        listeners[eventName].push(handler);
        return handler;
      },
      off: function(eventName, handler) {
        const list = listeners[eventName];
        if (!list) {
          return;
        }
        if (!handler) {
          listeners[eventName] = [];
          return;
        }
        const idx = list.indexOf(handler);
        if (idx >= 0) {
          list.splice(idx, 1);
        }
      },
      one: function(eventName, handler) {
        const onceHandler = function(evt) {
          this.off(eventName, onceHandler);
          handler.apply(null, arguments);
        }.bind(this);
        this.on(eventName, onceHandler);
        return onceHandler;
      },
      trigger: function(eventName) {
        const list = listeners[eventName];
        if (!list || list.length === 0) {
          return;
        }
        const extraArgs = [];
        for (let i = 1; i < arguments.length; i++) {
          extraArgs.push(arguments[i]);
        }
        const spreadArgs = (extraArgs.length === 1 && Array.isArray(extraArgs[0])) ? extraArgs[0] : extraArgs;
        const evt = {
          _stopped: false,
          stopImmediatePropagation: function() { this._stopped = true; }
        };
        const callArgs = [evt].concat(spreadArgs);
        const callList = list.slice();
        for (let i = 0; i < callList.length; i++) {
          callList[i].apply(this, callArgs);
          if (evt._stopped) {
            break;
          }
        }
      }
    };
  }

  function _bindSemaphores(appRoot, semaphores) {
    jiant.each(semaphores, function(name, spec) {
      bindSemaphore(spec);
    });
  }

  function bindSemaphore(spec) {
    const eventBus = createEventBus();
    spec.release = function() {
      spec.released = true;
      spec.releasedArgs = arguments;
      eventBus.trigger("sem.semaphore", Array.prototype.slice.call(arguments));
    };
    spec.on = function(cb) {
      if (spec.released) {
        cb && cb.apply(cb, spec.releasedArgs);
      } else {
        eventBus.on("sem.semaphore", function() {
          const args = [...arguments];
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      }
    };
    return spec;
  }

  jiant.bindSemaphore = bindSemaphore;

  return {
    apply: function(appRoot, tree) {
      _bindSemaphores(appRoot, tree.semaphores);
    }
  };

});
