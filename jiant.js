/*
 1.15: reverse binding via propagate(.., .., true) - for .val elements
 1.15.1: model function fields extracted for ajax call
 1.16: empty state "" auto-added, if states declared
 1.17: jiant.pager.refreshPage() added to refresh current pager page and trigger all listeners
 1.18: cssMarker tuned, also adds both componentId_value and componentId classes, removes completely for undefined vals
 1.19: model.data() function added, returns source data unchanged, for most lazy data usage with other model benefits
 1.19.1: pager minor behaviour fix
 1.20: model ajax parse fix
 1.21: collection proxy functions added to models
 1.22: collection functions fix - setters didn't work, now ok
 1.23: jiant.data ctl type added for views/templates, saves provided data to data-name attribute, fld: jiant.data, view.fld() === view.attr("data-fld")
 1.24: jiant lifecycle application listeners added, via addListener(listener)/removeListener(listener), logger separated
 1.25: listeners methods used when available, built-in state debuggers extracted to listeners, DEBUG_MODE.states removed
 1.26: ajax logging moved to listener, debugAjax.js
 1.27: debugEvents removed, debugData removed, DEBUG_MODE removed, listener methods renamed
 1.28: parsedTemplate added to listeners
 1.29: getCurrentState now accepts application, not only id as before
 1.30: state.start parameters now passed as integers, if they are integers
 1.31: overlapped multiple cssMarker in templates fixed
 1.32: obj.remove() now works, same as model.remove(obj)
 1.33: multiple cssMarkers on single element fixed for views
 1.34: re-commit previous fix, and removed setting of field name class in cssMarker
 1.35: add, addAll fixed - now doing subscribers notification when all fields are set
 1.36: non-empty model functions supported, using this. reference to refer to other object methods
 1.37: model function add() removed, addAll() should be used instead. To avoid mess in events
 1.38: redone of previous fix, add() remains, addAll() produces alert about need to replace it and doesn't work more
 1.39: customRenderer(obj, elem) available for view and template instances, called once per propagate(), doesn't subscribe for updates, useful for template UI setup
 1.40: added utility function getURLParameter(name)
 1.41: reverse binding off for view re-propagation scenario
 1.42: fixed external logic declaration scenario - .declare call between bind performed and dependency declared
 1.43: .declare accepts function as 2nd parameter: jiant.declare("name", function($, app)), it should return logic implementation
 1.44: added to jiant.image reload(url) functions
 1.45: added new field type cssFlag, works like name_true, name_false, but sets/removes "name" css class only, without suffix
 1.46: reverse binding for checkboxes implemented, propagate setting of non-string values for select input implemented
 1.47: jiant.asObjArray(arr, name[, idxName]) converts [2, 3, 5] to [{name: 2}, {name: 3}, {name: 5}], optional {name:2, idxName: 0}
 1.48: nlabel now also translates arrays, returning comma separated translations, nlabel works for templates 
 */
