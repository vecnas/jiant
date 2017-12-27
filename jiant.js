/*
 2.76.3: fix of wrong condition in models fill
 2.77: changing model in on .add handler now properly reflected in indexes
 2.77.1: intl attaches app.modulesSuffix to intl url
 2.78: .propagate skips jquery objects in models, to avoid re-attaching stored views
 2.79: jiant.registerCustomRenderer(name, function(obj, elem, val, isUpdate, viewOrTemplate) { added, to provide ability attach named custom renderers to elems
 2.80: jiant.comp[onent] added to declare templates/views hierarchy, example: templates.itemSlotTm = {item: jiant.comp("itemTm"}, should refer to template name
 2.80.1: .comp fields access: tmOut.fieldOut.fieldIn
 2.80.2: minor fix for views comp
 2.81 link to embedded template changed, tm.templateSource() method added to templates, returns source code of template
 2.82: loadModules minor fix, semaphore re-release enabled, proper subpath pass to comp subelements
 2.82.1: .comp in views fix
 2.82.2: appRoot.formatGroupsDelim could be set for numLabel formatting
 2.83: ajax method from now may return object {url: "", method: "[post|get|smth else]", paramMapping: {name: "paramName"}},
       /person/:id/save substitution supported by param names
 2.84: ports in url fixed, non-absolute ajax urls prefixed by ajaxPrefix
 2.84.1: labelNum gets class "nowrap", which could by defined in .css as white-space: nowrap
 2.85: ajax method returnable object may contain section headers: {paramName: headerName} for param to headers mapping
 2.85.1: added check for empty function in jRepo model spec, to allow non-empty custom implementation
 2.85.2: custom models findBy supported
 2.85.3: anti cache parameter added only if ajax method not specified or set to GET
 2.86: comp(onent) supports functions as root subobject, like obj.pet() mapped to pet: jiant.comp("petTm")
 2.87: propagate mapping now supports functions with this pointing to object, to enable {tp: function() {return translate(this.tp)}}
 2.88: jiant.comp accepts params: jiant.comp(tmName, params), passed to customRenderer as part of source object for better customization,
       jiant.comp doesn't call template for null data, just sets element html to empty value
 2.88.1: fixed jiant.comp for templates
 2.88.2: view customRenderer called after components, for back compatibility
 2.88.3: model once fixes for model itself and collection functions
 2.89: alt_shift_click in dev mode prints bound model and binding stack trace to console
 2.90: some refactoring, jiant.data, cssFlag and cssMarker now accept field name mapping, like a: cssFlag("amount", "cls") produces "a" class mapped to amount field as "cls" class name
 2.90.1: same as previous, with templates support
 2.90.2: fixed pure old cssMarker
 2.90.3: jiant.meta accepts arguments, which could be retrieved during runtime, for any purposes
 2.90.4: fixed cssFlag/cssMarker/data mapping to field, having no own declaration
 2.91: fixed error when loading module which includes already loaded styles, but not yet loaded js
 2.92: model field .enqueue organizes queue of values on field, sets next when value reset to null/undefined; m.user.cmd.enqueue
 2.92.1: IE 11 startsWith polyfill
 2.93: improved templates rendering, removed devHook to improve performance on large templates amounts
 2.93.1: endsWith polyfill, fixed ajax urls construction
 2.93.2: ajax urls concatenation fix
// 2.94: view component methods showOn(cbOrFld), hideOn(cbOrFld), switchClassOn(cbOrCls, cbOrFld); view methods jInit() - init, elems() - for collections
 */
