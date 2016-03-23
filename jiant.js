/*
 2.15: absolute urls for modules support, repo/defaults names per model, not app (redone 2.14), via jiantDefaults or jiantRepo flag inside of section
 2.15.1: minor fix for already loaded all modules
 2.16: jiant.flags, jiant.refs for public reflection
 2.16.1: states defaults/undefineds mix fix
 2.16.2: warning about old model repo format
 2.16.3: refs used as functions: model[jiant.refs.modelRepoRefName]() to avoid problems with $.extend
 2.16.4: template data copy protection vs infinite recursion
 2.17: jquery names intersection bug fix in models
 2.18: supplier methods of model (starting with "return") results passed to ajax call, jiant.isModelSupplier and jiant.isModelAccessor for testing model fields
 2.18.1: proper context for supplier call to support this.
 2.18.2: no-repo error shown only for spec and as info
 2.19: asMap(mapping, deep) - to iterate model recursively, jiant.isModel - to check is object model, jiant.packForState, jiant.unpackForState are public
 2.20: defaults/repo renamed to jDefaults/jRepo for more uniqueness
 2.21: asMap deep supports maps with models as values
 2.21.1: internal minor reorganizations
 2.21.2: better values mapping for inputSetAsString
 2.21.3: defaults functions now use passed object as this
 2.22: multiple UI elements could be bound to single jiant.pager declaration
 2.23: added model field .onAndNow method, similar to asap, but subscribes for all field updates
 2.24: restructure, amd compatible, anonymous model declared in amd environment
 2.25: further amd integration, amdConfig could be passed as last parameter for bindUi call, modules used as array for require call
 2.26: fixed non-singleton scenario, jiant.getApps() returns currently loaded applications
 2.27: jiant.module means define, name ignored, modules usage in any way require amd, object modules declaration supported, loadApp() added
 2.27.1: restructure code
 2.28: modules could be set as arr of objects for folders structure: [{"shared": ["m0", "m1"]} is same as ["shared/m0", "shared/m1"]
 2.28.1: jiant.registerCustomType("tp", function(elem, view, app) - custom type handler extra parameters
 2.29: error in console if onUiBound(undefined) called, modules executed if function returned from define: function($, app, jiant)
 2.30: removed loadApp, requirejs usage; modules returned to pre-2.24, other functionality remains, module dependencies not supported yet
 2.31: module dependencies supported, jiant.module(name, deps, function($, app, moduleParams) {}), executed in given order, app.modulesTimeout sets timeout for script load
 2.32: jiant.preUiBound(app, cb) added for pre-configuration of application
 2.33: app(app), onApp(app, deps, cb), preApp(app, cb) shorter synonyms for UiBind, app accepts only parameter - app, other moved to application definition
 2.33.1: jiant.preApp("*", cb) executed for all applications to be loaded
 2.33.2: fixed notification about non-resolved depends, it appears in console after 5 seconds in dev mode
 2.33.3: module load intitiated by fix
 2.33.4: sub-dependency module double-path fix
 2.34: transitive module deps load
 2.35: jiant.check(bool, errMessage) - alerts error in debug mode, prints to error log always, devMode of bindUi ignored, should be set via jiant.DEV_MODE, default devMode false
 2.36: jiant.intro.isTemplate(obj) - to check is given object jiant template
 2.36.1: null implementation possible for logic function
 2.36.2: model object update event not fired fixed
 2.36.3: event bus proper .off
 2.37: view/tm.off unbinds from model notifications if propagated - both direct and reverse
 2.37.1: set from function check fix
 2.37.2: module present in modules and dependencies - proper execution order fixed
 2.38: state.replace new generated method, to replace state without keeping nav history
 2.39: element types defined as strings, to enable $.extend(app, baseApp)
 2.40: handler returned by model.field.on now contains .off method, hanlder.off() could be used
 2.41: internal models implementation rewritten to prototypes inheritance, refs removed, modelObj.fld.on replaced by modelObj.on("fld", spec.fld.on still usable
 2.41.1: debug print removed
 2.42: collection functions optimization, handlers to fields attached as obj.fldName_on, obj.fldName_asap, obj.fldName_onAndNow, obj.fldName_off
 2.42.1: suppliers on spec missing flag fixed
 2.42.2: ajax auto parse fix for new Model and Collection
 2.42.3: reverse propagate fix for new Model
 2.43: pick(marker, threshold) - only exceeding threshold values are printed, if threshold is passed, returning true if threshold is exceeded
 2.44: few fixes related to prototypes refactoring
 2.45: findBy / listBy indexing
 2.45.1: template cache added
 2.46: error log reporting on wrong field names for findBy, listBy
 2.46.1: fixed - remove call didn't removed indexes
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
    bindingsResult = true,
    errString,
    pickTime,
    lastStates = {},
    lastEncodedStates = {},
    loadedLogics = {},
    awaitingDepends = {},
    externalDeclarations = {},
    modules = {},
    eventBus = $({}),
    boundApps = {},
    bindingCurrently = {},
    pre = {},
    onInitAppActions = [],
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
    reverseRegex = /;;|;1|;2|;3|;4|;5|;6|;7/gi;
  $.each(replacementMap, function(key, val) {
    reverseMap[val] = key;
  });

  function randomIntBetween(from, to) {
    return Math.floor((Math.random()*(to - from + 1)) + from);
  }
  function toDate(val) {
    var num = Number(val);
    return ((num === 0 && val !== 0 && val !== "0") || isNaN(num)) ? null : new Date(num);
  }

  function formatMoney(amount, grpDelim) {
    grpDelim = grpDelim !== undefined ? grpDelim : ",";
    var num = parseInt(amount);
    if (isNaN(num)) {
      return "";
    } else if (num == 0) {
      return "0";
    }
    var ret = "" + Math.abs(num);
    for (var idx = ret.length; idx > 0; idx -= 3) {
      ret = ret.substring(0, idx) + (idx < ret.length ? grpDelim : "") + ret.substring(idx);
    }
    return (num < 0 ? "-" : "") + ret;
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
    $.each(elem.find("*"), function(idx, child) {
      $.each(child.attributes, function(i, attr) {
        if (attr.value.indexOf(" ") < 0 && attr.value.indexOf("!!") >= 0) {
          $(child).attr(attr.name, attr.value.replace(/!!/g, "e2013e03e11eee "));
        }
      });
    });
    return $.trim($(elem).html()).replace(/!!/g, "!! ").replace(/e2013e03e11eee /g, "!! ");
  }

  function nvl(val, defVal, path) {
    if (val === undefined || val === null) {
      return defVal;
    }
    if (path) {
      var v = $.isFunction(val[path]) ? val[path]() : val[path];
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
      $.each(mapping, function(key, val) {
        data[key] = data[val];
      });
    }
    var err = "";
    try {
      var func = tmId ? _tmplCache[tmId] : null;
      if (!func) {
        var str = $.trim($(that).html());
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
            .replace(/!! (.+?)!! /g, "', $.isFunction($1) ? $1() : $1,'")
            .split("!?").join("');")
            .split("?!").join("p.push('")
          + "');}return p.join('');";

        func = new Function("obj", strFunc);
        _tmplCache[tmId] = func;
      }
      return $.trim(func(data));
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
        error: function (jqXHR, textStatus, errorText) {jiant.handleErrorFn(jqXHR.responseText)}
      };
      if (appRoot.crossDomain) {
        data.contentType = "application/json";
        data.dataType = 'jsonp';
        data.xhrFields = {withCredentials: true};
        data.crossDomain = true;
      }
      $.each(listeners, function(i, l) {l.submittingForm && l.submittingForm(appRoot, key, name, data)});
      return $.ajax(data);
    };
  }

  function printp(method, args) {
    var s = args[0] + "";
    $.each(args, function(idx, arg) {
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
    $.each(args, function(idx, arg) {
      s += arg;
      s += " ";
    });
    method(s);
  }

  function print(method, args) {
    try {
      window.console && window.console[method] && $.each(args, function(idx, arg) {
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
    $.each(uiElem, function(i, elem) {
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
      $.each(roots, function(idx, root) {
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
      $.each(container.children(), function(idx, domElem) {
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

  function getStackTrace() {
    var obj = {stack: {}};
    Error.captureStackTrace && Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
  }

// ------------ views ----------------

  function _bindContent(appRoot, viewRoot, viewId, viewElem, prefix) {
    var typeSpec = {};
    viewRoot._jiantSpec = typeSpec;
    $.each(viewRoot, function (componentId, componentContent) {
      typeSpec[componentId] = componentContent;
      if (componentId in {appPrefix: 1, impl: 1, _jiantSpec: 1}) {
        //skip
      } else if (viewRoot[componentId] === jiant.lookup) {
        jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
        setupLookup(viewRoot, componentId, viewElem, prefix);
      } else if (viewRoot[componentId] === jiant.meta) {
        //skipping, app meta info
      } else if (viewRoot[componentId] === jiant.data) {
        setupDataFunction(viewRoot, componentId);
        viewRoot[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {viewRoot[componentId](val)}
      } else if (viewRoot[componentId] === jiant.cssMarker || viewRoot[componentId] === jiant.cssFlag) {
        setupCssFlagsMarkers(viewRoot, componentId);
      } else {
        var uiElem = uiFactory.viewComponent(viewElem, viewId, prefix, componentId, componentContent);
        ensureExists(prefix, appRoot.dirtyList, uiElem, prefix + viewId, prefix + componentId);
        viewRoot[componentId] = uiElem;
        setupExtras(appRoot, uiElem, componentContent, viewId, componentId, viewRoot);
        //        logInfo("    bound UI for: " + componentId);
      }
    });
  }

  function setupLookup(viewRoot, componentId, viewElem, prefix) {
    viewRoot[componentId] = function() {return viewElem.find("." + prefix + componentId);};
  }

  function setupDataFunction(viewRoot, componentId) {
    viewRoot[componentId] = function(val) {
      if (arguments.length == 0) {
        return viewRoot.attr("data-" + componentId);
      } else {
        return viewRoot.attr("data-" + componentId, val);
      }
    };
  }

  function setupCssFlagsMarkers(viewRoot, componentId) {
    var flag = viewRoot[componentId] === jiant.cssFlag,
      markerName = "j_prevMarkerClass_" + componentId;
    viewRoot[componentId] = {};
    viewRoot[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
      if (viewOrTemplate[markerName]) {
        $.each(viewOrTemplate[markerName], function(i, cls) {
          cls && viewOrTemplate.removeClass(cls);
        });
      }
      viewOrTemplate[markerName] = [];
      if (flag) {
        var _v = $.isArray(val) && val.length == 0 ? undefined : val;
        if (!!_v) {
          viewOrTemplate[markerName].push(componentId);
          viewOrTemplate.addClass(componentId);
        }
      } else {
        if (val !== undefined && val !== null) {
          if (!$.isArray(val) && val && $.isFunction(val.split)) {
            val = val.split(",");
          } else if (!$.isArray(val)) {
            val = [val];
          }
          $.each(val, function(i, v) {
            var cls = componentId + "_" + v;
            viewOrTemplate[markerName].push(cls);
            viewOrTemplate.addClass(cls);
          })
        }
      }
    };
  }

  function ensureSafeExtend(spec, jqObject) {
    $.each(spec, function(key, content) {
      if (jqObject[key]) {
        jiant.logError("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used, now overriding!");
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
      $.each(obj, function (k, v) {
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

  function maybeAddDevHook(uiElem, key, elem) {
    jiant.DEV_MODE && uiElem.click(function(event) {
      if (event.shiftKey && event.altKey) {
        var message = key + (elem ? ("." + elem) : "");
        if (event.ctrlKey) {
          message += "\r\n------------\r\n";
          message += pseudoserializeJSON($._data(uiElem[0], "events"));
        }
        jiant.logInfo(message);
        alert(message);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  }

  function ensureExists(appPrefix, dirtyList, obj, idName, className) {
    if (idName && dirtyList && ($.inArray(idName, dirtyList) >= 0
      || (appPrefix && $.inArray(idName.substring(appPrefix.length), dirtyList) >= 0))) {
      return true;
    }
    if (!obj || !obj.length) {
      window.console && window.console.error
      && (className ? jiant.logError("non existing object referred by class under object id '" + idName
        + "', check stack trace for details, expected obj class: " + className) :
        jiant.logError("non existing object referred by id, check stack trace for details, expected obj id: " + idName));
      if (className) {
        errString += "   ,    #" + idName + " ." + className;
      } else {
        errString += ", #" + idName;
      }
      bindingsResult = false;
      return false;
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

  function setupExtras(appRoot, uiElem, elemType, key, elemKey, viewOrTm) {
    if (elemType === jiant.tabs && uiElem.tabs) {
      uiElem.tabs();
      uiElem.refreshTabs = function() {uiElem.tabs("refresh");};
    } else if (elemType === jiant.ctlHide) {
      setupCtlHide(viewOrTm, uiElem);
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
    } else if ($.isArray(elemType)) {
      $.each(elemType, function(i, tp) {
        setupExtras(appRoot, uiElem, tp, key, elemKey, viewOrTm);
      });
    }
    maybeAddDevHook(uiElem, key, elemKey);
  }

  function isServiceName(key) {
    var words = ["parseTemplate", "parseTemplate2Text", "propagate", "customRenderer"];
    return $.inArray(key, words) >= 0;
  }

  function assignPropagationFunction(viewId, spec, viewOrTm) {
    var map = {};
    $.each(spec, function (key, elem) {
      map[key] = elem;
    });
    var fn = function(data, subscribe4updates, reverseBinding, mapping) {
      subscribe4updates = (subscribe4updates === undefined) ? true : subscribe4updates;
      $.each(map, function (key, elem) {
        var fnKey = "_j" + key,
          actualKey = (mapping && mapping[key]) ? mapping[key] : key,
          val = data[actualKey],
          oldData,
          handler,
          elemType = viewOrTm._jiantSpec[key];
        if (spec[key].customRenderer || (data && val !== undefined && val !== null && !isServiceName(key))) {
          elem = viewOrTm[key];
          var actualVal = $.isFunction(val) ? val.apply(data) : val;
          getRenderer(spec[key], elemType)(data, elem, actualVal, false, viewOrTm);
          if (subscribe4updates && $.isFunction(data.on)&& (spec[key].customRenderer || $.isFunction(val))) { // 3rd ?
            if (fn[fnKey]) {
              oldData = fn[fnKey][0];
              oldData && oldData.off(fn[fnKey][1]);
              fn[fnKey][2] && elem.off && elem.off("change", fn[fnKey][2]);
            }
            if (!$.isFunction(val)) { // ?
              actualKey = null;
            }
            handler = data.on(actualKey, function(obj, newVal) {
              getRenderer(spec[key], elemType)(data, elem, newVal, true, viewOrTm)
            });
            fn[fnKey] = [data, handler];
          }
          if (reverseBinding) {
            var backHandler = function(event) {
              var tagName = elem[0].tagName.toLowerCase(),
                tp = elem.attr("type"),
                etype = viewOrTm._jiantSpec[key];
              function elem2arr(elem) {
                var arr = [];
                $.each(elem, function (idx, item) {!!$(item).prop("checked") && arr.push($(item).val());});
                return arr;
              }
              if (val && $.isFunction(val)) {
                if (etype === jiant.inputSet) {
                  val.call(data, elem2arr(elem));
                } else if (etype === jiant.inputSetAsString) {
                  val.call(data, elem2arr(elem).join(","));
                } else {
                  if (tagName == "input" && tp == "checkbox") {
                    val.call(data, !!elem.prop("checked"));
                  } else if (tagName == "input" && tp == "radio") {
                    val.call(data, elem2arr(elem).join(","));
                  } else if (tagName in {"input": 1,  "select": 1, "textarea": 1}) {
                    val.call(data, elem.val());
                  } else if (tagName == "img") {
                    val.call(data, elem.attr("src"));
                    // no html reverse binding because no actual event for changing html
                    //} else {
                    //  val(elem.html());
                  }
                }
              }
            };
            elem.change && elem.change(backHandler);
            fn[fnKey] && fn[fnKey].push(backHandler);
          }
        }
      });
      if (spec.customRenderer && $.isFunction(spec.customRenderer)) {
        spec.customRenderer(data, viewOrTm);
      }
    };
    viewOrTm.propagate = fn;
    viewOrTm.unpropagate = function() {
      $.each(map, function (key, elem) {
        var fnKey = "_j" + key;
        if (fn[fnKey]) {
          var off = fn[fnKey][0];
          off && off(fn[fnKey][1]);
          fn[fnKey][2] && elem.off && elem.off("change", fn[fnKey][2]);
        }
      });
    }
  }

  function getRenderer(obj, elemType) {
    if (obj && obj.customRenderer && $.isFunction(obj.customRenderer)) {
      return obj.customRenderer;
    } else if (elemType === jiant.inputSet) {
      return updateInputSet;
    } else if (elemType === jiant.imgBg) {
      return updateImgBg;
    } else if (elemType === jiant.inputSetAsString) {
      return function(obj, elem, val, isUpdate, viewOrTemplate) {
        updateInputSet(obj, elem, !val ? [val] : $.isArray(val) ? val : $.isNumeric(val) ? [val] : ("" + val).split(","), isUpdate, viewOrTemplate);
      };
    } else {
      return updateViewElement;
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
    $.each(elem, function(idx, item) {
      item = $(item);
      var check = item.val() === val;
      if (!check && $.isArray(val)) {
        $.each(val, function(i, subval) {
          if (subval + "" == item.val() + "") {
            check = true;
            return false;
          }
        });
      }
      item.prop("checked", check);
    });
  }

  function updateViewElement(obj, elem, val, isUpdate, viewOrTemplate) {
    if (! elem || ! elem[0]) {
      return;
    }
    var tagName = elem[0].tagName.toLowerCase();
    if (tagName in {"input": 1, "textarea": 1, "select": 1}) {
      var el = $(elem[0]),
        tp = el.attr("type");
      if (tp == "checkbox") {
        elem.prop("checked", !!val);
      } else if (tp == "radio") {
        $.each(elem, function(idx, subelem) {
          $(subelem).prop("checked", subelem.value == val);
        });
      } else {
        (val == undefined || val == null) ? elem.val(val) : elem.val(val + "");
      }
    } else if (tagName == "img") {
      elem.attr("src", val);
    } else {
      elem.html(val);
    }
  }

  function _bindViews(appRoot, root, appUiFactory) {
    $.each(root, function(viewId, viewContent) {
      var prefix = ("appPrefix" in viewContent) ? viewContent.appPrefix : appRoot.appPrefix,
        view = appUiFactory.view(prefix, viewId, viewContent);
      bindView(appRoot, viewId, viewContent, view);
    });
  }

  function bindView(appRoot, viewId, viewContent, view) {
    var prefix = ("appPrefix" in viewContent) ? viewContent.appPrefix : appRoot.appPrefix ? appRoot.appPrefix : "",
      viewOk = ensureExists(prefix, appRoot.dirtyList, view, prefix + viewId);
    viewOk && _bindContent(appRoot, viewContent, viewId, view, prefix);
    ensureSafeExtend(viewContent, view);
    assignPropagationFunction(viewId, viewContent, viewContent);
    $.extend(viewContent, view);
    maybeAddDevHook(view, viewId, undefined);
    $.each(listeners, function(i, l) {l.boundView && l.boundView(appRoot, appRoot.views, viewId, prefix, viewContent)});
  }

// ------------ templates ----------------

  function parseTemplate2Text(tm, data) {
    return parseTemplate(tm, data);
  }

  function _bindTemplates(appRoot, root, appUiFactory) {
    $.each(root, function(tmId, tmContent) {
      var prefix = ("appPrefix" in tmContent) ? tmContent.appPrefix : appRoot.appPrefix,
        tm = appUiFactory.template(prefix, tmId, tmContent);
      root[tmId]._jiantSpec = {};
      root[tmId]._jiantType = jTypeTemplate;
      $.each(tmContent, function (componentId, elemType) {
        if (!(componentId in {appPrefix: 1, impl: 1, _jiantSpec: 1, _jiantType: 1})) {
          root[tmId]._jiantSpec[componentId] = elemType;
          if (elemType === jiant.lookup) {
            jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
          } else if (elemType === jiant.meta) {
            //skipping, app meta info
          } else if (elemType === jiant.data) {
            tmContent[componentId] = {jiant_data: 1};
            tmContent[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
              viewOrTemplate[componentId](val);
            };
          } else if (elemType === jiant.cssMarker || elemType === jiant.cssFlag) {
            setupCssFlagsMarkers(tmContent, componentId);
          } else {
            var comp = appUiFactory.viewComponent(tm, tmId, prefix, componentId, elemType);
            ensureExists(prefix, appRoot.dirtyList, comp, prefix + tmId, prefix + componentId);
            tmContent[componentId] = {};
          }
        }
      });
      ensureExists(prefix, appRoot.dirtyList, tm, prefix + tmId);
      root[tmId].parseTemplate = function(data, subscribeForUpdates, reverseBind, mapping) {
        var retVal = $("<!-- -->" + parseTemplate(tm, data, tmId, mapping)); // add comment to force jQuery to read it as HTML fragment
        retVal._jiantSpec = root[tmId]._jiantSpec;
        $.each(tmContent, function (elem, elemType) {
          if (elemType === jiant.lookup) {
            jiant.logInfo("    loookup element, no checks/bindings: " + elem);
            setupLookup(retVal, elem, retVal, prefix);
          } else if (elemType === jiant.meta) {
          } else if (elemType.jiant_data) {
            setupDataFunction(retVal, elem);
          } else if (! (elem in {"parseTemplate": 1, "parseTemplate2Text": 1, "appPrefix": 1, "impl": 1, "_jiantSpec": 1})) {
            retVal[elem] = $.merge(retVal.filter("." + prefix + elem), retVal.find("." + prefix + elem));
            setupExtras(appRoot, retVal[elem], root[tmId]._jiantSpec[elem], tmId, elem, retVal);
            maybeAddDevHook(retVal[elem], tmId, elem);
          }
        });
        retVal.splice(0, 1); // remove first comment
        assignPropagationFunction(tmId, tmContent, retVal);
        data && retVal.propagate(data, !!subscribeForUpdates, !!reverseBind, mapping);
        $.each(listeners, function(i, l) {l.parsedTemplate && l.parsedTemplate(appRoot, root, tmId, root[tmId], data, retVal)});
        return retVal;
      };
      root[tmId].parseTemplate2Text = function(data) {
        return parseTemplate(tm, data);
      };
      $.each(listeners, function(i, l) {l.boundTemplate && l.boundTemplate(appRoot, root, tmId, prefix, root[tmId])});
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
          $.each(data, function(idx, obj) {that.push(obj)});
        }
      },
      specBus = $({}),
      singleton = new Model(),
      objFunctions = ["on", "off", "update", "reset", "remove", "asMap"],
      repoFunctions = ["updateAll", "add", "all", "remove"];
    if (jiant.DEV_MODE && !spec[repoName]) {
      jiant.infop("App !!, model !! uses deprecated model repository format, switch to new, with model.jRepo = {} section", appId, modelName);
    }
    spec[defaultsName] = spec[defaultsName] || {};
    $.each(repoFunctions, function(i, fn) {
      repoRoot[fn] = repoRoot[fn] || function(obj) {};
    });
    $.each(objFunctions, function(i, fn) {
      spec[fn] = spec[fn] || function(obj) {};
    });
    if (spec.id) {
      repoRoot.findById = repoRoot.findById || function(val) {};
    }
    $.each(repoRoot, function(fname, funcSpec) {
      if (isFindByFunction(fname)) {
        var listBy = "listBy" + fname.substring(6);
        if (! repoRoot[listBy]) {
          repoRoot[listBy] = funcSpec;
        }
      }
    });
    if (repoMode) {
      $.each(repoRoot, function(fname, funcSpec) {
        bindFn(repoRoot, fname, funcSpec);
      });
    }
    $.each(spec, function(fname, funcSpec) {
      bindFn(spec, fname, funcSpec);
    });
    spec.asap = proxy("asap");
    spec.onAndNow = proxy("onAndNow");
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
        arr = $.isArray(arr) ? arr : [arr];
        if (arr.length != 0) {
          $.each(arr, function(idx, item) {
            var newItem = $.extend({}, spec[defaultsName], item),
              newObj = new Model();
            storage.push(newObj);
            newArr.push(newObj);
            $.each(newItem, function(name, val) {
              if (isModelAccessor(newObj[name])) {
                val = isModelAccessor(val) ? val.apply(item) : val;
                newObj[modelStorage][name] = val;
              }
            });
            addIndexes(newObj);
            $.each(newItem, function(name, val) {
              if (isModelAccessor(newObj[name])) {
                newObj[name](newObj[name](), true, false, undefined);
              }
            });
          });
          trigger(specBus, "add", [newArr], [newArr]);
          if (specBus[evt("update")] || specBus[evt()]) {
            $.each(newArr, function(idx, item) {
              trigger(specBus, "update", [item], [item, "update"]);
            });
          }
          $.each(newArr, function(idx, item) {
            item.on(function(model, action) {
              if (action == "remove") {
                removeIndexes(item);
              } else {
                updateIndexes(item);
              }
            }); // any change, due to findBy synthetic fields
          });
        }
      }
      return newArr;
    };
    repoRoot.add[objectBus] = specBus;
    assignOnOffHandlers(repoRoot.add, "add");

    // ----------------------------------------------- indexes -----------------------------------------------

    function indexPresent(arr) {
      var present = false;
      $.each(indexesSpec, function(i, index) {
        if (index.length == arr.length) {
          var matching = true;
          $.each(index, function(j, elem) {
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
      $.each(indexesSpec, function(i, index) {
        var node = indexes;
        $.each(index, function(j, name) {
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
      $.each(obj[reverseIndexes], function(i, arr) {
        arr.splice($.inArray(obj, arr), 1);
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

    // ----------------------------------------------- updateAll -----------------------------------------------
    repoRoot.updateAll = function(arr, removeMissing, matcherCb) {
      arr = $.isArray(arr) ? arr : [arr];
      matcherCb = matcherCb ? matcherCb : function(modelObj, outerObj) {return modelObj.id ? modelObj.id() == outerObj.id : false;};
      var toRemove = [];
      var toAdd = [];
      $.each(arr, function(idx, item) {toAdd.push(item);});
      $.each(storage, function(idx, oldItem) {
        var matchingObj;
        $.each(arr, function(idx, newItem) {
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
      removeMissing && $.each(toRemove, function(idx, item) {
        repoRoot.remove(item);
      });
      toAdd.length > 0 && repoRoot.add(toAdd);
    };

    $.each(spec[defaultsName], function(key, val) {
      val = $.isFunction(val) ? val(spec) : val;
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

    function isFindByFunction(fname) {
      return fname.indexOf("findBy") == 0 && fname.length > 6 && isUpperCaseChar(fname, 6);
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
      obj.onAndNow = function(field, cb) {
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
            var args = $.makeArray(arguments);
            args.splice(0, 1);
            cb && cb.apply(that, args);
          })
        }
      };
    }

    function assignOnOffHandlers(obj, overrideField) {
      obj.on = function(field, cb) {
        if ($.isFunction(field)) {
          cb = field;
          field = overrideField;
        }
        var bus = this[objectBus],
          eventName = evt(field);
        var handler = function(evt) {
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          var res = cb && cb.apply(cb, args);
          if (res === false) {
            evt.stopImmediatePropagation();
          }
        };
        bus[eventName] = (bus[eventName] || 0) + 1;
        bus.on(eventName, handler);
        handler.off = function() {
          obj.off(handler);
        };
        handler.eventName = eventName;
        return handler;
      };
      obj.off = function(handler) {
        var bus = this[objectBus];
        bus[handler.eventName]--;
        return bus.off(handler.eventName, handler);
      };
    }

    function bindFn(fnRoot, fname, funcSpec) {
      var objMode = repoMode && fnRoot !== spec[repoName];
      if (fname == defaultsName && $.isPlainObject(funcSpec)) {
      } else if (fname == repoName && $.isPlainObject(funcSpec)) {
      } else if (fname == "all" && !objMode) {
      } else if (fname == "off") {
        collectionFunctions.push(fname);
      } else if (fname == "onAndNow") {
        collectionFunctions.push(fname);
      } else if (fname == "asap") {
        collectionFunctions.push(fname);
      } else if (fname == "on") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        assignOnOffHandlers(Model.prototype);
        assignExtraHandlers(Model.prototype);
        assignOnOffHandlers(spec);
      } else if (fname == "update") {
        collectionFunctions.push(fname);
        spec[fname] = proxy(fname);
        Model.prototype[fname] = function(objFrom, treatMissingAsNulls) {
          var smthChanged = false,
            toTrigger = {},
            that = this;
          treatMissingAsNulls && $.each(this[modelStorage], function(key, val) {
            (key in objFrom) || (objFrom[key] = null);
          });
          $.each(objFrom, function(key, val) {
            if (isModelAccessor(that[key])) {
              val = $.isFunction(val) ? val() : val;
              var oldVal = that[key]();
              if (oldVal !== val) {
                toTrigger[key] = oldVal;
                that[key](val, false);
                smthChanged = true;
              }
            }
          });
          $.each(toTrigger, function(key, oldVal) {
            that[key](that[key](), true, false, oldVal);
          });
          if (smthChanged) {
            trigger(this[objectBus], fname, [this], [this, fname]);
            trigger(specBus, fname, [this], [this, fname]);
          }
        };
      } else if (fname == "updateAll" && !objMode) {
      } else if (fname == "addAll") {
        alert("JIANT: Model function 'addAll' removed since 1.37, use previous versions or replace it by 'add'");
      } else if (fname == "add" && !objMode) {
      } else if (fname == "remove") {
      } else if (fname.indexOf("sum") == 0 && fname.length > 3 && isUpperCaseChar(fname, 3) && !objMode) {
        var arr = fname.substring(3).split("And");
        repoRoot[fname] = function() {
          function subsum(all, fieldName) {
            var ret;
            $.each(all, function(i, item) {
              if (item[fieldName] && $.isFunction(item[fieldName])) {
                var val = item[fieldName]();
                ret = ret === undefined ? val : val === undefined ? undefined : (ret + val);
              }
            });
            return ret;
          }
          var ret;
          $.each(arr, function(idx, name) {
            var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
            var perField = subsum(storage, fieldName);
            ret = ret === undefined ? perField : perField === undefined ? undefined : (ret + perField);
          });
          return ret;
        }
      } else if (isFindByFunction(fname) && !objMode) {
        repoRoot[fname] = function() {
          return repoRoot["listBy" + fname.substring(6)].apply(repoRoot, arguments)[0];
        }
      } else if (fname.indexOf("listBy") == 0 && fname.length > 6 && isUpperCaseChar(fname, 6) && !objMode) {
        var arr = fname.substring(6).split("And");
        $.each(arr, function(idx, name) {
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
          $.each(arr, function(i, name) {
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
          $.each(arr, function(idx, name) {
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
          $.each(this, function(name, fn) {
            isModelAccessor(fn) && fn(val, true);
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
            $.each(obj, function(key, val) {
              val2map(ret, val, key);
            });
            return ret;
          }
          $.each(that, function(key) {
            var actualKey = (mapping && mapping[key]) ? mapping[key] : key,
              fn = that[actualKey];
            if (isModelAccessor(fn) || isModelSupplier(fn)) {
              var val = fn.apply(that);
              val2map(ret, val, actualKey, mapping);
            }
          });
          return ret;
        }
      } else if (isEmptyFunction(funcSpec) && ! isEventHandlerName(fname)) {
        var trans = funcSpec === jiant.transientFn;
        collectionFunctions.push(fname);
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
        spec[fname].off = function(cb) {return spec.off(cb)};
        spec[fname].asap = function(cb) {return singleton.asap(fname, cb)};
        spec[fname].onAndNow = function(cb) {return singleton.onAndNow(fname, cb)};
        spec[fname + "_on"] = function(cb) {return spec.on(fname, cb)};
        spec[fname + "_off"] = function(cb) {return spec.off(cb)};
        spec[fname + "_asap"] = function(cb) {return singleton.asap(fname, cb)};
        spec[fname + "_onAndNow"] = function(cb) {return singleton.onAndNow(fname, cb)};
        Model.prototype[fname + "_on"] = function(cb) {return this.on(fname, cb)};
        Model.prototype[fname + "_off"] = function(cb) {return this.off(fname, cb)};
        Model.prototype[fname + "_asap"] = function(cb) {return this.asap(fname, cb)};
        Model.prototype[fname + "_onAndNow"] = function(cb) {return this.onAndNow(fname, cb)};
        spec[fname].jiant_accessor = 1;
        spec[fname].transient_fn = trans;
        //if (! objMode) {
        //  assignOnOffHandlers()
        //}
        //assignOnOffHandlers(); // spec[fname], specBus, fname
      } else if (isEventHandlerName(fname)) {
      } else if (fname != modelStorage && fname != objectBus && $.isFunction(funcSpec)) {
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
    return endsWith(fname, "_on") || endsWith(fname, "_off") || endsWith(fname, "_asap") || endsWith(fname, "_onAndNow");
  }

  function attachCollectionFunctions(arr, collectionFunctions) {
    $.each(collectionFunctions, function(idx, fn) {
      arr[fn] = function() {
        var ret = [],
          args = arguments;
        $.each(this, function(idx, obj) {
          ret.push(obj[fn].apply(obj, args));
        });
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
    return fn && fn.jiant_accessor && $.isFunction(fn);
  }

  function isModelSupplier(fn) {
    return fn && fn.jiant_supplier && $.isFunction(fn);
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
    $.each(models, function(name, spec) {
      bindModel(name, spec, appId);
      $.each(listeners, function(i, l) {l.boundModel && l.boundModel(appRoot, models, name, models[name])});
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
      $.each(newImpl, function(fname, fbody) {
        spec[fname] = fbody;
      });
    } else {
      spec._jOverrides = spec._jOverrides || [];
      spec._jOverrides.push(implFn);
    }
  }

  function _bindLogic(appRoot, logics, appId) {
    $.each(logics, function(name, spec) {
      if ($.isFunction(spec)) {
        if (isEmptyFunction(spec)) {
          jiant.logError("don't declare empty logic functions, use objects for namespace grouping");
        }
      } else {
        $.each(spec, function(fname, fnbody) {
          if ($.isFunction(fnbody)) {
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
          $.each(spec, function(fname, fnbody) {
            if ($.isFunction(fnbody) && !(fname in {"implement": 1, "_jAppId": 1, "_jOverrides": 1})) {
              if (! fname in obj) {
                jiant.logError("Logic function " + fname + " is not implemented by declared implementation");
              } else {
                spec[fname] = obj[fname];
              }
            }
          });
          spec._jOverrides && spec._jOverrides.length && $.each(spec._jOverrides, function(i, implFn) {
            var superImpl = $.extend(true, {}, spec),
              newImpl = implFn($, boundApps[spec._jAppId], superImpl);
            $.each(newImpl, function(fname, fbody) {
              spec[fname] = fbody;
            });
          });
          (! loadedLogics[appId]) && (loadedLogics[appId] = {});
          loadedLogics[appId][name] = 1;
          awakeAwaitingDepends(appId, name);
          logUnboundCount(appId, name);
        };
        if (name == "intl") {
          loadIntl(spec);
        }
      }
      $.each(listeners, function(i, l) {l.boundLogic && l.boundLogic(appRoot, logics, name, spec)});
    });
  }

  function logUnboundCount(appId, name) {
    var len = 0;
    awaitingDepends[appId] && $.each(awaitingDepends[appId], function() {len++});
    $.each(listeners, function(i, l) {l.logicImplemented && l.logicImplemented(appId, name, len)});
  }

  function loadLibs(arr, cb, devMode) {
    var pseudoDeps = [];
    if (!$.isArray(arr)) {
      arr = [arr];
    }
    $.each(arr, function(idx, url) {
      var pseudoName = "ext" + new Date().getTime() + Math.random();
      pseudoDeps.push(pseudoName);
      declare(pseudoName, url);
    });
    var pseudoAppName = "app" + new Date().getTime() + Math.random();
    onUiBound(pseudoAppName, pseudoDeps, cb);
    bindUi({id: pseudoAppName}, devMode);
  }

  function declare(name, objOrUrlorFn) {
    var lib = typeof objOrUrlorFn === "string";
    function handle() {
      lib && jiant.info("Loaded external library " + objOrUrlorFn);
      externalDeclarations[name] = lib ? {} : objOrUrlorFn;
      $.each(awaitingDepends, function(appId, depList) {
        copyLogic(appId, name);
      });
      $.each(awaitingDepends, function(appId, depList) {
        checkForExternalAwaiters(appId, name);
      });
    }
    lib && jiant.info("Start loading external library " + objOrUrlorFn);
    lib ? $.ajax({
      url: objOrUrlorFn,
      cache: true,
      crossDomain: true,
      dataType: "script",
      success: handle
    }) : handle();
  }

  function copyLogic(appId, name) {
    var obj = externalDeclarations[name];
    if (obj && awaitingDepends[appId] && awaitingDepends[appId][name] && boundApps[appId]) {
      boundApps[appId].logic || (boundApps[appId].logic = {});
      boundApps[appId].logic[name] || (boundApps[appId].logic[name] = {});
      $.each($.isFunction(obj) ? obj($, boundApps[appId]) : obj, function(fname, fspec) {
        boundApps[appId].logic[name][fname] = fspec;
      });
    }
  }

  function checkForExternalAwaiters(appId, name) {
    if (externalDeclarations[name] && awaitingDepends[appId][name] && boundApps[appId]) {
      awakeAwaitingDepends(appId, name);
      loadedLogics[appId][name] = 1;
      logUnboundCount(appId, name);
    }
  }

  function awakeAwaitingDepends(appId, name) {
    if (! awaitingDepends[appId] || ! awaitingDepends[appId][name]) {
      return;
    }
    var awaiters = awaitingDepends[appId][name];
    delete awaitingDepends[appId][name];
    awaiters && $.each(awaiters, function(idx, cb) {
      eventBus.trigger(dependencyResolvedEventName(appId, name));
//            handleBound(appId, cb);
    });
  }

// ------------ semaphores staff ----------------

  function _bindSemaphores(appRoot, semaphores, appId) {
    $.each(semaphores, function(name, spec) {
      semaphores[name].release = function() {
        if (semaphores[name].released) {
          logError("re-releasing semaphore already released, ignoring: " + appId + ".semaphores." + name);
          return;
        }
        semaphores[name].released = true;
        semaphores[name].releasedArgs = arguments;
        eventBus.trigger(appId + "." + name + ".semaphore", arguments);
      };
      semaphores[name].on = function(cb) {
        if (semaphores[name].released) {
          cb && cb.apply(cb, semaphores[name].releasedArgs);
        } else {
          eventBus.on(appId + "." + name + ".semaphore", function() {
            var args = $.makeArray(arguments);
            args.splice(0, 1);
            cb && cb.apply(cb, args);
          });
        }
      };
    });
  }

// ------------ events staff ----------------

  function _bindEvents(appRoot, events, appId) {
    $.each(events, function(name, spec) {
      events[name].listenersCount = 0;
      events[name].fire = function() {
        eventBus.trigger(appId + name + ".event", arguments);
      };
      events[name].on = function (cb) {
        events[name].listenersCount++;
        var handler = function () {
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        };
        eventBus.on(appId + name + ".event", handler);
        return handler;
      };
      events[name].off = function (handler) {
        events[name].listenersCount--;
        return eventBus.off(appId + name + ".event", handler);
      };

      $.each(listeners, function(i, l) {l.boundEvent && l.boundEvent(appRoot, events, name, events[name])});
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
    $.each(states, function(name, stateSpec) {
      stateSpec.go = go(name, stateSpec.root, stateSpec, stateExternalBase, appId, true);
      stateSpec.replace = go(name, stateSpec.root, stateSpec, stateExternalBase, appId, false);
      stateSpec.start = function(cb) {
        var trace;
        $.each(listeners, function(i, l) {l.stateStartRegisterHandler && l.stateStartRegisterHandler(appRoot, name, stateSpec)});
        statesUsed[appId + name] && $.each(listeners, function(i, l) {l.stateError && l.stateError(appRoot, name, stateSpec, "State start handler registered after state triggered")});
        trace = getStackTrace();
        eventBus.on(appId + "state_" + name + "_start", function() {
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          $.each(listeners, function(i, l) {l.stateStartCallHandler && l.stateStartCallHandler(appRoot, name, stateSpec, trace, args)});
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
        $.each(listeners, function(i, l) {l.stateEndRegisterHandler && l.stateEndRegisterHandler(appRoot, name, stateSpec)});
        statesUsed[appId + name] && $.each(listeners, function(i, l) {l.stateError && l.stateError(appRoot, name, stateSpec, "State end handler registered after state triggered")});
        trace = getStackTrace();
        eventBus.on(appId + "state_" + name + "_end", function() {
          $.each(listeners, function(i, l) {l.stateEndCallHandler && l.stateEndCallHandler(appRoot, name, stateSpec, trace)});
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
      $.each(listeners, function(i, l) {l.boundState && l.boundState(appRoot, states, name, stateSpec)});
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
      $.each(params, function (idx, p) {
        if (p == "undefined") {
          params[idx] = undefined;
        }
      });
      if (lastStates[appId] != undefined && lastStates[appId] != stateId) {
        $.each(listeners, function(i, l) {l.stateEndTrigger && l.stateEndTrigger(appRoot, lastStates[appId])});
        eventBus.trigger(appId + "state_" + lastStates[appId] + "_end");
      }
      lastStates[appId] = stateId;
      lastEncodedStates[appId] = getAppState(appId);
      stateId = (stateId ? stateId : "");
      $.each(listeners, function(i, l) {l.stateStartTrigger && l.stateStartTrigger(appRoot, stateId, params)});
      !statesUsed[appId + stateId] && (statesUsed[appId + stateId] = 1);
      //            jiant.logInfo(lastEncodedStates[appId] + " params are ", params);
      eventBus.trigger(appId + "state_" + stateId + "_start", params);
    }
  }

  function go(stateId, root, stateSpec, stateExternalBase, appId, assignMode) {
    var defaults = stateSpec.jDefaults,
      params = stateSpec.go ? getParamNames(stateSpec.go) : [];
    return function() {
      var parsed = parseState(appId),
        prevState = parsed.now;
      parsed.now = [stateId];
      $.each(arguments, function(idx, arg) {
        if (arg != undefined) {
          parsed.now.push(pack(arg));
        } else if (idx < params.length && defaults && (params[idx] in defaults)) {
          parsed.now.push(defaults[params[idx]]);
        } else if ((prevState[0] == stateId || isSameStatesGroup(appId, prevState[0], stateId)) && prevState[idx + 1] != undefined) {
//              info("reusing prev state param: " + prevState[idx + 1]);
          parsed.now.push(pack(prevState[idx + 1]));
        } else {
          parsed.now.push(pack(arg));
        }
      });
      if (defaults) {
        for (var i = arguments.length; i < params.length; i++) {
          if ((params[i] in defaults)) {
            parsed.now.push(defaults[params[i]]);
          } else {
            parsed.now.push(undefined);
          }
        }
      }
      if (prevState && (prevState[0] == stateId || isSameStatesGroup(appId, prevState[0], stateId))) {
        var argLen = arguments.length + 1;
        while (argLen < prevState.length) {
//              info("pushing prev state param: " + prevState[argLen]);
          if (argLen < parsed.now.length) {
            if (parsed.now[argLen] == undefined) {
              parsed.now[argLen] = pack(prevState[argLen]);
            }
          } else {
            parsed.now.push(pack(prevState[argLen]));
          }
          argLen++;
        }
      }
      if (root) {
        parsed.root = [];
        $.each(parsed.now, function(idx, param) {
          parsed.root.push(param);
        });
      } else {
        $.each(parsed.root, function(idx, param) {
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

  function goRoot(appId) {
    function _go(appId) {
      var parsed = parseState(appId);
      parsed.now = [];
      $.each(parsed.root, function(idx, param) {
        parsed.now.push(pack(param));
        parsed.root[idx] = pack(param);
      });
      setState(parsed, undefined, appId, true); // external base not used
    }
    appId && _go(appId);
    !appId && $.each(getStates(), function(appId, state) {
      _go(appId);
    });
  }

  function setState(parsed, stateExternalBase, appId, assignMode) {
    var states = getStates(),
      result = "";
    var s = parsed.now + "|" + parsed.root;
    $.each(states, function(stateAppId, state) {
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
    $.each(data, function(idx, elem) {
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
      $.each(getStates(), function(key, val) {
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
    $.each(arr, function(idx, item) {
      var args = item.split(",");
      $.each(args, function(idxInner, arg) {
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
      $.each(s, function(key, val) {
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
    s = s ? s.replace(reverseRegex, function(matched) {return reverseMap[matched];}) : "";
    if (s && s[0] == "{") {
      var retVal = {};
      var arr = s.substring(1, s.length).split("}");
      $.each(arr, function(idx, item) {
        var sub = item.split(":");
        (sub.length == 2) && (retVal[unpack(sub[0])] = unpack(sub[1]));
      });
      return retVal;
    } else {
      return s === "undefined" ? undefined
        : (parseInt(s) + "" == s) ? parseInt(s)
        : s;
    }
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
    return funcStr.slice(funcStr.indexOf('(') + 1, funcStr.indexOf(')')).match(/([^\s,]+)/g);
  }

  function getDeclaredName(obj) {
    return !!obj ? obj._jiantSpecName : undefined;
  }

  function _bindAjax(appRoot, root, ajaxPrefix, ajaxSuffix, crossDomain) {
    $.each(root, function(uri, funcSpec) {
      var params = getParamNames(funcSpec);
      params && params.length > 0 ? params.splice(params.length - 1, 1) : params = [];
      root[uri] = makeAjaxPerformer(appRoot, ajaxPrefix, ajaxSuffix, uri, params, $.isFunction(root[uri]) ? root[uri]() : undefined, crossDomain);
      root[uri]._jiantSpec = funcSpec;
      root[uri]._jiantSpecName = uri;
      $.each(listeners, function(i, l) {l.boundAjax && l.boundAjax(appRoot, root, uri, root[uri])});
    });
  }

  function parseForAjaxCall(root, path, actual, traverse) {
    if ($.isArray(actual) || (actual && actual.jCollection)) {
      var compound = false;
      $.each(actual, function(i, obj) {
        compound = compound || $.isPlainObject(obj) || obj.jModelName;
        return !compound;
      });
      $.each(actual, function(i, obj) {
        parseForAjaxCall(root, path + (compound ? ("[" + i + "]") : ""), obj, true);
      });
    } else if ($.isPlainObject(actual) || (actual && actual.jModelName)) {
      $.each(actual, function(key, value) {
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

  function makeAjaxPerformer(appRoot, ajaxPrefix, ajaxSuffix, uri, params, hardUrl, crossDomain) {
    return function() {
      var callData = {},
        callback,
        errHandler,
        outerArgs = arguments;
      if ($.isFunction(outerArgs[outerArgs.length - 2])) {
        callback = outerArgs[outerArgs.length - 2];
        errHandler = outerArgs[outerArgs.length - 1];
      } else if ($.isFunction(outerArgs[outerArgs.length - 1])) {
        callback = outerArgs[outerArgs.length - 1];
      }
      $.each(params, function(idx, param) {
        if (idx < outerArgs.length && !$.isFunction(outerArgs[idx]) && outerArgs[idx] != undefined && outerArgs[idx] != null) {
          var actual = outerArgs[idx];
          parseForAjaxCall(callData, param, actual);
        }
      });
      if (! callData["antiCache3721"]) {
        callData["antiCache3721"] = new Date().getTime();
      }
      var pfx = (ajaxPrefix || ajaxPrefix == "") ? ajaxPrefix : jiant.AJAX_PREFIX,
        sfx = (ajaxSuffix || ajaxSuffix == "") ? ajaxSuffix : jiant.AJAX_SUFFIX,
        url = hardUrl ? hardUrl : (pfx + uri + sfx),
        time = new Date().getTime();
      $.each(listeners, function(i, l) {l.ajaxCallStarted && l.ajaxCallStarted(appRoot, uri, url, callData)});
      var settings = {data: callData, traditional: true, success: function(data) {
        $.each(listeners, function(i, l) {l.ajaxCallCompleted && l.ajaxCallCompleted(appRoot, uri, url, callData, new Date().getTime() - time)});
        if (callback) {
          try {
            data = $.parseJSON(data);
          } catch (ex) {
          }
          $.each(listeners, function(i, l) {l.ajaxCallResults && l.ajaxCallResults(appRoot, uri, url, callData, data)});
          callback(data);
        }
      }, error: function (jqXHR, textStatus, errorText) {
        if (0 === jqXHR.status && ('abort' === jqXHR.statusText || 'error' === jqXHR.statusText)) {
          return;
        }
        if (errHandler) {
          errHandler(jqXHR.responseText);
        } else {
          jiant.handleErrorFn(jqXHR.responseText);
        }
        $.each(listeners, function(i, l) {l.ajaxCallError && l.ajaxCallError(appRoot, uri, url, callData, new Date().getTime() - time, jqXHR.responseText, jqXHR)});
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
    if ($.isArray(val)) {
      var arr = [];
      $.each(val, function(i, key) {
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
        prev.call(uiElem, formatMoney(num));
      }
    };
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
          onUiBound(appRoot, ["intl"], function() {prev.call(elem, translate(appRoot, val))});
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
        jiant.logError("Both logic.intl and app.intl declared, skipping app.intl");
      } else {
        root.logic.intl = intl;
      }
    }
  }

  function loadIntl(intlRoot) {
    if (! intlRoot.url) {
      //error("Intl data url not provided, internationalization will not be loaded");
      return;
    }
    intlRoot.t = function(val) {};
    intlRoot.t.spec = true;
    intlRoot.t.empty = true;
    $.getJSON(intlRoot.url, function(data) {
      var implSpec = {};
      if (intlRoot.i18n) {
        var option = {
          customLoad: function(lng, ns, options, loadComplete) {
            loadComplete(null, data);
          }
        };
        if (intlRoot.javaSubst) {
          option.interpolationPrefix = '{';
          option.interpolationSuffix = '}';
        }
        i18n.init(option);
      }
      $.each(intlRoot, function(fname, fspec) {
        if (fspec.spec) {
          implSpec[fname] = intlRoot.i18n ? implementIntlFunctionWithI18N(fname, fspec, data, intlRoot.javaSubst) : implementIntlFunction(fname, fspec, data);
        }
      });
      intlRoot.implement(implSpec);
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
    data[key] || jiant.error("Not found translation for key: ", key);
  }

  function implementIntlFunctionWithI18N(fname, fspec, data, javaSubst) {
    if (fname == "t") {
      return function(key) {
        var args = {};
        if (arguments) {
          if (javaSubst) {
            $.each(arguments, function(i, a) {i > 0 && (args["" + (i - 1)] = a)});
          } else {
            args = arguments[1];
          }
        }
        ensureIntlKey(data, key);
        return i18n.t(key, args);
      }
    } else if (fspec.empty) {
      return function() {
        var args = {};
        if (arguments) {
          if (javaSubst) {
            $.each(arguments, function(i, a) {args["" + i] = a});
          } else {
            var paramNames = getParamNames(fspec);
            $.each(arguments, function(i, a) {i > 0 && i < paramNames.length && (args[paramNames[i]] = a)});
          }
        }
        ensureIntlKey(data, fname);
        return i18n.t(fname, args);
      }
    } else {
      return fspec;
    }
  }

  function implementIntlFunction(fname, fspec, data) {
    var impl = function(key) {return prepareTranslation(key, data[key])};
    if (fname == "t") {
      return impl
    } else if (fspec.empty) {
      return function() {
        return impl(fname);
      }
    } else {
      return fspec;
    }
  }


// ------------ modules staff ----------------

  function _loadModules(appRoot, root, appId, cb) {
    var modules2load = [];
    if ($.isPlainObject(root)) {
      modules2load = parseObjectModules(root, appId);
    } else if ($.isArray(root)) {
      modules2load = parseArrayModules(root, appId);
    } else {
      logError("Unrecognized modules type", root);
    }
    if (modules2load.length) {
      loadModules(appRoot, appId, modules2load, cb);
    } else {
      cb();
    }
  }

  function loadModules(appRoot, appId, modules2load, cb) {
    var loading = {};
    function cbIf0() {
      if (Object.keys(loading).length > 0) {
        return;
      }
      appRoot.modules = {};
      var arr = [];
      $.each(modules2load, function(i, moduleSpec) {
        arr.push(moduleSpec);
      });
      arr.sort(function(a, b) {
        return nvl(a.order, 0) - nvl(b.order, 0);
      });
      $.each(arr, function(i, moduleSpec) {
        var mname = moduleSpec.name;
        if ($.isFunction(modules[mname])) {
          var args = [$, appRoot, jiant, moduleSpec];
          modules[mname].parsedDeps && $.each(modules[mname].parsedDeps, function(i, name) {
            args.push(appRoot.modules[name]);
          });
          appRoot.modules[mname] = modules[mname].apply(this, args);
        } else {
          jiant.logError("Application " + appId + ". Not loaded module " + mname
            + ". Possible error - wrong path or module name in js file doesn't match declared in app.modules section. Load initiated by "
            + (moduleSpec.j_initiatedBy ? moduleSpec.j_initiatedBy : "appication"));
        }
      });
      cb();
    }
    function addIfNeed(depModule) {
      var found = false;
      $.each(modules2load, function(i, moduleSpec) {
        if (moduleSpec.name == depModule.name) {
          found = true;
          moduleSpec.order = Math.min(moduleSpec.order, depModule.order);
          return false;
        }
      });
      !found && modules2load.push(depModule);
    }
    function parseDep(relpath, dep, moduleSpec) {
      var url = moduleSpec.path,
        pos = url.lastIndexOf("/") + 1,
        relurl = url.substring(0, pos) + relpath;
      (relurl.lastIndexOf("/") == relurl.length - 1) || (relurl+="/");
      var depObj = typeof dep === "string" ? {name: dep, path: relurl + dep} : dep,
        depModule = parseObjModule(depObj.name, depObj, appId, modules2load.length);
      moduleSpec.j_after[depModule.name] = 1;
      depModule.order = Math.min(depModule.order, moduleSpec.order - 0.5);
      depModule.j_initiatedBy = moduleSpec.name;
      addIfNeed(depModule);
      loadModule(depModule);
      return depModule.name;
    }
    function loadModule(moduleSpec) {
      var moduleName = moduleSpec.name;
      if (!modules[moduleName]) {
        loading[moduleName] = 1;
        var url = isCouldBePrefixed(moduleSpec.path)
          ? ((appRoot.modulesPrefix || "") + moduleSpec.path + ".js?" + (appRoot.modulesSuffix || ""))
          : moduleSpec.path;
        $.ajax({
          url: url,
          timeout: appRoot.modulesTimeout || 15000,
          cache: true,
          crossDomain: true,
          dataType: "script"
        }).done(function() {
          if (modules[moduleName]) {
            var deps = modules[moduleName].deps,
              darr = modules[moduleName].parsedDeps = [];
            deps && $.each(deps, function(i, dep) {
              if (typeof dep === "string") {
                darr.push(parseDep("", dep, moduleSpec))
              } else {
                $.each(dep, function(path, arr) {
                  if (! $.isArray(arr)) {
                    arr = [arr];
                  }
                  $.each(arr, function(i, val) {
                    darr.push(parseDep(path, val, moduleSpec));
                  });
                });
              }
            });
          }
        }).fail(function() {
          errorp("Application !!. Not loaded module !!", appId, moduleName);
        }).always(function() {
          if (loading[moduleName]) {
            delete loading[moduleName];
            cbIf0(moduleName);
          }
        });
      }
    }
    $.each(modules2load, function(i, moduleSpec) {
      loadModule(moduleSpec);
    });
    cbIf0();
  }

  function parseArrayModules(root, appId) {
    var ret = [], j = 0;
    $.each(root, function(i, module) {
      if (typeof module === "string") {
        ret.push(parseObjModule(module, {path: module}, appId, j));
      } else {
        $.each(module, function(key, val) {
          if (typeof val === "string") {
            ret.push(parseObjModule(val, {path: key + "/" + val}, appId, j));
          } else if ($.isArray(val)) {
            $.each(val, function(i, subval) {
              if (typeof subval === "string") {
                ret.push(parseObjModule(subval, {path: key + "/" + subval}, appId, j));
              } else {
                $.each(subval, function(k, v) {
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
    $.each(root, function(name, module) {
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
      return true;
    }
    if (root[shorten]) {
      root[full] = root[shorten];
      return true;
    }
    root[full] = {};
    return false;
  }

  function _bindUi(root, devMode, appUiFactory) {
    ! devMode && maybeSetDevModeFromQueryString();
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
    if (pre[appId]) {
      $.each(pre[appId], function(i, cb) {
        cb($, root, jiant);
      });
      delete pre[appId];
    }
    if (appId !== "*" && pre["*"]) {
      $.each(pre["*"], function(i, cb) {
        cb($, root, jiant);
      });
    }
    bindingCurrently[appId] = 1;
    _loadModules(root, root.modules, appId, function() {
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
      boundApps[appId] = root;
      loadedLogics[appId] || (loadedLogics[appId] = {});
      $.each(externalDeclarations, function(name, impl) {
        loadedLogics[appId][name] || (loadedLogics[appId][name] = externalDeclarations[name]);
        copyLogic(appId, name);
        awakeAwaitingDepends(appId, name);
      });
      delete bindingCurrently[appId];
      var appInitEvent = appId + "onAppInit" + appId;
      eventBus.trigger(appInitEvent);
      $.when.apply($, onInitAppActions).done(function() {eventBus.trigger(appBoundEventName(appId))});
      devMode && setTimeout(function() {
        if (awaitingDepends[appId]) {
          $.each(awaitingDepends[appId], function(key, arr) {
            if (arr && arr.length) {
              logError("Some depends for application " + appId + " are not resolved", awaitingDepends[appId]);
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
    $.each(listeners, function(i, l) {l.bindStarted && l.bindStarted(root)});
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
        _bindUi(root, devMode, appUiFactory);
      });
    } else {
      _bindUi(root, devMode, appUiFactory);
    }
    $.each(listeners, function(i, l) {l.bindCompleted && l.bindCompleted(root)});
  }

  function bind(obj1, obj2) {
    $.extend(obj1, obj2);
  }

  function extractApplicationId(appId) {
    return $.isPlainObject(appId) ? appId.id : appId
  }

  // onUiBound(cb);
  // onUiBound(depList, cb); - INVALID, treated as onUiBound(appIdArr, cb);
  // onUiBound(appIdArr, cb);
  // onUiBound(appIdArr, depList, cb);
  // onUiBound(appId, cb);
  // onUiBound(appId, depList, cb)
  function onUiBound(appIdArr, dependenciesList, cb) {
    if (! cb && ! dependenciesList) {
      jiant.error("!!! Registering anonymous logic without application id. Not recommended since 0.20");
      cb = appIdArr;
      appIdArr = ["no_app_id"];
    } else if (! cb) {
      cb = dependenciesList;
      dependenciesList = [];
    }
    if (! $.isArray(appIdArr)) {
      appIdArr = [appIdArr];
    }
    if (appIdArr.length > 1 && $.isArray(dependenciesList) && dependenciesList.length > 0) {
      $.each(dependenciesList, function(idx, arr) {
        if (!$.isArray(arr)) {
          jiant.error("Used multiple applications onUiBound and supplied wrong dependency list, use multi-array, " +
            "like [[app1DepList], [app2DepList]]");
        }
      })
    } else if (appIdArr.length == 1 && dependenciesList && dependenciesList.length) {
      dependenciesList = [dependenciesList];
    } else if (! dependenciesList) {
      dependenciesList = [];
    }
    $.each(listeners, function(i, l) {l.onUiBoundCalled && l.onUiBoundCalled(appIdArr, dependenciesList, cb)});
    $.each(appIdArr, function(idx, appId) {
      if (appId === undefined || appId === null) {
        logError("Called onUiBound with undefined application, apps array is ", appIdArr);
      } else if ($.isPlainObject(appId)) {
        appId = appId.id;
        appIdArr[idx] = appId;
      }
      (! awaitingDepends[appId]) && (awaitingDepends[appId] = {});
      (! loadedLogics[appId]) && (loadedLogics[appId] = {});
      dependenciesList[idx] && $.each(dependenciesList[idx], function(idx, depName) {
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

  function preUiBound(appId, cb) {
    if (typeof appId != "string") {
      errorp("preUiBound first parameter must be application id string, got !!", typeof appId);
      return;
    } else if (boundApps[appId]) {
      errorp("Application !! already bound, preUiBound should be called before bindUi", appId);
      return;
    } else if (bindingCurrently[appId]) {
      errorp("Application !! binding in progress, preUiBound should be called before bindUi", appId);
      return;
    }
    var arr = pre[appId] = nvl(pre[appId], []);
    arr.push(cb);
  }

  function handleBoundArr(appIdArr, cb) {
    var allBound = true;
    $.each(appIdArr, function(idx, appId) {
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
      $.each(appIdArr, function(idx, appId) {
        $.each(awaitingDepends[appId], function(depName, cbArr) {
          allDependsResolved = allDependsResolved && ($.inArray(cb, cbArr) < 0);
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

  function onAppInit(appId, cb) {
    var deferred = new $.Deferred();
    onInitAppActions.push(deferred.promise());
    var readyCb = function() {
      deferred.resolve();
    };
    if (boundApps[appId]) {
      jiant.logError("Defining and calling onUiBound() before onAppInit().");
    } else {
      var eventId = appId + "onAppInit" + appId;
      eventBus.on(eventId, function () {
        cb && cb($, boundApps[appId], readyCb);
      });
    }
  }

  function forget(appOrId) {
    var appId = extractApplicationId(appOrId);
    if (boundApps[appId]) {
      boundApps[appId].views && $.each(boundApps[appId].views, function(v, vSpec) {
        boundApps[appId].views[v] = vSpec._jiantSpec;
      });
      boundApps[appId].templates && $.each(boundApps[appId].templates, function(t, tSpec) {
        boundApps[appId].templates[t] = tSpec._jiantSpec;
      });
      boundApps[appId].ajax && $.each(boundApps[appId].ajax, function(f, fSpec) {
        boundApps[appId].ajax[f] = fSpec._jiantSpec;
      });
    }
    boundApps[appId] && delete boundApps[appId];
    awaitingDepends[appId] && delete awaitingDepends[appId];
    loadedLogics[appId] && delete loadedLogics[appId];
    lastEncodedStates[appId] && delete lastEncodedStates[appId];
    lastStates[appId] && delete lastStates[appId];
  }

  function getAwaitingDepends() {
    return awaitingDepends;
  }

  function setUiFactory(factory) {
    var ok = true;
    $.each(["template", "viewComponent", "view"], function(idx, name) {
      if (! factory[name]) {
        jiant.logError("UI Factory doesn't implement method " + name + ", ignoring bad factory");
        ok = false;
      }
    });
    ok && (uiFactory = factory);
  }

  function visualize(appId) {
    loadLibs(["https://cdn.rawgit.com/vecnas/jiant/master/graph.js"], function() {
      appId || $.each(boundApps, function(key, val) {
        appId = key;
        return false;
      });
      onUiBound(appId, ["jiantVisualizer"], function($, app) {
        app.logic.jiantVisualizer.visualize($, app);
      });
    }, true);
  }

  function asObjArray(arr, name, idxName) {
    var ret = [];
    $.each(arr, function(i, val) {
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

  function check(bool, err) {
    if (! bool) {
      var args = $.makeArray(arguments);
      args.splice(0, 1);
      logError(args);
      jiant.DEV_MODE && alert(err);
    }
  }

  function version() {
    return 246;
  }

  function Jiant() {}

  Jiant.prototype = {
    AJAX_PREFIX: "",
    AJAX_SUFFIX: "",
    DEV_MODE: false,
    PAGER_RADIUS: 6,
    isMSIE: eval("/*@cc_on!@*/!1"),
    STATE_EXTERNAL_BASE: undefined,
    getAwaitingDepends: getAwaitingDepends, // for application debug purposes

    bind: bind,
    bindUi: bindUi,
    app: app,
    forget: forget,
    declare: declare,
    override: override,
    implement: implement,
    module: module,
    bindView: bindView,
    loadLibs: loadLibs,
    goRoot: goRoot,
    goState: function (params, preserveOmitted) {},
    onUiBound: onUiBound,
    onApp: onUiBound,
    preUiBound: preUiBound,
    preApp: preUiBound,
    onAppInit: onAppInit,
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
    logInfo: logInfo,
    logError: logError,
    info: info,
    error: error,
    infop: infop,
    errorp: errorp,
    check: check,
    parseTemplate: function(text, data) {return $(parseTemplate(text, data));},
    parseTemplate2Text: parseTemplate2Text,
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
    inputSet: "jiant.inputSet",
    inputSetAsString: "jiant.inputSetAsString",
    inputDate: "jiant.inputDate",
    inputInt: "jiant.inputInt",
    inputFloat: "jiant.inputFloat",
    label: "jiant.label",
    nlabel: "jiant.nlabel",
    numLabel: "jiant.numLabel",
    meta: "jiant.meta",
    cssFlag: "jiant.cssFlag",
    cssMarker: "jiant.cssMarker",
    pager: "jiant.pager",
    slider: "jiant.slider",
    tabs: "jiant.tabs",
    fn: function (param) {},
    data: function (val) {},
    lookup: function (selector) {},
    on: function (cb) {},
    stub: function () {jiant.logError("stub called")},
    transientFn: function(val) {},

    flags: {
      ajaxSubmitAsMap: "_jiantFlagSubmitAsMap"
    },

    intro: {
      isTemplate: function(obj) {return obj && obj._jiantType === jTypeTemplate}
    },

    key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
      escape: 27, dot: 190, dotExtra: 110, comma: 188,
      a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54}

  };

  return window.jiant || (window.jiant = new Jiant());

}));
