// 0.01 : ajax alpha, views, templates
// 0.02 : event bus
// 0.03 : ajax with callback and errHandler per call
// 0.04 : bind plugin
// 0.05 : states
// 0.06 : onUiBound event for anonymous plugins, empty hash state
// 0.07 : crossdomain views load, setupForm check for form, pager update
// 0.08 : templates IE attribute quotes workaround from http://weblogs.asp.net/alexeigorkov/archive/2010/03/16/lazy-html-attributes-wrapping-in-internet-explorer.aspx

var jiant = jiant || (function($) {

  var collection = {},
      container = {},
      containerPaged = {},
      ctl = {},
      form = {},
      fn = function(param) {},
      grid = {},
      image = {},
      input = {},
      inputInt = {},
      label = {},
      lookup = function(selector) {},
      on = function(cb) {},
      goState = function(params, preserveOmitted) {},
      pager = {},
      slider = {},
      stub = function() {
        var callerName = "not available";
        if (arguments && arguments.callee && arguments.callee.caller) {
          callerName = arguments.callee.caller.name;
        }
        alert("stub called from function: " + callerName);
      },
      tabs = {},

      lastState = undefined,
      eventBus = $({}),
      bindingsResult = true,
      uiBoundRoot = undefined,
      errString;

  function ensureExists(obj, idName, className) {
    if (!obj || !obj.length) {
      window.console && window.console.error
      && (className ? logError("non existing object referred by class under object id '" + idName
          + "', check stack trace for details, expected obj class: " + className) :
          logError("non existing object referred by id, check stack trace for details, expected obj id: " + idName));
      if (className) {
        errString += "   ,    #" + idName + " ." + className;
      } else {
        errString += ", #" + idName;
      }
      bindingsResult = false;
    }
  }

  function maybeAddDevHook(uiElem, key, elem) {
    if (jiant.DEV_MODE) {
      uiElem.click(function(event) {
        if (event.shiftKey && event.altKey) {
          var message = key + (elem ? ("." + elem) : "");
          if (event.ctrlKey) {
            message += "\r\n------------\r\n";
            message += pseudoserializeJSON(jQuery._data(uiElem[0], "events"));
          }
          logInfo(message);
          alert(message);
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      });
    }
  }

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
        }
        else if (t == "object" && v !== null) {
          v = pseudoserializeJSON(v);
        }
        json.push((arr ? "" : '"' + k + '":') + (v ? v : "\"\""));
      });

      return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
    }
  }

  function parseTemplate(that, data) {
    data = data || {};
//    if (! that.html) {
//      that = $(that);
//    }
    var str = $.trim($(that).html()),
        _tmplCache = {},
        err = "";
    str = str.replace(/=(!!([^!!]+)!!)/g, '="$1"');
    try {
      var func = _tmplCache[str];
      if (!func) {
        var strFunc =
            "var p=[],print=function(){p.push.apply(p,arguments);};" +
                "with(obj){p.push('" +
                str.replace(/[\r\t\n]/g, " ")
                    .replace(/'(?=[^#]*#>)/g, "\t")
                    .split("'").join("\\'")
                    .split("\t").join("'")
                    .replace(/!!(.+?)!!/g, "',$1,'")
                    .split("!?").join("');")
                    .split("?!").join("p.push('")
                + "');}return p.join('');";

        //alert(strFunc);
        func = new Function("obj", strFunc);
        _tmplCache[str] = func;
      }
      return $.trim(func(data));
    } catch (e) {
      err = e.message;
    }
    return "!!! ERROR: " + err.toString() + " !!!";
  }

  function setupInputInt(input) {
    input.keydown(function(event) {
      if (event.keyCode == jiant.key.down && input.val() > 0) {
        input.val(input.val() - 1);
        return false;
      } else if (event.keyCode == jiant.key.up) {
        input.val(input.val() + 1);
        return false;
      } else if (event.keyCode == jiant.key.backspace || event.keyCode == jiant.key.del || event.keyCode == jiant.key.end
          || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
      } else if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
        event.preventDefault();
        return false;
      }
      return true;
    });
  }

  function setupForm(elem, key, name) {
    var tagName = elem[0].tagName.toLowerCase();
    if (tagName != "form") {
      jiant.logError(key + "." + name + " form element assigned to non-form: " + tagName);
      if (jiant.DEV_MODE) {
        alert(key + "." + name + " form element assigned to non-form: " + tagName);
      }
    }
    elem.submitForm = function(url, cb) {
      url = url || elem.attr("action");
      $.post(url, elem.serialize(), cb);
    };
  }

  function logError(error) {
    window.console && window.console.error && window.console.error(error);
  }

  function logInfo(s) {
    jiant.DEV_MODE && window.console && window.console.info && window.console.info(s);
  }

  function setupPager(uiElem) {
    var pagerBus = $({}),
        root = $("<ul></ul>");
    uiElem.addClass("pagination");
    uiElem.append(root);
    uiElem.onValueChange = function(callback) {
      pagerBus.on("ValueChange", callback);
    };
    uiElem.updatePager = function(page) {
      root.empty();
//      $.each(page, function(key, value) {
//        logInfo(key + " === " + value);
//      });
      var from = Math.max(0, page.number - jiant.PAGER_RADIUS / 2),
          to = Math.min(page.number + jiant.PAGER_RADIUS / 2, page.totalPages);
      if (from > 0) {
        addPageCtl(1, "").find("a").css("margin-right", "20px");
      }
      for (var i = from; i < to; i++) {
        var cls = "";
        if (i == page.number) {
          cls += " active";
        }
        addPageCtl(i + 1, cls);
      }
      if (to < page.totalPages - 1) {
        addPageCtl(page.totalPages, "").find("a").css("margin-left", "20px");
      }
    };
    function addPageCtl(value, ctlClass) {
      var ctl = $(parseTemplate($("<b><li class='!!ctlClass!!' style='cursor: pointer;'><a>!!label!!</a></li></b>"), {label: value, ctlClass: ctlClass}));
      root.append(ctl);
      ctl.click(function() {
        pagerBus.trigger("ValueChange", value);
      });
      return ctl;
    }
  }

  function setupContainerPaged(uiElem) {
    var prev = $("<div>&lt;&lt;</div>"),
        next = $("<div>&gt;&gt;</div>"),
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
          logInfo("showing");
          elem.show();
        } else {
          elem.hide();
        }
      });
    }
  }

