jiant.onAppInit("initAppTest", function ($, app, readyCb) {
  ok(1, "Slow part of initialization...");

  setTimeout(function () {
    app.someInitValue = "test";
//    alert("Slow part of initialization... completed");
    readyCb();
  }, 3000)
});

jiant.onAppInit("initAppTest", function ($, app, readyCb) {
  ok(1, "Fast part of initialization...");
  readyCb();

});
