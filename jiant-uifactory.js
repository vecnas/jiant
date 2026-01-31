jiant.module("jiant-uifactory", function({jiant}) {

  this.singleton();
  function htmlToFragment(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    return tpl.content;
  }

  function selectOne(root, selector) {
    const scope = root || document;
    return scope.querySelector(selector);
  }

  function selectAll(root, selector) {
    const scope = root || document;
    return scope.querySelectorAll(selector);
  }

  function matchesSelector(elem, selector) {
    return elem && elem.nodeType && elem.matches && elem.matches(selector);
  }

  function view(prefix, viewId, viewContent, byTags) {
    const idSel = "#" + prefix + viewId;
    if (viewContent.impl) {
      if (typeof viewContent.impl === "string") {
        return htmlToFragment(viewContent.impl);
      }
      return viewContent.impl;
    } else if (byTags === "after-class") {
      const byCls = selectOne(null, idSel);
      return byCls || selectOne(null, viewId);
    } else if (byTags === "before-class") {
      const byTag = selectOne(null, viewId);
      return byTag || selectOne(null, idSel);
    } else if (!!byTags) {
      return selectOne(null, viewId);
    } else {
      return selectOne(null, idSel);
    }
  }

  function viewComponent(viewElem, viewId, prefix, componentId, componentContent, byTags, optional, bindLogger) {
    const path = "." + prefix + componentId;
    let result;
    if (byTags === "after-class") {
      const byCls = selectAll(viewElem, path);
      result = byCls.length ? byCls : selectAll(viewElem, componentId);
    } else if (byTags === "before-class") {
      const byTag = selectAll(viewElem, componentId);
      result = byTag.length ? byTag : selectAll(viewElem, path);
    } else if (!!byTags) {
      result = selectAll(viewElem, componentId);
    } else {
      result = selectAll(viewElem, path);
    }
    if (!result.length && matchesSelector(viewElem, path)) {
      result = [viewElem];
    }
    if (!optional) {
      bindLogger && bindLogger.result(ensureExists(result, prefix + viewId, prefix + componentId, optional));
    }
    return result;
  }

  function ensureExists(obj, idName, className, optional) {
    if (obj && (obj.length || obj.nodeType)) {
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
