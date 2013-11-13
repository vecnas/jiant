jiant.onUiBound("initAppTest", function($, app) {
  test("uiBound event after init", function() {
    ok(app.someInitValue == "test", "app was successfully initialized.")
  });
});
