jiant.module("jiant-types", ["jiant-jtype", "jiant-comp", "jiant-util"],
  function({jiant, "jiant-jtype": {initType, JType}, "jiant-comp": {getCompRenderer}, "jiant-util": util}) {

  this.singleton();
  const dom = (util && util.dom) ? util.dom : jiant.dom;

  function fit(val, min, max) {
    val = isNaN(min) ? val : parseFloat(val) < min ? min : val;
    val = isNaN(max) ? val : parseFloat(val) > max ? max : val;
    return "" + val;
  }

  function elemFromHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.firstElementChild;
  }

  function updateInputSet({data, elem, val, isUpdate, view}) {
    const firstElem = dom.first(elem);
    if (!elem || !firstElem) {
      return;
    }
    jiant.each(elem, function(i, item) {
      const itemElem = dom.first(item);
      if (!itemElem) {
        return;
      }
      let check = itemElem.value === val + "";
      if (!check && Array.isArray(val)) {
        val.forEach(function(subval) {
          if (subval + "" === itemElem.value + "") {
            check = true;
            return false;
          }
        });
      }
      dom.setChecked(itemElem, check);
    });
  }

  const visualComponentProducer = ({app, view, viewId, templateId, viewImpl, componentId, tpInstance, uiFactory, bindLogger}) =>
    uiFactory.viewComponent(viewImpl, viewId || templateId, app.appPrefix, componentId,
      undefined, app.bindByTag, tpInstance.optional(), bindLogger);

  visualComponentProducer.and = cb => arg => {
    const elem = visualComponentProducer(arg);
    cb({...arg, elem: elem});
    return elem;
  }

  const visualRenderProducer = ({app, view, viewId, templateId, componentId, tpInstance}) =>
    ({data, elem, val, isUpdate, view, fieldPresent}) => {
      if (!elem || !elem[0]) {
        return;
      }
      const tagName = elem[0].tagName.toLowerCase();
      if (tagName in {"input": 1, "textarea": 1, "select": 1}) {
        const tp = elem[0].getAttribute("type");
        if (tp === "checkbox") {
          elem.prop("checked", !!val);
        } else if (tp === "radio") {
          dom.forEach(elem, function(subelem) {
            dom.setChecked(subelem, subelem.value === (val + ""));
          });
        } else {
          (val === undefined || val === null) ? elem.val(val) : elem.val(val + "");
        }
      } else if (tagName === "img") {
        elem.attr("src", val);
      } else if (fieldPresent) {
        const htmlVal = val === undefined ? "" : val;
        let usedCustom = false;
        dom.forEach(elem, function(node) {
          if (node && typeof node.html === "function") {
            node.html(htmlVal);
            usedCustom = true;
          } else if (node && "innerHTML" in node) {
            node.innerHTML = htmlVal;
          }
        });
        if (!usedCustom && elem && typeof elem.html === "function") {
          elem.html(htmlVal);
        }
      }
    };

  const meta = initType({clz: class meta extends JType {}, fields: {flags: 0}});
  const container = initType({clz: class container extends JType {},
    componentProducer: visualComponentProducer, renderProducer: visualRenderProducer});
  const label = initType({clz: class label extends JType {},
    componentProducer: visualComponentProducer, renderProducer: visualRenderProducer});
  const ctl = initType({clz: class ctl extends JType {},
    componentProducer: visualComponentProducer, renderProducer: visualRenderProducer});
  const grid = initType({clz: class grid extends JType {},
    componentProducer: visualComponentProducer, renderProducer: visualRenderProducer});
  const collection = initType({clz: class collection extends JType {},
    componentProducer: visualComponentProducer, renderProducer: visualRenderProducer});
  const input = initType({clz: class input extends JType {},
    componentProducer: visualComponentProducer, renderProducer: visualRenderProducer});
  const slider = initType({clz: class slider extends JType {},
      componentProducer: visualComponentProducer, renderProducer: visualRenderProducer});
  const inputSetAsString = initType({clz: class slider extends JType {},
      componentProducer: visualComponentProducer, renderProducer: () => ({data, elem, val, isUpdate, view}) => {
      updateInputSet({data, elem, isUpdate, view,
        val: !val ? [val] : Array.isArray(val) ? val : jiant.isNumeric(val) ? [val] : ("" + val).split(",")});
    }});
  const inputSet = initType({clz: class slider extends JType {},
      componentProducer: visualComponentProducer, renderProducer: () => updateInputSet});

  const imgBg = initType({clz: class imgBg extends JType {},
    componentProducer: visualComponentProducer, renderProducer: () => ({elem, val}) => {
      jiant.css(elem, "background-image", !!val ? "url(\"" + val + "\")" : "");
    }});

  const href = initType({clz: class href extends JType {},
    componentProducer: visualComponentProducer, renderProducer: () => ({elem, val}) => {
      elem.attr("href", !!val ? val : "");
    }});

  const image = initType({clz: class image extends JType {},
    componentProducer: visualComponentProducer.and(({elem}) => {
      elem.reload = function (url) {
        url = url || this.attr("src");
        url = (url.indexOf("?") > -1) ? url : url + "?";
        const antiCache = "&_=" + new Date().getTime();
        url = (url.indexOf("&_=") > -1) ? url.replace(/&_=[0-9]{13}/, antiCache) : url + antiCache;
        this.attr("src", url);
      }
    }),
    renderProducer: visualRenderProducer});

  const nlabel = initType({clz: class nlabel extends JType {},
    componentProducer: visualComponentProducer.and(({elem, app}) => {
      jiant.loadModule(app, "jiant-intl", function() {
        dom.forEach(elem, function(el) {
          jiant.intlProxy(app, el, "html");
          jiant.intlProxy(app, el, "text");
        });
      });
    }),
    renderProducer: visualRenderProducer});

  const numLabel = initType({clz: class numLabel extends JType {},
    componentProducer: visualComponentProducer.and(({elem, app}) => {
      const prev = elem.html;
      elem.html = function(val) {
        const num = parseInt(val);
        if (isNaN(num) || val + "" !== num + "") {
          prev.call(elem, val);
        } else {
          prev.call(elem, jiant.formatMoney(num, app.formatGroupsDelim || undefined ));
        }
      };
      jiant.addClass(elem, "nowrap");
    }),
    renderProducer: visualRenderProducer});

  const pager = initType({clz: class pager extends JType {},
    componentProducer: visualComponentProducer.and(({elem: uiElem}) => {
      const pagerBus = jiant.createEventBus(),
        roots = [];
      let lastPage = 0, lastTotalCls;
      jiant.each(uiElem, function(i, elem) {
        const root = document.createElement("ul");
        jiant.addClass(root, "pagination");
        jiant.dom.append(elem, root);
        roots.push(root);
      });
      uiElem.onValueChange = function(callback) {
        pagerBus.on("ValueChange", callback);
      };
      uiElem.refreshPage = function() {
        pagerBus.trigger("ValueChange", lastPage);
      };
      uiElem.val = function() {
        if (arguments.length === 0) {
          return lastPage;
        } else {
          lastPage = parseInt(arguments[0]);
          uiElem.refreshPage();
        }
      };
      /**
       * Updates pager state with page data from server, in spring format, function extends ui element api (jquery object)
       * @param {Object} page
       * @param {number} page.totalPages - amount of total available pages
       * @param {number} page.number - currently active page, for first page added class pager_first, for last - added class pager_last
       */
      uiElem.updatePager = function(page) {
        jiant.each(roots, function(idx, root) {
          jiant.empty(root);
          lastTotalCls && jiant.dom.removeClass(root, lastTotalCls);
          lastTotalCls = "totalPages_" + page.totalPages;
          jiant.addClass(root, lastTotalCls);
          const from = Math.max(0, page.number - Math.round(jiant.PAGER_RADIUS / 2)),
            to = Math.min(page.number + Math.round(jiant.PAGER_RADIUS / 2), page.totalPages);
          if (from > 0) {
            addPageCtl(root, 1, "pager_first");
            addPageCtl(root, -1, "disabled emptyPlaceholder");
          }
          for (let i = from; i < to; i++) {
            let cls = "";
            if (i === page.number) {
              cls += " active";
            }
            addPageCtl(root, i + 1, cls);
          }
          let clsLast = "";
          if (to < page.totalPages - 1) {
            addPageCtl(root, -1, "disabled emptyPlaceholder");
            clsLast = "pager_last";
          }
          if (to < page.totalPages) {
            addPageCtl(root, page.totalPages, clsLast);
          }
        });
      };
      function addPageCtl(root, value, ctlClass) {
        const ctl = elemFromHtml(jiant._parseTemplate("<li class='!!ctlClass!!' style='cursor: pointer;'><a>!!label!!</a></li>",
          {label: value !== -1 ? value : "...", ctlClass: ctlClass}));
        jiant.dom.append(root, ctl);
        value !== -1 && ctl.addEventListener("click", function() {
          lastPage = value;
          uiElem.refreshPage();
        });
        return ctl;
      }
    }),
    renderProducer: visualRenderProducer});

  const form = initType({clz: class form extends JType {},
    componentProducer: visualComponentProducer.and(({elem, app: appRoot, componentId, viewId, templateId}) => {
      if (! elem[0]) {
        return;
      }
      const tagName = elem[0].tagName.toLowerCase();
      if (tagName !== "form") {
        jiant.logError((viewId || templateId) + "." + componentId + " form element assigned to non-form: " + tagName);
        jiant.DEV_MODE && alert((viewId || templateId) + "." + componentId + " form element assigned to non-form: " + tagName);
      }
      elem.submitForm = function(url, cb) {
        url = url ? url : elem.attr("action");
        url = jiant.isCouldBePrefixed(url) ? ((appRoot.ajaxPrefix ? appRoot.ajaxPrefix : jiant.AJAX_PREFIX ? jiant.AJAX_PREFIX : "") + url) : url;
        url = jiant.isCouldBePrefixed(url) ? (url + (appRoot.ajaxSuffix ? appRoot.ajaxSuffix : jiant.AJAX_SUFFIX ? jiant.AJAX_SUFFIX : "")) : url;
        const settings = {
          method: "POST",
          url: url,
          data: elem.serialize()
        };
        if (appRoot.crossDomain) {
          settings.crossDomain = true;
          if (appRoot.withCredentials) {
            settings.xhrFields = {withCredentials: true};
          }
        }
        return fetchForm(settings).then(function(text) {
          cb && cb(text);
          return text;
        }).catch(function(err) {
          const responseText = err && typeof err.responseText === "string" ? err.responseText : "";
          if (appRoot.handleErrorFn) {
            appRoot.handleErrorFn(responseText);
          } else {
            jiant.handleErrorFn(responseText);
          }
          return;
        });
      };
    }),
    renderProducer: visualRenderProducer});

  function fetchForm(settings) {
    const headers = {};
    if (!settings.data) {
      settings.data = "";
    }
    const fetchOpts = {
      method: settings.method || "POST",
      headers: headers,
      body: settings.data,
      mode: settings.crossDomain ? "cors" : "same-origin",
      credentials: settings.crossDomain ? (settings.xhrFields && settings.xhrFields.withCredentials ? "include" : "omit") : "same-origin"
    };
    if (!("Content-Type" in headers) && !("content-type" in headers)) {
      headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    }
    return fetch(settings.url, fetchOpts).then(function(res) {
      return res.text().then(function(text) {
        if (res.ok) {
          return text;
        }
        throw {status: res.status, statusText: res.statusText || "", responseText: text};
      });
    }).catch(function(err) {
      if (err && err.status !== undefined) {
        throw err;
      }
      throw {status: 0, statusText: err && err.name ? err.name : "error", responseText: ""};
    });
  }

  const containerPaged = initType({clz: class containerPaged extends JType {},
    componentProducer: visualComponentProducer.and(({elem: uiElem}) => {
      let prev = $("<div>&laquo;</div>"),
        next = $("<div>&raquo;</div>"),
        container = $("<div></div>"),
        pageSize = 8,
        offset = 0;
      jiant.addClass(prev, "paged-prev");
      jiant.addClass(next, "paged-next");
      jiant.addClass(container, "paged-container");
      jiant.empty(uiElem);
      uiElem.append(prev);
      uiElem.append(container);
      uiElem.append(next);
      prev.click(function() {
        offset -= pageSize;
        sync();
      });
      next.click(function() {
        offset += pageSize;
        sync();
      });
      uiElem.append = function(elem) {
        container.append(elem);
        sync();
      };
      uiElem.empty = function() {
        jiant.empty(container);
        sync();
      };
      uiElem.setHorizontal = function(bool) {
        const display = bool ? "inline-block" : "block";
        jiant.css(prev, "display", display);
        jiant.css(next, "display", display);
        jiant.css(container, "display", display);
      };
      uiElem.setPageSize = function(val) {
        pageSize = val;
        sync();
      };
      uiElem.setHorizontal(true);

      function sync() {
        offset = Math.max(offset, 0);
        offset = Math.min(offset, container.children().length - 1);
        jiant.css(prev, "visibility", offset > 0 ? "visible" : "hidden");
        jiant.css(next, "visibility", offset < container.children().length - pageSize ? "visible" : "hidden");
        jiant.each(container.children(), function(idx, domElem) {
          let elem = $(domElem);
//        logInfo("comparing " + idx + " vs " + offset + " - " + (offset+pageSize));
          if (idx >= offset && idx < offset + pageSize) {
//          logInfo("showing");
            jiant.show(elem);
          } else {
            jiant.hide(elem);
          }
        });
      }
    }),
    renderProducer: visualRenderProducer});

  const tabs = initType({clz: class tabs extends JType {},
    componentProducer: visualComponentProducer.and(({elem, view}) => {
      if (! "tabs" in elem) {
        jiant.logError("Tabs function required to use jiant.tabs type. Now just skipping. You may add bootstrap tabs to enable it");
        return;
      }
      elem.tabs();
      elem.refreshTabs = function() {elem.tabs("refresh")};
    }),
    renderProducer: null});

  const ctlHide = initType({clz: class ctlHide extends JType {},
    componentProducer: visualComponentProducer.and(({elem, view}) => elem.click(e => jiant.hide(view))),
    renderProducer: null});

  const ctlBack = initType({clz: class ctlBack extends JType {},
    componentProducer: visualComponentProducer.and(({elem, view}) => elem.click(e => window.history.back())),
    renderProducer: null});

  const ctl2state = initType({clz: class ctl2state extends JType {},
    componentProducer: visualComponentProducer.and(({elem, app, componentId}) => {
      const stateName = componentId.endsWith("Ctl") ? componentId.substring(0, componentId.length - 3) : componentId;
      elem.click(e => app.states[stateName].go())
    }),
    renderProducer: null});

  const ctl2root = initType({clz: class ctl2root extends JType {},
    componentProducer: visualComponentProducer.and(({elem, app}) => elem.click(e => jiant.goRoot(app))),
    renderProducer: null});

  const inputInt = initType({clz: class inputInt extends JType {},
    componentProducer: visualComponentProducer.and(({elem: input}) => {
      input.keydown(function(event) {
        if (event.keyCode === jiant.key.down && input.val() > 0) {
          input.val(fit(input.valInt() - 1, input.j_valMin, input.j_valMax));
          input.trigger("change");
          return false;
        } else if (event.keyCode === jiant.key.up) {
          input.val(fit(input.valInt() + 1, input.j_valMin, input.j_valMax));
          input.trigger("change");
          return false;
        } else if ( event.keyCode === jiant.key.end || event.keyCode === jiant.key.home || event.keyCode === jiant.key.tab || event.keyCode === jiant.key.enter) {
          input.val(fit(input.valInt(), input.j_valMin, input.j_valMax));
        } else if (!event.ctrlKey && !event.shiftKey && (event.keyCode !== jiant.key.backspace && event.keyCode !== jiant.key.del
            && event.keyCode !== jiant.key.left && event.keyCode !== jiant.key.right && event.keyCode < 48 || event.keyCode > 57)
          && (event.keyCode < 96 || event.keyCode > 105 )) {
          event.preventDefault();
          return false;
        }
        return true;
      });
      input.valInt = function() {
        const val = parseInt(input.val());
        return isNaN(val) ? 0 : val;
      };
      input.setMax = function(val) {
        input.j_valMax = val;
        input.attr("max", val);
        input.val(fit(input.valInt(), input.j_valMin, input.j_valMax));
      };
      input.setMin = function(val) {
        input.j_valMin = val;
        input.attr("min", val);
        input.val(fit(input.valInt(), input.j_valMin, input.j_valMax));
      }
    }),
    renderProducer: visualRenderProducer});

  const inputFloat = initType({clz: class inputFloat extends JType {},
    componentProducer: visualComponentProducer.and(({elem: input}) => {
      input.keydown(function(event) {
        if (event.keyCode === jiant.key.down && input.val() > 0) {
          input.val(fit(input.valFloat() - 1, input.j_valMin, input.j_valMax));
          input.trigger("change");
          return false;
        } else if (event.keyCode === jiant.key.up) {
          input.val(fit(input.valFloat() + 1, input.j_valMin, input.j_valMax));
          input.trigger("change");
          return false;
        } else if (event.keyCode === jiant.key.dot || event.keyCode === jiant.key.dotExtra) {
          return (input.val().indexOf(".") < 0) && input.val().length > 0;
        } else if ( event.keyCode === jiant.key.end || event.keyCode === jiant.key.home || event.keyCode === jiant.key.tab || event.keyCode === jiant.key.enter) {
          input.val(fit(input.valFloat(), input.j_valMin, input.j_valMax));
        } else if (!event.ctrlKey && !event.shiftKey && (event.keyCode !== jiant.key.backspace
          && event.keyCode !== jiant.key.del && event.keyCode !== jiant.key.left && event.keyCode !== jiant.key.right
          && event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
          event.preventDefault();
          return false;
        }
        return true;
      });
      input.valFloat = function() {
        const val = parseFloat(input.val());
        return isNaN(val) ? 0 : val;
      };
      input.setMax = function(val) {
        input.j_valMax = val;
        input.attr("max", val);
        input.val(fit(input.valFloat(), input.j_valMin, input.j_valMax));
      };
      input.setMin = function(val) {
        input.j_valMin = val;
        input.attr("min", val);
        input.val(fit(input.valFloat(), input.j_valMin, input.j_valMax));
      }
    }),
    renderProducer: visualRenderProducer});

  const inputDate = initType({clz: class inputDate extends JType {},
    componentProducer: visualComponentProducer.and(({elem, app}) => {
      if (! ("datepicker" in elem)) {
        jiant.logError("Datepicker required for inputDate usage, now skipping inputDate declaration");
        return;
      }
      const dp = app.dateFormat ? elem.datepicker({format: app.dateFormat}) : elem.datepicker();
      dp.on('changeDate', function() {elem.trigger("change")});
    }),
    renderProducer: visualRenderProducer});

  const fn = initType({clz: class fn extends JType {}, fields: {func: 1},
    componentProducer: ({app, view, componentId, tpInstance}) => tpInstance.func});

  const lookup = initType({clz: class lookup extends JType {},
    componentProducer: ({app, view, componentId, tpInstance}) => 
      function() { return view.find("." + app.appPrefix + componentId)}});

  const data = initType({clz: class data extends JType {}, fields: {dataName: 0},
    componentProducer: ({app, view, viewImpl, componentId, tpInstance}) => function(val) {
      const attrName = "data-" + (tpInstance.dataName() || componentId);
      if (arguments.length === 0) {
        return viewImpl.attr(attrName);
      } else {
        return viewImpl.attr(attrName, val);
      }
    },
    renderProducer: ({componentId}) => function ({val, view}) {view[componentId](val)}
  });

  const cssMarker = initType({clz: class cssMarker extends JType {}, fields: {className: 0}, alwaysUpdatable: true,
    renderProducer: ({app, view, componentId, tpInstance}) => ({data, val, view, elem, isUpdate}) => {
      const markerName = "j_prevMarkerClass_" + componentId;
      const className = tpInstance.className() || componentId;
      if (view[markerName]) {
        jiant.each(view[markerName], function (i, cls) {
          cls && view.removeClass(cls);
        });
      }
      view[markerName] = [];
      if (val !== undefined && val !== null) {
        if (!Array.isArray(val) && val && typeof val.split === "function") {
          val = val.split(",");
        } else if (!Array.isArray(val)) {
          val = [val];
        }
        jiant.each(val, function (i, v) {
          const cls = className + "_" + v;
          view[markerName].push(cls);
          jiant.addClass(view, cls);
        })
      }
  }});

  const cssFlag = initType({clz: class cssFlag extends JType {}, fields: {className: 0}, alwaysUpdatable: true,
    renderProducer: ({app, view, componentId, tpInstance}) => ({data, val, view, elem, isUpdate}) => {
      const markerName = "j_prevMarkerClass_" + componentId;
      const className = tpInstance.className() || componentId;
      if (view[markerName]) {
        jiant.each(view[markerName], function (i, cls) {
          cls && view.removeClass(cls);
        });
      }
      view[markerName] = [];
      const _v = Array.isArray(val) && val.length === 0 ? undefined : val;
      if (!!_v) {
        view[markerName].push(className);
        jiant.addClass(view, className);
      }
  }});

  const comp = initType({clz: class comp extends JType {}, fields: {compName: 0, params: 0}, alwaysUpdatable: true,
    componentProducer: visualComponentProducer,
    renderProducer: ({app, view, viewId, templateId, componentId, tpInstance}) => {
      const isParentView = viewId !== undefined;
      if (! (tpInstance.compName() in app.templates)) {
        jiant.error("jiant.comp element refers to non-existing template name: " + tpInstance.compName() + ", view.elem: " + viewId + "." + componentId);
      }
      if (!tpInstance.optional() && isParentView) {
        // jiant.logError("Scheduling R TP 487 " + viewId + templateId + "::" + componentId);
        jiant.onApp(app, () => {
          // jiant.logError("R TP 489 " + viewId + templateId + "::" + componentId);
          view[componentId].renderer({data: {}, elem: view[componentId], isUpdate: false, view: view, settings: {}})
        }
      );
      }
      return getCompRenderer({app, componentId: tpInstance.compName(), templateId, viewId, field: componentId, spec: tpInstance});
    }
  });

  const is = p => p instanceof JType;

  const module = {
    comp,
    fn,
    meta,
    data,
    lookup,
    cssMarker,
    cssFlag,
    container,
    label,
    ctl,
    ctlHide,
    ctlBack,
    ctl2root,
    ctl2state,
    numLabel,
    nlabel,
    image,
    inputInt,
    inputFloat,
    inputDate,
    pager,
    form,
    tabs,
    containerPaged,
    grid,
    collection,
    input,
    imgBg,
    slider,
    href,
    inputSet,
    inputSetAsString
  };

  Object.assign(jiant, module);

  return {
    ...module,
    is: is,
    canonizeMap: (obj) => {
      for (const [key, val] of Object.entries(obj)) {
        if (is(val) && val.field() === undefined) {
          obj[key] = val.field(key);
        }
      }
    }
  };

});