"use strict";
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    factory(jQuery);
  }
}(function($) {

  var

    DefaultUiFactory = function() {

      function view(prefix, viewId, viewContent) {
        return viewContent.impl ? $(viewContent.impl) : $("#" + prefix + viewId);
      }

      function viewComponent(viewElem, viewId, prefix, componentId, componentContent) {
        return viewElem.find("." + prefix + componentId);
      }

      function template(prefix, tmId, tmContent) {
        return tmContent.impl ? $(tmContent.impl) : $("#" + prefix + tmId);
      }

      return {
        template: template,
        viewComponent: viewComponent,
        view: view
      }
    },

    listenerProto = {
      bindStarted: function(app) {},
      bindCompleted: function(app) {},

      boundAjax: function(app, ajaxRoot, uri, ajaxFn) {},
      boundEvent: function(app, eventsRoot, name, eventImpl) {},
      boundLogic: function(app, logicsRoot, name, spec) {},
      boundModel: function(app, modelsRoot, name, modelImpl) {},
      boundState: function(app, states, name, stateSpec) {},
      boundTemplate: function(app, tmRoot, tmId, prefix, tm) {},
      boundView: function(app, viewsRoot, viewId, prefix, view) {},

      ajaxCallStarted: function(app, uri, url, callData) {},
      ajaxCallCompleted: function(app, uri, url, callData, timeMs) {},
      ajaxCallResults: function(app, uri, url, callData, data) {},
      ajaxCallError: function(app, uri, url, callData, timeMs, errorMessage, jqXHR) {},

      stateEndCallHandler: function(app, name, stateSpec, trace) {},
      stateEndRegisterHandler: function(app, name, stateSpec) {},
      stateEndTrigger: function(app, name) {},
      stateError: function(app, name, stateSpec, message) {},
      stateStartCallHandler: function(app, name, stateSpec, trace, args) {},
      stateStartRegisterHandler: function(app, name, stateSpec) {},
      stateStartTrigger: function(app, name, params) {},

      parsedTemplate: function(app, tmRoot, tmId, tmSpec, data, tm) {},
      submittingForm: function(app, viewName, formName, data) {},

      logicImplemented: function(appId, name, unboundCount) {},
      onUiBoundCalled: function(appIdArr, dependenciesList, cb) {}
    },

    customElementTypes = {},
    customElementRenderers = {},
    bindingsResult = true,
    errString,
    pickTime,
    alwaysTrace = false,
    lastStates = {},
    lastEncodedStates = {},
    loadedLogics = {},
    addedLibs = {},
    loadedLibs = {},
    loadingLibs = {},
    moduleLoads = [],
    awaitingDepends = {},
    externalDeclarations = {},
    modules = {},
    eventBus = $({}),
    perAppBus = {},
    preApping = {},
    boundApps = {},
    backupApps = {},
    bindingCurrently = {},
    pre = {},
    uiFactory = new DefaultUiFactory(),
    statesUsed = {},
    listeners = [],
    objectBus = "jModelObjectBus",
    repoName = "jRepo",
    jTypeTemplate = {},
    _tmplCache = {},
    replacementMap = {
      ";" : ";;",
      "," : ";1",
      "=" : ";2",
      "|" : ";3",
      "{" : ";4",
      "}" : ";5",
      ":" : ";6",
      "#" : ";7",
      "'" : ";7"
    }, reverseMap = {},
    replacementRegex = /;|,|=|\||\{|\}|:|#/gi,
    reverseRegex = /;;|;1|;2|;3|;4|;5|;6|;7/gi,
    restRegexp = /:([^\/]+)(\/|$)/g;
  each(replacementMap, function(key, val) {
    reverseMap[val] = key;
  });

  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
      position = position || 0;
      return this.indexOf(searchString, position) === position;
    };
  }

  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }

  function copyArr(arr) {
    var ret = [];
    each(arr, function(i, val) {ret.push(val)});
    return ret;
  }

  function isFunction(fn) {
    return typeof fn === "function";
  }

  function isArray(obj) {
    return $.isArray(obj);// obj !== undefined && obj !== null && (Array.isArray(obj) || obj.jCollection);
  }

  function each(obj, cb) {
    $.each(obj, cb);
    /*
     if (obj === null && obj === undefined) {
     return;
     }
     var i = 0;
     if (isArray(obj)) {
     for (; i < obj.length; i++) {
     if (cb.call(obj[i], i, obj[i]) === false) {
     break;
     }
     }
     } else if (typeof obj === "object") {
     for (i in obj) {
     if (obj.hasOwnProperty(i)) {
     if (cb.call(obj[i], i, obj[i]) === false) {
     break;
     }
     }
     }
     }
     return obj;
     */
  }

  function randomIntBetween(from, to) {
    return Math.floor((Math.random()*(to - from + 1)) + from);
  }
  function toDate(val) {
    var num = Number(val);
    return ((num === 0 && val !== 0 && val !== "0") || isNaN(num)) ? null : new Date(num);
  }

  function formatMoney(amount, grpDelim, decDelim, decimals) {
    var total, num, ret;
    grpDelim = grpDelim !== undefined ? grpDelim : ",";
    decDelim = decDelim !== undefined ? decDelim : '.';
    amount = amount.toString().replace(/\s+/g, '');
    num = (typeof decimals === 'undefined' || decimals === 0) ? Math.round(parseFloat(amount)) : num = amount.split('.');
    if (isNaN(num) && !num[0]) {
      return "";
    }
    if (num[1]) {
      num[1] = Math.round((num[1])).toString().substring(0, decimals);
      ret = "" + Math.abs(num[0]);
    } else {
      ret = "" + Math.abs(num);
    }
    for (var idx = ret.length; idx > 0; idx -= 3) {
      ret = ret.substring(0, idx) + (idx < ret.length ? "." : "") + ret.substring(idx);
    }
    ret = ret.split('.');
    total = ret.join(grpDelim);
    if (!isNaN(num[1])) {
      total += (decDelim + num[1]);
    }
    return total;
  }

  function formatDate(millis) {
    var dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getFullYear()) + "-" + lfill(dt.getMonth() + 1) + "-" + lfill(dt.getDate());
  }

  function formatDateUsa(millis) {
    var dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getMonth() + 1) + "/" + lfill(dt.getDate()) + "/" + lfill(dt.getFullYear());
  }

  function formatTime(millis) {
    var dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes());
  }

  function formatTimeSeconds(millis) {
    var dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes()) + ":" + lfill(dt.getSeconds());
  }

  function lfill(val) {
    val = "" + val;
    return val.length == 0 ? "00" : val.length == 1 ? "0" + val : val;
  }

  function getURLParameter(name) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    return (results !== null) ? decodeURIComponent(results[1]) : null;
  }

  function pick(marker, threshold) {
    var now = new Date().getTime(),
      ms = now - pickTime;
    threshold = threshold || -1;
    if (pickTime && ms >= threshold) {
      info((marker ? marker : "jiant.pick:") + " " + ms + "ms");
    }
    pickTime = now;
    return ms >= threshold ? ms : 0;
  }

  function msieDom2Html(elem) {
    each(elem.find("*"), function(idx, child) {
      each(child.attributes, function(i, attr) {
        if (attr.value.indexOf(" ") < 0 && attr.value.indexOf("!!") >= 0) {
          $(child).attr(attr.name, attr.value.replace(/!!/g, "e2013e03e11eee "));
        }
      });
    });
    return $(elem).html().trim().replace(/!!/g, "!! ").replace(/e2013e03e11eee /g, "!! ");
  }

  function nvl(val, defVal, path) {
    if (val === undefined || val === null) {
      return defVal;
    }
    if (path) {
      var v = isFunction(val[path]) ? val[path]() : val[path];
      if (v === undefined || v === null) {
        return defVal;
      }
      return v;
    }
    return val;
  }

  function parseTemplate(that, data, tmId, mapping) {
    data = data || {};
    if (mapping) {
      data = $.extend({}, data);
      each(mapping, function(key, val) {
        data[key] = data[val];
      });
    }
    var err = "";
    try {
      var func = tmId ? _tmplCache[tmId] : null;
      if (!func) {
        var str = $(that).html().trim();
        if (!jiant.isMSIE) {
          str = str.replace(/!!/g, "!! ");
        } else {
          str = msieDom2Html($(that));
        }
        var strFunc =
          "var p=[],print=function(){p.push.apply(p,arguments);};" +
          "with(obj){p.push('" +
          str.replace(/[\r\t\n]/g, " ")
            .replace(/'(?=[^#]*#>)/g, "\t")
            .split("'").join("\\'")
            .split("\t").join("'")
            .replace(/!! (.+?)!! /g, "', jiant.intro.isFunction($1) ? $1() : $1,'")
            .split("!?").join("');")
            .split("?!").join("p.push('")
          + "');}return p.join('');";

        func = new Function("obj", strFunc);
        _tmplCache[tmId] = func;
      }
      return func(data).trim();
    } catch (e) {
      err = e.message;
      logError("Error parse template: " + err);
    }
    return "!!! ERROR: " + err.toString() + " !!!";
  }

  function fit(val, min, max) {
    val = isNaN(min) ? val : parseFloat(val) < min ? min : val;
    val = isNaN(max) ? val : parseFloat(val) > max ? max : val;
    return "" + val;
  }

  function setupInputInt(input) {
    input.keydown(function(event) {
      if (event.keyCode == jiant.key.down && input.val() > 0) {
        input.val(fit(input.valInt() - 1, input.j_valMin, input.j_valMax));
        input.trigger("change");
        return false;
      } else if (event.keyCode == jiant.key.up) {
        input.val(fit(input.valInt() + 1, input.j_valMin, input.j_valMax));
        input.trigger("change");
        return false;
      } else if ( event.keyCode == jiant.key.end || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
        input.val(fit(input.valInt(), input.j_valMin, input.j_valMax));
      } else if (!event.ctrlKey && !event.shiftKey && (event.keyCode != jiant.key.backspace && event.keyCode != jiant.key.del
        && event.keyCode != jiant.key.left && event.keyCode != jiant.key.right && event.keyCode < 48 || event.keyCode > 57)
        && (event.keyCode < 96 || event.keyCode > 105 )) {
        event.preventDefault();
        return false;
      }
      return true;
    });
    input.valInt = function() {
      var val = parseInt(input.val());
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
      if (event.keyCode == jiant.key.down && input.val() > 0) {
        input.val(fit(input.valFloat() - 1, input.j_valMin, input.j_valMax));
        input.trigger("change");
        return false;
      } else if (event.keyCode == jiant.key.up) {
        input.val(fit(input.valFloat() + 1, input.j_valMin, input.j_valMax));
        input.trigger("change");
        return false;
      } else if (event.keyCode == jiant.key.dot || event.keyCode == jiant.key.dotExtra) {
        return (input.val().indexOf(".") < 0) && input.val().length > 0;
      } else if ( event.keyCode == jiant.key.end || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
        input.val(fit(input.valFloat(), input.j_valMin, input.j_valMax));
      } else if (!event.ctrlKey && !event.shiftKey && (event.keyCode != jiant.key.backspace && event.keyCode != jiant.key.del && event.keyCode != jiant.key.left && event.keyCode != jiant.key.right && event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
        event.preventDefault();
        return false;
      }
      return true;
    });
    input.valFloat = function() {
      var val = parseFloat(input.val());
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
    var tagName = elem[0].tagName.toLowerCase();
    if (tagName != "form") {
      jiant.logError(key + "." + name + " form element assigned to non-form: " + tagName);
      jiant.DEV_MODE && alert(key + "." + name + " form element assigned to non-form: " + tagName);
    }
    elem.submitForm = function(url, cb) {
      url = url ? url : elem.attr("action");
      url = isCouldBePrefixed(url) ? ((appRoot.ajaxPrefix ? appRoot.ajaxPrefix : jiant.AJAX_PREFIX ? jiant.AJAX_PREFIX : "") + url) : url;
      url = isCouldBePrefixed(url) ? (url + (appRoot.ajaxSuffix ? appRoot.ajaxSuffix : jiant.AJAX_SUFFIX ? jiant.AJAX_SUFFIX : "")) : url;
      var data = {
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
        data.contentType = "application/json";
        data.dataType = 'jsonp';
        data.xhrFields = {withCredentials: true};
        data.crossDomain = true;
      }
      each(listeners, function(i, l) {l.submittingForm && l.submittingForm(appRoot, key, name, data)});
      return $.ajax(data);
    };
  }

  function printp(method, args) {
    var s = args[0] + "";
    each(args, function(idx, arg) {
      if (idx > 0) {
        var pos = s.indexOf("!!");
        if (pos >= 0) {
          s = s.substring(0, pos) + arg + s.substring(pos + 2);
        } else {
          s += " ";
          s += arg;
        }
      }
    });
    method(s);
  }

  function printShort(method, args) {
    var s = "";
    each(args, function(idx, arg) {
      s += arg;
      s += " ";
    });
    method(s);
  }

  function print(method, args) {
    if (alwaysTrace) {
      method = "error";
    }
    try {
      window.console && window.console[method] && each(args, function(idx, arg) {
        window.console[method](arg);
      });
    } catch (ex) {
      // firefox + firebug glitch with recursion workaround
      method != "info" && print("info", args);
    }
  }

  function logError() {
    print("error", arguments);
  }

  function logInfo(s) {
    jiant.DEV_MODE && print("info", arguments);
  }

  function error() {
    printShort(logError, arguments);
  }

  function info() {
    printShort(logInfo, arguments);
  }

  function errorp() {
    printp(logError, arguments);
  }

  function infop() {
    printp(logInfo, arguments);
  }

  function setupPager(uiElem) {
    var pagerBus = $({}),
      roots = [],
      lastPage = 0,
      lastTotalCls;
    each(uiElem, function(i, elem) {
      var root = $("<ul></ul>");
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
      if (arguments.length == 0) {
        return lastPage;
      } else {
        lastPage = parseInt(arguments[0]);
        uiElem.refreshPage();
      }
    };
    uiElem.updatePager = function(page) {
      each(roots, function(idx, root) {
        root.empty();
        lastTotalCls && root.removeClass(lastTotalCls);
        lastTotalCls = "totalPages_" + page.totalPages;
        root.addClass(lastTotalCls);
        var from = Math.max(0, page.number - Math.round(jiant.PAGER_RADIUS / 2)),
          to = Math.min(page.number + Math.round(jiant.PAGER_RADIUS / 2), page.totalPages);
        if (from > 0) {
          addPageCtl(root, 1, "pager_first");
          addPageCtl(root, -1, "disabled emptyPlaceholder");
        }
        for (var i = from; i < to; i++) {
          var cls = "";
          if (i == page.number) {
            cls += " active";
          }
          addPageCtl(root, i + 1, cls);
        }
        var clsLast = "";
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
      var ctl = $(parseTemplate($("<b><li class='!!ctlClass!!' style='cursor: pointer;'><a>!!label!!</a></li></b>"),
        {label: value != -1 ? value : "...", ctlClass: ctlClass}));
      root.append(ctl);
      value != -1 && ctl.click(function() {
        lastPage = value;
        uiElem.refreshPage();
      });
      return ctl;
    }
  }

  function setupContainerPaged(uiElem) {
    var prev = $("<div>&laquo;</div>"),
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
      var display = bool ? "inline-block" : "block";
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
      each(container.children(), function(idx, domElem) {
        var elem = $(domElem);
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

  function showTrace() {
    alwaysTrace = true;
  }

  function getStackTrace() {
    var obj = {stack: {}};
    Error.captureStackTrace && Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
  }

// ------------ views ----------------

  function _bindContent(appRoot, viewRoot, viewId, viewElem, prefix) {
    var typeSpec = {};
    viewRoot._jiantSpec = typeSpec;
    each(viewRoot, function (componentId, elemTypeOrArr) {
      var componentTp = getComponentType(elemTypeOrArr);
      typeSpec[componentId] = elemTypeOrArr;
      if (componentId in {appPrefix: 1, impl: 1, _jiantSpec: 1, _scan: 1}) {
        //skip
      } else if (componentTp === jiant.lookup) {
        jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
        setupLookup(viewRoot, componentId, viewElem, prefix);
      } else if (componentTp === jiant.meta) {
        //skipping, app meta info
      } else if (componentTp === jiant.data) {
        setupDataFunction(viewRoot, viewRoot, componentId, getAt(elemTypeOrArr, 1), getAt(elemTypeOrArr, 2));
        viewRoot[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {viewRoot[componentId](val)}
      } else if (componentTp === jiant.cssMarker || componentTp === jiant.cssFlag) {
        setupCssFlagsMarkers(viewRoot, componentId, componentTp, getAt(elemTypeOrArr, 1), getAt(elemTypeOrArr, 2));
      } else {
        var uiElem = uiFactory.viewComponent(viewElem, viewId, prefix, componentId, componentTp);
        ensureExists(prefix, appRoot.dirtyList, uiElem, prefix + viewId, prefix + componentId, isFlagPresent(elemTypeOrArr, jiant.optional));
        viewRoot[componentId] = uiElem;
        setupExtras(appRoot, uiElem, componentTp, viewId, componentId, viewRoot, prefix);
        if (componentTp === jiant.comp) {
          var tmName = getAt(elemTypeOrArr, 1);
          viewRoot[componentId].customRenderer = getCompRenderer(appRoot, tmName, componentId, elemTypeOrArr);
          if (! (tmName in appRoot.templates)) {
            error("jiant.comp element refers to non-existing template name: " + tmName + ", view.elem: " + viewId + "." + componentId);
          }
        }
      }
    });
  }

  function getComponentType(tpOrArr) {
    return getAt(tpOrArr, 0);
  }

  function getAt(tpOrArr, pos) {
    if (! isArray(tpOrArr)) {
      return pos === 0 ? tpOrArr : null;
    }
    var ret;
    each(tpOrArr, function(i, item) {
      if (item === jiant.optional) {
        pos++;
      }
      if (i === pos) {
        ret = item;
        return false;
      }
    });
    return ret;

  }

  function isFlagPresent(tpOrArr, flag) {
    if (! isArray(tpOrArr)) {
      return false;
    }
    var b = false;
    each(tpOrArr, function(i, item) {
      if (item === flag) {
        b = true;
        return false;
      }
    });
    return b;
  }

  function getCompRenderer(appRoot, tmId, componentId, componentContentOrArr) {
    return function(obj, elem, val, isUpdate, viewOrTemplate, settings) {
      var mapping = settings.mapping || {},
          actualObj = componentId in mapping ? obj[mapping[componentId]] : componentId in obj ? obj[componentId] : obj,
          el, params;
      if ($.isFunction(actualObj)) {
        actualObj = actualObj.apply(obj);
      }
      if (actualObj) {
        var param = getAt(componentContentOrArr, 2);
        if (param) {
          actualObj = $.extend({}, actualObj, param);
        }
        el = appRoot.templates[tmId].parseTemplate(actualObj, settings.subscribeForUpdates, settings.reverseBind, mapping[componentId]);
        $.each(appRoot.templates[tmId]._jiantSpec, function(cId, cElem) {
          viewOrTemplate[componentId][cId] = el[cId];
        });
        elem.html(el);
      } else {
        elem.html("");
      }
    };
  }

  function setupLookup(viewRoot, componentId, viewElem, prefix) {
    viewRoot[componentId] = function() {return viewElem.find("." + prefix + componentId);};
  }

  function setupDataFunction(viewRoot, linkRoot, componentId, mappingId, dataName) {
    linkComponent(linkRoot, componentId, mappingId);
    dataName = dataName || componentId;
    viewRoot[componentId] = function(val) {
      if (arguments.length === 0) {
        return viewRoot.attr("data-" + dataName);
      } else {
        return viewRoot.attr("data-" + dataName, val);
      }
    };
  }

  function linkComponent(viewRoot, componentId, mappingId) {
    if (mappingId) {
      viewRoot.jMapping = viewRoot.jMapping || [];
      viewRoot.jMapping[mappingId] = viewRoot.jMapping[mappingId] || [];
      viewRoot.jMapping[mappingId].push(componentId);
      viewRoot.jMapped = viewRoot.jMapped || {};
      viewRoot.jMapped[componentId] = viewRoot.jMapped[componentId] || [];
      viewRoot.jMapped[componentId].push(mappingId);
    }
  }

  function setupCssFlagsMarkers(viewRoot, componentId, componentTp, mappingId, className) {
    var flag = componentTp === jiant.cssFlag,
      markerName = "j_prevMarkerClass_" + componentId;
    className = className || componentId;
    linkComponent(viewRoot, componentId, mappingId);
    viewRoot[componentId] = {};
    viewRoot[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
      if (viewOrTemplate[markerName]) {
        each(viewOrTemplate[markerName], function (i, cls) {
          cls && viewOrTemplate.removeClass(cls);
        });
      }
      viewOrTemplate[markerName] = [];
      if (flag) {
        var _v = isArray(val) && val.length === 0 ? undefined : val;
        if (!!_v) {
          viewOrTemplate[markerName].push(className);
          viewOrTemplate.addClass(className);
        }
      } else {
        if (val !== undefined && val !== null) {
          if (!isArray(val) && val && isFunction(val.split)) {
            val = val.split(",");
          } else if (!isArray(val)) {
            val = [val];
          }
          each(val, function (i, v) {
            var cls = className + "_" + v;
            viewOrTemplate[markerName].push(cls);
            viewOrTemplate.addClass(cls);
          })
        }
      }
    };
  }

  function ensureSafeExtend(spec, jqObject) {
    each(spec, function(key, content) {
      if (jqObject[key]) {
        jiant.info("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used, now overriding!");
        jqObject[key] = undefined;
      }
    });
  }

  // not serialization actually, for example when text contains " - generates invalid output. just for dev purposes
  function pseudoserializeJSON(obj) {
    var t = typeof(obj);
    if (t != "object" || obj === null) {
      // simple data type
      if (t == "string") {
        obj = '"' + obj + '"';
      }
      return String(obj);
    } else {
      // array or object
      var json = [],
        arr = (obj && obj.constructor == Array);
      each(obj, function (k, v) {
        t = typeof(v);
        if (t == "string") {
          v = '"' + v + '"';
        } else if (t == "object" && v !== null) {
          v = pseudoserializeJSON(v);
        }
        json.push((arr ? "" : '"' + k + '":') + (v ? v : "\"\""));
      });
      return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
    }
  }

  function maybeAddDevHook(uiElem, key, elem, prefix, viewOrTm) {
    jiant.DEV_MODE && uiElem.click(function(event) {
      if (event.shiftKey && event.altKey) {
        var message = key + (elem ? ("." + elem) : "");
        if (event.ctrlKey) {
          message += "\r\n------------\r\n";
          message += pseudoserializeJSON($._data(uiElem[0], "events"));
        }
        info(message);
        if (viewOrTm._jiantPropagationInfo) {
          logInfo("Last propagated by: ", viewOrTm._jiantPropagationInfo, viewOrTm._jiantPropagationInfo.trace);
        } else {
          logInfo("No propagation for this view");
        }
        // alert(message);
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (event.ctrlKey && event.altKey) {
        copy2cb("#" + prefix + key + " " + (elem ? ("." + prefix + elem) : ""));
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  }

  function copy2cb(txt) {
    info(txt);
    if (document.execCommand) {
      var input = document.createElement("input");
      input.type = "text";
      input.style.opacity = 0;
      input.style.position = "absolute";
      input.style.zIndex = -1;
      input.value = txt;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  }

  function ensureExists(appPrefix, dirtyList, obj, idName, className, optional) {
    if (idName && dirtyList && (dirtyList.indexOf(idName) >= 0
      || (appPrefix && dirtyList.indexOf(idName.substring(appPrefix.length)) >= 0))) {
      return true;
    }
    if (!obj || !obj.length) {
      if (optional) {
        jiant.DEV_MODE && infop("optional element .!! not present under #!!, skipping, all is ok", className, idName);
        return true;
      } else {
        className ? errorp("non existing object referred by class under object id #!!, check stack trace for details, expected obj class: .!!", idName, className)
          : errorp("non existing object referred by id, check stack trace for details, expected obj id: #!!", idName);
        if (className) {
          errString += ",    #" + idName + " ." + className;
        } else {
          errString += ", #" + idName;
        }
        bindingsResult = false;
        return false;
      }
    }
    return true;
  }

  function setupImage(uiElem) {
    uiElem.reload = function (url) {
      url = url || this.attr("src");
      url = (url.indexOf("?") > -1) ? url : url + "?";
      var antiCache = "&_=" + new Date().getTime();
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
    var stateName = name.endsWith("Ctl") ? name.substring(0, name.length - 3) : name;
    elem.click(function() {app.states[stateName].go()})
  }

  function setupExtras(appRoot, uiElem, elemType, key, elemKey, viewOrTm, prefix) {
    if (elemType === jiant.tabs && uiElem.tabs) {
      uiElem.tabs();
      uiElem.refreshTabs = function() {uiElem.tabs("refresh");};
    } else if (elemType === jiant.ctlHide) {
      setupCtlHide(viewOrTm, uiElem);
    } else if (elemType === jiant.et.ctl2state) {
      setupCtl2state(viewOrTm, uiElem, appRoot, elemKey);
    } else if (elemType === jiant.et.ctlBack) {
      setupCtlBack(viewOrTm, uiElem);
    } else if (elemType === jiant.et.ctl2root) {
      setupCtl2root(appRoot, uiElem);
    } else if (elemType === jiant.inputInt) {
      setupInputInt(uiElem);
    } else if (elemType === jiant.inputFloat) {
      setupInputFloat(uiElem);
    } else if (elemType === jiant.inputDate && uiElem.datepicker) {
      var dp = appRoot.dateFormat ? uiElem.datepicker({format: appRoot.dateFormat}) : uiElem.datepicker();
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
    } else if (isArray(elemType)) {
      each(elemType, function(i, tp) {
        setupExtras(appRoot, uiElem, tp, key, elemKey, viewOrTm, prefix);
      });
    }
    // maybeAddDevHook(uiElem, key, elemKey, prefix, viewOrTm);
  }

  function isServiceName(key) {
    var words = ["parseTemplate", "parseTemplate2Text", "propagate", "customRenderer", "jMapping", "jMapped", "_jiantSpec"];
    return words.indexOf(key) >= 0;
  }

  function ElemsProxy(args) {

  }

  function assignExtraFunctions(viewId, spec, viewOrTm) {
    // viewOrTm.elems = function() {
    //   return new ElemsProxy(arguments);
    // }
  }

  function assignPropagationFunction(viewId, spec, viewOrTm) {
    var map = {};
    each(spec, function (key, elem) {
      map[key] = elem;
    });
    spec.jMapped && each(spec.jMapped, function(key, arr) {
      $.each(arr, function(i, elem) {
        map[elem] = map[elem] || 1;
      });
    });
    var fn = function(data, subscribe4updates, reverseBinding, mapping) {
      var propSettings = {subscribe4updates: subscribe4updates, reverseBinding: reverseBinding, mapping: mapping};
      subscribe4updates = (subscribe4updates === undefined) ? true : subscribe4updates;
      each(map, function (key, elem) {
        var actualKey = (mapping && mapping[key]) ? mapping[key] : key,
          val = $.isFunction(actualKey) ? actualKey.apply(data) : data[actualKey],
          oldData,
          handler,
          elemType = viewOrTm._jiantSpec[key];
        if ((spec[key] && spec[key].customRenderer) || customElementRenderers[elemType] || (spec.jMapping && spec.jMapping[key])
            || (data && val !== undefined && val !== null && !isServiceName(key) && !(val instanceof $))) {
          var actualVal = isFunction(val) ? val.apply(data) : val;
          $.each([key].concat(spec.jMapping && spec.jMapping[key]? spec.jMapping[key] : []), function(i, compKey) {
            if (compKey === key && spec.jMapped && spec.jMapped[compKey]) {
              return;
            }
            var compElem = viewOrTm[compKey],
                compType = viewOrTm._jiantSpec[compKey],
                fnKey = "_j" + compKey;
            getRenderer(spec[compKey], compType)(data, compElem, actualVal, false, viewOrTm, propSettings);
            if (subscribe4updates && isFunction(data.on)&& (spec[compKey].customRenderer || isFunction(val))) { // 3rd ?
              if (fn[fnKey]) {
                oldData = fn[fnKey][0];
                oldData && oldData.off(fn[fnKey][1]);
                fn[fnKey][2] && compElem.off && compElem.off("change", fn[fnKey][2]);
              }
              if (!isFunction(val)) { // ?
                actualKey = null;
              }
              handler = data.on(actualKey, function(obj, newVal) {
                if (arguments.length === 2 && newVal === "remove") {
                  return;
                }
                getRenderer(spec[compKey], compType)(data, compElem, newVal, true, viewOrTm, propSettings);
              });
              fn[fnKey] = [data, handler];
            }
            if (reverseBinding) {
              var backHandler = function(event) {
                var tagName = compElem[0].tagName.toLowerCase(),
                  tp = compElem.attr("type"),
                  etype = viewOrTm._jiantSpec[compKey];
                function convert(val) {
                  return val === "undefined" ? undefined : val;
                }
                function elem2arr(elem) {
                  var arr = [];
                  each(elem, function (idx, item) {!!$(item).prop("checked") && arr.push(convert($(item).val()));});
                  return arr;
                }
                function joinOrUndef(arr) {
                  return arr.length === 0 || (arr.length === 1 && arr[0] === undefined) ? undefined : arr.join();
                }
                if (val && isFunction(val)) {
                  if (etype === jiant.inputSet) {
                    val.call(data, elem2arr(compElem));
                  } else if (etype === jiant.inputSetAsString) {
                    val.call(data, joinOrUndef(elem2arr(compElem)));
                  } else {
                    if (tagName === "input" && tp === "checkbox") {
                      val.call(data, !!compElem.prop("checked"));
                    } else if (tagName === "input" && tp === "radio") {
                      val.call(data, joinOrUndef(elem2arr(compElem)));
                    } else if (tagName in {"input": 1,  "select": 1, "textarea": 1}) {
                      val.call(data, compElem.val()); // don't convert due to user may input "undefined" as string
                    } else if (tagName === "img") {
                      val.call(data, compElem.attr("src"));
                      // no actual event for changing html, manual 'change' trigger supported by this code
                    } else {
                      val.call(data, compElem.html());
                    }
                  }
                }
              };
              compElem.change && compElem.change(backHandler);
              fn[fnKey] && fn[fnKey].push(backHandler);
            }
          });
        }
      });
      if (spec.customRenderer && isFunction(spec.customRenderer)) {
        spec.customRenderer(data, viewOrTm);
      }
      if (jiant.DEV_MODE) {
        viewOrTm._jiantPropagationInfo = {
          modelName: data ? data.jModelName : "",
          data: data,
          subscribe4updates: subscribe4updates,
          reverseBinding: reverseBinding,
          mapping: mapping,
          trace: jiant.getStackTrace()
        };
      }
    };
    viewOrTm.propagate = fn;
    viewOrTm.unpropagate = function() {
      each(map, function (key, elem) {
        var fnKey = "_j" + key;
        if (fn[fnKey]) {
          var oldData = fn[fnKey][0];
          oldData && oldData.off(fn[fnKey][1]);
          fn[fnKey][2] && elem.off && elem.off("change", fn[fnKey][2]);
        }
      });
      if (jiant.DEV_MODE) {
        delete viewOrTm._jiantPropagationInfo;
      }
    }
  }

  function getRenderer(obj, elemType) {
    elemType = getComponentType(elemType);
    if (obj && obj.customRenderer && isFunction(obj.customRenderer)) {
      return obj.customRenderer;
    } else if (customElementRenderers[elemType]) {
      return customElementRenderers[elemType];
    } else if (elemType === jiant.inputSet) {
      return updateInputSet;
    } else if (elemType === jiant.href) {
      return updateHref;
    } else if (elemType === jiant.imgBg) {
      return updateImgBg;
    } else if (elemType === jiant.inputSetAsString) {
      return function(obj, elem, val, isUpdate, viewOrTemplate) {
        updateInputSet(obj, elem, !val ? [val] : isArray(val) ? val : $.isNumeric(val) ? [val] : ("" + val).split(","), isUpdate, viewOrTemplate);
      };
    } else {
      return updateViewElement;
    }
  }

  function updateHref(obj, elem, val, isUpdate, viewOrTemplate) {
    if (!!val) {
      elem.attr("href", val);
    } else {
      elem.attr("href", "");
    }
  }

  function updateImgBg(obj, elem, val, isUpdate, viewOrTemplate) {
    if (!!val) {
      elem.css("background-image", "url(" + val + ")");
    } else {
      elem.css("background-image", "");
    }
  }

  function updateInputSet(obj, elem, val, isUpdate, viewOrTemplate) {
    if (!elem || !elem[0]) {
      return;
    }
    each(elem, function(idx, item) {
      item = $(item);
      var check = item.val() === val + "";
      if (!check && isArray(val)) {
        each(val, function(i, subval) {
          if (subval + "" === item.val() + "") {
            check = true;
            return false;
          }
        });
      }
      item.prop("checked", check);
    });
  }

  function updateViewElement(obj, elem, val, isUpdate, viewOrTemplate) {
    if (!elem || !elem[0]) {
      return;
    }
    var tagName = elem[0].tagName.toLowerCase();
    if (tagName in {"input": 1, "textarea": 1, "select": 1}) {
      var el = $(elem[0]),
        tp = el.attr("type");
      if (tp === "checkbox") {
        elem.prop("checked", !!val);
      } else if (tp === "radio") {
        each(elem, function(idx, subelem) {
          $(subelem).prop("checked", subelem.value === (val + ""));
        });
      } else {
        (val == undefined || val == null) ? elem.val(val) : elem.val(val + "");
      }
    } else if (tagName === "img") {
      elem.attr("src", val);
    } else {
      elem.html(val === undefined ? "" : val);
    }
  }

  function _bindViews(appRoot, root, appUiFactory) {
    each(root, function(viewId, viewContent) {
      var prefix = ("appPrefix" in viewContent) ? viewContent.appPrefix : appRoot.appPrefix,
        view = appUiFactory.view(prefix, viewId, viewContent);
      if ("_scan" in viewContent) {
        scanForSpec(prefix, viewContent, view);
      }
      bindView(appRoot, viewId, viewContent, view);
    });
  }

  function bindView(appRoot, viewId, viewContent, view) {
    if (viewContent._jiantSpec) {
      var spec = viewContent._jiantSpec;
      for (var key in viewContent) {
        delete viewContent[key];
      }
      appRoot.views[viewId] = viewContent;
      each(spec, function(key, val) {
        viewContent[key] = val;
      })
    }
    var prefix = ("appPrefix" in viewContent) ? viewContent.appPrefix : appRoot.appPrefix ? appRoot.appPrefix : "",
      viewOk = ensureExists(prefix, appRoot.dirtyList, view, prefix + viewId);
    viewOk && _bindContent(appRoot, viewContent, viewId, view, prefix);
    ensureSafeExtend(viewContent, view);
    assignPropagationFunction(viewId, viewContent, viewContent);
    assignExtraFunctions(viewId, viewContent, viewContent);
    $.extend(viewContent, view);
    each(listeners, function(i, l) {l.boundView && l.boundView(appRoot, appRoot.views, viewId, prefix, viewContent)});
  }

  function getAutoType(child, name) {
    switch (child.tagName.toUpperCase()) {
      case "INPUT": return jiant.input;
      case "IMG": return jiant.image;
      case "FORM": return jiant.form;
      case "BUTTON": return jiant.ctl;
      case "A": return jiant.href;
      default:
        var lowerName = name.toLowerCase();
        if (lowerName.indexOf("container") >= 0) {
          return jiant.container;
        } else if (lowerName.indexOf("ctl") >= 0) {
          return jiant.ctl;
        }
        return jiant.label;
    }
  }

  function scanForSpec(prefix, content, elem) {
    var children = elem[0].getElementsByTagName("*");
    $.each(children, function(i, child) {
      var classes = child.className.split(/\s+/);
      $.each(classes, function(j, cls) {
        if (cls.startsWith(prefix)) {
          var name = cls.substring(prefix.length);
          if (! (name in content)) {
            content[name] = getAutoType(child, name);
          }
        }
      });
    });
  }

// ------------ templates ----------------

  function parseTemplate2Text(tm, data, cacheKey) {
    return parseTemplate(tm, data, cacheKey);
  }

  function fillClassMapping(elem, classMapping) {
    var childs = elem.find("*"),
        selfs = elem.filter("*");
    $.each($.merge(selfs, childs), function(i, item) {
      var clss = item.className.split(" ");
      $.each(clss, function(i, cls) {
        classMapping[cls] = classMapping[cls] || [];
        classMapping[cls].push(item);
      });
    });
  }

  function _bindTemplates(appRoot, root, appUiFactory) {
    each(root, function(tmId, tmContent) {
      var prefix = ("appPrefix" in tmContent) ? tmContent.appPrefix : appRoot.appPrefix,
        tm = appUiFactory.template(prefix, tmId, tmContent);
      root[tmId]._jiantSpec = {};
      root[tmId]._jiantType = jTypeTemplate;
      if ("_scan" in tmContent) {
        scanForSpec(prefix, tmContent, tm);
      }
      each(tmContent, function (componentId, elemTypeOrArr) {
        var elemType = getComponentType(elemTypeOrArr);
        if (!(componentId in {appPrefix: 1, impl: 1, _jiantSpec: 1, _jiantType: 1, _scan: 1})) {
          root[tmId]._jiantSpec[componentId] = elemType;
          if (elemType === jiant.lookup) {
            jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
          } else if (elemType === jiant.meta) {
            //skipping, app meta info
          } else if (elemType === jiant.data) {
            tmContent[componentId] = {jiant_data: 1, jiant_data_spec: elemTypeOrArr};
            tmContent[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
              viewOrTemplate[componentId](val);
            };
          } else if (elemType === jiant.cssMarker || elemType === jiant.cssFlag) {
            setupCssFlagsMarkers(tmContent, componentId, elemType, getAt(elemTypeOrArr, 1), getAt(elemTypeOrArr, 2));
          } else {
            var comp = appUiFactory.viewComponent(tm, tmId, prefix, componentId, elemType);
            ensureExists(prefix, appRoot.dirtyList, comp, prefix + tmId, prefix + componentId, isFlagPresent(elemTypeOrArr, jiant.optional));
            tmContent[componentId] = {};
            if (elemType === jiant.comp) {
              var tmName = getAt(elemTypeOrArr, 1);
              tmContent[componentId].customRenderer = getCompRenderer(appRoot, tmName, componentId, elemTypeOrArr);
              if (!(tmName in root)) {
                error("jiant.comp element refers to non-existing template name: " + tmName + ", tm.elem " + tmId + "." + componentId);
              }
            }
          }
        }
      });
      ensureExists(prefix, appRoot.dirtyList, tm, prefix + tmId);
      root[tmId].templateSource = function() {return tm.html().trim()};
      root[tmId].parseTemplate = function(data, subscribeForUpdates, reverseBind, mapping) {
        var retVal = $("<!-- -->" + parseTemplate(tm, data, tmId, mapping)); // add comment to force jQuery to read it as HTML fragment
        retVal._jiantSpec = root[tmId]._jiantSpec;
        var classMapping = {};
        fillClassMapping(retVal, classMapping);
        each(tmContent, function (compId, elemTypeOrArr) {
          if (isServiceName(compId)) {
            return;
          }
          var elemType = getComponentType(elemTypeOrArr);
          if (elemType === jiant.lookup) {
            info("    loookup element, no checks/bindings: " + compId);
            setupLookup(retVal, compId, retVal, prefix);
          } else if (elemType === jiant.meta) {
          } else if (elemType.jiant_data) {
            setupDataFunction(retVal, root[tmId], compId, getAt(elemTypeOrArr.jiant_data_spec, 1), getAt(elemTypeOrArr.jiant_data_spec, 2));
          } else if (! (compId in {parseTemplate: 1, parseTemplate2Text: 1, templateSource: 1, appPrefix: 1, impl: 1, _jiantSpec: 1, _scan: 1})) {
            retVal[compId] = $(classMapping[prefix + compId]);
            setupExtras(appRoot, retVal[compId], root[tmId]._jiantSpec[compId], tmId, compId, retVal, prefix);
          }
        });
        retVal.splice(0, 1); // remove first comment
        assignPropagationFunction(tmId, tmContent, retVal);
        assignExtraFunctions(tmId, tmContent, retVal);
        data && retVal.propagate(data, !!subscribeForUpdates, !!reverseBind, mapping);
        each(listeners, function(i, l) {l.parsedTemplate && l.parsedTemplate(appRoot, root, tmId, root[tmId], data, retVal)});
        retVal.addClass("jianttm_" + tmId);
        return retVal;
      };
      root[tmId].parseTemplate2Text = function(data, mapping) {
        return parseTemplate(tm, data, tmId, mapping);
      };
      each(listeners, function(i, l) {l.boundTemplate && l.boundTemplate(appRoot, root, tmId, prefix, root[tmId])});
    });
  }

// ------------ model staff ----------------

  function getRepo(spec) {
    return (spec[repoName] && $.isPlainObject(spec[repoName])) ? spec[repoName] : spec;
  }

  function bindModel(modelName, spec, appId) {
    var storage = [],
      collectionFunctions = [],
      modelStorage = "jModelStorage",
      reverseIndexes = "jReverseIndexes",
      defaultsName = "jDefaults",
      indexesSpec = [],
      indexes = {},
      repoMode = spec[repoName] && $.isPlainObject(spec[repoName]),
      repoRoot = getRepo(spec),
      Model = function() {
        this[modelStorage] = {};
        this[objectBus] = $({});
        this[reverseIndexes] = [];
      },
      Collection = function(data) {
        if (data) {
          var that = this;
          each(data, function(idx, obj) {that.push(obj)});
        }
      },
      specBus = $({}),
      singleton = new Model(),
      objFunctions = ["on", "once", "off", "update", "reset", "remove", "asMap"],
      repoFunctions = ["updateAll", "add", "all", "remove", "filter", "toCollection"];
    Model.prototype.jModelName = modelName;
    if (jiant.DEV_MODE && !spec[repoName]) {
      infop("App !!, model !! uses deprecated model repository format, switch to new, with model.jRepo = {} section", appId, modelName);
    }
    spec[defaultsName] = spec[defaultsName] || {};
    each(repoFunctions, function(i, fn) {
      repoRoot[fn] = repoRoot[fn] || function(obj) {};
    });
    each(objFunctions, function(i, fn) {
      spec[fn] = spec[fn] || function(obj) {};
    });
    if (spec.id) {
      repoRoot.findById = repoRoot.findById || function(val) {};
    }
    each(repoRoot, function(fname, funcSpec) {
      if (isFindByFunction(fname, funcSpec)) {
        var listBy = "listBy" + fname.substring(6);
        if (! repoRoot[listBy]) {
          repoRoot[listBy] = funcSpec;
        }
      }
    });
    if (repoMode) {
      each(repoRoot, function(fname, funcSpec) {
        bindFn(repoRoot, fname, funcSpec);
      });
    }
    each(spec, function(fname, funcSpec) {
      bindFn(spec, fname, funcSpec);
    });
    spec.asap = proxy("asap");
    spec.nowAndOn = proxy("nowAndOn");
    spec.asapAndOn = proxy("asapAndOn");
    spec[objectBus] = specBus;

    //  ----------------------------------------------- remove -----------------------------------------------

    collectionFunctions.push("remove");
    Model.prototype.remove = function() {repoRoot.remove(this)};
    repoRoot.remove = function(obj) {
      var prevLen = storage.length;
      storage = $.grep(storage, function(value) {return value != obj});
      removeIndexes(obj);
      if (storage.length != prevLen) {
        obj[objectBus].trigger(evt("remove"), [obj]);
        obj[objectBus].trigger(evt(), [obj, "remove"]);
        specBus.trigger(evt("remove"), [obj]);
        specBus.trigger(evt(), [obj, "remove"]);
      }
      return obj;
    };
    repoRoot.remove[objectBus] = specBus;
    assignOnOffHandlers(repoRoot.remove, "remove");

    //  ----------------------------------------------- add -----------------------------------------------

    repoRoot.add = function(arr) {
      var newArr = new Collection();
      if (arr != undefined && arr != null) {
        arr = isArray(arr) ? arr : [arr];
        if (arr.length != 0) {
          each(arr, function(idx, item) {
            var newItem = $.extend({}, spec[defaultsName], item),
              newObj = new Model();
            storage.push(newObj);
            newArr.push(newObj);
            each(newItem, function(name, val) {
              if (spec[defaultsName][name]) {
                val = isFunction(val) ? val(newItem) : val;
              }
              if (isModelAccessor(newObj[name])) {
                val = isModelAccessor(val) ? val.apply(item) : val;
                newObj[modelStorage][name] = val;
              }
            });
            addIndexes(newObj);
            each(newItem, function(name, val) {
              if (isModelAccessor(newObj[name])) {
                newObj[name](newObj[name](), true, false, undefined);
              }
            });
          });
          each(newArr, function(idx, item) {
            item.on(function(model, action) {
              if (action == "remove") {
                removeIndexes(item);
              } else {
                updateIndexes(item);
              }
            }); // any change, due to findBy synthetic fields
          });
          trigger(specBus, "add", [newArr], [newArr]);
          if (specBus[evt("update")] || specBus[evt()]) {
            each(newArr, function(idx, item) {
              trigger(specBus, "update", [item], [item, "update"]);
            });
          }
        }
      }
      return newArr;
    };
    repoRoot.add[objectBus] = specBus;
    assignOnOffHandlers(repoRoot.add, "add");

    // ----------------------------------------------- indexes -----------------------------------------------

    function indexPresent(arr) {
      var present = false;
      each(indexesSpec, function(i, index) {
        if (index.length == arr.length) {
          var matching = true;
          each(index, function(j, elem) {
            matching = matching && elem === arr[j];
          });
          if (matching) {
            present = true;
            return false;
          }
        }
      });
      return present;
    }

    function addIndexes(obj) {
      each(indexesSpec, function(i, index) {
        var node = indexes;
        each(index, function(j, name) {
          var key = name + "=" + obj[name]();
          node[key] = node[key] || {};
          node = node[key];
        });
        node.content = node.content || [];
        node.content.push(obj);
        obj[reverseIndexes].push(node.content);
      });
    }

    function removeIndexes(obj) {
      each(obj[reverseIndexes], function(i, arr) {
        arr.splice(arr.indexOf(obj), 1);
      });
      obj[reverseIndexes] = [];
    }

    function updateIndexes(obj) {
      removeIndexes(obj);
      addIndexes(obj);
    }

    // ----------------------------------------------- all -----------------------------------------------

    repoRoot.all = function() {
      return new Collection(storage);
    };

    // ----------------------------------------------- toCollection ----------------------------------------

    repoRoot.toCollection = function(arr) {
      return new Collection(arr);
    };

    // ----------------------------------------------- updateAll -----------------------------------------------
    repoRoot.updateAll = function(arr, removeMissing, matcherCb) {
      arr = isArray(arr) ? arr : (arr ? [arr] : []);
      matcherCb = matcherCb ? matcherCb : function(modelObj, outerObj) {return modelObj.id ? modelObj.id() == outerObj.id : false;};
      var toRemove = [];
      var toAdd = [];
      each(arr, function(idx, item) {toAdd.push(item);});
      each(storage, function(idx, oldItem) {
        var matchingObj;
        each(arr, function(idx, newItem) {
          if (matcherCb(oldItem, newItem)) {
            matchingObj = newItem;
            return false;
          }
          return true;
        });
        var idxAdd = toAdd.indexOf(matchingObj);
        removeMissing && !matchingObj && toRemove.push(oldItem);
        matchingObj && idx >= 0 && toAdd.splice(idxAdd, 1);
        matchingObj && oldItem.update(matchingObj);
      });
      removeMissing && each(toRemove, function(idx, item) {
        repoRoot.remove(item);
      });
      toAdd.length > 0 && repoRoot.add(toAdd);
    };

    each(spec[defaultsName], function(key, val) {
      val = isFunction(val) ? val(spec) : val;
      if (isModelAccessor(spec[key])) {
        spec[key](val);
      }
    });

    Collection.prototype = [];
    Collection.prototype.jCollection = true;
    Collection.prototype.jModelName = modelName;
    Model.prototype.jModelName = modelName;
    attachCollectionFunctions(Collection.prototype, collectionFunctions);

    // ----------------------------------------------- bind other functions -----------------------------------------------

    function isFindByFunction(fname, funcSpec) {
      return fname.indexOf("findBy") === 0 && fname.length > 6 && isUpperCaseChar(fname, 6) && isEmptyFunction(funcSpec);
    }

    function trigger(bus, fname, args, argsPerObj) {
      bus[evt(fname)] && bus.trigger(evt(fname), args);
      bus[evt()] && bus.trigger(evt(), argsPerObj);
    }

    function proxy(fname) {
      return function() {
        return singleton[fname].apply(singleton, arguments);
      }
    }

    function evt(fname) {
      fname = fname || "";
      return modelName + "_" + fname + "_event";
    }

    function assignExtraHandlers(obj) {
      obj.enqueue = function(field, val) {
        var hndlr, that = this;
        function maybeSet() {
          var current = that[field]();
          if (current === null || current === undefined) {
            that[field](val);
            hndlr && hndlr.off();
            return true;
          }
          return false;
        }
        if (!maybeSet()) {
          hndlr = this[field+"_on"](maybeSet);
        }
      };
      obj.nowAndOn = function(field, cb) {
        cb.apply(this, [this, this[field]()]);
        return this.on(field, cb);
      };
      obj.asapAndOn = function(field, cb) {
        var that = this;
        that.asap(field, function() {
          cb.apply(that, arguments);
          that.on(field, cb);
        });
      };
      obj.asap = function(field, cb) {
        var bus = this[objectBus],
          val = this[field]();
        if (val !== undefined) {
          cb && cb.apply(this, [this, val]);
        } else {
          var eventName = evt(field),
            that = this;
          bus[eventName] = (bus[eventName] || 0) + 1;
          bus.one(eventName, function () {
            bus[eventName]--;
            var args = copyArr(arguments);
            args.splice(0, 1);
            cb && cb.apply(that, args);
          })
        }
      };
    }

    function assignOnOffHandlers(obj, overrideField) {
      obj.on = function(field, cb) {
        if (isFunction(field)) {
          cb = field;
          field = overrideField;
        }
        var that = this,
          bus = this[objectBus],
          eventName = evt(field);
        var handler = function(evt) {
          var args = copyArr(arguments);
          args.splice(0, 1);
          var res = cb && cb.apply(cb, args);
          if (res === false) {
            evt.stopImmediatePropagation();
          }
        };
        bus.handlers = bus.handlers || {};
        bus.handlers[eventName] = bus.handlers[field] || [];
        bus.handlers[eventName].push(cb);
        bus[eventName] = (bus[eventName] || 0) + 1;
        bus.on(eventName, handler);
        handler.off = function() {
          that.off(handler);
        };
        handler.eventName = eventName;
        handler.cb = cb;
        return handler;
      };
      obj.once = function(field, cb) {
        if (isFunction(field)) {
          cb = field;
          field = overrideField;
        }
        var that = this,
            handler = that.on(field, function() {
              that.off(handler);
              cb && cb.apply(that, arguments);
            });
      };
      obj.off = function(handlerOrArr) {
        var bus = this[objectBus];
        handlerOrArr = isArray(handlerOrArr) ? handlerOrArr : [handlerOrArr];
        each(handlerOrArr, function(i, handler) {
          bus[handler.eventName]--;
          bus.handlers[handler.eventName].splice(bus.handlers[handler.eventName].indexOf(handler.cb), 1);
          return bus.off(handler.eventName, handler);
        });
      };
      obj.subscribers = function(field) {
        var bus = this[objectBus],
          eventName = evt(field);
        return bus.handlers ? bus.handlers[eventName] : undefined;
      }
    }

    function bindFn(fnRoot, fname, funcSpec) {
      var objMode = repoMode && fnRoot !== spec[repoName];
      if (fname === defaultsName && $.isPlainObject(funcSpec)) {
      } else if (fname === repoName && $.isPlainObject(funcSpec)) {
      } else if (fname === "addAll") {
        alert("JIANT: Model function 'addAll' removed since 1.37, use previous versions or replace it by 'add'");
      } else if (!objMode && fname in {"updateAll": 1, "add": 1, "toCollection": 1, "all": 1}) {
      } else if (fname in {"off": 1, "nowAndOn": 1, "asapAndOn": 1, "asap": 1, "once": 1, "enqueue": 1}) {
        collectionFunctions.push(fname);
      } else if (fname === "on") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        assignOnOffHandlers(Model.prototype);
        assignExtraHandlers(Model.prototype);
        assignOnOffHandlers(spec);
      } else if (fname === "update") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = function(objFrom, treatMissingAsUndefined) {
          var smthChanged = false,
            toTrigger = {},
            that = this;
          if (arguments.length === 0) {
            smthChanged = true;
          } else {
            treatMissingAsUndefined && each(this[modelStorage], function(key, val) {
              (key in objFrom) || (objFrom[key] = undefined);
            });
            each(objFrom, function(key, val) {
              if (isModelAccessor(that[key])) {
                val = isFunction(val) ? val() : val;
                var oldVal = that[key]();
                if (oldVal !== val) {
                  toTrigger[key] = oldVal;
                  that[key](val, false);
                  smthChanged = true;
                }
              }
            });
            each(toTrigger, function(key, oldVal) {
              that[key](that[key](), true, false, oldVal);
            });
          }
          if (smthChanged) {
            trigger(this[objectBus], fname, [this], [this, fname]);
            trigger(specBus, fname, [this], [this, fname]);
          }
        };
      } else if (fname === "remove") {
      } else if (fname.indexOf("sum") === 0 && fname.length > 3 && isUpperCaseChar(fname, 3) && !objMode) {
        var arr = fname.substring(3).split("And");
        repoRoot[fname] = function() {
          function subsum(all, fieldName) {
            var ret;
            each(all, function(i, item) {
              if (item[fieldName] && isFunction(item[fieldName])) {
                var val = item[fieldName]();
                ret = ret === undefined ? val : val === undefined ? undefined : (ret + val);
              }
            });
            return ret;
          }
          var ret;
          each(arr, function(idx, name) {
            var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
            var perField = subsum(storage, fieldName);
            ret = ret === undefined ? perField : perField === undefined ? undefined : (ret + perField);
          });
          return ret;
        }
      } else if (fname === "filter" && !objMode) {
        repoRoot[fname] = function(cb) {
          var ret = [];
          each(repoRoot.all(), function(i, obj) {
            if (cb(obj)) {
              ret.push(obj);
            }
          });
          return new Collection(ret);
        };
      } else if (isFindByFunction(fname, funcSpec) && !objMode) {
        repoRoot[fname] = function() {
          return repoRoot["listBy" + fname.substring(6)].apply(repoRoot, arguments)[0];
        }
      } else if (fname.indexOf("listBy") === 0 && fname.length > 6 && isUpperCaseChar(fname, 6) && !objMode && isEmptyFunction(funcSpec)) {
        var arr = fname.substring(6).split("And");
        each(arr, function(idx, name) {
          arr[idx] = name.substring(0, 1).toLowerCase() + name.substring(1);
          if (! spec[arr[idx]]) {
            errorp("Non existing field used by model method !!, field name: !!, model name: !!, app id: !!", fname, arr[idx], modelName, appId);
          }
        });
        if (!indexPresent(arr)) {
          indexesSpec.push(arr);
        }
        repoRoot[fname] = function() {
          var node = indexes,
            args = arguments;
          each(arr, function(i, name) {
            var key = name + "=" + args[i];
            node = node[key];
            if (node === undefined) {
              return false;
            }
          });
          return new Collection(node === undefined ? [] : node.content);
        }
      } else if (fname.indexOf("set") == 0 && fname.length > 3 && isUpperCaseChar(fname, 3)) {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        var arr = fname.substring(3).split("And");
        Model.prototype[fname] = function() {
          var outerArgs = arguments,
            newVals = {};
          each(arr, function(idx, name) {
            var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
            newVals[fieldName] = outerArgs[idx];
          });
          this.update(newVals);
          return this;
        }
      } else if (fname == "reset") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = function (val) {
          var that = this;
          each(this, function(name, fn) {
            isModelAccessor(fn) && that[name](val, true);
          });
        }
      } else if (fname == "asMap") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = function (mapping, deep) {
          var ret = {},
            that = this;
          function val2map(ret, val, actualKey) {
            if (isModel(val)) {
              ret[actualKey] = val.asMap(null, deep);
            } else if ($.isPlainObject(val)) {
              ret[actualKey] = obj2map(val);
            } else {
              val !== undefined && (ret[actualKey] = val);
            }
          }
          function obj2map(obj) {
            var ret = {};
            each(obj, function(key, val) {
              val2map(ret, val, key);
            });
            return ret;
          }
          each(that, function(key) {
            var actualKey = (mapping && mapping[key]) ? mapping[key] : key,
              fn = that[actualKey];
            if (isModelAccessor(fn) || isModelSupplier(fn)) {
              var val = fn.apply(that);
              val2map(ret, val, actualKey, mapping);
            }
          });
          return ret;
        }
      } else if ((isModelAccessor(funcSpec) || isEmptyFunction(funcSpec)) && ! isEventHandlerName(fname) && (objMode || !repoMode)) {
        var trans = funcSpec === jiant.transientFn;
        collectionFunctions.push(fname);
        collectionFunctions.push(fname + "_on");
        collectionFunctions.push(fname + "_once");
        collectionFunctions.push(fname + "_off");
        collectionFunctions.push(fname + "_asap");
        collectionFunctions.push(fname + "_nowAndOn");
        collectionFunctions.push(fname + "_asapAndOn");
        collectionFunctions.push(fname + "_enqueue");
        Model.prototype[fname] = function(val, forceEvent, dontFireUpdate, oldValOverride) {
          if (arguments.length != 0) {
            if (forceEvent || (this[modelStorage][fname] !== val && forceEvent !== false)) {
              var oldVal = arguments.length == 4 ? oldValOverride : this[modelStorage][fname];
              this[modelStorage][fname] = val;
              if (! dontFireUpdate) {
                trigger(this[objectBus], fname, [this, val, oldVal], [this, fname, val, oldVal]);
                trigger(specBus, fname, [this, val, oldVal], [this, fname, val, oldVal]);
              }
            } else {
              this[modelStorage][fname] = val;
            }
          }
          return this[modelStorage][fname];
        };
        Model.prototype[fname].jiant_accessor = 1;
        Model.prototype[fname].transient_fn = trans;
        spec[fname] = proxy(fname);
        spec[fname].on = function(cb) {return spec.on(fname, cb)};
        spec[fname].once = function(cb) {return spec.once(fname, cb)};
        spec[fname].off = function(cb) {return spec.off(cb)};
        spec[fname].asap = function(cb) {return singleton.asap(fname, cb)};
        spec[fname].nowAndOn = function(cb) {return singleton.nowAndOn(fname, cb)};
        spec[fname].asapAndOn = function(cb) {return singleton.asapAndOn(fname, cb)};
        spec[fname].enqueue = function(cb) {return singleton.enqueue(fname, cb)};
        spec[fname + "_on"] = function(cb) {return spec.on(fname, cb)};
        spec[fname + "_once"] = function(cb) {return spec.once(fname, cb)};
        spec[fname + "_off"] = function(cb) {return spec.off(cb)};
        spec[fname + "_asap"] = function(cb) {return singleton.asap(fname, cb)};
        spec[fname + "_nowAndOn"] = function(cb) {return singleton.nowAndOn(fname, cb)};
        spec[fname + "_asapAndOn"] = function(cb) {return singleton.asapAndOn(fname, cb)};
        spec[fname + "_enqueue"] = function(cb) {return singleton.enqueue(fname, cb)};
        Model.prototype[fname + "_on"] = function(cb) {return this.on(fname, cb)};
        Model.prototype[fname + "_once"] = function(cb) {return this.once(fname, cb)};
        Model.prototype[fname + "_off"] = function(cb) {return this.off(cb)};
        Model.prototype[fname + "_asap"] = function(cb) {return this.asap(fname, cb)};
        Model.prototype[fname + "_nowAndOn"] = function(cb) {return this.nowAndOn(fname, cb)};
        Model.prototype[fname + "_asapAndOn"] = function(cb) {return this.asapAndOn(fname, cb)};
        Model.prototype[fname + "_enqueue"] = function(cb) {return this.enqueue(fname, cb)};
        spec[fname].jiant_accessor = 1;
        spec[fname].transient_fn = trans;
        //if (! objMode) {
        //  assignOnOffHandlers()
        //}
        //assignOnOffHandlers(); // spec[fname], specBus, fname
      } else if (isEventHandlerName(fname)) {
      } else if (fname != modelStorage && fname != objectBus && isFunction(funcSpec) && (objMode || !repoMode)) {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = funcSpec;
        if (isSupplierFunction(funcSpec)) {
          Model.prototype[fname].jiant_supplier = 1;
          spec[fname].jiant_supplier = 1;
        }
      }
    }
  }

  function isEventHandlerName(fname) {
    function endsWith(fname, suffix) {
      return fname.length > suffix.length && fname.indexOf(suffix) === fname.length - suffix.length;
    }
    return endsWith(fname, "_on") || endsWith(fname, "_once") || endsWith(fname, "_off")
      || endsWith(fname, "_asap") || endsWith(fname, "_nowAndOn") || endsWith(fname, "_asapAndOn");
  }

  function attachCollectionFunctions(arr, collectionFunctions) {
    each(collectionFunctions, function(idx, fn) {
      arr[fn] = function() {
        var ret = [],
          args = arguments;
        each(this, function(idx, obj) {
          ret.push(obj[fn].apply(obj, args));
        });
        if (isEventHandlerName(fn)) {
          ret.off = function() {
            each(ret, function(i, item) {
              item.off();
            });
          }
        }
        return ret;
      }
    });
    return arr;
  }

  function isUpperCaseChar(s, pos) {
    var sub = s.substring(pos, pos + 1);
    return sub !== sub.toLowerCase();
  }

  function isTransient(fn) {
    return fn.transient_fn;
  }

  function isModelAccessor(fn) {
    return fn && fn.jiant_accessor && isFunction(fn);
  }

  function isModelSupplier(fn) {
    return fn && fn.jiant_supplier && isFunction(fn);
  }

  function isModel(obj) {
    return !!obj && !!obj[objectBus];
  }

  function isEmptyFunction(funcSpec) {
    var s = ("" + funcSpec).replace(/\s/g, '');
    return s.indexOf("{}") == s.length - 2;
  }

  function isSupplierFunction(funcSpec) {
    var s = ("" + funcSpec).replace(/\s/g, '');
    return s.indexOf("function(){return") == 0;
  }

  function _bindModels(appRoot, models, appId) {
    each(models, function(name, spec) {
      bindModel(name, spec, appId);
      each(listeners, function(i, l) {l.boundModel && l.boundModel(appRoot, models, name, models[name])});
    });
  }

// ------------ logic staff ----------------

  function implement(logic, impl) {
    logic.implement(impl);
  }

  function override(spec, implFn) {
    if (spec._jAppId) {
      var superImpl = $.extend(true, {}, spec),
        newImpl = implFn($, boundApps[spec._jAppId], superImpl);
      each(newImpl, function(fname, fbody) {
        spec[fname] = fbody;
      });
    } else {
      spec._jOverrides = spec._jOverrides || [];
      spec._jOverrides.push(implFn);
    }
  }

  function _bindLogic(appRoot, logics, appId) {
    each(logics, function(name, spec) {
      if (isFunction(spec)) {
        if (isEmptyFunction(spec)) {
          jiant.logError("don't declare empty logic functions, use objects for namespace grouping");
        }
      } else {
        each(spec, function(fname, fnbody) {
          if (isFunction(fnbody)) {
            var params = getParamNames(fnbody);
            if (isEmptyFunction(fnbody)) {
              spec[fname] = function() {
                jiant.logError("Logic function app.logics." + name + "." + fname + " called before implemented!");
              };
              spec[fname].empty = true;
            }
            spec[fname].params = params;
            spec[fname].spec = true;
          }
        });
        spec.implement = function(obj) {
          spec._jAppId = appId;
          each(spec, function(fname, fnbody) {
            if (isFunction(fnbody) && !(fname in {"implement": 1, "_jAppId": 1, "_jOverrides": 1})) {
              if (! fname in obj) {
                jiant.logError("Logic function " + fname + " is not implemented by declared implementation");
              } else {
                spec[fname] = obj[fname];
              }
            }
          });
          spec._jOverrides && spec._jOverrides.length && each(spec._jOverrides, function(i, implFn) {
            var superImpl = $.extend(true, {}, spec),
              newImpl = implFn($, boundApps[spec._jAppId], superImpl);
            each(newImpl, function(fname, fbody) {
              spec[fname] = fbody;
            });
          });
          (! loadedLogics[appId]) && (loadedLogics[appId] = {});
          loadedLogics[appId][name] = 1;
          awakeAwaitingDepends(appId, name);
          logUnboundCount(appId, name);
        };
        if (name == "intl") {
          loadIntl(spec, appRoot);
        }
      }
      each(listeners, function(i, l) {l.boundLogic && l.boundLogic(appRoot, logics, name, spec)});
    });
  }

  function logUnboundCount(appId, name) {
    var len = 0;
    awaitingDepends[appId] && each(awaitingDepends[appId], function() {len++});
    each(listeners, function(i, l) {l.logicImplemented && l.logicImplemented(appId, name, len)});
  }

  function loadLibs(arr, cb) {
    var pseudoDeps = [];
    if (!isArray(arr)) {
      arr = [arr];
    }
    each(arr, function(idx, url) {
      var pseudoName = "ext" + new Date().getTime() + Math.random();
      pseudoDeps.push(pseudoName);
      declare(pseudoName, url);
    });
    var pseudoAppName = "app" + new Date().getTime() + Math.random();
    onApp(pseudoAppName, pseudoDeps, function($, app) {
      cb($);
      forget(pseudoAppName);
    });
    app({id: pseudoAppName});
  }

  function declare(name, objOrUrlorFn) {
    var lib = typeof objOrUrlorFn === "string",
      startedAt = new Date().getTime();
    function handle() {
      var ms = new Date().getTime() - startedAt;
      lib && jiant.infop("Loaded external library !! in !! ms", objOrUrlorFn, ms);
      externalDeclarations[name] = lib ? {} : objOrUrlorFn;
      each(awaitingDepends, function(appId, depList) {
        copyLogic(appId, name);
      });
      each(awaitingDepends, function(appId, depList) {
        checkForExternalAwaiters(appId, name);
      });
    }
    lib && info("Start loading external library " + objOrUrlorFn);
    lib ? $.ajax({
      url: objOrUrlorFn,
      cache: true,
      crossDomain: true,
      timeout: 500,
      dataType: "script"
    }).always(handle) : handle();
  }

  function copyLogic(appId, name) {
    var obj = externalDeclarations[name],
      app = boundApps[appId];
    if (obj && awaitingDepends[appId] && awaitingDepends[appId][name] && app) {
      app.logic || (app.logic = {});
      app.logic[name] || (app.logic[name] = {});
      each(isFunction(obj) ? obj($, app) : obj, function(fname, fspec) {
        app.logic[name][fname] = fspec;
      });
    }
  }

  function checkForExternalAwaiters(appId, name) {
    if (externalDeclarations[name] && awaitingDepends[appId][name] && boundApps[appId]) {
      awakeAwaitingDepends(appId, name);
      loadedLogics[appId] && (loadedLogics[appId][name] = 1);
      logUnboundCount(appId, name);
    }
  }

  function awakeAwaitingDepends(appId, name) {
    if (! awaitingDepends[appId] || ! awaitingDepends[appId][name]) {
      return;
    }
    var awaiters = awaitingDepends[appId][name];
    delete awaitingDepends[appId][name];
    awaiters && each(awaiters, function(idx, cb) {
      eventBus.trigger(dependencyResolvedEventName(appId, name));
//            handleBound(appId, cb);
    });
  }

// ------------ load css staff ----------------

  function loadCss(arr, cb) {
    var all_loaded = $.Deferred(),
      loadedCss = [],
      link,
      style,
      interval,
      timeout = 60000, // 1 minute seems like a good timeout
      counter = 0, // Used to compare try time against timeout
      step = 30, // Amount of wait time on each load check
      docStyles = document.styleSheets, // local reference
      ssCount = docStyles.length; // Initial stylesheet count

    if (!isArray(arr)) {
      arr = [arr];
    }
    each(arr, function (idx, url) {
      info("Start loading CSS: " + url);
      loadedCss.push(handleCss(url));
    });

    if (all_loaded.state() != 'resolved') {
      // How to load multiple CSS files before callback
      $.when.apply(loadedCss).done(function () {
        all_loaded.resolve();
      });
    }

    if (cb) {
      // Perform JS
      all_loaded.done(cb);
    } else {
      return loadedCss;
    }

    function handleCss(url) {
      var promise = $.Deferred();
      // IE 8 & 9 it is best to use 'onload'. style[0].sheet.cssRules has problems.
      if (navigator.appVersion.indexOf("MSIE") != -1) {
        link = document.createElement('link');
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = url;
        link.onload = function () {
          promise.resolve();
        };
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      // Support for FF, Chrome, Safari, and Opera
      else {
        style = $('<style>').text('@import "' + url + '"').attr({
          // Adding this attribute allows the file to still be identified as an external
          // resource in developer tools.
          'data-uri': url
        }).appendTo('body');
        // This setInterval will detect when style rules for our stylesheet have loaded.
        interval = setInterval(function () {
          try {
            // This will fail in Firefox (and kick us to the catch statement) if there are no
            // style rules.
            style[0].sheet.cssRules;
            // The above statement will succeed in Chrome even if the file isn't loaded yet
            // but Chrome won't increment the styleSheet length until the file is loaded.
            if (ssCount === docStyles.length) {
              throw (url + ' not loaded yet');
            } else {
              var loaded = false,
                href,
                n;
              // If there are multiple files being loaded at once, we need to make sure that
              // the new file is this file
              for (n = docStyles.length - 1; n >= 0; n--) {
                href = docStyles[n].cssRules[0].href;
                if (typeof href != 'undefined' && href === url) {
                  // If there is an HTTP error there is no way to consistently
                  // know it and handle it. The file is considered 'loaded', but
                  // the console should will the HTTP error.
                  loaded = true;
                  break;
                }
              }
              if (loaded === false) {
                throw (url + ' not loaded yet');
              }
            }
            // If an error wasn't thrown by now, the stylesheet is loaded, proceed.
            promise.resolve();
            clearInterval(interval);
          } catch (e) {
            counter += step;
            if (counter > timeout) {
              // Time out so that the interval doesn't run indefinitely.
              clearInterval(interval);
              promise.reject();
            }
          }
        }, step);
      }
      return promise;
    }
  }

// ------------ semaphores staff ----------------

  function _bindSemaphores(appRoot, semaphores, appId) {
    each(semaphores, function(name, spec) {
      semaphores[name].release = function() {
        // if (semaphores[name].released) {
        //   logError("re-releasing semaphore already released, ignoring: " + appId + ".semaphores." + name);
        //   return;
        // }
        semaphores[name].released = true;
        semaphores[name].releasedArgs = arguments;
        eventBus.trigger(appId + "." + name + ".semaphore", arguments);
      };
      semaphores[name].on = function(cb) {
        if (semaphores[name].released) {
          cb && cb.apply(cb, semaphores[name].releasedArgs);
        } else {
          eventBus.on(appId + "." + name + ".semaphore", function() {
            var args = copyArr(arguments);
            args.splice(0, 1);
            cb && cb.apply(cb, args);
          });
        }
      };
    });
  }

// ------------ events staff ----------------

  function _bindEvents(appRoot, events, appId) {
    each(events, function(name, spec) {
      events[name].listenersCount = 0;
      events[name].fire = function() {
        perAppBus[appId].trigger(name + ".event", arguments);
      };
      events[name].on = function (cb) {
        events[name].listenersCount++;
        var handler = function () {
          var args = copyArr(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        };
        perAppBus[appId].on(name + ".event", handler);
        return handler;
      };
      events[name].once = function (cb) {
        var handler = events[name].on(function() {
          events[name].off(handler);
          cb.apply(cb, arguments);
        });
      };
      events[name].off = function (handler) {
        if (jiant.DEV_MODE && (arguments.length == 0 || !handler)) {
          jiant.logInfo("Event.off called without handler, unsubscribing all event handlers, check code if it is unintentionally",
            jiant.getStackTrace());
        }
        events[name].listenersCount--;
        return perAppBus[appId].off(name + ".event", handler);
      };

      each(listeners, function(i, l) {l.boundEvent && l.boundEvent(appRoot, events, name, events[name])});
    });
  }

// ------------ states staff ----------------

  function _bindStates(appRoot, states, stateExternalBase, appId) {
    if (! Object.keys(states).length) {
      return;
    }
    if (! $(window).hashchange) {
      var err = "No hashchange plugin and states configured. Don't use states or add hashchange plugin (supplied with jiant)";
      jiant.logError(err);
      if (jiant.DEV_MODE) {
        alert(err);
      }
      return;
    }
    if (! states[""]) {
      states[""] = {};
    }
    each(states, function(name, stateSpec) {
      var params = stateSpec.go ? getParamNames(stateSpec.go) : [];
      stateSpec.go = go(name, stateSpec.root, stateSpec, stateExternalBase, appId, true, params);
      stateSpec.replace = go(name, stateSpec.root, stateSpec, stateExternalBase, appId, false, params);
      stateSpec.start = function(cb) {
        var trace;
        each(listeners, function(i, l) {l.stateStartRegisterHandler && l.stateStartRegisterHandler(appRoot, name, stateSpec)});
        statesUsed[appId + name] && each(listeners, function(i, l) {l.stateError && l.stateError(appRoot, name, stateSpec, "State start handler registered after state triggered")});
        trace = getStackTrace();
        eventBus.on(appId + "state_" + name + "_start", function() {
          var args = copyArr(arguments);
          args.splice(0, 1);
          each(listeners, function(i, l) {l.stateStartCallHandler && l.stateStartCallHandler(appRoot, name, stateSpec, trace, args)});
          cb && cb.apply(cb, args);
        });
        var current = parseState(appId);
        if (boundApps[appId] && ((name == "" && current.now.length == 0) || (current.now[0] == name))) {
          var params = current.now;
          params.splice(0, 1);
          cb && cb.apply(cb, params);
        }
      };
      stateSpec.end = function(cb) {
        var trace;
        each(listeners, function(i, l) {l.stateEndRegisterHandler && l.stateEndRegisterHandler(appRoot, name, stateSpec)});
        statesUsed[appId + name] && each(listeners, function(i, l) {l.stateError && l.stateError(appRoot, name, stateSpec, "State end handler registered after state triggered")});
        trace = getStackTrace();
        eventBus.on(appId + "state_" + name + "_end", function() {
          each(listeners, function(i, l) {l.stateEndCallHandler && l.stateEndCallHandler(appRoot, name, stateSpec, trace)});
          var args = copyArr(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
      each(listeners, function(i, l) {l.boundState && l.boundState(appRoot, states, name, stateSpec)});
    });
    $(window).hashchange(makeHashListener(appRoot, appId));
    lastStates[appId] = parseState(appId).now[0];
    lastEncodedStates[appId] = getAppState(appId);
  }

  function makeHashListener(appRoot, appId) {
    return function (event, enforce, runtimeAppId) {
      if (runtimeAppId && runtimeAppId != appId) {
        return;
      }
      var state = location.hash.substring(1),
        parsed = parseState(appId),
        stateId = parsed.now[0],
        params = parsed.now,
        smthChanged = enforce || (lastEncodedStates[appId] != getAppState(appId));
      if (!smthChanged) {
        return;
      }
      params.splice(0, 1);
      each(params, function (idx, p) {
        if (p == "undefined") {
          params[idx] = undefined;
        }
      });
      if (lastStates[appId] != undefined && lastStates[appId] != stateId) {
        each(listeners, function(i, l) {l.stateEndTrigger && l.stateEndTrigger(appRoot, lastStates[appId])});
        eventBus.trigger(appId + "state_" + lastStates[appId] + "_end");
      }
      lastStates[appId] = stateId;
      lastEncodedStates[appId] = getAppState(appId);
      stateId = (stateId ? stateId : "");
      each(listeners, function(i, l) {l.stateStartTrigger && l.stateStartTrigger(appRoot, stateId, params)});
      !statesUsed[appId + stateId] && (statesUsed[appId + stateId] = 1);
      //            jiant.logInfo(lastEncodedStates[appId] + " params are ", params);
      eventBus.trigger(appId + "state_" + stateId + "_start", params);
    }
  }

  function go(stateId, root, stateSpec, stateExternalBase, appId, assignMode, params) {
    var defaults = stateSpec.jDefaults;
    return function() {
      var parsed = parseState(appId),
        prevState = parsed.now;
      parsed.now = [stateId];
      each(arguments, function(idx, arg) {
        if (arg !== undefined) {
          parsed.now.push(pack(arg));
        } else if ((prevState[0] == stateId || isSameStatesGroup(appId, prevState[0], stateId)) && prevState[idx + 1] != undefined) {
          parsed.now.push(pack(prevState[idx + 1]));
        } else if (idx < params.length && defaults && (params[idx] in defaults)) {
          parsed.now.push(defaults[params[idx]]);
        } else {
          parsed.now.push(pack(arg));
        }
      });
      if (prevState && (prevState[0] == stateId || isSameStatesGroup(appId, prevState[0], stateId))) {
        var argLen = arguments.length + 1;
        while (argLen < prevState.length) {
          // infop("!! vs !!, !! of !!", parsed.now[argLen], prevState[argLen], argLen, parsed.now.length);
          if (argLen < parsed.now.length) {
            if (parsed.now[argLen] === undefined) {
              parsed.now[argLen] = pack(prevState[argLen]);
            }
          } else {
            parsed.now.push(pack(prevState[argLen]));
          }
          argLen++;
        }
      }
      if (defaults) {
        for (var i = arguments.length; i < params.length; i++) {
          if ((params[i] in defaults && parsed.now[i] === undefined)) {
            if (i < parsed.now.length) {
              parsed.now[i] = defaults[params[i]];
            } else {
              parsed.now.push(defaults[params[i]]);
            }
          }
        }
      }
      if (root) {
        parsed.root = [];
        each(parsed.now, function(idx, param) {
          parsed.root.push(param);
        });
      } else {
        each(parsed.root, function(idx, param) {
          parsed.root[idx] = pack(param);
        });
      }
      setState(parsed, stateExternalBase, appId, assignMode);
    };
  }

  function isSameStatesGroup(appId, state0, state1) {
    var statesRoot = boundApps[appId].states;
    return (statesRoot[state0] && statesRoot[state1] && statesRoot[state0].statesGroup !== undefined
    && statesRoot[state0].statesGroup === statesRoot[state1].statesGroup);
  }

  function goRoot(appOrId) {
    function _go(appId) {
      var parsed = parseState(appId);
      parsed.now = [];
      each(parsed.root, function(idx, param) {
        parsed.now.push(pack(param));
        parsed.root[idx] = pack(param);
      });
      setState(parsed, undefined, appId, true); // external base not used
    }
    if (appOrId) {
      var appId = extractApplicationId(appOrId);
      _go(appId);
    } else {
      each(getStates(), function(appId, state) {
        _go(appId);
      });
    }
  }

  function setState(parsed, stateExternalBase, appId, assignMode) {
    var states = getStates(),
      result = "";
    var s = parsed.now + "|" + parsed.root;
    each(states, function(stateAppId, state) {
      if (appId == stateAppId) {
        result += (stateAppId + "=" + s + "=");
      } else {
        result += (stateAppId + "=" + state + "=");
      }
    });
    if (! states[appId]) {
      result += (appId + "=" + s + "=");
    }
    var extBase = (stateExternalBase || stateExternalBase == "") ? stateExternalBase : jiant.STATE_EXTERNAL_BASE;
    if (assignMode) {
      window.location.assign((extBase ? extBase : "") + "#" + result);
    } else {
      window.location.replace((extBase ? extBase : "") + "#" + result);
    }
    $(window).hashchange();
  }

  function getStates() {
    var state = location.hash.substring(1),
      data = state.split("="),
      retVal = {};
//          jiant.logInfo("parsing state: " + state);
    each(data, function(idx, elem) {
      (idx % 2 == 0) && elem && data[idx + 1] != undefined && (retVal[elem] = data[idx + 1]);
//            (idx % 2 == 0) && elem && data[idx + 1] != undefined && jiant.logInfo("state parsed: " + elem + " === " + data[idx+1]);
    });
    return retVal;
  }

  function getAppState(appId) {
    if (appId) {
      var s = getStates()[appId];
      return s === undefined ? "" : s;
    } else {
      var retVal = "";
      each(getStates(), function(key, val) {
        retVal = val;
        return false;
      });
      return retVal;
    }
  }

  function parseState(appId) {
    var state = getAppState(appId),
      arr = state.split("|"),
      parsed = {now: [], root: []};
    each(arr, function(idx, item) {
      var args = item.split(",");
      each(args, function(idxInner, arg) {
        parsed[idx == 0 ? "now" : "root"].push(unpack(arg));
      });
    });
    parsed.now = parsed.now || [];
    parsed.root = parsed.root || [];
    return parsed;
  }

  function pack(s) {
    if ($.isPlainObject(s)) {
      var retVal = "{";
      each(s, function(key, val) {
        retVal += pack(key);
        retVal += ":";
        retVal += pack(val);
        retVal += "}";
      });
      retVal = retVal[retVal.length - 1] == "}" ? retVal.substring(0, retVal.length - 1) : retVal;
      return pack(retVal);
    } else {
      s = s + "";
      return s ? s.replace(replacementRegex, function(matched) {return replacementMap[matched];}) : "";
    }
  }

  function unpack(s) {
    if (s.indexOf("%") >= 0 && navigator.userAgent.toLowerCase().indexOf('firefox') >= 0) {
      s = decodeURI(s);
    }
    s = s ? s.replace(reverseRegex, function(matched) {return reverseMap[matched];}) : "";
    if (s && s[0] == "{") {
      var retVal = {};
      var arr = s.substring(1, s.length).split("}");
      each(arr, function(idx, item) {
        var sub = item.split(":");
        (sub.length == 2) && (retVal[unpack(sub[0])] = unpack(sub[1]));
      });
      return retVal;
    } else {
      return s === "undefined" ? undefined : isNumberString(s) ? parseInt(s) : s;
    }
  }

  function isNumberString(s) {
    return (parseInt(s) + "") === s;
  }

  function getCurrentState(appId) {
    if ($.isPlainObject(appId)) {
      appId = appId.id;
    }
    var parsed = parseState(appId);
    return parsed.now[0] ? parsed.now[0] : "";
  }

  function refreshState(appId) {
    $(window).hashchange && $(window).trigger("hashchange", [true, extractApplicationId(appId)]);
  }

// ------------ ajax staff ----------------

  function getParamNames(func) {
    var funcStr = func.toString();
    funcStr = funcStr.slice(funcStr.indexOf('(') + 1, funcStr.indexOf(')')).match(/([^\s,]+)/g);
    return funcStr ? funcStr : [];
  }

  function getDeclaredName(obj) {
    return !!obj ? obj._jiantSpecName : undefined;
  }

  function _bindAjax(appRoot, root, ajaxPrefix, ajaxSuffix, crossDomain) {
    each(root, function(uri, funcSpec) {
      var params = getParamNames(funcSpec);
      params && params.length > 0 ? params.splice(params.length - 1, 1) : params = [];
      root[uri] = makeAjaxPerformer(appRoot, ajaxPrefix, ajaxSuffix, uri, params, isFunction(root[uri]) ? root[uri]() : undefined, crossDomain);
      root[uri]._jiantSpec = funcSpec;
      root[uri]._jiantSpecName = uri;
      each(listeners, function(i, l) {l.boundAjax && l.boundAjax(appRoot, root, uri, root[uri])});
    });
  }

  function parseForAjaxCall(root, path, actual, traverse) {
    if (path === null) {
      return;
    }
    if (isArray(actual) || (actual && actual.jCollection)) {
      var compound = false;
      each(actual, function(i, obj) {
        compound = compound || $.isPlainObject(obj) || (obj && obj.jModelName);
        return !compound;
      });
      each(actual, function(i, obj) {
        parseForAjaxCall(root, path + (compound ? ("[" + i + "]") : ""), obj, true);
      });
    } else if ($.isPlainObject(actual) || (actual && actual.jModelName)) {
      each(actual, function(key, value) {
        if (key === jiant.flags.ajaxSubmitAsMap) {
          return;
        }
        var subpath = actual[jiant.flags.ajaxSubmitAsMap]
          ? (traverse ? (path + "[") : "") + key + (traverse ? "]" : "")
          : (traverse ? (path + ".") : "") + key;
        if (isModel(actual)) { // model
          (isModelAccessor(value) || isModelSupplier(value)) && !isTransient(value) && parseForAjaxCall(root, subpath, value.apply(actual), true);
        } else {
          parseForAjaxCall(root, subpath, value, true);
        }
      });
    } else {
      if (path in root) {
        if (root[path] && root[path].jParsed) {
          root[path].push(actual);
        } else {
          root[path] = [root[path], actual];
          root[path].jParsed = 1;
        }
      } else {
        root[path] = actual;
      }
    }
  }

  function subslash(s) {
    s = s.substring(1);
    return s.endsWith("/") ? s.substring(0, s.length - 1) : s;
  }

  function replaceSubsInUrl(url, subs) {
    return url.replace(restRegexp, function(key) {
      var lenBefore = key.length;
      key = subslash(key);
      return (key in subs ? subs[key] : (":" + key)) + ((lenBefore - key.length >= 2) ? "/" : "");
    });
  }

  function extractSubsInUrl(url) {
    var arr = url.match(restRegexp) || [];
    each(arr, function(i, obj) {
      arr[i] = subslash(obj);
    });
    if (isNumberString(arr[0])) {
      arr = arr.slice(1, arr.length);
    }
    return arr;
  }

  function makeAjaxPerformer(appRoot, ajaxPrefix, ajaxSuffix, uri, params, specRetVal, crossDomain) {
    var pfx = (ajaxPrefix || ajaxPrefix === "") ? ajaxPrefix : jiant.AJAX_PREFIX,
        sfx = (ajaxSuffix || ajaxSuffix === "") ? ajaxSuffix : jiant.AJAX_SUFFIX,
        callSpec = (specRetVal && (typeof specRetVal !== "string")) ? specRetVal : {},
        subsInUrl,
        headers = {};
    callSpec.url = callSpec.url || (typeof specRetVal === "string" ? specRetVal : (uri + sfx));
    if (pfx.endsWith("/") && callSpec.url.startsWith("/")) {
      callSpec.url = callSpec.url.substring(1);
    }
    if (!callSpec.url.startsWith("http://") && !callSpec.url.startsWith("https://")) {
      callSpec.url = pfx + ((callSpec.url.startsWith("/") || pfx.endsWith("/") || pfx.length === 0
                            || (!callSpec.url.startsWith("/") && !pfx.endsWith("/"))) ? "" : "/") + callSpec.url;
    }
    subsInUrl = extractSubsInUrl(callSpec.url);
    if (! ("paramMapping" in callSpec)) {
      callSpec.paramMapping = {};
    }
    if (! ("headers" in callSpec)) {
      callSpec.headers = {};
    }
    return function() {
      var callData = {},
          callback,
          errHandler,
          outerArgs = arguments,
          url = callSpec.url,
          time = new Date().getTime();
      if (isFunction(outerArgs[outerArgs.length - 2])) {
        callback = outerArgs[outerArgs.length - 2];
        errHandler = outerArgs[outerArgs.length - 1];
      } else if (isFunction(outerArgs[outerArgs.length - 1])) {
        callback = outerArgs[outerArgs.length - 1];
      }
      each(params, function(idx, param) {
        if (idx < outerArgs.length && !isFunction(outerArgs[idx]) && outerArgs[idx] !== undefined && outerArgs[idx] !== null) {
          var actual = outerArgs[idx],
              paramName = callSpec.paramMapping[param] || param;
          if (!(param in callSpec.headers)) {
            parseForAjaxCall(callData, paramName, actual);
          } else {
            headers[callSpec.headers[param]] = actual;
          }
        }
      });
      if ((!callSpec.method || callSpec.method.toLowerCase() === "get") && !callData["antiCache3721"]) {
        callData["antiCache3721"] = new Date().getTime();
      }
      each(listeners, function(i, l) {l.ajaxCallStarted && l.ajaxCallStarted(appRoot, uri, url, callData)});
      var subs = {};
      $.each(subsInUrl, function(i, sub) {
        var subMapped = callSpec.paramMapping[sub] || sub;
        if (subMapped in callData) {
          subs[subMapped] = callData[subMapped];
          delete callData[subMapped];
        }
      });
      url = replaceSubsInUrl(url, subs);
      var settings = {data: callData, traditional: true, method: callSpec.method, headers: headers, success: function(data) {
        each(listeners, function(i, l) {l.ajaxCallCompleted && l.ajaxCallCompleted(appRoot, uri, url, callData, new Date().getTime() - time)});
        if (callback) {
          try {
            data = $.parseJSON(data);
          } catch (ex) {
          }
          each(listeners, function(i, l) {l.ajaxCallResults && l.ajaxCallResults(appRoot, uri, url, callData, data)});
          callback(data);
        }
      }, error: function (jqXHR, textStatus, errorText) {
        if (0 === jqXHR.status && ('abort' === jqXHR.statusText || 'error' === jqXHR.statusText)) {
          return;
        }
        if (errHandler) {
          errHandler(jqXHR.responseText);
        } else if (appRoot.handleErrorFn) {
          appRoot.handleErrorFn(jqXHR.responseText);
        } else {
          jiant.handleErrorFn(jqXHR.responseText);
        }
        each(listeners, function(i, l) {l.ajaxCallError && l.ajaxCallError(appRoot, uri, url, callData, new Date().getTime() - time, jqXHR.responseText, jqXHR)});
      }};
      if (crossDomain) {
        settings.contentType = "application/json";
        settings.dataType = 'jsonp';
        settings.xhrFields = {withCredentials: true};
        settings.crossDomain = true;
      }
      return $.ajax(url, settings);
    };
  }

  function defaultAjaxErrorsHandle(errorDetails) {
    logError(errorDetails);
  }

// ------------ internationalization, texts ------------

  function translate(appRoot, val) {
    if (isArray(val)) {
      var arr = [];
      each(val, function(i, key) {
        arr.push(appRoot.logic.intl.t(key));
      });
      return arr.join(", ");
    } else {
      return appRoot.logic.intl.t(val);
    }
  }

  function setupNumLabel(appRoot, uiElem) {
    var prev = uiElem.html;
    uiElem.html = function(val) {
      var num = parseInt(val);
      if (isNaN(num) || val != num + "") {
        prev.call(uiElem, val);
      } else {
        prev.call(uiElem, formatMoney(num, appRoot.formatGroupsDelim || undefined ));
      }
    };
    uiElem.addClass("nowrap");
  }

  function intlProxy(appRoot, elem, fname) {
    if (! appRoot.logic.intl) {
      error("nlabel used, but no intl declared, degrading nlabel to label");
      return;
    }
    var prev = elem[fname];
    elem[fname] = function(val) {
      if (val == undefined) {
        return prev.call(elem);
      } else {
        if (loadedLogics[appRoot.id] && loadedLogics[appRoot.id].intl) {
          prev.call(elem, translate(appRoot, val));
        } else {
          prev.call(elem, val);
          var stack = getStackTrace();
          onApp(appRoot, ["intl"], function() {prev.call(elem, translate(appRoot, val))});
        }
      }
    }
  }

  function setupIntlProxies(appRoot, elem) {
    intlProxy(appRoot, elem, "html");
    intlProxy(appRoot, elem, "text");
  }

  function _bindIntl(root, intl, appId) {
    if (intl) {
      if (root.logic.intl) {
        info("Both logic.intl and app.intl declared, skipping app.intl");
      } else {
        root.logic.intl = intl;
      }
    }
  }

  function isI18n() {
    return (typeof i18n !== "undefined");
  }

  function i18ntl() {
    return (typeof i18n !== "undefined") ? i18n : i18next;
  }

  function loadIntl(intlRoot, appRoot) {
    infop("Loading intl for app !!", appRoot.id);
    if (! intlRoot.url) {
      //error("Intl data url not provided, internationalization will not be loaded");
      return;
    }
    var url = intlRoot.url;
    if (appRoot.modulesSuffix) {
      var delim = intlRoot.url.indexOf("?") >= 0 ? "&" : "?";
      url = url + delim + appRoot.modulesSuffix;
    }
    intlRoot.t = function(val) {};
    intlRoot.t.spec = true;
    intlRoot.t.empty = true;
    $.getJSON(url, function(data) {
      var implSpec = {}, option = intlRoot["i18nOptions"] || {debug: jiant.DEV_MODE};
      if (intlRoot.i18n) {
        if (isI18n()) {
          option.customLoad = function(lng, ns, options, loadComplete) {
            loadComplete(null, data);
          };
          if (intlRoot.javaSubst) {
            option.interpolationPrefix = '{';
            option.interpolationSuffix = '}';
          }
          i18n.init(option);
          completeIntl();
        } else {
          if (intlRoot.javaSubst) {
            option.interpolation = {
              prefix: '{',
              suffix: '}'
            };
          } else {
            option.interpolation = option.interpolation || {
                prefix: intlRoot.prefix || '__',
                suffix: intlRoot.suffix || '__'
              };
          }
          i18next.use({
            type: 'backend',
            init: function(services, options) {},
            read: function(language, namespace, callback) {
              callback(null, data);
            }
          }).init(option, completeIntl);
        }
      } else {
        completeIntl();
      }
      function completeIntl() {
        each(intlRoot, function(fname, fspec) {
          if (fspec.spec) {
            implSpec[fname] = intlRoot.i18n ? implementIntlFunctionWithI18N(fname, fspec, data, intlRoot.javaSubst) : implementIntlFunction(fname, fspec, data);
          }
        });
        intlRoot.implement(implSpec);
        intlRoot.debugIntl = function(prefix) {
          each(data, function(key, val) {
            key.startsWith(prefix) && infop("!! = !!", key, val);
          });
        };
        if (intlRoot.scanDoc) {
          $("*[data-nlabel]").each(function(i, elem) {
            elem = $(elem);
            var key = elem.attr("data-nlabel"),
              translation = intlRoot.t(key);
            elem.html(translation);
          });
        }
      }
    });
  }

  function prepareTranslation(key, val) {
    if (val || val == "") {
      return val;
    }
    jiant.error("Not found translation for key: ", key);
    return key;
  }

  function ensureIntlKey(data, key) {
    key && (data[key] || jiant.error("Not found translation for key: ", key));
  }

  function implementIntlFunctionWithI18N(fname, fspec, data, javaSubst) {
    if (fname == "t") {
      return function(key) {
        var args = {};
        if (arguments) {
          if (javaSubst) {
            each(arguments, function(i, a) {i > 0 && (args["" + (i - 1)] = a)});
          } else {
            args = arguments[1];
          }
        }
        ensureIntlKey(data, key);
        return i18ntl().t(key, args);
      }
    } else if (fspec.empty) {
      return function() {
        var args = {};
        if (arguments) {
          if (javaSubst) {
            each(arguments, function(i, a) {args["" + i] = a});
          } else {
            var paramNames = getParamNames(fspec);
            each(arguments, function(i, a) {i > 0 && i < paramNames.length && (args[paramNames[i]] = a)});
          }
        }
        ensureIntlKey(data, fname);
        return i18ntl().t(fname, args);
      }
    } else {
      return fspec;
    }
  }

  function implementIntlFunction(fname, fspec, data) {
    var impl = function(key) {return prepareTranslation(key, data[key])};
    if (fname == "t") {
      return impl;
    } else if (fspec.empty) {
      return function() {
        return impl(fname);
      }
    } else {
      return fspec;
    }
  }


// ------------ modules staff ----------------

  function a(app) {
    return jiant.getApps()[extractApplicationId(app)];
  }

  // loadModule before .app puts module into list of app modules, cb ignored
  // loadModule during .app executes module immediately
  // loadModule after .app executes module immediately
  function loadModule(app, modules, cb, replace) {
    var appId = extractApplicationId(app);
    if (! isArray(modules)) {
      modules = [modules];
    }
    if (boundApps[appId]) { // after
      _loadModules(boundApps[appId], modules, appId, false, cb, replace);
    } else if (bindingCurrently[appId]) { // during
      _loadModules(bindingCurrently[appId], modules, appId, false, cb, replace);
    } else { // before
      if (cb) {
        logError("loadModule called before .app with callback, callback will be ignored. loadModule arguments: ", arguments);
      }
      preApp(appId, function($, app) {
        each(modules, function(i, m) {
          app.modules.push(m);
        });
      });
    }
  }

  function _loadModules(appRoot, root, appId, initial, cb, replace) {
    var modules2load = [],
      replaceProvided = arguments.length >= 6;
    cb = cb || function() {};
    if ($.isPlainObject(root)) {
      modules2load = parseObjectModules(root, appId);
    } else if (isArray(root)) {
      modules2load = parseArrayModules(root, appId);
    } else {
      logError("Unrecognized modules type", root);
    }
    if (modules2load.length) {
      if (replaceProvided) {
        each(modules2load, function(i, m) {
          m.replace = replace;
        });
      }
      loadModules(appRoot, appId, modules2load, initial, cb);
    } else {
      cb();
    }
  }

  function executeExternal(appRoot, cb, arr, idx, module) {
    module.css && each(module.css, function(i, url) {
      if (addedLibs[url]) {
        return;
      }
      addedLibs[url] = 1;
      if (module.cssLoaded[url]) {
        var css = module.cssLoaded[url] + "\r\n/*# sourceURL=" + url + " */\r\n";
        $("<style>").html(css).appendTo("head");
      }
    });
    module.html && each(module.html, function(i, url) {
      // if (addedLibs[url]) {
      //   return;
      // }
      addedLibs[url] = 1;
      if (module.htmlLoaded[url]) {
        var html = "<!-- sourceUrl = " + url + " -->" + module.htmlLoaded[url] + "<!-- end of source from " + url + " -->";
        var inj = $("body");
        if (arr[idx].replace) {
          inj.html(html);
        } else {
          inj.append($(html));
        }
      }
    });
    module.js && each(module.js, function(i, url) {
      if (addedLibs[url]) {
        return;
      }
      addedLibs[url] = 1;
      if (module.jsLoaded[url]) {
        var js = module.jsLoaded[url] + "\r\n//# sourceURL=" + url + " \r\n";
        $.globalEval(js);
      }
    });
    executeModule(appRoot, cb, arr, idx + 1);
  }

  function executeModule(appRoot, cb, arr, idx) {
    if (idx >= arr.length) {
      cb();
      return;
    }
    var moduleSpec = arr[idx],
      mname = moduleSpec.name,
      module = modules[mname];
    if (isFunction(module)) {
      var args = [$, appRoot, jiant, moduleSpec];
      module.parsedDeps && each(module.parsedDeps, function(i, name) {
        args.push(appRoot.modules[name]);
      });
      appRoot.modules[mname] = module.apply(this, args);
      executeModule(appRoot, cb, arr, idx + 1);
    } else if ($.isPlainObject(module)) {
      executeExternal(appRoot, cb, arr, idx, module);
    } else {
      errorp("Application !!. Not loaded module !!. " +
        "Possible error - wrong modules section, wrong path or module name in js file doesn't match declared " +
        "in app.modules section. Load initiated by !!",
        appRoot.id, mname, (moduleSpec.j_initiatedBy ? moduleSpec.j_initiatedBy : "appication"));
      executeModule(appRoot, cb, arr, idx + 1);
    }
  }

  function cbIf0() {
    for (var i = 0; i < moduleLoads.length; i++) {
      var load = moduleLoads[i];
      if (cbLoadIf0(load.appRoot, load.modules2load, load.initial, load.cb, load.loading, i)) {
        cbIf0();
        break;
      }
    }
  }

  function cbLoadIf0(appRoot, modules2load, initial, cb, loading, idx) {
    if (Object.keys(loading).length > 0) {
      return false;
    }
    for (var i in modules2load) {
      var mName = modules2load[i].name,
        m = modules[mName];
      if (!m || m.cssCount || m.jsCount || m.htmlCount) {
        return false;
      }
    }
    moduleLoads.splice(idx, 1);
    if (initial) {
      appRoot.modulesSpec = appRoot.modules;
      appRoot.modules = {};
    }
    var arr = [];
    each(modules2load, function(i, moduleSpec) {
      arr.push(moduleSpec);
    });
    arr.sort(function(a, b) {
      return nvl(a.order, 0) - nvl(b.order, 0);
    });
    executeModule(appRoot, cb, arr, 0);
    return true;
  }

  function addIfNeed(modules2load, depModule) {
    var found = false;
    each(modules2load, function(i, moduleSpec) {
      if (moduleSpec.name == depModule.name) {
        found = true;
        moduleSpec.order = Math.min(moduleSpec.order, depModule.order);
        return false;
      }
    });
    !found && modules2load.push(depModule);
  }

  function _loadModule(appRoot, appId, modules2load, initial, cb, moduleSpec, loading) {
    function loadDep(relpath, dep, moduleSpec) {
      var url = moduleSpec.path,
        pos = url.lastIndexOf("/") + 1,
        relurl = url.substring(0, pos) + relpath;
      (relurl.lastIndexOf("/") == relurl.length - 1) || (relurl+="/");
      var depObj = typeof dep === "string" ? {name: dep, path: relurl + dep} : dep,
        depModule = parseObjModule(depObj.name, depObj, appId, modules2load.length);
      moduleSpec.j_after[depModule.name] = 1;
      depModule.order = Math.min(depModule.order, moduleSpec.order - 0.5);
      depModule.j_initiatedBy = moduleSpec.name;
      addIfNeed(modules2load, depModule);
      _loadModule(appRoot, appId, modules2load, initial, cb, depModule, loading);
      return depModule.name;
    }
    function handleModuleDeps(moduleName, moduleSpec) {
      if (typeof modules[moduleName].deps == "string") {
        errorp("Dependencies for module should be array, not string, error in module: !!, module url: !!", moduleName, url);
        modules[moduleName].deps = [modules[moduleName].deps];
      }
      var deps = modules[moduleName].deps,
        darr = modules[moduleName].parsedDeps = [];
      deps && each(deps, function(i, dep) {
        if (typeof dep === "string") {
          darr.push(loadDep("", dep, moduleSpec))
        } else {
          each(dep, function(path, arr) {
            if (! isArray(arr)) {
              arr = [arr];
            }
            each(arr, function(i, val) {
              darr.push(loadDep(path, val, moduleSpec));
            });
          });
        }
      });
    }
    function preprocessLoadedModule(moduleSpec, moduleObj) {
      handleModuleDeps(moduleSpec.name, moduleSpec);
      if ($.isPlainObject(moduleObj)) {
        preparePath(moduleObj, "css");
        preparePath(moduleObj, "js");
        preparePath(moduleObj, "html");
        loadPath(moduleObj, "css");
        loadPath(moduleObj, "js");
        loadPath(moduleObj, "html");
      }
    }
    var moduleName = moduleSpec.name;
    infop("Loading module !!, initiated by !!", moduleSpec.name, moduleSpec.j_initiatedBy ? moduleSpec.j_initiatedBy : "application");
    if (typeof moduleName != "string") {
      logError("Wrong module declaration, possibly used array instead of object, moduleSpec:", moduleSpec);
      return;
    }
    if (!loading[moduleName]) {
      if (!modules[moduleName]) {
        loading[moduleName] = 1;
        var url = isCouldBePrefixed(moduleSpec.path) ? ((appRoot.modulesPrefix || "") + moduleSpec.path) : moduleSpec.path;
        url = url + ".js?" + (appRoot.modulesSuffix || "");
        infop("           url: " + url);
        $.ajax({
          url: url,
          method: "GET",
          timeout: appRoot.modulesTimeout || 15000,
          cache: true,
          crossDomain: true,
          dataType: "script"
        }).done(function() {
          if (modules[moduleName]) {
            preprocessLoadedModule(moduleSpec, modules[moduleName]);
          }
        }).fail(function() {
          errorp("Application !!. Not loaded module !!", appId, moduleName);
        }).always(function() {
          if (loading[moduleName]) {
            delete loading[moduleName];
            cbIf0();
          }
        });
      } else {
        preprocessLoadedModule(moduleSpec, modules[moduleName]);
      }
    }
  }

  function loadModules(appRoot, appId, modules2load, initial, cb) {
    var loading = {};
    moduleLoads.push({
      appRoot: appRoot, modules2load: modules2load, initial: initial, cb: cb, loading: loading
    });
    each(modules2load, function(i, moduleSpec) {
      _loadModule(appRoot, appId, modules2load, initial, cb, moduleSpec, loading);
    });
    cbIf0();
  }

  function parseArrayModules(root, appId) {
    var ret = [], j = 0;
    each(root, function(i, module) {
      if (typeof module === "string") {
        ret.push(parseObjModule(module, {path: module}, appId, j));
      } else {
        each(module, function(key, val) {
          if (typeof val === "string") {
            ret.push(parseObjModule(val, {path: key + "/" + val}, appId, j));
          } else if (isArray(val)) {
            each(val, function(i, subval) {
              if (typeof subval === "string") {
                ret.push(parseObjModule(subval, {path: key + "/" + subval}, appId, j));
              } else {
                each(subval, function(k, v) {
                  v.path = v.path || (key + "/" + k);
                  ret.push(parseObjModule(k, v, appId, j));
                  j++;
                });
              }
              j++;
            });
          } else {
            ret.push(parseObjModule(key, val, appId, j));
          }
          j++;
        });
      }
      j++;
    });
    return ret;
  }

  function parseObjectModules(root, appId) {
    var ret = [], i = 0;
    each(root, function(name, module) {
      if (typeof module === "string") {
        ret.push(parseObjModule(name, {path: module}, appId, i));
      } else {
        ret.push(parseObjModule(name, module, appId, i));
      }
      i++;
    });
    return ret;
  }

  function parseObjModule(name, module, appId, j) {
    var mname = module.name || name;
    "order" in module || (module.order = j);
    "path" in module || (module.path = name);
    module.j_after = {};
    module.name = mname;
    return module;
  }

  function preparePath(module, path) {
    if (module[path]) {
      if (!isArray(module[path])) {
        module[path] = [module[path]];
      }
      module[path + "Count"] = module[path + "Count"] ? (module[path + "Count"] + module[path].length) : module[path].length;
      module[path + "Loaded"] = {};
    }
  }

  function loadPath(module, path) {
    if (module[path]) {
      each(module[path], function(i, url) {
        if (loadedLibs[url]) {
          module[path + "Loaded"][url] = loadedLibs[url];
          module[path + "Count"]--;
          if (!module.cssCount && !module.jsCount && !module.htmlCount) {
            cbIf0();
          }
        } else if (loadingLibs[url]) {
          loadingLibs[url].push(function() {
            module[path + "Loaded"][url] = loadedLibs[url];
            module[path + "Count"]--;
            if (!module.cssCount && !module.jsCount && !module.htmlCount) {
              cbIf0();
            }
          })
        } else {
          loadingLibs[url] = [];
          $.ajax({
            url: url,
            timeout: jiant.LIB_LOAD_TIMEOUT,
            method: "GET",
            cache: true,
            crossDomain: true,
            dataType: "text"
          }).done(function(data) {
            module[path + "Loaded"][url] = data;
            loadedLibs[url] = data;
            var waiters = loadingLibs[url];
            delete loadingLibs[url];
            each(waiters, function(i, w) {
              w();
            });
          }).always(function() {
            module[path + "Count"]--;
            if (!module.cssCount && !module.jsCount && !module.htmlCount) {
              cbIf0();
            }
          });
        }
      });
    }
  }

  function module(name, deps, cb) {
    if (arguments.length < 3) {
      cb = deps;
      deps = [];
    }
    if (modules[name] && cb + "" != modules[name] + "") {
      var nameOld = name + "_j2";
      modules[nameOld] = modules[name];
      errorp("Module !! already defined, overriding, old module stored as !!", name, nameOld);
    }
    info("registered module " + name);
    modules[name] = cb;
    modules[name].deps = deps;
  }

// ------------ base staff ----------------

  function isCouldBePrefixed(url) {
    return ! (url.substring(0, 1) == "/" || url.substring(0, 7) == "http://" || url.substring(0, 8) == "https://");
  }

  function maybeSetDevModeFromQueryString() {
    if ((window.location + "").toLowerCase().indexOf("jiant.dev_mode") >= 0) {
      jiant.DEV_MODE = true;
    }
  }

  function maybeShort(root, full, shorten) {
    if (root[full]) {
      root[shorten] || (root[shorten] = root[full]);
      return true;
    }
    if (root[shorten]) {
      root[full] = root[shorten];
      return true;
    }
    root[full] = {};
    return false;
  }

  function _bindUi(root, appUiFactory) {
    maybeSetDevModeFromQueryString();
    errString = "";
    bindingsResult = true;
    var appId = (root.id ? root.id : "no_app_id");
    if (! root.id) {
      jiant.logError("!!! Application id not specified. Not recommended since 0.20. Use 'id' property of application root to specify application id");
    }
    if (boundApps[appId]) {
      jiant.logError("Application '" + appId + "' already loaded, skipping multiple bind call");
      return;
    }
    backupApps[appId] = {};
    plainCopy(root, backupApps[appId]);
    maybeShort(root, "logic", "l");
    var intlPresent = maybeShort(root, "intl", "i");
    maybeShort(root, "views", "v");
    maybeShort(root, "templates", "t");
    maybeShort(root, "ajax", "a");
    maybeShort(root, "events", "e");
    maybeShort(root, "semaphores", "sem");
    maybeShort(root, "states", "s");
    maybeShort(root, "models", "m");
    root.modules = root.modules || [];
    preApping[appId] = root;
    if (pre[appId]) {
      each(pre[appId], function(i, cb) {
        cb($, root, jiant);
      });
      delete pre[appId];
    }
    if (appId !== "*" && pre["*"]) {
      each(pre["*"], function(i, cb) {
        cb($, root, jiant);
      });
    }
    delete preApping[appId];
    bindingCurrently[appId] = root;
    if (root.modulesSpec) {
      root.modules = root.modulesSpec;
    }
    _loadModules(root, root.modules, appId, true, function() {
      intlPresent && _bindIntl(root, root.intl, appId);
      // views after intl because of nlabel proxies
      _bindViews(root, root.views, appUiFactory);
      _bindTemplates(root, root.templates, appUiFactory);
      _bindAjax(root, root.ajax, root.ajaxPrefix, root.ajaxSuffix, root.crossDomain);
      _bindEvents(root, root.events, appId);
      _bindSemaphores(root, root.semaphores, appId);
      _bindStates(root, root.states, root.stateExternalBase, appId);
      _bindModels(root, root.models, appId);
      _bindLogic(root, root.logic, appId);
      jiant.DEV_MODE && !bindingsResult && alert("Some elements not bound to HTML properly, check console" + errString);
      perAppBus[appId] = $({});
      boundApps[appId] = root;
      loadedLogics[appId] || (loadedLogics[appId] = {});
      each(externalDeclarations, function(name, impl) {
        loadedLogics[appId][name] || (loadedLogics[appId][name] = externalDeclarations[name]);
        copyLogic(appId, name);
        awakeAwaitingDepends(appId, name);
      });
      delete bindingCurrently[appId];
      eventBus.trigger(appBoundEventName(appId));
      jiant.DEV_MODE && setTimeout(function() {
        if (awaitingDepends[appId]) {
          each(awaitingDepends[appId], function(key, arr) {
            if (arr && arr.length) {
              errorp("Some logic depends for application " + appId + " are not implemented by your code, logic name: ", key);
              logError(awaitingDepends[appId]);
              return false;
            }
          })
        }
      }, 5000);
    });
  }

  function app(app) {
    bindUi(app.appPrefix, app, undefined, app.viewsUrl, app.injectId);
  }

  function bindUi(prefix, root, devMode, viewsUrl, injectId) {
    if ($.isPlainObject(prefix)) { // no prefix syntax
      injectId = viewsUrl;
      viewsUrl = devMode;
      devMode = root;
      root = prefix;
      prefix = root.appPrefix;
    }
    root.appPrefix = prefix || "";
    if (devMode === undefined) {
      devMode = true;
    }
    if (typeof viewsUrl !== "string") {
      viewsUrl = undefined;
    }
    if (typeof injectId !== "string") {
      injectId = undefined;
    }
    if (typeof devMode !== "boolean") {
      devMode = undefined;
    }
    each(listeners, function(i, l) {l.bindStarted && l.bindStarted(root)});
    var appUiFactory = root.uiFactory ? root.uiFactory : uiFactory;
    if (viewsUrl) {
      var injectionPoint;
      if (injectId) {
        injectionPoint = $("#" + injectId);
        if (!injectionPoint[0]) {
          injectionPoint = $("<div id='" + injectId + "' style='display:none'></div>");
          $("body").append(injectionPoint);
        }
      } else {
        injectionPoint = $("body");
      }
      injectionPoint.load(viewsUrl, {}, function () {
        _bindUi(root, appUiFactory);
      });
    } else {
      _bindUi(root, appUiFactory);
    }
    each(listeners, function(i, l) {l.bindCompleted && l.bindCompleted(root)});
  }

  function extractApplicationId(appId) {
    return $.isPlainObject(appId) ? appId.id : appId
  }

  // onApp(cb);
  // onApp(depList, cb); - INVALID, treated as onApp(appIdArr, cb);
  // onApp(appIdArr, cb);
  // onApp(appIdArr, depList, cb);
  // onApp(appId, cb);
  // onApp(appId, depList, cb)
  function onApp(appIdArr, dependenciesList, cb) {
    if (! cb && ! dependenciesList) {
      jiant.error("!!! Registering anonymous logic without application id. Not recommended since 0.20");
      cb = appIdArr;
      appIdArr = ["no_app_id"];
    } else if (! cb) {
      cb = dependenciesList;
      dependenciesList = [];
    }
    if (! isArray(appIdArr)) {
      appIdArr = [appIdArr];
    }
    if (appIdArr.length > 1 && isArray(dependenciesList) && dependenciesList.length > 0) {
      each(dependenciesList, function(idx, arr) {
        if (!isArray(arr)) {
          jiant.error("Used multiple applications onApp and supplied wrong dependency list, use multi-array, " +
            "like [[app1DepList], [app2DepList]]");
        }
      })
    } else if (appIdArr.length == 1 && dependenciesList && dependenciesList.length) {
      dependenciesList = [dependenciesList];
    } else if (! dependenciesList) {
      dependenciesList = [];
    }
    each(listeners, function(i, l) {l.onUiBoundCalled && l.onUiBoundCalled(appIdArr, dependenciesList, cb)});
    each(appIdArr, function(idx, appId) {
      if (appId === undefined || appId === null) {
        logError("Called onApp with undefined application, apps array is ", appIdArr);
      } else if ($.isPlainObject(appId)) {
        appId = appId.id;
        appIdArr[idx] = appId;
      }
      (! awaitingDepends[appId]) && (awaitingDepends[appId] = {});
      (! loadedLogics[appId]) && (loadedLogics[appId] = {});
      dependenciesList[idx] && each(dependenciesList[idx], function(idx, depName) {
        (!awaitingDepends[appId][depName]) && (awaitingDepends[appId][depName] = []);
        if ((!loadedLogics[appId][depName]) && externalDeclarations[depName]) {
          copyLogic(appId, depName);
          checkForExternalAwaiters(appId, depName);
        }
        (!loadedLogics[appId][depName]) && awaitingDepends[appId][depName].push(cb);
      });
    });
    handleBoundArr(appIdArr, cb);
  }

  function preApp(appId, cb) {
    if (typeof appId != "string") {
      errorp("preApp first parameter must be application id string, got !!", typeof appId);
    } else if (boundApps[appId]) {
      errorp("Application !! already bound, preApp should be called before bindUi", appId);
    } else if (bindingCurrently[appId]) {
      errorp("Application !! binding in progress, preApp should be called before bindUi", appId);
    } else {
      var arr = pre[appId] = nvl(pre[appId], []);
      arr.push(cb);
      if (preApping[appId]) {
        cb($, preApping[appId], jiant);
      }
    }
  }

  function handleBoundArr(appIdArr, cb) {
    var allBound = true;
    each(appIdArr, function(idx, appId) {
      if (! boundApps[appId]) {
        eventBus.one(appBoundEventName(appId), function() {
          handleBoundArr(appIdArr, cb);
        });
        allBound = false;
        return false;
      }
    });
    if (allBound) {
      var allDependsResolved = true, params = [$];
      each(appIdArr, function(idx, appId) {
        each(awaitingDepends[appId], function(depName, cbArr) {
          allDependsResolved = allDependsResolved && (cbArr.indexOf(cb) < 0);
          !allDependsResolved && eventBus.one(dependencyResolvedEventName(appId, depName), function() {
            handleBoundArr(appIdArr, cb);
          });
          return allDependsResolved;
        });
        if (! allDependsResolved) {
          return false;
        }
        params.push(boundApps[appId]);
      });
      allDependsResolved && cb.apply(cb, params);
    }
  }

  function appBoundEventName(appId) {
    return appId + "jiant_uiBound_" + appId;
  }

  function dependencyResolvedEventName(appId, depName) {
    return appId + "jiant_dependency_resolved_" + depName;
  }

  function forget(appOrId, deep) {
    var appId = extractApplicationId(appOrId),
      app = boundApps[appId];
    if (app && deep) {
      each(app.models, function(i, m) {
        m.reset(undefined);
        getRepo(m).all().remove();
      });
      each(app.views, function (i, v) {
        each(v._jiantSpec, function (name, spec) {
          if (jiant.cssFlag === spec) {
            v.removeClass(name);
          } else if (jiant.cssMarker === spec) {
            v.removeClass($.grep(v.attr('class').split(' '), function (c) {
              return c.substr(0, name.length + 1) === (name + "_");
            }).join(' '))
          }
        });
      });
    }
    app && plainCopy(backupApps[appId], app);
    app && delete boundApps[appId];
    awaitingDepends[appId] && delete awaitingDepends[appId];
    loadedLogics[appId] && delete loadedLogics[appId];
    lastEncodedStates[appId] && delete lastEncodedStates[appId];
    lastStates[appId] && delete lastStates[appId];
    perAppBus[appId] && delete perAppBus[appId];
  }

  function plainCopy(fromApp, toApp) {
    if (! fromApp) {
      return;
    }
    each(toApp, function(key, val) {
      delete toApp[key];
    });
    $.extend(true, toApp, fromApp);
  }

  function getAwaitingDepends() {
    return awaitingDepends;
  }

  function setUiFactory(factory) {
    var ok = true;
    each(["template", "viewComponent", "view"], function(idx, name) {
      if (! factory[name]) {
        jiant.logError("UI Factory doesn't implement method " + name + ", ignoring bad factory");
        ok = false;
      }
    });
    ok && (uiFactory = factory);
  }

  function visualize(appId) {
    loadLibs(["https://rawgit.com/vecnas/jiant/master/arbor.js"], function() {
      loadLibs(["https://rawgit.com/vecnas/jiant/master/arbor-tween.js"], function() {
        loadLibs(["https://rawgit.com/vecnas/jiant/master/graph.js"], function() {
          appId || each(boundApps, function(key, val) {
            appId = key;
            return false;
          });
          onApp(appId, ["jiantVisualizer"], function($, app) {
            app.logic.jiantVisualizer.visualize($, app);
          });
        }, true)
      })
    })
  }

  function asObjArray(arr, name, idxName) {
    var ret = [];
    each(arr, function(i, val) {
      var obj = {};
      obj[name] = val;
      idxName && (obj[idxName] = i);
      ret.push(obj);
    });
    return ret;
  }

  function addListener(listener) {
    listeners.push(listener);
  }

  function removeListener(listener) {
    listeners.remove(listener);
  }

  function registerCustomType(customTypeName, handler) {
    if (! (typeof customTypeName === 'string' || customTypeName instanceof String)) {
      alert("Custom type name should be string");
    }
    customElementTypes[customTypeName] = handler;
  }

  function registerCustomRenderer(customRendererName, handler) {
    if (! (typeof customRendererName === 'string' || customRendererName instanceof String)) {
      alert("Custom renderer name should be string");
    }
    customElementRenderers[customRendererName] = handler;
  }

  function check(bool, err) {
    if (! bool) {
      var args = copyArr(arguments);
      args.splice(0, 1);
      logError(args);
      jiant.DEV_MODE && alert(err);
    }
  }

  function optional(tp) {
    var arr = [optional];
    if (isArray(tp)) {
      each(tp, function(i, elem) {arr.push(elem)});
    } else {
      arr.push(tp);
    }
    return arr;
  }

  function comp(tp, params) {
    return [comp, tp, params];
  }

  function data(field, dataName) {
    return arguments.length === 0 ? data : [data, field, dataName];
  }

  function cssMarker(field, className) {
    return arguments.length === 0 ? cssMarker : [cssMarker, field, className];
  }

  function cssFlag(field, className) {
    return arguments.length === 0 ? cssFlag : [cssFlag, field, className];
  }

  function meta() {
    var arr = [meta];
    each(arguments, function(i, arg) {arr.push(arg)});
    return arguments.length === 0 ? meta : arr;
  }

  function version() {
    return 293;
  }

  function Jiant() {}

  Jiant.prototype = {
    AJAX_PREFIX: "",
    AJAX_SUFFIX: "",
    DEV_MODE: false,
    PAGER_RADIUS: 6,
    LIB_LOAD_TIMEOUT: 15000,
    isMSIE: eval("/*@cc_on!@*/!1"),
    STATE_EXTERNAL_BASE: undefined,
    getAwaitingDepends: getAwaitingDepends, // for application debug purposes

    bindUi: bindUi,
    app: app,
    forget: forget,
    declare: declare,
    override: override,
    implement: implement,
    module: module,
    loadModule: loadModule,
    bindView: bindView,
    bindModel: bindModel,
    loadLibs: loadLibs,
    loadCss: loadCss,
    goRoot: goRoot,
    getStackTrace: getStackTrace,
    showTrace: showTrace,
    onUiBound: onApp,
    onApp: onApp,
    preUiBound: preApp,
    preApp: preApp,
    refreshState: refreshState,
    getCurrentState: getCurrentState,
    setUiFactory: setUiFactory,
    visualize: visualize,
    isModelSupplier: isModelSupplier,
    isModelAccessor: isModelAccessor,
    isModel: isModel,
    packForState: pack,
    unpackForState: unpack,

    handleErrorFn: defaultAjaxErrorsHandle,
    registerCustomType: registerCustomType,
    registerCustomRenderer: registerCustomRenderer,
    logInfo: logInfo,
    logError: logError,
    info: info,
    error: error,
    infop: infop,
    errorp: errorp,
    check: check,
    parseTemplate: function(text, data) {return $(parseTemplate(text, data));},
    parseTemplate2Text: parseTemplate2Text,
    copy2clipboard: copy2cb,
    version: version,

    formatDate: formatDate,
    formatDateUsa: formatDateUsa,
    formatMoney: formatMoney,
    formatTime: formatTime,
    formatTimeSeconds: formatTimeSeconds,
    randomIntBetween: randomIntBetween,
    getURLParameter: getURLParameter,
    lfill: lfill,
    pick: pick,
    asObjArray: asObjArray,
    nvl: nvl,
    getFunctionParamNames : getParamNames,
    getDeclaredName: getDeclaredName,
    getApps: function() {return boundApps},
    getRepo: getRepo,

    addListener: addListener,
    removeListener: removeListener,

    optional: optional,

    comp: comp,

    collection: "jiant.collection",
    container: "jiant.container",
    containerPaged: "jiant.containerPaged",
    ctl: "jiant.ctl",
    ctlHide: "jiant.ctlHide",
    form: "jiant.form",
    grid: "jiant.grid",
    image: "jiant.image",
    imgBg: "jiant.imgBg",
    input: "jiant.input",
    href: "jiant.href",
    inputSet: "jiant.inputSet",
    inputSetAsString: "jiant.inputSetAsString",
    inputDate: "jiant.inputDate",
    inputInt: "jiant.inputInt",
    inputFloat: "jiant.inputFloat",
    label: "jiant.label",
    nlabel: "jiant.nlabel",
    numLabel: "jiant.numLabel",
    meta: meta,
    cssFlag: cssFlag,
    cssMarker: cssMarker,
    pager: "jiant.pager",
    slider: "jiant.slider",
    tabs: "jiant.tabs",
    fn: function (param) {},
    data: data,
    lookup: function (selector) {},
    transientFn: function(val) {},

    et: { // element types
      ctl2state: "jiant.ctl2state",
      ctl2root: "jiant.ctl2root",
      ctlBack: "jiant.ctlBack"
    },
    flags: {
      ajaxSubmitAsMap: "_jiantFlagSubmitAsMap"
    },

    intro: {
      isFunction: isFunction,
      isTemplate: function(obj) {return obj && obj._jiantType === jTypeTemplate}
    },

    key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
      escape: 27, dot: 190, dotExtra: 110, comma: 188,
      a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
      f1: 112, f2: 113, f3: 114, f4: 115, f5: 116, f6: 117, f7: 118, f8: 119, f9: 120}

  };

  return window.jiant || (window.jiant = new Jiant());

}));
