// 0.01 : ajax alpha, views, templates
// 0.02 : event bus
// 0.03 : ajax with callback and errHandler per call
// 0.04 : bind plugin
// 0.05 : states
// 0.06 : onUiBound event for anonymous plugins, empty hash state
// 0.07 : crossdomain views load, setupForm check for form, pager update
// 0.08 : broken for some ie cases, templates IE attribute quotes workaround from http://weblogs.asp.net/alexeigorkov/archive/2010/03/16/lazy-html-attributes-wrapping-in-internet-explorer.aspx
// 0.09 : broken for some ie cases, templates IE redone, to avoid bug with "a=!!val!!" situation, isMSIE flag added
// 0.10 : templates IE one more redone, attributes DOM manipulation, for templates parse, parse template starting with plain text by adding comment, template controls binding
// 0.11: ajax url override for ajax calls via returning value from specification function
// 0.12: return from submitForm, template parse results binding changed to merge of filter and find to support no-root templates, added propagate(data) function to views
// 0.13: comment node removed from template parse results
// 0.14: events[name].listenersCount++;
// 0.15: parseInt for inputInt value arrow up
// 0.16: state parameters - undefined replacement by current value properly, inputDate added, works when datepicker available, formatDate, formatTime added
// 0.17: propagate "0" and "" passed as valid values
// 0.18: default state "end" not triggered - fixed
// 0.19: DEBUG_MODE added, state start vs trigger check in debug mode, event usage check in debug mode
// 0.20: appId introduced
// 0.21: root state not packed, go back not packed - fixed, propagate added to parseTemplate results
// 0.22: onUiBound accepts both app and app.id as first param
// 0.23: model initial auto-implementation added for method names "add", "remove", "setXXX", "getXXX", "findByXXX"; .xl added
// 0.24: model modified, "set"/"get" replaced by single method xxx(optional_param), in jquery style, added global "on" event for any model change. incompatible with 0.23
// 0.25: radio button handled properly in propagate function
// 0.26: jiant.STATE_EXTERNAL_BASE added for navigation to another page in frames of state change, fixed multiple apps on a page mixing
// 0.27: predefined model functions not created automatically more
// 0.28: ajaxPrefix, ajaxSuffix, stateExternalBase per application for multi-app support
// 0.28.1: minor fix for "" comparison
// 0.29: refreshState() workaround for used History plugin timeout, states tuning, per app cross domain via flag for multiple app cross/noncross domain mix, form influenced by ajax pre/suff
// 0.30: cross domain settings for submitForm
// 0.31: addAll() method added to model with auto-wrap for all source object properties
// 0.32: propagate() fixed for templates, propagate(model) with auto data binding added, customRenderer(elem, value, isUpdate) for view/template controls
// 0.33: refreshTabs added to jiant.tabs, logInfo prints any amount of arguments
// 0.34: override unsafe extended properties with user jiant specified
// 0.35: customRenderer accepts 4 parameters: bound object, bound view, new field value, is update
// 0.36: models.on fixed - fired for target object only, models.update() added
// 0.37: provided implementation for model functions support
// 0.38: models.updateAll, models.update.on triggered on addAll, AI on .update.on subscription to spec
// 0.39: $.History replaced by $.hashchange usage

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
      inputDate = {},
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
      uiBoundRoot = {},
      errString,
      statesUsed = {},
      eventsUsed = {};

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
        }
        else if (t == "object" && v !== null) {
          v = pseudoserializeJSON(v);
        }
        json.push((arr ? "" : '"' + k + '":') + (v ? v : "\"\""));
      });

      return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
    }
  }

  function formatDate(millis) {
    var dt = new Date(millis);
    return $.datepicker.formatDate("yy-mm-dd", dt);
  }

  function formatTime(millis) {
    var dt = new Date(millis);
    return lfill(dt.getHours()) + ":" + lfill(dt.getMinutes());
  }

  function formatTimeSeconds(millis) {
    var dt = new Date(millis);
    return lfill(dt.getHours()) + ":" + lfill(dt.getMinutes()) + ":" + lfill(dt.getSeconds());
  }

  function lfill(val) {
    return val < 10 ? "0" + val : val;
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

  function parseTemplate(that, data) {
    data = data || {};
    var str = $.trim($(that).html()),
        _tmplCache = {},
        err = "";
    if (!jiant.isMSIE) {
      str = str.replace(/!!/g, "!! ");
    } else {
      str = msieDom2Html($(that));
    }
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
                    .replace(/!! (.+?)!! /g, "',$1,'")
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
        input.val(parseInt(input.val()) + 1);
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

  function setupForm(appRoot, elem, key, name) {
    if (! elem[0]) {
      return;
    }
    var tagName = elem[0].tagName.toLowerCase();
    if (tagName != "form") {
      jiant.logError(key + "." + name + " form element assigned to non-form: " + tagName);
      if (jiant.DEV_MODE) {
        alert(key + "." + name + " form element assigned to non-form: " + tagName);
      }
    }
    elem.submitForm = function(url, cb) {
      url = url ? url : elem.attr("action");
      if (appRoot.ajaxPrefix) {
        url = appRoot.ajaxPrefix + url;
      } else if (jiant.AJAX_PREFIX) {
        url = jiant.AJAX_PREFIX = url;
      }
      if (appRoot.ajaxSuffix) {
        url += appRoot.ajaxSuffix;
      } else if (jiant.AJAX_SUFFIX) {
        url += jiant.AJAX_SUFFIX;
      }
      var data = {
        type: "POST",
        url: url,
        data: elem.serialize(),
        success: cb
      };
      if (appRoot.crossDomain) {
        data.contentType = "application/json";
        data.dataType = 'jsonp';
        data.xhrFields = {withCredentials: true};
        data.crossDomain = true;
      }
      return $.ajax(data);
    };
  }

  function logError(error) {
    window.console && window.console.error && window.console.error(error);
  }

  function logInfo(s) {
    if (jiant.DEV_MODE && window.console && window.console.info) {
      $.each(arguments, function(idx, arg) {
        window.console.info(arg);
      });
    }
  }


  function debug(s) {
    if (window.console && window.console.error) {
      window.console.error(s);
//      var callerName = "not available";
//      if (arguments && arguments.callee && arguments.callee.caller) {
//        callerName = arguments.callee.caller.name;
//        callerName && window.console.debug(callerName);
//        arguments.callee.caller.caller && arguments.callee.caller.caller.name && window.console.debug(arguments.callee.caller.caller.name);
//      }
      return true;
    } else {
      return false;
    }
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
//          logInfo("showing");
          elem.show();
        } else {
          elem.hide();
        }
      });
    }
  }

  function setupExtras(appRoot, uiElem, elemContent, key, elem) {
    if ((elemContent == tabs || elemContent.tabsTmInner) && uiElem.tabs) {
      uiElem.tabs();
      uiElem.refreshTabs = function() {uiElem.tabs("refresh");};
    } else if (elemContent == inputInt || elemContent.inputIntTmInner) {
      setupInputInt(uiElem);
    } else if ((elemContent == inputDate || elemContent.inputDateTmInner) && uiElem.datepicker) {
      uiElem.datepicker();
    } else if (elemContent == pager || elemContent.pagerTmInner) {
      setupPager(uiElem);
    } else if (elemContent == form || elemContent.formTmInner) {
      setupForm(appRoot, uiElem, key, elem);
    } else if (elemContent == containerPaged || elemContent.containerPagedTmInner) {
      setupContainerPaged(uiElem);
    }
    maybeAddDevHook(uiElem, key, elem);
  }

  function getStackTrace() {
    var obj = {stack: {}};
    Error.captureStackTrace && Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
  }

