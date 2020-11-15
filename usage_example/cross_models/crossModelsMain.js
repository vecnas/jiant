jiant.module("crossModelsMain", function($, app) {

  jiant.onApp(app, () => {
    app.views.superView.propagate(app.models.super, true);
  });

});