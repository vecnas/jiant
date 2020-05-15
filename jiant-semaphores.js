jiant.module("jiant-semaphores", function() {

  this.singleton();

  var eventBus = $({});

  function _bindSemaphores(appRoot, semaphores, appId) {
    $.each(semaphores, function(name, spec) {
      semaphores[name].release = function() {
        // if (semaphores[name].released) {
        //   logError("re-releasing semaphore already released, ignoring: " + appId + ".semaphores." + name);
        //   return;
        // }
        semaphores[name].released = true;
        semaphores[name].releasedArgs = arguments;
        eventBus.trigger(appId + "." + name + ".semaphore", arguments);
      };
      semaphores[name].on = function(cb) {
        if (semaphores[name].released) {
          cb && cb.apply(cb, semaphores[name].releasedArgs);
        } else {
          eventBus.on(appId + "." + name + ".semaphore", function() {
            var args = [...arguments];
            args.splice(0, 1);
            cb && cb.apply(cb, args);
          });
        }
      };
    });
  }

  return {
    apply: function(appRoot) {
      _bindSemaphores(appRoot, appRoot.semaphores, appRoot.id);
    }
  };

});