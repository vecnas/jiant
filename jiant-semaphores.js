jiant.module("jiant-semaphores", function({jiant}) {

  this.singleton();

  function _bindSemaphores(appRoot, semaphores) {
    $.each(semaphores, function(name, spec) {
      bindSemaphore(spec);
    });
  }

  function bindSemaphore(spec) {
    const eventBus = $({});
    spec.release = function() {
      spec.released = true;
      spec.releasedArgs = arguments;
      eventBus.trigger("sem.semaphore", arguments);
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