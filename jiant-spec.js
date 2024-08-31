jiant.module("jiant-spec", ["jiant-log"], function({jiant}) {

  this.singleton();

  const specs = {}, {logInfo} = jiant;

  function initLazy(app) {
    if (! (app.id in specs)) {
      specs[app.id] = {views: {}, templates: {}};
    }
  }

  function viewSpec(app, viewId) {
    initLazy(app);
    return specs[app.id].views[viewId]??={};
  }

  function templateSpec(app, tmId) {
    initLazy(app);
    return specs[app.id].templates[tmId]??={};
  }

  function isViewPresent(app, viewId) {
    initLazy(app);
    return viewId in specs[app.id]?.views;
  }

  jiant.printSpec = function() {
    logInfo(specs);
  }

  return {
    viewSpec,
    templateSpec,
    isViewPresent
  }
})