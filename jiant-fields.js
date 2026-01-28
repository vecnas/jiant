jiant.module("jiant-fields", [], function({$, app, jiant, params}) {

  this.singleton();

  const customElementTypes = {};

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

  function setupCssFlagsMarkers(viewRoot, componentId, componentTp, mappingId, className, spec) {
    const flag = componentTp === jiant.cssFlag,
        markerName = "j_prevMarkerClass_" + componentId;
    className = className || componentId;
    viewRoot[componentId] = jiant.wrapType(componentTp);
    viewRoot[componentId].renderer = ({data, val, view, elem, isUpdate}) => {
      if (view[markerName]) {
        $.each(view[markerName], function (i, cls) {
          cls && view.removeClass(cls);
        });
      }
      view[markerName] = [];
      if (flag) {
        const _v = Array.isArray(val) && val.length === 0 ? undefined : val;
        if (!!_v) {
          view[markerName].push(className);
          view.addClass(className);
        }
      } else {
        if (val !== undefined && val !== null) {
          if (!Array.isArray(val) && val && typeof val.split === "function") {
            val = val.split(",");
          } else if (!Array.isArray(val)) {
            val = [val];
          }
          $.each(val, function (i, v) {
            const cls = className + "_" + v;
            view[markerName].push(cls);
            view.addClass(cls);
          })
        }
      }
    };
  }

  function setupDataFunction(viewRoot, linkRoot, componentId, mappingId, dataName) {
    dataName = dataName || componentId;
    viewRoot[componentId] = function(val) {
      if (arguments.length === 0) {
        return viewRoot.attr("data-" + dataName);
      } else {
        return viewRoot.attr("data-" + dataName, val);
      }
    };
  }

  function setupPager(uiElem) {
    const pagerBus = $({}),
        roots = [];
    let lastPage = 0, lastTotalCls;
    $.each(uiElem, function(i, elem) {
      const root = $("<ul></ul>");
      root.addClass("pagination");
      $(elem).append(root);
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
    uiElem.updatePager = function(page) {
      $.each(roots, function(idx, root) {
        root.empty();
        lastTotalCls && root.removeClass(lastTotalCls);
        lastTotalCls = "totalPages_" + page.totalPages;
        root.addClass(lastTotalCls);
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
      const ctl = $(jiant.parseTemplate($("<b><li class='!!ctlClass!!' style='cursor: pointer;'><a>!!label!!</a></li></b>"),
          {label: value !== -1 ? value : "...", ctlClass: ctlClass}));
      root.append(ctl);
      value !== -1 && ctl.click(function() {
        lastPage = value;
        uiElem.refreshPage();
      });
      return ctl;
    }
  }

  function setupContainerPaged(uiElem) {
    let prev = $("<div>&laquo;</div>"),
        next = $("<div>&raquo;</div>"),
        container = $("<div></div>"),
        pageSize = 8,
        offset = 0;
    prev.addClass("paged-prev");
    next.addClass("paged-next");
    container.addClass("paged-container");
    uiElem.empty();
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
      container.empty();
      sync();
    };
    uiElem.setHorizontal = function(bool) {
      const display = bool ? "inline-block" : "block";
      prev.css("display", display);
      next.css("display", display);
      container.css("display", display);
    };
    uiElem.setPageSize = function(val) {
      pageSize = val;
      sync();
    };
    uiElem.setHorizontal(true);

    function sync() {
      offset = Math.max(offset, 0);
      offset = Math.min(offset, container.children().length - 1);
      prev.css("visibility", offset > 0 ? "visible" : "hidden");
      next.css("visibility", offset < container.children().length - pageSize ? "visible" : "hidden");
      $.each(container.children(), function(idx, domElem) {
        let elem = $(domElem);
//        logInfo("comparing " + idx + " vs " + offset + " - " + (offset+pageSize));
        if (idx >= offset && idx < offset + pageSize) {
//          logInfo("showing");
          elem.show();
        } else {
          elem.hide();
        }
      });
    }
  }

  function setupImage(uiElem) {
    uiElem.reload = function (url) {
      url = url || this.attr("src");
      url = (url.indexOf("?") > -1) ? url : url + "?";
      const antiCache = "&_=" + new Date().getTime();
      url = (url.indexOf("&_=") > -1) ? url.replace(/&_=[0-9]{13}/, antiCache) : url + antiCache;
      this.attr("src", url);
    }
  }

  function setupCtlHide(viewOrTm, elem) {
    elem.click(function() {viewOrTm.hide()})
  }

  function setupCtlBack(viewOrTm, elem) {
    elem.click(function() {window.history.back()})
  }

  function setupCtl2root(app, elem) {
    elem.click(function() {jiant.goRoot(app)})
  }

  function setupCtl2state(viewOrTm, elem, app, name) {
    const stateName = name.endsWith("Ctl") ? name.substring(0, name.length - 3) : name;
    elem.click(function() {app.states[stateName].go()})
  }

  function fit(val, min, max) {
    val = isNaN(min) ? val : parseFloat(val) < min ? min : val;
    val = isNaN(max) ? val : parseFloat(val) > max ? max : val;
    return "" + val;
  }

  function setupInputInt(input) {
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
  }

  function setupInputFloat(input) {
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
  }

  function setupForm(appRoot, elem, key, name) {
    if (! elem[0]) {
      return;
    }
    const tagName = elem[0].tagName.toLowerCase();
    if (tagName !== "form") {
      jiant.logError(key + "." + name + " form element assigned to non-form: " + tagName);
      jiant.DEV_MODE && alert(key + "." + name + " form element assigned to non-form: " + tagName);
    }
    elem.submitForm = function(url, cb) {
      url = url ? url : elem.attr("action");
      url = isCouldBePrefixed(url) ? ((appRoot.ajaxPrefix ? appRoot.ajaxPrefix : jiant.AJAX_PREFIX ? jiant.AJAX_PREFIX : "") + url) : url;
      url = isCouldBePrefixed(url) ? (url + (appRoot.ajaxSuffix ? appRoot.ajaxSuffix : jiant.AJAX_SUFFIX ? jiant.AJAX_SUFFIX : "")) : url;
      const data = {
        type: "POST",
        url: url,
        data: elem.serialize(),
        success: cb,
        error: function (jqXHR, textStatus, errorText) {
          if (appRoot.handleErrorFn) {
            appRoot.handleErrorFn(jqXHR.responseText);
          } else {
            jiant.handleErrorFn(jqXHR.responseText);
          }
        }
      };
      if (appRoot.crossDomain) {
        data.crossDomain = true;
        if (appRoot.withCredentials) {
          data.xhrFields = {withCredentials: true};
        }
      }
      return $.ajax(data);
    };
  }

  function setupNumLabel(appRoot, uiElem) {
    const prev = uiElem.html;
    uiElem.html = function(val) {
      const num = parseInt(val);
      if (isNaN(num) || val + "" !== num + "") {
        prev.call(uiElem, val);
      } else {
        prev.call(uiElem, jiant.formatMoney(num, appRoot.formatGroupsDelim || undefined ));
      }
    };
    uiElem.addClass("nowrap");
  }

  function setupIntlProxies(appRoot, elem) {
    jiant.loadModule(appRoot, "jiant-intl", function() {
      jiant.intlProxy(appRoot, elem, "html");
      jiant.intlProxy(appRoot, elem, "text");
    });
  }

  function setupExtras(appRoot, uiElem, elemType, key, elemKey, viewOrTm, prefix) {
    if (elemType === jiant.tabs && uiElem.tabs) {
      uiElem.tabs();
      uiElem.refreshTabs = function() {uiElem.tabs("refresh");};
    } else if (elemType === jiant.ctlHide) {
      setupCtlHide(viewOrTm, uiElem);
    } else if (elemType === jiant.ctl2state) {
      setupCtl2state(viewOrTm, uiElem, appRoot, elemKey);
    } else if (elemType === jiant.ctlBack) {
      setupCtlBack(viewOrTm, uiElem);
    } else if (elemType === jiant.ctl2root) {
      setupCtl2root(appRoot, uiElem);
    } else if (elemType === jiant.inputInt) {
      setupInputInt(uiElem);
    } else if (elemType === jiant.inputFloat) {
      setupInputFloat(uiElem);
    } else if (elemType === jiant.inputDate && ("datepicker" in uiElem)) {
      const dp = appRoot.dateFormat ? uiElem.datepicker({format: appRoot.dateFormat}) : uiElem.datepicker();
      dp.on('changeDate', function() {uiElem.trigger("change")});
    } else if (elemType === jiant.pager) {
      setupPager(uiElem);
    } else if (elemType === jiant.form) {
      setupForm(appRoot, uiElem, key, elemKey);
    } else if (elemType === jiant.containerPaged) {
      setupContainerPaged(uiElem);
    } else if (elemType === jiant.image) {
      setupImage(uiElem);
    } else if (elemType === jiant.nlabel) {
      setupIntlProxies(appRoot, uiElem);
    } else if (elemType === jiant.numLabel) {
      setupNumLabel(appRoot, uiElem);
    } else if (customElementTypes[elemType]) {
      customElementTypes[elemType](uiElem, viewOrTm, appRoot);
    } else if (Array.isArray(elemType)) {
      $.each(elemType, function(i, tp) {
        setupExtras(appRoot, uiElem, tp, key, elemKey, viewOrTm, prefix);
      });
    }
    // maybeAddDevHook(uiElem, key, elemKey, prefix, viewOrTm);
  }

  function registerCustomType(customTypeName, handler) {
    if (! (typeof customTypeName === 'string' || customTypeName instanceof String)) {
      alert("Custom type name should be string");
    }
    customElementTypes[customTypeName] = handler;
  }

  const exp = {
    registerCustomType: registerCustomType
  };

  for (let key in exp) {
    jiant[key] = exp[key];
  }

  return {
    getAutoType: getAutoType,
    setupExtras: setupExtras,
    setupCssFlagsMarkers: setupCssFlagsMarkers,
    setupDataFunction: setupDataFunction
  }

});