// ------------ views ----------------

  function _bindContent(subRoot, key, content, view, prefix) {
    $.each(content, function (elem, elemContent) {
//      window.console && window.console.logInfo(elem + "    : " + subRoot[elem]);
      if (subRoot[elem] == lookup) {
        logInfo("    loookup element, no checks/bindings: " + elem);
        subRoot[elem] = function() {return $("." + prefix + elem);};
      } else {
        var uiElem = view.find("." + prefix + elem);
        ensureExists(uiElem, prefix + key, prefix + elem);
        subRoot[elem] = uiElem;
        if (elemContent == tabs && uiElem.tabs) {
          subRoot[elem].tabs();
        } else if (elemContent == inputInt) {
          setupInputInt(subRoot[elem]);
        } else if (elemContent == pager) {
          setupPager(subRoot[elem]);
        } else if (elemContent == form) {
          setupForm(subRoot[elem], key, elem);
        } else if (elemContent == containerPaged) {
          setupContainerPaged(subRoot[elem]);
        }
//        _bindContent(subRoot[elem], key, elemContent, uiElem, prefix);
        maybeAddDevHook(uiElem, key, elem);
        logInfo("    bound UI for: " + elem);
      }
    });
  }

  function ensureSafeExtend(spec, jqObject) {
    $.each(spec, function(key, content) {
      if (jqObject[key]) {
        logError("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used");
      }
    });
  }

  function _bindViews(prefix, root) {
    prefix = prefix || "";
    $.each(root, function (key, content) {
      logInfo("binding UI for view: " + key);
      var view = $("#" + prefix + key);
      ensureExists(view, prefix + key);
      _bindContent(root[key], key, content, view, prefix);
      ensureSafeExtend(root[key], view);
      $.extend(root[key], view);
      maybeAddDevHook(view, key, undefined);
    });
  }

