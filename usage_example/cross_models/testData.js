jiant.module("testData", function($, app) {

  jiant.onApp(app, () => {
    app.models.sub.jRepo.add({name: "test 1", price: 3000});
    app.models.sub.jRepo.add({name: "test 2", price: 1000});
  });

});