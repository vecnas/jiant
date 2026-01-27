(function () {

  var actions = [];

  function r(type, data) {
    data.time = new Date().getTime();
    data.type = type;
    actions.push(data);
    jiant.logInfo("stored action: ", data);
  }

  function addUiTrackers(app, view, viewId) {
    $.each(view._jiantSpec, function(elemName, val) {
      var elem = view[elemName];
      elem && elem.click && elem.click(function(event) {
        r("click", {view: viewId, elem: elemName});
      })
    });
  }

  var logger = {
    boundAjax: function (app, ajaxRoot, uri, ajaxFn) {
      r("ajax", {uri: uri});
    },
    boundEvent: function (app, eventsRoot, name, eventImpl) {
    },
    boundLogic: function (app, logicsRoot, name, spec) {
    },
    boundModel: function (app, modelsRoot, name, modelImpl) {
    },
    boundState: function (app, states, name, stateSpec) {
    },
    boundView: function (app, viewsRoot, viewId, prefix, view) {
      addUiTrackers(app, view, viewId);
    },
    parsedTemplate: function(app, tmRoot, tmId, tmSpec, data, tm) {
      addUiTrackers(app, tm, tmId);
    }
  };
  jiant.addListener(logger);
})();
