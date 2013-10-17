if (! window.jiant) {
  alert("Use this script when Jiant available on a page");
} else {
  jiant.setUiFactory(new function() {

    function view(prefix, viewId) {
      var viewElem = $("#" + prefix + viewId);
      if (viewElem[0]) {
        return viewElem;
      }
      viewElem = $("<div class='jiant_view'>" + viewId + "</div>");
      viewElem.attr("id", prefix + viewId);
      viewElem.attr("title", "view: " + viewId);
      $("body").append(viewElem);
      return viewElem;
    }

    function template(prefix, tmId, tmContent) {
      var tmElem = $("#" + prefix + tmId);
      if (tmElem[0]) {
        return tmElem;
      }
      tmElem = $("<div><div class='jiant_tm " + prefix + tmId + "' title='tm: " + tmId + "'></div></div>");
      tmElem.attr("id", prefix + tmId);
      tmElem.hide();
      $("body").append(tmElem);
      return tmElem;
    }

    function viewComponent(viewElem, viewId, prefix, componentId, componentContent) {
      var elem = viewElem.find("." + prefix + componentId);
      if (elem[0]) {
        return elem;
      }
      if (componentContent == jiant.input || componentContent == jiant.inputInt || componentContent == jiant.inputFloat
          || componentContent == jiant.inputDate) {
        elem = $("<input type='text'/>");
      } else if (componentContent == jiant.ctl) {
        elem = $("<button>" + componentId + "</button>");
      } else if (componentContent == jiant.container) {
        elem = $("<div>" + componentId + "</div>");
      } else if (componentContent == jiant.label) {
        elem = $("<div>" + componentId + "</div>");
      } else if (componentContent == jiant.pager) {
        elem = $("<div>" + componentId + "</div>");
      } else if (componentContent == jiant.image) {
        elem = $("<img/>");
      } else {
        jiant.logError("Unsupported element type: " + componentContent);
        elem = $("<div>" + componentId + "</div>");
      }
      elem.attr("class", prefix + componentId + " jiant_elem");
      elem.attr("title", viewId + "." + componentId);
      elem.attr("placeholder", viewId + "." + componentId);
      (viewElem.find(".jiant_tm")[0] ? viewElem.find(".jiant_tm") : viewElem) .append(elem);
      return elem;
    }


    return {
      template: template,
      view: view,
      viewComponent: viewComponent
    }

  });
}
