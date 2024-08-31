jiant.module("jiant-uifactory", function({$, jiant}) {

  this.singleton();

  function view(prefix, viewId, viewContent, byTags) {
    const id = "#" + prefix + viewId;
    if (viewContent.impl) {
      return $(viewContent.impl);
    } else if (byTags === "after-class") {
      const byCls = $(id);
      return byCls[0] ? byCls : $(viewId);
    } else if (byTags === "before-class") {
      const byTag = $(viewId);
      return byTag[0] ? byTag : $(id);
    } else if (!!byTags) {
      return $(viewId);
    } else {
      return $(id);
    }
  }

  function viewComponent(viewElem, viewId, prefix, componentId, componentContent, byTags, optional, bindLogger) {
    const path = "." + prefix + componentId;
    let result;
    if (byTags === "after-class") {
      const byCls = viewElem.find(path);
      result = byCls[0] ? byCls : viewElem.find(componentId);
    } else if (byTags === "before-class") {
      const byTag = viewElem.find(componentId);
      result = byTag[0] ? byTag : viewElem.find(path);
    } else if (!!byTags) {
      result = viewElem.find(componentId);
    } else {
      result = viewElem.find(path);
    }
    if (!result.length) {
      result = viewElem.filter(path);
    }
    if (!optional) {
      bindLogger && bindLogger.result(ensureExists(result, prefix + viewId, prefix + componentId, optional));
    }
    return result;
  }

  function ensureExists(obj, idName, className, optional) {
    if (obj && obj.length) {
      return "";
    }
    if (optional) {
      jiant.DEV_MODE && jiant.infop("optional element .!! not present under #!!, skipping, all is ok", className, idName);
      return "";
    }
    className ? jiant.errorp("non existing object referred by class under object id #!!, check stack trace for details, expected obj class: .!!", idName, className)
        : jiant.errorp("non existing object referred by id, check stack trace for details, expected obj id: #!!", idName);
    if (className) {
      return ",    #" + idName + " ." + className;
    } else {
      return ", #" + idName;
    }
  }

  return {
    ensureExists: ensureExists,
    viewComponent: viewComponent,
    view: view
  }

});