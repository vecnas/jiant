jiant.module("initMain", function({app}) {

  jiant.onApp(app, function() {
    app.views.main.propagate({
      mainBtn: {title: "Main", value: "0"},
      btns: [
        {title: "b 1", value: "1"},
        {title: "b 2", value: "2"},
        {title: "b 3", value: "3"},
        {title: "b 4", value: "4"}
      ]
    });

  });

});