(function() {
  var
    DefaultUiFactory = function() {

      function view(prefix, viewId) {
        return $("#" + prefix + viewId);
      }

      function viewComponent(viewElem, viewId, prefix, componentId, componentContent) {
        return viewElem.find("." + prefix + componentId);
      }

      function template(prefix, tmId, tmContent) {
        return $("#" + prefix + tmId);
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

    tmpJiant = (function($) {

      var collection = {},
        container = {},
        containerPaged = {},
        ctl = {},
        form = {},
        fn = function (param) {
        },
        grid = {},
        image = {},
        input = {},
        inputInt = {},
        inputFloat = {},
        inputDate = {},
        label = {},
        nlabel = {},
        meta = {},
        cssMarker = {},
        cssFlag = {},
        data = function (val) {
        },
        lookup = function (selector) {
        },
        on = function (cb) {
        },
        goState = function (params, preserveOmitted) {
        },
        pager = {},
        slider = {},
        stub = function () {
          var callerName = "not available";
          if (arguments && arguments.callee && arguments.callee.caller) {
            callerName = arguments.callee.caller.name;
          }
          alert("stub called from function: " + callerName);
        },
        tabs = {},

        bindingsResult = true,
        errString,

        pickTime,
        lastStates = {},
        lastEncodedStates = {},
        loadedLogics = {},
        awaitingDepends = {},
        externalModules = {},
        eventBus = $({}),
        uiBoundRoot = {},
        onInitAppActions = [],
        uiFactory = new DefaultUiFactory(),
        statesUsed = {},
        listeners = [],
        modelInnerDataField = "jiant_innerData";

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
        return decodeURI((new RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]);
      }

      function pick(marker) {
        var now = new Date().getTime();
        if (pickTime) {
          info((marker ? marker : "jiant.pick:") + " " + (now - pickTime) + "ms");
        }
        pickTime = now;
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

      function parseTemplate(that, data, tmId) {
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
          } else if (event.keyCode == jiant.key.backspace || event.keyCode == jiant.key.del
            || event.keyCode == jiant.key.end || event.keyCode == jiant.key.left || event.keyCode == jiant.key.right
            || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
            input.val(fit(input.valInt(), input.j_valMin, input.j_valMax));
          } else if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
            event.preventDefault();
            return false;
          } else {
            input.val(fit(input.valInt(), input.j_valMin, input.j_valMax));
          }
          return true;
        });
        input.change(function(event) {
          input.val(fit(input.valInt(), input.j_valMin, input.j_valMax));
          return false;
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
          } else if (event.keyCode == jiant.key.backspace || event.keyCode == jiant.key.del
            || event.keyCode == jiant.key.end || event.keyCode == jiant.key.left || event.keyCode == jiant.key.right
            || event.keyCode == jiant.key.home || event.keyCode == jiant.key.tab || event.keyCode == jiant.key.enter) {
            input.val(fit(input.valFloat(), input.j_valMin, input.j_valMax));
          } else if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105 )) {
            event.preventDefault();
            return false;
          } else {
            input.val(fit(input.val(), input.j_valMin, input.j_valMax));
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
          url = (appRoot.ajaxPrefix ? appRoot.ajaxPrefix : jiant.AJAX_PREFIX ? jiant.AJAX_PREFIX : "") + url;
          url = url + (appRoot.ajaxSuffix ? appRoot.ajaxSuffix : jiant.AJAX_SUFFIX ? jiant.AJAX_SUFFIX : "");
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
        window.console && window.console[method] && $.each(args, function(idx, arg) {
          window.console[method](arg);
        });
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
          root = $("<ul></ul>"),
          lastPage = 0;
        root.addClass("pagination");
        uiElem.append(root);
        uiElem.onValueChange = function(callback) {
          pagerBus.on("ValueChange", callback);
        };
        uiElem.refreshPage = function() {
          pagerBus.trigger("ValueChange", lastPage);
        };
        uiElem.updatePager = function(page) {
          root.empty();
          var from = Math.max(0, page.number - jiant.PAGER_RADIUS / 2),
            to = Math.min(page.number + jiant.PAGER_RADIUS / 2, page.totalPages);
          if (from > 0) {
            addPageCtl(1, "");
            addPageCtl(-1, "disabled emptyPlaceholder");
          }
          for (var i = from; i < to; i++) {
            var cls = "";
            if (i == page.number) {
              cls += " active";
            }
            addPageCtl(i + 1, cls);
          }
          if (to < page.totalPages - 1) {
            addPageCtl(-1, "disabled emptyPlaceholder");
          }
          if (to < page.totalPages) {
            addPageCtl(page.totalPages, "");
          }
        };
        function addPageCtl(value, ctlClass) {
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

      function _bindContent(appRoot, viewRoot, viewId, viewContent, viewElem, prefix) {
        var viewSpec = {};
        $.each(viewContent, function (componentId, componentContent) {
          viewSpec[componentId] = componentId;
          if (componentId != "appPrefix") {
            if (viewRoot[componentId] === jiant.lookup) {
              jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
              viewRoot[componentId] = function() {return viewElem.find("." + prefix + componentId);};
            } else if (viewRoot[componentId] === jiant.meta) {
              //skipping, app meta info
            } else if (viewRoot[componentId] === jiant.data) {
              viewRoot[componentId] = function(val) {
                if (arguments.length == 0) {
                  return viewRoot.attr("data-" + componentId);
                } else {
                  return viewRoot.attr("data-" + componentId, val);
                }
              };
              viewRoot[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
                viewRoot[componentId](val);
              }
            } else if (viewRoot[componentId] === jiant.cssMarker || viewRoot[componentId] === jiant.cssFlag) {
              var flag = viewRoot[componentId] === jiant.cssFlag,
                  prevNm = "j_prevMarkerClass_" + componentId;
              viewRoot[componentId] = {};
              viewRoot[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
                var cls = componentId + (flag ? "" : ("_" + val));
                viewOrTemplate[prevNm] && viewOrTemplate.removeClass(viewOrTemplate[prevNm]);
                if ((!flag && val !== undefined) || (flag && !!val)) {
                  viewOrTemplate[prevNm] = cls;
                  viewOrTemplate.addClass(cls);
                }
              };
            } else {
              var isNlabel = viewRoot[componentId] === nlabel,
                uiElem = uiFactory.viewComponent(viewElem, viewId, prefix, componentId, componentContent);
              ensureExists(prefix, appRoot.dirtyList, uiElem, prefix + viewId, prefix + componentId);
              viewRoot[componentId] = uiElem;
              isNlabel && setupIntlProxies(appRoot, viewRoot[componentId]);
              setupExtras(appRoot, uiElem, componentContent, viewId, componentId);
              //        logInfo("    bound UI for: " + componentId);
            }
          }
        });
        viewRoot._jiantSpec = viewSpec;
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

      function setupExtras(appRoot, uiElem, elemContent, key, elem) {
        if ((elemContent == jiant.tabs || elemContent.tabsTmInner) && uiElem.tabs) {
          uiElem.tabs();
          uiElem.refreshTabs = function() {uiElem.tabs("refresh");};
        } else if (elemContent == jiant.inputInt || elemContent.inputIntTmInner) {
          setupInputInt(uiElem);
        } else if (elemContent == jiant.inputFloat || elemContent.inputFloatTmInner) {
          setupInputFloat(uiElem);
        } else if ((elemContent == jiant.inputDate || elemContent.inputDateTmInner) && uiElem.datepicker) {
          uiElem.datepicker();
        } else if (elemContent == jiant.pager || elemContent.pagerTmInner) {
          setupPager(uiElem);
        } else if (elemContent == jiant.form || elemContent.formTmInner) {
          setupForm(appRoot, uiElem, key, elem);
        } else if (elemContent == containerPaged || elemContent.containerPagedTmInner) {
          setupContainerPaged(uiElem);
        } else if (elemContent == jiant.image || elemContent.imageTmInner) {
          setupImage(uiElem);
        } else if (elemContent == jiant.nlabel || elemContent.nlabelTmInner) {
          setupIntlProxies(appRoot, uiElem);
        }
        maybeAddDevHook(uiElem, key, elem);
      }

      function isServiceName(key) {
        var words = ["parseTemplate", "parseTemplate2Text", "propagate", "customRenderer"];
        return $.inArray(key, words) >= 0;
      }

      function makePropagationFunction(viewId, spec, obj, viewOrTm) {
        var map = {};
        $.each(spec, function (key, elem) {
          map[key] = elem;
        });
        var fn = function(data, subscribe4updates, reverseBinding) {
          subscribe4updates = (subscribe4updates === undefined) ? true : subscribe4updates;
          $.each(map, function (key, elem) {
            if (spec[key].customRenderer || (data && data[key] !== undefined && data[key] !== null && ! isServiceName(key))) {
              var val = data[key];
              elem = obj[key];
              if ($.isFunction(val)) {
                getRenderer(spec[key])(data, elem, val.apply(data), false, viewOrTm);
                if (subscribe4updates && $.isFunction(val.on)) {
                  if (fn[key]) {
                    var off = fn[key][0];
                    off && off(fn[key][1]);
                    fn[key][2] && elem.off("change", fn[key][2]);
                  }
                  var handler = val.on(function(obj, newVal) {getRenderer(spec[key])(data, elem, newVal, true, viewOrTm)});
                  fn[key] = [val.off, handler];
                }
              } else {
                getRenderer(spec[key])(data, elem, val, false, viewOrTm);
              }
              if (reverseBinding) {
                var backHandler = function(event) {
                  var tagName = elem[0].tagName.toLowerCase(),
                      tp = elem.attr("type");
                  if (tagName == "input" && tp == "checkbox") {
                    val(!!elem.prop("checked"));
                  } else {
                    val(elem.val());
                  }
                };
                elem.change && elem.val && elem.change(backHandler);
                fn[key] && fn[key].push(backHandler);
              }
            }
          });
          if (spec.customRenderer && $.isFunction(spec.customRenderer)) {
            spec.customRenderer(data, obj);
          }
        };
        return fn;
      }

      function getRenderer(obj) {
        if (obj && obj.customRenderer && $.isFunction(obj.customRenderer)) {
          return obj.customRenderer;
        } else {
          return updateViewElement;
        }
      }

      function updateViewElement(obj, elem, val, isUpdate, viewOrTemplate) {
        if (! elem || ! elem[0]) {
          return;
        }
        var types = ["text", "hidden", undefined];
        var tagName = elem[0].tagName.toLowerCase();
        if (tagName == "input" || tagName == "textarea" || tagName == "select") {
          var el = $(elem[0]),
            tp = el.attr("type");
          if ($.inArray(tp, types) >= 0) {
            val !== undefined && elem.val(val + "");
          } else if (tp == "checkbox") {
            elem.prop("checked", !!val);
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

      function _bindViews(appRoot, root, pfx, appUiFactory) {
        $.each(root, function(viewId, viewContent) {
          var prefix = viewContent.appPrefix ? viewContent.appPrefix : (pfx ? pfx : ""),
            view = appUiFactory.view(prefix, viewId),
            viewOk = ensureExists(prefix, appRoot.dirtyList, view, prefix + viewId);
          viewOk && _bindContent(appRoot, root[viewId], viewId, viewContent, view, prefix);
          ensureSafeExtend(root[viewId], view);
          root[viewId].propagate = makePropagationFunction(viewId, viewContent, viewContent, root[viewId]);
          $.extend(root[viewId], view);
          maybeAddDevHook(view, viewId, undefined);
          $.each(listeners, function(i, l) {l.boundView && l.boundView(appRoot, root, viewId, prefix, root[viewId])});
        });
      }

// ------------ templates ----------------

      function calcInnerTmKey(elem) {
        switch (elem) {
          case (jiant.label): return "labelTmInner";
          case (jiant.nlabel): return "nlabelTmInner";
          case (jiant.ctl): return "ctlTmInner";
          case (jiant.container): return "containerTmInner";
          case (jiant.containerPaged): return "containerPagedTmInner";
          case (jiant.form): return "formTmInner";
          case (jiant.pager): return "pagerTmInner";
          case (jiant.image): return "imageTmInner";
          case (jiant.grid): return "gridTmInner";
          case (jiant.input): return "inputTmInner";
          case (jiant.inputInt): return "inputIntTmInner";
          case (jiant.inputFloat): return "inputFloatTmInner";
          case (jiant.inputDate): return "inputDateTmInner";
          default: return "customTmInner";
        }
      }

      function parseTemplate2Text(tm, data) {
        return parseTemplate(tm, data);
      }

      function _bindTemplates(appRoot, root, pfx, appUiFactory) {
        $.each(root, function(tmId, tmContent) {
          var prefix = tmContent.appPrefix ? tmContent.appPrefix : (pfx ? pfx : ""),
            tm = appUiFactory.template(prefix, tmId, tmContent);
          $.each(tmContent, function (componentId, elemType) {
            if (componentId != "appPrefix") {
              if (elemType === jiant.lookup) {
                jiant.logInfo("    loookup element, no checks/bindings: " + componentId);
                tmContent[componentId] = function() {return tmContent.find("." + prefix + componentId);};
              } else if (elemType === jiant.meta) {
                //skipping, app meta info
              } else if (elemType === jiant.data) {
                //skipping, data function
                tmContent[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
                  viewOrTemplate[componentId](val);
                };
              } else if (elemType === jiant.cssMarker || elemType === jiant.cssFlag) {
                tmContent[componentId] = {};
                var flag = elemType === jiant.cssFlag,
                    markerName = "j_prevMarkerClass_" + componentId;
                tmContent[componentId].customRenderer = function(obj, elem, val, isUpdate, viewOrTemplate) {
                  var cls = componentId + (flag ? "" : ("_" + val));
                  viewOrTemplate[markerName] && viewOrTemplate.removeClass(viewOrTemplate[markerName]);
                  if ((!flag && val !== undefined) || (flag && !!val)) {
                    viewOrTemplate[markerName] = cls;
                    viewOrTemplate.addClass(cls);
                  }
                };
              } else {
                var comp = appUiFactory.viewComponent(tm, tmId, prefix, componentId, elemType);
                ensureExists(prefix, appRoot.dirtyList, comp, prefix + tmId, prefix + componentId);
                var innerTmKey = calcInnerTmKey(tmContent[componentId]);
                tmContent[componentId] = {};
                tmContent[componentId][innerTmKey] = true;
              }
            }
          });
          ensureExists(prefix, appRoot.dirtyList, tm, prefix + tmId);
          root[tmId].parseTemplate = function(data) {
            var retVal = $("<!-- -->" + parseTemplate(tm, data, tmId)); // add comment to force jQuery to read it as HTML fragment
            $.each(tmContent, function (elem, elemType) {
              if (elemType === jiant.data) {
                retVal[elem] = function(val) {
                  if (arguments.length == 0) {
                    return retVal.attr("data-" + elem);
                  } else {
                    return retVal.attr("data-" + elem, val);
                  }
                };
              } else if (elem != "parseTemplate" && elem != "parseTemplate2Text" && elem != "appPrefix") {
                retVal[elem] = $.merge(retVal.filter("." + prefix + elem), retVal.find("." + prefix + elem));
                setupExtras(appRoot, retVal[elem], root[tmId][elem], tmId, elem);
                maybeAddDevHook(retVal[elem], tmId, elem);
              }
            });
            retVal.splice(0, 1); // remove first comment
            retVal.propagate = makePropagationFunction(tmId, tmContent, retVal, retVal);
            data && retVal.propagate(data);
            retVal._jiantSpec = root[tmId];
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

      function assignAsapHandler(obj, eventName, fname) {
        obj[fname].asap = function(cb) {
          var val = obj[fname]();
          if (val != undefined) {
            cb && cb.apply(cb, [obj, val]);
          } else {
            obj[modelInnerDataField].one(eventName, function () {
              var args = $.makeArray(arguments);
              args.splice(0, 1);
              cb && cb.apply(cb, args);
            })
          }
        };
      }

      function assignOnOffHandlers(obj, eventName, fname, eventObject) {
        eventObject = eventObject ? eventObject : obj[modelInnerDataField];
        var fn = function (cb) {
            var handler = function () {
              var args = $.makeArray(arguments);
              args.splice(0, 1);
              //        args.splice(0, 2);
              cb && cb.apply(cb, args);
            };
            (fname ? obj[fname] : obj).listenersCount++;
            eventObject.on(eventName, handler);
            return handler;
          },
          fnOff = function (handler) {
            (fname ? obj[fname] : obj).listenersCount--;
            var res = eventObject.off(eventName, handler);
          };
        if (fname) {
          obj[fname].on = fn;
          obj[fname].off = fnOff;
          obj[fname].listenersCount = 0;
          assignAsapHandler(obj, eventName, fname);
        } else {
          obj.on = fn;
          obj.off = fnOff;
          obj.listenersCount = 0;
        }
      }

      function bindFunctions(name, spec, obj, appId) {
        var storage = [],
          modelStorageField = "_modelData",
          dataStorageField = "_sourceData",
          parentModelReference = "_parentModel",
          collectionFunctions = [];
        obj[modelStorageField] = {};
        if (spec.updateAll && spec.id) {
          if (! spec.update) spec.update = function(val) {};
          if (! spec.findById) spec.findById = function(val) {};
        }
        if (spec.updateAll) {
          if (! spec.add) spec.add = function(val) {};
          if (! spec.remove) spec.remove = function(elem) {};
        }
        if (! spec.update) {
          $.each(spec, function(fname, funcSpec) {
            if (fname.indexOf("set") == 0 && fname.length > 3 && ("" + funcSpec).indexOf("{}") == ("" + funcSpec).length - 2) {
              spec.update = function(val) {};
              return false;
            }
          });
        }
        if (! spec.asMap) {
          spec.asMap = function() {};
        }
        obj[modelInnerDataField] = $({});
        $.each(spec, function(fname, funcSpec) {
          var eventName = name + "_" + fname + "_event",
            globalChangeEventName = appId + name + "_globalevent";
//      jiant.logInfo("  implementing model function " + fname);
          if (fname == modelInnerDataField) {
          } else if (fname == "all") {
            obj[fname] = function() {
              var retVal = [];
              $.each(storage, function(idx, obj) {
                retVal.push(obj);
              });
              attachCollectionFunctions(retVal, collectionFunctions);
              return retVal;
            };
          } else if (fname == "on") {
            collectionFunctions.push(fname);
            assignOnOffHandlers(obj, globalChangeEventName, undefined, eventBus);
          } else if (fname == "update") {
            collectionFunctions.push(fname);
            obj[fname] = function(objFrom, treatMissingAsNulls) {
              var smthChanged = false;
              var toTrigger = {};
              obj[dataStorageField] = objFrom;
              treatMissingAsNulls && $.each(obj[modelStorageField], function(key, val) {
                objFrom[key] == undefined && (objFrom[key] = null);
              });
              $.each(objFrom, function(key, val) {
                if (obj[key] && $.isFunction(obj[key]) && obj[key]() != val) {
                  obj[key](val, false);
                  toTrigger[key] = true;
                  smthChanged = true;
                }
              });
              $.each(toTrigger, function(key, val) {
                obj[key](obj[key](), true, true);
              });
              if (smthChanged) {
                obj[modelInnerDataField].trigger(eventName, obj);
                obj != spec && spec[modelInnerDataField].trigger(eventName, obj);
                eventBus.trigger(globalChangeEventName, [obj, fname]);
              }
            };
            assignOnOffHandlers(obj, eventName, fname);
          } else if (fname == "updateAll") {
            obj[fname] = function(arr, removeMissing, matcherCb) {
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
                obj.remove(item);
              });
              toAdd.length > 0 && obj.add(toAdd);
            };
            assignOnOffHandlers(obj, eventName, fname);
          } else if (fname == "addAll") {
            alert("JIANT: Model function 'addAll' removed since 1.37, use previous versions or replace it by 'add'");
          } else if (fname == "add") {
            obj[fname] = function(arr) {
              if (arr == undefined || arr == null) {
                return;
              }
              arr = $.isArray(arr) ? arr : [arr];
              if (arr.length == 0) {
                return;
              }
              var newArr = [];
              function fn(item) {
                var newObj = {},
                  toTrigger = {};
                storage.push(newObj);
                newArr.push(newObj);
                newObj[dataStorageField] = item;
                newObj[parentModelReference] = obj;
                bindFunctions(name, spec, newObj, appId);
                $.each(item, function(name, param) {
                  if (newObj[name]) {
                    newObj[name](param, false);
                    toTrigger[name] = param;
                  }
                });
                $.each(toTrigger, function(key, val) {
                  newObj[key](newObj[key](), true, true);
                });
              }
              $.each(arr, function(idx, item) {
                fn(item);
              });
              obj[modelInnerDataField].trigger(eventName, [newArr]);
              eventBus.trigger(globalChangeEventName, [newArr, fname]);
              $.each(arr, function(idx, item) {
                newArr[idx].update && newArr[idx].update(item); // todo: replace by just trigger update event
              });
              return newArr;
            };
            assignOnOffHandlers(obj, eventName, fname);
          } else if (fname == "remove") {
            collectionFunctions.push(fname);
            obj[fname] = function(elem) {
              if (elem == undefined || elem == null) {
                obj[parentModelReference].remove(obj);
                return;
              }
              var prevLen = storage.length;
              storage = $.grep(storage, function(value) {return value != elem;});
              if (storage.length != prevLen) {
                obj[modelInnerDataField].trigger(eventName, [elem]);
                eventBus.trigger(globalChangeEventName, [elem, fname]);
              }
              return elem;
            };
            assignOnOffHandlers(obj, eventName, fname);
          } else if (fname.indexOf("findBy") == 0 && fname.length > 6) {
            var arr = fname.substring(6).split("And");
            obj[fname] = function() {
              var retVal = storage,
                outerArgs = arguments;
              function filter(arr, fieldName, val) {
                return $.grep(arr, function(item) {return val == undefined || item[fieldName]() == val});
              }
              $.each(arr, function(idx, name) {
                var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
                retVal = filter(retVal, fieldName, outerArgs[idx]);
              });
              return retVal[0];
            }
          } else if (fname.indexOf("listBy") == 0 && fname.length > 6) {
            var arr = fname.substring(6).split("And");
            obj[fname] = function() {
              var retVal = storage,
                outerArgs = arguments;
              function filter(arr, fieldName, val) {
                return $.grep(arr, function(item) {return val == undefined || item[fieldName]() == val});
              }
              $.each(arr, function(idx, name) {
                var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
                retVal = filter(retVal, fieldName, outerArgs[idx]);
              });
              attachCollectionFunctions(retVal, collectionFunctions);
              return retVal;
            }
          } else if (fname.indexOf("set") == 0 && fname.length > 3) {
            collectionFunctions.push(fname);
            var arr = fname.substring(3).split("And");
            obj[fname] = function() {
              var outerArgs = arguments,
                newVals = {};
              $.each(arr, function(idx, name) {
                var fieldName = name.substring(0, 1).toLowerCase() + name.substring(1);
                newVals[fieldName] = outerArgs[idx];
              });
              obj.update(newVals);
              return newVals;
            }
          } else if (fname == "asMap") {
            obj[fname] = function () {
              return obj[modelStorageField];
            }
          } else if (fname == "data") {
            obj[fname] = function () {
              return obj[dataStorageField];
            }
          } else if (isEmptyFunction(funcSpec) || spec[modelInnerDataField][fname]) {
            collectionFunctions.push(fname);
            spec[modelInnerDataField][fname] = true;
            obj[fname] = function(val, forceEvent, dontFireUpdate) {
              if (arguments.length == 0) {
                return obj[modelStorageField][fname];
              } else {
                if (forceEvent || (obj[modelStorageField][fname] !== val && forceEvent !== false)) {
                  var oldVal = obj[modelStorageField][fname];
                  obj[modelStorageField][fname] = val;
                  obj[modelInnerDataField].trigger(eventName, [obj, val, oldVal]);
                  obj != spec && spec[modelInnerDataField].trigger(eventName, [obj, val, oldVal]);
                  if (! dontFireUpdate) {
                    eventBus.trigger(globalChangeEventName, [obj, fname, val, oldVal]);
                  }
                } else {
                  obj[modelStorageField][fname] = val;
                }
                return obj[modelStorageField][fname];
              }
            };
            obj[fname].jiant_accessor = 1;
            assignOnOffHandlers(obj, eventName, fname);
          } else if (fname != "_modelData") {
            obj[fname] = funcSpec;
          }
        });
      }

      function attachCollectionFunctions(arr, collectionFunctions) {
        $.each(collectionFunctions, function(idx, fn) {
          arr[fn] = function() {
            var ret = [],
              args = arguments;
            $.each(arr, function(idx, obj) {
              ret.push(obj[fn].apply(obj, args));
            });
            return ret;
          }
        });
      }

      function isModelAccessor(fn) {
        return fn.jiant_accessor;
      }

      function isEmptyFunction(funcSpec) {
        return ("" + funcSpec).indexOf("{}") == ("" + funcSpec).length - 2
      }

      function _bindModels(appRoot, models, appId) {
        $.each(models, function(name, spec) {
          bindFunctions(name, spec, spec, appId);
          $.each(listeners, function(i, l) {l.boundModel && l.boundModel(appRoot, models, name, models[name])});
        });
      }

// ------------ logic staff ----------------

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
              $.each(spec, function(fname, fnbody) {
                if ($.isFunction(fnbody) && fname != "implement") {
                  if (! obj[fname]) {
                    jiant.logError("Logic function " + fname + " is not implemented by declared implementation");
                  } else {
                    spec[fname] = obj[fname];
                  }
                }
              });
              awakeAwaitingDepends(appId, name);
              (! loadedLogics[appId]) && (loadedLogics[appId] = {});
              loadedLogics[appId][name] = 1;
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
        $.each(awaitingDepends[appId], function() {len++});
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
        jiant.onUiBound(pseudoAppName, pseudoDeps, cb);
        jiant.bindUi({id: pseudoAppName}, devMode);
      }

      function declare(name, objOrUrlorFn) {
        var lib = typeof objOrUrlorFn === "string";
        function handle() {
          lib && jiant.info("Loaded external library " + objOrUrlorFn);
          externalModules[name] = lib ? {} : objOrUrlorFn;
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
        var obj = externalModules[name];
        if (obj && awaitingDepends[appId][name] && uiBoundRoot[appId]) {
          uiBoundRoot[appId].logic || (uiBoundRoot[appId].logic = {});
          uiBoundRoot[appId].logic[name] || (uiBoundRoot[appId].logic[name] = {});
          $.each($.isFunction(obj) ? obj($, uiBoundRoot[appId]) : obj, function(fname, fspec) {
            uiBoundRoot[appId].logic[name][fname] = fspec;
          });
        }
      }

      function checkForExternalAwaiters(appId, name) {
        if (externalModules[name] && awaitingDepends[appId][name] && uiBoundRoot[appId]) {
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

// ------------ events staff ----------------

      function _bindEvents(appRoot, events, appId) {
        $.each(events, function(name, spec) {
          events[name].listenersCount = 0;
          events[name].fire = function() {
            eventBus.trigger(appId + name + ".event", arguments);
          };
          events[name].on = function (cb) {
            var trace;
            events[name].listenersCount++;
            eventBus.on(appId + name + ".event", function () {
              var args = $.makeArray(arguments);
              args.splice(0, 1);
              cb && cb.apply(cb, args);
            });
          };
          $.each(listeners, function(i, l) {l.boundEvent && l.boundEvent(appRoot, events, name, events[name])});
        });
      }

// ------------ states staff ----------------

      function _bindStates(appRoot, states, stateExternalBase, appId) {
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
          stateSpec.go = go(name, stateSpec.root, stateExternalBase, appId);
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
            if (uiBoundRoot[appId] && ((name == "" && current.now.length == 0) || (current.now[0] == name))) {
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

      function go(stateId, root, stateExternalBase, appId) {
        return function() {
          var parsed = parseState(appId),
            prevState = parsed.now;
          parsed.now = [stateId];
          $.each(arguments, function(idx, arg) {
            if (arg != undefined) {
              parsed.now.push(pack(arg));
            } else if ((prevState[0] == stateId || isSameStatesGroup(appId, prevState[0], stateId)) && prevState[idx + 1] != undefined) {
//              info("reusing prev state param: " + prevState[idx + 1]);
              parsed.now.push(pack(prevState[idx + 1]));
            } else {
              parsed.now.push(pack(arg));
            }
          });
          if (prevState && (prevState[0] == stateId || isSameStatesGroup(appId, prevState[0], stateId))) {
            var argLen = arguments.length;
            while (argLen < prevState.length - 1) {
//              info("pushing prev state param: " + prevState[argLen]);
              parsed.now.push(pack(prevState[++argLen]));
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
          setState(parsed, stateExternalBase, appId);
        };
      }

      function isSameStatesGroup(appId, state0, state1) {
        var statesRoot = uiBoundRoot[appId].states;
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
          setState(parsed, undefined, appId); // external base not used
        }
        appId && _go(appId);
        !appId && $.each(getStates(), function(appId, state) {
          _go(appId);
        });
      }

      function setState(parsed, stateExternalBase, appId) {
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
//          jiant.logInfo("setting state: " + result);
        window.location.assign((extBase ? extBase : "") + "#" + result);
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

      var replacementMap = {
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
        var funStr = func.toString();
        return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
      }

      function _bindAjax(appRoot, root, ajaxPrefix, ajaxSuffix, crossDomain) {
        $.each(root, function(uri, funcSpec) {
          var params = getParamNames(funcSpec);
          params && params.length > 0 ? params.splice(params.length - 1, 1) : params = [];
          root[uri] = makeAjaxPerformer(appRoot, ajaxPrefix, ajaxSuffix, uri, params, $.isFunction(root[uri]) ? root[uri]() : undefined, crossDomain);
          root[uri]._jiantSpec = params;
          $.each(listeners, function(i, l) {l.boundAjax && l.boundAjax(appRoot, root, uri, root[uri])});
        });
      }

      function parseForAjaxCall(root, path, actual) {
        if ($.isArray(actual)) {
          root[path] = actual;
        } else if ($.isFunction(actual) && $.isFunction(actual.on)) { // model
          root[path] = actual();
        } else if ($.isPlainObject(actual)) {
          $.each(actual, function(key, value) {
            if (actual[modelInnerDataField]) { // model
              isModelAccessor(value) && parseForAjaxCall(root, key, value);
            } else {
              parseForAjaxCall(root, key, value);
            }
//        parseForAjaxCall(root, path + "." + key, value);
          });
        } else {
          root[path] = actual;
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
            url = hardUrl ? hardUrl : pfx + uri + sfx,
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
          $.ajax(url, settings);
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
              onUiBound(appRoot, ["intl"], function() {prev.call(elem, translate(appRoot, val));});
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
//        jiant.logInfo("Loading intl: ", intlRoot);
        if (! intlRoot.url) {
          error("Intl data url not provided, internationalization will not be loaded");
          return;
        }
        intlRoot.t = function(val) {};
        intlRoot.t.spec = true;
        intlRoot.t.empty = true;
        $.getJSON(intlRoot.url, function(data) {
          var implSpec = {};
          $.each(intlRoot, function(fname, fspec) {
            if (fspec.spec) {
              implSpec[fname] = implementIntlFunction(fname, fspec, data);
//              info("intl implementation assigned to ", fname);
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

      function implementIntlFunction(fname, fspec, data) {
        if (fname == "t") {
          return function(key) {
            return prepareTranslation(key, data[key]);
          }
        } else if (fspec.empty) {
          if (! fspec.params) {
            return function() {
              return prepareTranslation(fname, data[fname]);
            }
          } else {
            return function(param) {
              return prepareTranslation(fname + param, data[fname + param]);
            }
          }
        } else {
          return fspec;
        }
      }

// ------------ base staff ----------------

      function maybeSetDevModeFromQueryString() {
        if ((window.location + "").toLowerCase().indexOf("jiant.dev_mode") >= 0) {
          jiant.DEV_MODE = true;
        }
      }

      function maybeSetDebugModeFromQueryString() {
        /*
         if ((window.location + "").toLowerCase().indexOf("jiant.debug_events") >= 0) {
         jiant.DEBUG_MODE.events = 1;
         }
         if ((window.location + "").toLowerCase().indexOf("jiant.debug_states") >= 0) {
         jiant.DEBUG_MODE.states = 1;
         }
         if ((window.location + "").toLowerCase().indexOf("jiant.debug_ajax") >= 0) {
         jiant.DEBUG_MODE.ajax = 1;
         }
         if ((window.location + "").toLowerCase().indexOf("jiant.debug_data") >= 0) {
         jiant.DEBUG_MODE.data = 1;
         }
         */
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

      function _bindUi(prefix, root, devMode, appUiFactory) {
        jiant.DEV_MODE = devMode;
        ! devMode && maybeSetDevModeFromQueryString();
        maybeSetDebugModeFromQueryString();
        errString = "";
        bindingsResult = true;
        var appId = (root.id ? root.id : "no_app_id");
        if (! root.id) {
          jiant.logError("!!! Application id not specified. Not recommended since 0.20. Use 'id' property of application root to specify application id");
        }
        if (uiBoundRoot[appId]) {
          jiant.logError("Application '" + appId + "' already loaded, skipping multiple bind call");
          return;
        }
        maybeShort(root, "logic", "l");
        maybeShort(root, "intl", "i") && _bindIntl(root, root.intl, appId);
        // views after intl because of nlabel proxies
        maybeShort(root, "views", "v") && _bindViews(root, root.views, prefix, appUiFactory);
        maybeShort(root, "templates", "t") && _bindTemplates(root, root.templates, prefix, appUiFactory);
        maybeShort(root, "ajax", "a") && _bindAjax(root, root.ajax, root.ajaxPrefix, root.ajaxSuffix, root.crossDomain);
        maybeShort(root, "events", "e") && _bindEvents(root, root.events, appId);
        maybeShort(root, "states", "s") && _bindStates(root, root.states, root.stateExternalBase, appId);
        maybeShort(root, "models", "m") && _bindModels(root, root.models, appId);
        _bindLogic(root, root.logic, appId);
        jiant.DEV_MODE && !bindingsResult && alert("Some elements not bound to HTML properly, check console" + errString);
        uiBoundRoot[appId] = root;
        loadedLogics[appId] || (loadedLogics[appId] = {});
        $.each(externalModules, function(name, impl) {
          loadedLogics[appId][name] || (loadedLogics[appId][name] = externalModules[name]);
          copyLogic(appId, name);
          awakeAwaitingDepends(appId, name);
        });
        var appInitEvent = appId + "onAppInit" + appId;
        eventBus.trigger(appInitEvent);
        $.when.apply($, onInitAppActions).done(function() {eventBus.trigger(appBoundEventName(appId))});
      }

      function bindUi(prefix, root, devMode, viewsUrl, injectId) {
        if ($.isPlainObject(prefix)) { // no prefix syntax
          injectId = viewsUrl;
          viewsUrl = devMode;
          devMode = root;
          root = prefix;
          prefix = root.appPrefix;
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
            _bindUi(prefix, root, devMode, appUiFactory);
          });
        } else {
          _bindUi(prefix, root, devMode, appUiFactory);
        }
        $.each(listeners, function(i, l) {l.bindCompleted && l.bindCompleted(root)});
        devMode && setTimeout(function() {
          awaitingDepends.length > 0 && logError("Attention!! Some depends are not resolved", awaitingDepends);
        }, 10000);
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
          if ($.isPlainObject(appId)) {
            appId = appId.id;
            appIdArr[idx] = appId;
          }
          (! awaitingDepends[appId]) && (awaitingDepends[appId] = {});
          (! loadedLogics[appId]) && (loadedLogics[appId] = {});
          dependenciesList[idx] && $.each(dependenciesList[idx], function(idx, depName) {
            (!awaitingDepends[appId][depName]) && (awaitingDepends[appId][depName] = []);
            if ((!loadedLogics[appId][depName]) && externalModules[depName]) {
              copyLogic(appId, depName);
              checkForExternalAwaiters(appId, depName);
            }
            (!loadedLogics[appId][depName]) && awaitingDepends[appId][depName].push(cb);
          });
        });
        handleBoundArr(appIdArr, cb);
      }

      function handleBoundArr(appIdArr, cb) {
        var allBound = true;
        $.each(appIdArr, function(idx, appId) {
          if (! uiBoundRoot[appId]) {
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
            params.push(uiBoundRoot[appId]);
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
        if (uiBoundRoot[appId]) {
          jiant.logError("Defining and calling onUiBound() before onAppInit().");
        } else {
          var eventId = appId + "onAppInit" + appId;
          eventBus.on(eventId, function () {
            cb && cb($, uiBoundRoot[appId], readyCb);
          });
        }
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
        loadLibs(["https://raw.github.com/vecnas/jiant/master/graph.js"], function() {
          appId || $.each(uiBoundRoot, function(key, val) {
            appId = key;
            return false;
          });
          jiant.onUiBound(appId, ["jiantVisualizer"], function($, app) {
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

      function version() {
        return 148;
      }

      return {
        AJAX_PREFIX: "",
        AJAX_SUFFIX: "",
        DEV_MODE: true,
        PAGER_RADIUS: 6,
        isMSIE: eval("/*@cc_on!@*/!1"),
        STATE_EXTERNAL_BASE: undefined,
        getAwaitingDepends: getAwaitingDepends, // for application debug purposes

        bind: bind,
        bindUi: bindUi,
        declare: declare,
        loadLibs: loadLibs,
        goRoot: goRoot,
        goState: goState,
        onUiBound: onUiBound,
        onAppInit: onAppInit,
        refreshState: refreshState,
        getCurrentState: getCurrentState,
        setUiFactory: setUiFactory,
        visualize: visualize,

        handleErrorFn: defaultAjaxErrorsHandle,
        logInfo: logInfo,
        logError: logError,
        info: info,
        error: error,
        infop: infop,
        errorp: errorp,
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

        addListener: addListener,
        removeListener: removeListener,

        collection: collection,
        container: container,
        containerPaged: containerPaged,
        ctl : ctl,
        fn: fn,
        form: form,
        grid: grid,
        image: image,
        input: input,
        inputDate: inputDate,
        inputInt: inputInt,
        inputFloat: inputFloat,
        label: label,
        nlabel: nlabel,
        meta: meta,
        cssFlag: cssFlag,
        cssMarker: cssMarker,
        data: data,
        lookup: lookup,
        on: on,
        pager: pager,
        slider: slider,
        stub: stub,
        tabs: tabs,

        key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
          escape: 27, dot: 190, dotExtra: 110, comma: 188,
          a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54}

      };

    })(jQuery);

  if (! (window.jiant && window.jiant.version && window.jiant.version() >= tmpJiant.version())) {
    window.jiant = tmpJiant;
  }
})();