// ------------ templates ----------------

  function _bindTemplates(prefix, root) {
    prefix = prefix || "";
    $.each(root, function(key, content) {
      logInfo("binding UI for template: " + key);
      var tm = $("#" + prefix + key);
      ensureExists(tm, prefix + key);
      $.each(content, function (elem, elemType) {
        root[key][elem] = tm.find("." + prefix + elem);
        ensureExists(root[key][elem], prefix + key, prefix + elem);
      });
      root[key].parseTemplate = function(data) {
        var retVal = $(parseTemplate(tm, data));
//        jiant.logInfo(retVal.length);
        $.each(content, function (elem, elemType) {
          retVal[elem] = retVal.find("." + prefix + elem);
          maybeAddDevHook(retVal[elem], key, elem);
        });
        return retVal;
      };
      root[key].parseTemplate2Text = function(data) {
        return parseTemplate(tm, data);
      };
    });
  }

  function parseTemplate2Text(tm, data) {
    return parseTemplate(tm, data);
  }

// ------------ events staff ----------------

  function _bindEvents(events) {
    $.each(events, function(name, spec) {
      logInfo("binding event: " + name);
      events[name].fire = function() {
        logInfo("    EVENT fire. " + name);
        logInfo(arguments);
        eventBus.trigger(name + ".event", arguments);
      };
      events[name].on = function (cb) {
        logInfo("    assigning event handler to " + name);
        eventBus.on(name + ".event", function () {
//        logInfo("    EVENT. on");
//        logInfo(arguments);
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        })
      };
    });
  }

