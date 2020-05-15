jiant.module("jiant-uifactory", function() {

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

  function viewComponent(viewElem, viewId, prefix, componentId, componentContent, byTags) {
    const path = "." + prefix + componentId;
    if (byTags === "after-class") {
      const byCls = viewElem.find(path);
      return byCls[0] ? byCls : viewElem.find(componentId);
    } else if (byTags === "before-class") {
      const byTag = viewElem.find(componentId);
      return byTag[0] ? byTag : viewElem.find(path);
    } else if (!!byTags) {
      return viewElem.find(componentId);
    } else {
      return viewElem.find(path);
    }
  }

  function ensureExists(appPrefix, dirtyList, obj, idName, className, optional) {
    if (idName && dirtyList && (dirtyList.indexOf(idName) >= 0
        || (appPrefix && dirtyList.indexOf(idName.substring(appPrefix.length)) >= 0))) {
      return "";
    }
    if (!obj || !obj.length) {
      if (optional) {
        jiant.DEV_MODE && jiant.infop("optional element .!! not present under #!!, skipping, all is ok", className, idName);
        return "";
      } else {
        className ? jiant.errorp("non existing object referred by class under object id #!!, check stack trace for details, expected obj class: .!!", idName, className)
            : jiant.errorp("non existing object referred by id, check stack trace for details, expected obj id: #!!", idName);
        if (className) {
          return ",    #" + idName + " ." + className;
        } else {
          return ", #" + idName;
        }
      }
    }
    return "";
  }

  return {
    ensureExists: ensureExists,
    viewComponent: viewComponent,
    view: view
  }

});