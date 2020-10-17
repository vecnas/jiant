jiant.module("filterMain", function($, app) {

  jiant.onApp(app, function() {
    renderFilter();
    app.views.contentView.propagate(app.models.filter, true);
  });

  function renderFilter() {
    getFilterData(function(filterData) {
      app.views.filterView.propagate(filterData);
      app.views.filter2modelView = {
        optionBox: jiant.inputSet
      };
      jiant.bindView(app, "filter2modelView", app.views.filter2modelView, $("#_filter2modelView"));
      app.views.filter2modelView.propagate(app.models.filter, true, true);
      app.models.filter.on(function() {
        jiant.logInfo(app.models.filter.asMap());
      });
    });
  }

  function getFilterData(cb) {
    const filterData = {
      filters: [
        {label: "Преподаватель", options: [
            {"id" : "mark", "label" : "Татьяна Маркелова"},
            {"id" : "shock", "label" : "Анастасия Шокурова"},
          ]},
        {label: "Сложность", options: [
            {"id" : "c1", "label" : "Начинающие"},
            {"id" : "c2", "label" : "Практикующие"},
            {"id" : "c3", "label" : "Продолжающие"},
          ]}
      ]
    };
    cb(filterData);
  }

});