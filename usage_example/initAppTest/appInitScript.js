jiant.initializingApp("initAppTest", function ($, app, readyCb) {

  setTimeout(function () {
    alert("Slow part of initialization...");
    readyCb();
  }, 5000)
});

jiant.initializingApp("initAppTest", function ($, app, readyCb) {

  alert("Fast part of initialization...");
  readyCb();

});
