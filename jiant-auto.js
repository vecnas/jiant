jiant.module("jiant-auto", [], function({$, app, jiant, params}) {

  this.singleton();

  function getAutoType(child, name) {
    switch (child.tagName.toUpperCase()) {
      case "INPUT": return jiant.input;
      case "IMG": return jiant.image;
      case "FORM": return jiant.form;
      case "BUTTON": return jiant.ctl;
      case "A": return jiant.href;
      default:
        const lowerName = name.toLowerCase();
        if (lowerName.indexOf("container") >= 0) {
          return jiant.container;
        } else if (lowerName.indexOf("ctl") >= 0) {
          return jiant.ctl;
        }
        return jiant.label;
    }
  }

  return {
    getAutoType: getAutoType
  }

});