// ------------ states staff ----------------

  function _bindStates(states) {
    if (! $.History) {
      var err = "No history plugin and states configured. Don't use states or add $.History plugin";
      jiant.logError(err);
      if (jiant.DEV_MODE) {
        alert(err);
      }
      return;
    }
    $.each(states, function(name, stateSpec) {
      logInfo("binding state: " + name);
      stateSpec.go = go(name, stateSpec.root);
      stateSpec.start = function(cb) {
        eventBus.on(name + "_start", function() {
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
      stateSpec.end = function(cb) {
        eventBus.on(name + "_end", function() {
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
    });
    $.History.bind(function (state) {
      var parsed = parseState(),
          stateId = parsed.now[0],
          handler = states[stateId],
          params = parsed.now;
      params.splice(0, 1);
      if (lastState && lastState != stateId) {
        eventBus.trigger(lastState + "_end");
      }
      lastState = stateId;
      eventBus.trigger((stateId ? stateId : "") + "_start", params);
    });
  }

  function go(stateId, root) {
    return function() {
      var parsed = parseState(),
          prevState = parsed.now;
      parsed.now = [stateId];
      $.each(arguments, function(idx, arg) {
        if (arg != undefined) {
          parsed.now.push(pack(arg + ""));
        } else if (prevState[0] == stateId && prevState[idx + 1] != undefined) {
          parsed.now.push(pack(prevState[idx + 1] + ""));
        } else {
          parsed.now.push(pack(arg + ""));
        }
      });
      if (root) {
        parsed.root = parsed.now;
      }
      setState(parsed);
    };
  }

  function goRoot() {
    var parsed = parseState();
    parsed.now = parsed.root;
    setState(parsed);
  }

  function setState(parsed) {
    var s = "root=" + parsed.root + "|now=" + parsed.now;
    $.History.go(s);
  }

  function parseState() {
    var state = $.History.getState();
    var arr = state.split("|");
    var parsed = {};
    $.each(arr, function(idx, item) {
      var itemArr = item.split("="),
          args = [];
      if (itemArr.length >= 2) {
        args = itemArr[1].split(",");
      }
      parsed[itemArr[0]] = [];
      $.each(args, function(idx, arg) {
        parsed[itemArr[0]].push(unpack(arg));
      });
    });
    parsed.now = parsed.now || [];
    parsed.root = parsed.root || [];
    return parsed;
  }

  function pack(s) {
    return s ? s.replace(/;/g, ";;").replace(/,/g, ";1").replace(/=/g, ";2").replace(/\|/g, ";3") : "";
  }

  function unpack(s) {
    return s ? s.replace(/;3/g, "|").replace(/;2/g, "=").replace(/;1/g, ",").replace(/;;/g, ";") : "";
  }

  function refreshState() {
    $.History.trigger($.History.getState());
  }

// ------------ ajax staff ----------------

  function getParamNames(func) {
    var funStr = func.toString();
    return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
  }

  function _bindAjax(root) {
    $.each(root, function(uri, funcSpec) {
      logInfo("binding ajax for function: " + uri);
      var params = getParamNames(funcSpec);
      params.splice(params.length - 1, 1);
      root[uri] = makeAjaxPerformer(uri, params);
    });
  }

  function parseForAjaxCall(root, path, actual) {
    if ($.isArray(actual)) {
      root[path] = actual;
    } else if ($.isPlainObject(actual)) {
      $.each(actual, function(key, value) {
        parseForAjaxCall(root, key, value);
//        parseForAjaxCall(root, path + "." + key, value);
      });
    } else {
      root[path] = actual;
    }
  }

  function makeAjaxPerformer(uri, params) {
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
      logInfo("    AJAX call. " + uri);
      $.ajax(jiant.AJAX_PREFIX + uri + jiant.AJAX_SUFFIX, {data: callData, traditional: true, success: function(data) {
        if (callback) {
          try{
            data = $.parseJSON(data);
          } catch (ex) {}
          callback(data);
        }
      }, error: function(jqXHR, textStatus, errorText) {
        if (errHandler) {
          errHandler(jqXHR.responseText);
        } else {
          jiant.handleErrorFn(jqXHR.responseText);
        }
      }});
    };
  }

  function defaultAjaxErrorsHandle(errorDetails) {
    logError(errorDetails);
  }

// ------------ base staff ----------------

  function maybeSetDevModeFromQueryString() {
    if ((window.location + "").toLowerCase().indexOf("jiant.dev_mode") >= 0) {
      jiant.DEV_MODE = true;
    }
  }

  function _bindUi(prefix, root, devMode) {
    jiant.DEV_MODE = devMode;
    if (! devMode) {
      maybeSetDevModeFromQueryString();
    }
    errString = "";
    bindingsResult = true;
    if (root.views) {
      _bindViews(prefix, root.views);
    } else {
      root.views = {};
    }
    if (root.templates) {
      _bindTemplates(prefix, root.templates);
    } else {
      root.templates = {};
    }
    if (root.ajax) {
      _bindAjax(root.ajax);
    } else {
      root.ajax = {};
    }
    if (root.events) {
      _bindEvents(root.events);
    } else {
      root.events = {};
    }
    if (root.states) {
      _bindStates(root.states);
    } else {
      root.states = {};
    }
    if (jiant.DEV_MODE && !bindingsResult) {
      alert("Some elements not bound to HTML properly, check console" + errString);
    }
    uiBoundRoot = root;
    eventBus.trigger("jiant.uiBound");
  }

  function bindUi(prefix, root, devMode, viewsUrl, injectId) {
    if (viewsUrl) {
      var injectionPoint = injectId ? $("#" + injectId) : $("body");
      injectionPoint.load(viewsUrl, {}, function() {
        $.ajaxSetup({
          contentType:"application/json",
          dataType:'jsonp',
          xhrFields: {
            withCredentials: true
          },
          crossDomain: true
        });
        _bindUi(prefix, root, devMode);
      });
    } else {
      _bindUi(prefix, root, devMode);
    }
  }

  function bind(obj1, obj2) {
    $.extend(obj1, obj2);
  }

  function onUiBound(cb) {
    if (uiBoundRoot) {
      cb && cb($, uiBoundRoot);
    } else {
      eventBus.on("jiant.uiBound", function() {
        cb && cb($, uiBoundRoot);
      });
    }
  }

  return {
    AJAX_PREFIX: "",
    AJAX_SUFFIX: "",
    DEV_MODE: false,
    PAGER_RADIUS: 6,

    bind: bind,
    bindUi: bindUi,
    goRoot: goRoot,
    goState: goState,
    onUiBound: onUiBound,
    refreshState: refreshState,

    handleErrorFn: defaultAjaxErrorsHandle,
    logInfo: logInfo,
    logError: logError,
    parseTemplate: function(text, data) {return $(parseTemplate(text, data));},
    parseTemplate2Text: parseTemplate2Text,

    collection: collection,
    container: container,
    containerPaged: containerPaged,
    ctl : ctl,
    fn: fn,
    form: form,
    grid: grid,
    image: image,
    input: input,
    inputInt: inputInt,
    label: label,
    lookup: lookup,
    on: on,
    pager: pager,
    slider: slider,
    stub: stub,
    tabs: tabs,

    key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
      a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54}

  };

})(jQuery);
