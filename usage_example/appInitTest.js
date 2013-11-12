jiant.onInitCompleted("initAppTest", function ($, app, deferred) {

  setTimeout(function () {
    alert(1);
    deferred.resolve();
  }, 10000)
});

jiant.onInitCompleted("initAppTest", function ($, app, deferred) {

  alert(0);
  deferred.resolve();

});
