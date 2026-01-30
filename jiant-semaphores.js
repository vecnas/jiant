jiant.module("jiant-semaphores", function({jiant}) {

  this.singleton();

  const createEventBus = jiant.createEventBus;

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
