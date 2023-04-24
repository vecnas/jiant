jiant.module("jiant-components", ["jiant-uifactory", "jiant-ui"],
    function({$, app, jiant, params, "jiant-uifactory": UiFactory, "jiant-ui": Ui}) {

  this.singleton();

  let errString;

  const bindComponentElement = (instance, shadowRoot, prefix, compId, elemId, elemSpec) => {
    const prefixedElemId = prefix + elemId;
    jiant.infop("--------- Implementing elem #!!.!! ", compId, prefixedElemId);
    if (jiant.isVisualType(Ui.getComponentType(elemSpec))) {
      let elems = shadowRoot.querySelectorAll(`.${prefixedElemId}`);
      if (elems.length === 0) {
        elems = shadowRoot.querySelectorAll(`${prefixedElemId}`);
      }
      if (elems.length === 0) {
        elems = shadowRoot.querySelectorAll(`${jiant.toWebComponentName(elemId)}`);
      }
      if (elems.length !== 0) {
        instance[elemId] = elems;
        // Object.defineProperty(instance, elemId, {value: elems, writable: false});
      } else {
        console.log(`%c Not found implementation for #${compId}.${prefixedElemId}: ${elemSpec}`, "color:blue");
      }
    }
  }

  const autogenTemplate = (compId, compContent) => {
    alert("Autogenerate template not yet implemented, component id: " + compId);
  }

  const verifyContent = (compSpec, compContent) => {
    const sample = compContent.newInstance();
    for (const key in compSpec) {
      const tp = compSpec[key];
      if (jiant.isVisualType(tp)) {
        // check for presence in sample
      }
    }
  }

  const findSource = (appRoot, prefix, compId, compContent) => {
    if ("impl" in compContent) {
      return {tp: "impl", source: compContent.impl}
    }
    const indocElem = document.getElementById(prefix + compId);
    if (indocElem !== null) {
      return {tp: indocElem.tagName === "TEMPLATE" ? "template" : "elem", source: indocElem}
    }
    return {tp: "autogen"}
  }

  const getTemplate = source => {
    switch (source.tp) {
      case "impl":
        const t = document.createElement('template');
        t.innerHTML = source.source;
        return t
      case "template":
        return source.source
      case "elem":
        const tt = document.createElement('template');
        tt.innerHTML = source.source.outerHTML;
        return tt
      case "autogen":
      default:
        return null;
    }
  }

  const _bindComponents = (appRoot, root) => {
    // errString = "";
    for (const compId in root) {
      bindComponent(appRoot, compId, root[compId]);
    }
    // jiant.DEV_MODE && errString.length > 0 && alert("Some components not bound to HTML properly, check console " + errString);
  }

  const bindComponent = jiant.bindComponent = (appRoot, compId, compContent) => {
    jiant.logInfo("Binding component " + compId + ", looking for implementation");
    const prefix = jiant.getAppPrefix(appRoot, compContent);
    const source = findSource(appRoot, prefix, compId, compContent);
    console.log(`%c Content template method for ${compId} is ${source.tp}`, "color: lightblue");
    let compTemplate = getTemplate(source);
    if (compTemplate === null) {
      compTemplate = autogenTemplate(compId, compContent);
    }
    jiant.logInfo(source, compId + " produces compTemplate", compTemplate);
    const compSpec = {...compContent};
    jiant.logInfo("comp spec is ", compSpec);
    const compName = jiant.toWebComponentName(compId, "comp");
    const compClass = class extends HTMLElement {
      constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(compTemplate.content.cloneNode(true));
        for (const elemId in compSpec) {
          bindComponentElement(this, shadowRoot, prefix, compId, elemId, compSpec[elemId]);
        }
      }
    };
    customElements.define(compName, compClass);
    compContent.newInstance = () => new compClass();
    verifyContent(compSpec, compContent);
  }

  return {
    apply: function(appRoot, tree) {
      _bindComponents(appRoot, tree.components);
    }
  }

});