// ------------ views ----------------

  function _bindContent(appRoot, subRoot, key, content, view, prefix) {
    $.each(content, function (elem, elemContent) {
//      window.console && window.console.logInfo(elem + "    : " + subRoot[elem]);
      if (subRoot[elem] == lookup) {
        logInfo("    loookup element, no checks/bindings: " + elem);
        subRoot[elem] = function() {return view.find("." + prefix + elem);};
      } else {
        var uiElem = view.find("." + prefix + elem);
        ensureExists(uiElem, prefix + key, prefix + elem);
        subRoot[elem] = uiElem;
        setupExtras(appRoot, uiElem, elemContent, key, elem);
//        logInfo("    bound UI for: " + elem);
      }
    });
  }

  function ensureSafeExtend(spec, jqObject) {
    $.each(spec, function(key, content) {
      if (jqObject[key]) {
        logError("unsafe extension: " + key + " already defined in base jQuery, shouldn't be used, now overriding!");
        jqObject[key] = undefined;
      }
    });
  }

  function makePropagationFunction(spec, obj) {
    var map = {};
    $.each(spec, function (key, elem) {
      map[key] = elem;
    });
    return function(data, subscribe4updates) {
      subscribe4updates = (subscribe4updates == undefined) ? true : subscribe4updates;
      $.each(map, function (key, elem) {
        if (data[key] != undefined && data[key] != null) {
          var val = data[key];
          elem = obj[key];
          if ($.isFunction(val)) {
            getRenderer(spec, key)(data, elem, val());
            if (subscribe4updates && $.isFunction(val.on)) {
              val.on(function(obj, newVal) {
                getRenderer(spec, key)(data, elem, newVal, true);
              });
            }
          } else {
            getRenderer(spec, key)(data, elem, val);
          }
        }
      });
    }
  }

  function getRenderer(spec, key) {
    if (spec[key] && spec[key].customRenderer && $.isFunction(spec[key].customRenderer)) {
      return spec[key].customRenderer;
    } else {
      return updateViewElement;
    }
  }

  function updateViewElement(obj, elem, val) {
    var types = ["text", "hidden", undefined];
    var tagName = elem[0].tagName.toLowerCase();
    if (tagName == "input" || tagName == "textarea") {
      var el = $(elem[0]),
          tp = el.attr("type");
      if ($.inArray(tp, types) >= 0) {
        elem.val(val);
      } else if (tp == "radio") {
        $.each(elem, function(idx, subelem) {
          $(subelem).prop("checked", subelem.value == val);
        });
      }
    } else if (tagName == "img") {
      elem.attr("src", val);
    } else {
      elem.html(val);
    }
  }

  function _bindViews(prefix, root, appRoot) {
    prefix = prefix || "";
    $.each(root, function (key, content) {
      logInfo("binding UI for view: " + key);
      var view = $("#" + prefix + key);
      ensureExists(view, prefix + key);
      _bindContent(appRoot, root[key], key, content, view, prefix);
      ensureSafeExtend(root[key], view);
      root[key].propagate = makePropagationFunction(content, content);
      $.extend(root[key], view);
      maybeAddDevHook(view, key, undefined);
    });
  }

