(function () {
  function toIds(apps) {
    var arr = [];
    $.each(apps, function (i, app) {
      arr.push(app.id)
    });
    return arr;
  }

  var appTimers = {},
      logger = {
        bindCompleted: function (app) {
          jiant.infop("!!. application bind completed in !!ms", app.id, new Date().getTime() - appTimers[app.id]);
          delete appTimers[app.id];
        },
        bindStarted: function (app) {
          appTimers[app.id] = new Date().getTime();
          jiant.infop("!!. application bind started", app.id);
        },
        boundAjax: function (app, ajaxRoot, uri, ajaxFn) {
          jiant.infop("!!. bound ajax !!", app.id, uri);
        },
        boundEvent: function (app, eventsRoot, name, eventImpl) {
          jiant.infop("!!. bound event !!", app.id, name);
        },
        boundLogic: function (app, logicsRoot, name, spec) {
          jiant.infop("!!. bound logic !!", app.id, name);
        },
        boundModel: function (app, modelsRoot, name, modelImpl) {
          jiant.infop("!!. bound model !!", app.id, name);
        },
        boundState: function (app, states, name, stateSpec) {
          jiant.infop("!!. bound state !!", app.id, name);
        },
        boundTemplate: function (app, tmRoot, tmId, prefix, tm) {
          jiant.infop("!!. bound template !! using prefix !!", app.id, tmId, prefix);
        },
        boundView: function (app, viewsRoot, viewId, prefix, view) {
          jiant.infop("!!. bound view !! using prefix !!", app.id, viewId, prefix);
        },
        logicImplemented: function(appId, name, unboundCount) {
          jiant.infop("!!. implementation assigned to logic !!, remaining unbound logics count: !! !!",
              appId, name, unboundCount, unboundCount == 0 ? ", all logics loaded OK!" : "");
        },
        onUiBoundCalled: function (appIdArr, dependenciesList, cb) {
          jiant.errorp("!!. called onUiBound", toIds(appIdArr));
        }
      };
  jiant.addListener(logger);
})();