// ------------ templates ----------------

  function calcInnerTmKey(elem) {
    switch (elem) {
      case (label): return "labelTmInner";
      case (ctl): return "ctlTmInner";
      case (container): return "containerTmInner";
      case (containerPaged): return "containerPagedTmInner";
      case (form): return "formTmInner";
      case (pager): return "pagerTmInner";
      case (image): return "imageTmInner";
      case (grid): return "gridTmInner";
      case (input): return "inputTmInner";
      case (inputInt): return "inputIntTmInner";
      case (inputDate): return "inputDateTmInner";
      default: return "customTmInner";
    }
  }

  function _bindTemplates(prefix, root, appRoot) {
    prefix = prefix || "";
    $.each(root, function(key, content) {
      logInfo("binding UI for template: " + key);
      var tm = $("#" + prefix + key);
      ensureExists(tm, prefix + key);
      $.each(content, function (elem, elemType) {
        ensureExists(tm.find("." + prefix + elem), prefix + key, prefix + elem);
        var innerTmKey = calcInnerTmKey(content[elem]);
        content[elem] = {};
        content[elem][innerTmKey] = true;
      });
      root[key].parseTemplate = function(data) {
        var retVal = $("<!-- -->" + parseTemplate(tm, data)); // add comment to force jQuery to read it as HTML fragment
        $.each(content, function (elem, elemType) {
          if (elem != "parseTemplate" && elem != "parseTemplate2Text") {
            retVal[elem] = $.merge(retVal.filter("." + prefix + elem), retVal.find("." + prefix + elem));
            setupExtras(appRoot, retVal[elem], root[key][elem], key, elem);
            maybeAddDevHook(retVal[elem], key, elem);
          }
        });
        retVal.splice(0, 1); // remove first comment
        retVal.propagate = makePropagationFunction(content, retVal);
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

// ------------ model staff ----------------

  function assignOnHandler(obj, eventName, fname) {
    var fn = function(cb) {
      var trace;
      if (jiant.DEBUG_MODE.events) {
        debug("assigning event handler to " + eventName);
        eventsUsed[eventName] && debug(" !!! Event handler assigned after fire occured, possible error, for event " + eventName);
        trace = getStackTrace();
      }
      if (fname) {
        obj[fname].listenersCount++;
      } else {
        obj.listenersCount++;
      }
      obj._innerData.on(eventName, function () {
        jiant.DEBUG_MODE.events && debug("called event handler: " + eventName + ", registered at " + trace);
        var args = $.makeArray(arguments);
        args.splice(0, 1);
//        args.splice(0, 2);
        cb && cb.apply(cb, args);
      })
    };
    if (fname) {
      obj[fname].on = fn;
      obj[fname].listenersCount = 0;
    } else {
      obj.on = fn;
      obj.listenersCount = 0;
    }
  }

  function bindFunctions(name, spec, obj) {
    var storage = [],
        fldPrefix = "fld_prefix_";
//        predefined = ["add", "addAll, "all", "on", "remove"];
//    $.each(predefined, function(idx, fn) {
//      if (! spec[fn]) {
//        spec[fn] = fn;
//        jiant.logInfo("  !Adding not declared function to model: " + fn);
//      }
//    });
    if (spec.updateAll && spec.id) {
      if (! spec.addAll) spec.addAll = function(val) {};
      if (! spec.update) spec.update = function(val) {};
      if (! spec.findById) spec.findById = function(val) {};
    }
    obj._innerData = $({});
    $.each(spec, function(fname, funcSpec) {
      var eventName = name + "_" + fname + "_event",
          globalChangeEventName = name + "_globalevent";
//      jiant.logInfo("  implementing model function " + fname);
      if (fname == "_innerData") {
      } else if (fname == "all") {
        obj[fname] = function() {
          return storage;
        };
      } else if (fname == "on") {
        assignOnHandler(obj, globalChangeEventName);
      } else if (fname == "update") {
        obj[fname] = function(objFrom) {
          $.each(objFrom, function(key, val) {
            if (obj[key] && $.isFunction(obj[key]) && obj[key]() != val) {
              obj[key](val);
            }
          });
          jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
          obj._innerData.trigger(eventName, obj);
          obj != spec && spec._innerData.trigger(eventName, obj);
          jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
          eventBus.trigger(globalChangeEventName, [obj, fname]);
        };
        assignOnHandler(obj, eventName, fname);
      } else if (fname == "updateAll") {
        obj[fname] = function(arr) {
          function up(item) {
            if (spec.id) {
              var src = obj.findById(item.id);
              src.length == 0 ? obj.addAll(item) : src[0].update(item);
            } else {
              obj.update(item);
            }
          }
          if ($.isArray(arr)) {
            $.each(arr, function(idx, item) {
              up(item);
            });
          } else {
            up(arr);
          }
        };
        assignOnHandler(obj, eventName, fname);
      } else if (fname == "add") {
        var params = getParamNames(funcSpec);
        obj[fname] = function() {
          var newObj = {};
          $.each(arguments, function(idx, arg) {
            params[idx] && (newObj[fldPrefix + params[idx]] = arg);
          });
          storage.push(newObj);
          bindFunctions(name, spec, newObj);
          jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
          obj._innerData.trigger(eventName, newObj);
          jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
          eventBus.trigger(globalChangeEventName, [newObj, fname]);
          return newObj;
        };
        assignOnHandler(obj, eventName, fname);
      } else if (fname == "addAll") {
//        eventName = name + "_add_event";
        obj[fname] = function(arr) {
          var newArr = [];
          function fn(item) {
            var newObj = {};
            $.each(item, function(name, param) {
              newObj[fldPrefix + name] = param;
            });
            storage.push(newObj);
            newArr.push(newObj);
            bindFunctions(name, spec, newObj);
          }
          if ($.isArray(arr)) {
            $.each(arr, function(idx, item) {
              fn(item);
            });
          } else {
            fn(arr);
          }
          jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
          obj._innerData.trigger(eventName, [newArr]);
          jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
          jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
          eventBus.trigger(globalChangeEventName, [newArr, fname]);
          if ($.isArray(arr)) {
            $.each(arr, function(idx, item) {
              newArr[idx].update && newArr[idx].update(item); // todo: replace by just trigger update event
            });
          } else {
            newArr.update && newArr.update(arr); // todo: replace by just trigger update event
          }
          return newArr;
        };
        assignOnHandler(obj, eventName, fname);
      } else if (fname == "remove") {
        obj[fname] = function(elem) {
          var prevLen = storage.length;
          storage = $.grep(storage, function(value) {return value != elem;});
          if (storage.length != prevLen) {
            jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
            jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
            obj._innerData.trigger(eventName, elem);
            jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
            jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
            eventBus.trigger(globalChangeEventName, [elem, fname]);
          }
          return elem;
        };
        assignOnHandler(obj, eventName, fname);
      } else if (fname.indexOf("findBy") == 0 && fname.length > 6) {
        var fieldName = fldPrefix + fname.substring(6).toLowerCase();
        obj[fname] = function(val) {
          return $.grep(storage, function(value) {return value[fieldName] == val});
        };
      } else if (("" + funcSpec).indexOf("{}") == ("" + funcSpec).length - 2 || spec._innerData[fname]) {
        spec._innerData[fname] = true;
        obj[fname] = function(val) {
          var fieldName = fldPrefix + fname;
          if (arguments.length == 0) {
            return obj[fieldName];
          } else {
            if (obj[fieldName] !== val) {
              obj[fieldName] = val;
              jiant.DEBUG_MODE.events && debug("fire event: " + eventName);
              jiant.DEBUG_MODE.events && (! eventsUsed[eventName]) && (eventsUsed[eventName] = name);
              obj._innerData.trigger(eventName, [obj, val]);
              jiant.DEBUG_MODE.events && debug("fire event: " + globalChangeEventName);
              jiant.DEBUG_MODE.events && (! eventsUsed[globalChangeEventName]) && (eventsUsed[globalChangeEventName] = name);
              eventBus.trigger(globalChangeEventName, [obj, fname, val]);
            }
            return obj[fieldName];
          }
        };
        assignOnHandler(obj, eventName, fname);
//        jiant.logError("Unsupported model functionality declaration, can't implement: " + fname);
//      } else {
//        logInfo("Provided implementation used for function " + fname);
      }
    });
  }

  function _bindModels(models) {
    $.each(models, function(name, spec) {
      jiant.logInfo("implementing model " + name);
      bindFunctions(name, spec, spec);
    });
  }

// ------------ events staff ----------------

  function _bindEvents(events) {
    $.each(events, function(name, spec) {
      logInfo("binding event: " + name);
      events[name].listenersCount = 0;
      events[name].fire = function() {
        jiant.DEBUG_MODE.events && debug("fire event: " + name);
        jiant.DEBUG_MODE.events && (! eventsUsed[name]) && (eventsUsed[name] = name);
        eventBus.trigger(name + ".event", arguments);
      };
      events[name].on = function (cb) {
        var trace;
        if (jiant.DEBUG_MODE.events) {
          debug("assigning event handler to: " + name);
          eventsUsed[name] && debug(" !!! Event handler assigned after fire occured, possible error, for event " + name);
          trace = getStackTrace();
        }
        events[name].listenersCount++;
        eventBus.on(name + ".event", function () {
          jiant.DEBUG_MODE.events && debug("called event handler: " + name + ", registered at " + trace);
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        })
      };
    });
  }

// ------------ states staff ----------------

  function _bindStates(states, stateExternalBase) {
    if (! $(window).hashchange) {
      var err = "No hashchange plugin and states configured. Don't use states or add hashchange plugin (supplied with jiant)";
      jiant.logError(err);
      if (jiant.DEV_MODE) {
        alert(err);
      }
      return;
    }
    $.each(states, function(name, stateSpec) {
      logInfo("binding state: " + name);
      stateSpec.go = go(name, stateSpec.root, stateExternalBase);
      stateSpec.start = function(cb) {
        var trace;
        if (jiant.DEBUG_MODE.states) {
          debug("register state start handler: " + name);
          statesUsed[name] && debug(" !!! State start handler registered after state triggered, possible error, for state " + name);
          trace = getStackTrace();
        }
        eventBus.on("state_" + name + "_start", function() {
          jiant.DEBUG_MODE.states && debug("called state start handler: " + name + ", registered at " + trace);
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
      stateSpec.end = function(cb) {
        var trace;
        if (jiant.DEBUG_MODE.states) {
          debug("register state end handler: " + name);
          statesUsed[name] && debug(" !!! State end handler registered after state triggered, possible error, for state " + name);
          trace = getStackTrace();
        }
        eventBus.on("state_" + name + "_end", function() {
          jiant.DEBUG_MODE.states && debug("called state end handler: " + name + ", registered at " + trace);
          var args = $.makeArray(arguments);
          args.splice(0, 1);
          cb && cb.apply(cb, args);
        });
      };
    });
    $(window).hashchange(function () {
      var state = location.hash.substring(1),
          parsed = parseState(),
          stateId = parsed.now[0],
          handler = states[stateId],
          params = parsed.now;
      jiant.logInfo(state);
      params.splice(0, 1);
      $.each(params, function(idx, p) {
        if (p == "undefined") {
          params[idx] = undefined;
        }
      });
      if (lastState != undefined && lastState != stateId) {
        jiant.DEBUG_MODE.states && debug("trigger state end: " + (lastState ? lastState : ""));
        eventBus.trigger("state_" + lastState + "_end");
      }
      lastState = stateId;
      stateId = (stateId ? stateId : "");
      jiant.DEBUG_MODE.states && debug("trigger state start: " + stateId);
      jiant.DEBUG_MODE.states && (! statesUsed[stateId]) && (statesUsed[stateId] = stateId);
      eventBus.trigger("state_" + stateId + "_start", params);
    });
  }

  function go(stateId, root, stateExternalBase) {
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
        parsed.root = [];
        $.each(parsed.now, function(idx, param) {
          parsed.root.push(param);
        });
      } else {
        $.each(parsed.root, function(idx, param) {
          parsed.root[idx] = pack(param);
        });
      }
      setState(parsed, stateExternalBase);
    };
  }

  function goRoot() {
    var parsed = parseState();
    parsed.now = [];
    $.each(parsed.root, function(idx, param) {
      parsed.now.push(pack(param));
      parsed.root[idx] = pack(param);
    });
    setState(parsed, undefined); // external base not used
  }

  function setState(parsed, stateExternalBase) {
    var s = "now=" + parsed.now + "|root=" + parsed.root;
    var extBase = (stateExternalBase || stateExternalBase == "") ? stateExternalBase : jiant.STATE_EXTERNAL_BASE;
    if (extBase) {
      window.location.assign(extBase + "#" + s);
    } else {
      location.hash = "#" + s;
    }
  }

  function parseState() {
    var state = location.hash.substring(1);
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
    $(window).hashchange();
  }

// ------------ ajax staff ----------------

  function getParamNames(func) {
    var funStr = func.toString();
    return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
  }

  function _bindAjax(root, ajaxPrefix, ajaxSuffix, crossDomain) {
    $.each(root, function(uri, funcSpec) {
      logInfo("binding ajax for function: " + uri);
      var params = getParamNames(funcSpec);
      params.splice(params.length - 1, 1);
      root[uri] = makeAjaxPerformer(ajaxPrefix, ajaxSuffix, uri, params, $.isFunction(root[uri]) ? root[uri]() : undefined, crossDomain);
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

  function makeAjaxPerformer(ajaxPrefix, ajaxSuffix, uri, params, hardUrl, crossDomain) {
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
      var pfx = (ajaxPrefix || ajaxPrefix == "") ? ajaxPrefix : jiant.AJAX_PREFIX;
      var sfx = (ajaxSuffix || ajaxSuffix == "") ? ajaxSuffix : jiant.AJAX_SUFFIX;
      var url = hardUrl ? hardUrl : pfx + uri + sfx;
      logInfo("    AJAX call. " + uri + " to server url: " + url);
      var settings = {data: callData, traditional: true, success: function(data) {
        if (callback) {
          try {
            data = $.parseJSON(data);
          } catch (ex) {
          }
          jiant.DEBUG_MODE.ajax && debug("Ajax call results for uri " + uri) && debug(data);
          callback(data);
        }
      }, error: function (jqXHR, textStatus, errorText) {
        if (errHandler) {
          errHandler(jqXHR.responseText);
        } else {
          jiant.handleErrorFn(jqXHR.responseText);
        }
      }};
      if (crossDomain) {
        settings.contentType = "application/json";
        settings.dataType = 'jsonp';
        settings.xhrFields = {withCredentials: true};
        settings.crossDomain = true;
      }
      $.ajax(url, settings);
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

  function maybeSetDebugModeFromQueryString() {
    if ((window.location + "").toLowerCase().indexOf("jiant.debug_events") >= 0) {
      jiant.DEBUG_MODE.events = 1;
    }
    if ((window.location + "").toLowerCase().indexOf("jiant.debug_states") >= 0) {
      jiant.DEBUG_MODE.states = 1;
    }
    if ((window.location + "").toLowerCase().indexOf("jiant.debug_ajax") >= 0) {
      jiant.DEBUG_MODE.ajax = 1;
    }
  }

  function _bindUi(prefix, root, devMode) {
    jiant.DEV_MODE = devMode;
    if (! devMode) {
      maybeSetDevModeFromQueryString();
    }
    maybeSetDebugModeFromQueryString();
    errString = "";
    bindingsResult = true;
    if (! root.id) {
      jiant.logError("!!! Application id not specified. Not recommended since 0.20. Use 'id' property of application root to specify application id");
    } else {
      jiant.logInfo("Loading application, id: " + root.id);
    }
    if (root.views) {
      _bindViews(prefix, root.views, root);
    } else {
      root.views = {};
    }
    if (root.templates) {
      _bindTemplates(prefix, root.templates, root);
    } else {
      root.templates = {};
    }
    if (root.ajax) {
      _bindAjax(root.ajax, root.ajaxPrefix, root.ajaxSuffix, root.crossDomain);
    } else {
      root.ajax = {};
    }
    if (root.events) {
      _bindEvents(root.events);
    } else {
      root.events = {};
    }
    if (root.states) {
      _bindStates(root.states, root.stateExternalBase);
    } else {
      root.states = {};
    }
    if (root.models) {
      _bindModels(root.models);
    } else {
      root.models = {};
    }
    if (jiant.DEV_MODE && !bindingsResult) {
      alert("Some elements not bound to HTML properly, check console" + errString);
    }
    var appId = (root.id ? root.id : "no_app_id");
    uiBoundRoot[appId] = root;
    var eventId = "jiant_uiBound_" + appId;
    eventBus.trigger(eventId);
    refreshState();
  }

  function bindUi(prefix, root, devMode, viewsUrl, injectId) {
    var startedAt = new Date().getMilliseconds();
    if (viewsUrl) {
      var injectionPoint = injectId ? $("#" + injectId) : $("body");
      injectionPoint.load(viewsUrl, {}, function() {
        _bindUi(prefix, root, devMode);
      });
    } else {
      _bindUi(prefix, root, devMode);
    }
    jiant.logInfo("UI bound in " + (new Date().getMilliseconds() - startedAt) + "ms");
  }

  function bind(obj1, obj2) {
    $.extend(obj1, obj2);
  }

  function onUiBound(appId, cb) {
    if (! cb) {
      jiant.logError("!!! Registering anonymous logic without application id. Not recommended since 0.20");
      cb = appId;
      appId = "no_app_id";
    } else {
      if ($.isPlainObject(appId)) {
        appId = appId.id;
      }
    }
    if (uiBoundRoot[appId]) {
      cb && cb($, uiBoundRoot[appId]);
    } else {
      var eventId = "jiant_uiBound_" + appId;
      eventBus.on(eventId, function() {
        cb && cb($, uiBoundRoot[appId]);
      });
    }
  }

  return {
    AJAX_PREFIX: "",
    AJAX_SUFFIX: "",
    DEV_MODE: false,
    DEBUG_MODE: {
      states: 0,
      events: 0,
      ajax: 0
    },
    PAGER_RADIUS: 6,
    isMSIE: eval("/*@cc_on!@*/!1"),
    STATE_EXTERNAL_BASE: undefined,

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
    formatDate: formatDate,
    formatTime: formatTime,
    formatTimeSeconds: formatTimeSeconds,
    grid: grid,
    image: image,
    input: input,
    inputDate: inputDate,
    inputInt: inputInt,
    label: label,
    lookup: lookup,
    on: on,
    pager: pager,
    slider: slider,
    stub: stub,
    tabs: tabs,

    key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
      escape: 27,
      a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54}

  };

})(jQuery);
