/*
  4.00 jiant broken on modules, loaded when used by application
  4.01 bindXXX methods (see docs), bindTree initial version
  4.02 app.cacheInStorage enables modules cache in local storage
  4.03 jiant cache disabling - jiant.disableCache = true, core log calls filtered by DEV_MODE again
 */
"use strict";
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    factory(jQuery);
  }
}(function($) {

  const jsrc = document.currentScript.src, j2s = "jiant.js",
      jiantPath = jsrc.substring(0, jsrc.indexOf(j2s));

  const addedLibs = {},
      loadedLibs = {},
      loadingLibs = {},
      moduleLoads = [],
      modules = {},
      singletones = {},
      eventBus = $({}),
      preApping = {},
      boundApps = {},
      bindingCurrently = {},
      pre = {};

  function getAt(tpOrArr, pos) {
    if (! Array.isArray(tpOrArr)) {
      return pos === 0 ? tpOrArr : null;
    }
    let ret;
    tpOrArr.some(function(item, i) {
      if (item === jiant.optional) {
        pos++;
      }
      if (i === pos) {
        ret = item;
        return true;
      }
    });
    return ret;
  }

  function setupLookup(viewRoot, componentId, viewElem, prefix) {
    viewRoot[componentId] = function() {return viewElem.find("." + prefix + componentId);};
  }

  // loadModule before .app puts module into list of app modules, cb ignored
  // loadModule during .app executes module immediately
  // loadModule after .app executes module immediately
  function loadModule(app, modules, cb, replace, injectTo) {
    const appId = extractApplicationId(app);
    if (! Array.isArray(modules)) {
      modules = [modules];
    }
    if (boundApps[appId]) { // after
      _loadModules(boundApps[appId], modules, appId, false, cb, replace, injectTo);
    } else if (bindingCurrently[appId]) { // during
      _loadModules(bindingCurrently[appId], modules, appId, false, cb, replace, injectTo);
    } else { // before
      if (cb) {
        console.error("loadModule called before .app with callback, callback will be ignored. loadModule arguments: ");
        console.error(arguments);
      }
      preApp(appId, function($, app) {
        modules.forEach(function(m) {
          app.modules.push(m);
        });
      });
    }
  }

  function _loadModules(appRoot, root, appId, initial, cb, replace, injectTo) {
    let modules2load = [];
    cb = cb || function() {};
    if ($.isPlainObject(root)) {
      modules2load = parseObjectModules(root, appId);
    } else if (Array.isArray(root)) {
      modules2load = parseArrayModules(root, appId);
    } else {
      jiant.logError("Unrecognized modules type", root);
    }
    if (modules2load.length) {
      modules2load.forEach(function(m) {
        m.replace = replace;
        m.injectTo = injectTo;
      });
      loadModules(appRoot, appId, modules2load, initial, cb);
    } else {
      cb();
    }
  }

  function executeExternal(appRoot, cb, arr, idx, module) {
    module.css && module.css.some(function(url) {
      if (addedLibs[url]) {
        return true;
      }
      addedLibs[url] = 1;
      if (module.cssLoaded[url]) {
        const css = module.cssLoaded[url] + "\r\n/*# sourceURL=" + url + " */\r\n";
        $("<style>").html(css).appendTo("head");
      }
    });
    module.html && module.html.forEach(function(url) {
      // if (addedLibs[url]) {
      //   return;
      // }
      addedLibs[url] = 1;
      if (module.htmlLoaded[url]) {
        const html = "<!-- sourceUrl = " + url + " -->" + module.htmlLoaded[url] + "<!-- end of source from " + url + " -->";
        const inj = arr[idx].injectTo ? $(arr[idx].injectTo) : $("body");
        if (arr[idx].replace) {
          inj.html(html);
        } else {
          inj.append($(html));
        }
      }
    });
    module.js && module.js.some(function(url) {
      if (addedLibs[url]) {
        return true;
      }
      addedLibs[url] = 1;
      if (module.jsLoaded[url]) {
        const js = module.jsLoaded[url] + "\r\n//# sourceURL=" + url + " \r\n";
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
    const moduleSpec = arr[idx],
        mname = moduleSpec.name,
        module = modules[mname];
    if (typeof module === "function") {
      const args = [$, appRoot, jiant, moduleSpec];
      module.parsedDeps && module.parsedDeps.forEach(function(name) {
        args.push(appRoot.modules[name]);
      });
      if (!module.singleton) {
        appRoot.modules[mname] = module.apply({singleton: function() {
            module.singleton = true;
          }}, args);
        if (module.singleton) {
          singletones[mname] = appRoot.modules[mname];
        }
      } else {
        appRoot.modules[mname] = singletones[mname];
      }
      executeModule(appRoot, cb, arr, idx + 1);
    } else if ($.isPlainObject(module)) {
      executeExternal(appRoot, cb, arr, idx, module);
    } else {
      jiant.errorp("Application !!. Not loaded module !!. " +
          "Possible error - wrong modules section, wrong path or module name in js file doesn't match declared " +
          "in app.modules section. Load initiated by !!",
          appRoot.id, mname, (moduleSpec.j_initiatedBy ? moduleSpec.j_initiatedBy : "appication"));
      executeModule(appRoot, cb, arr, idx + 1);
    }
  }

  function cbIf0() {
    for (let i = 0; i < moduleLoads.length; i++) {
      const load = moduleLoads[i];
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
    for (const i in modules2load) {
      const mName = modules2load[i].name,
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
    const arr = [];
    modules2load.forEach(function(moduleSpec) {
      arr.push(moduleSpec);
    });
    arr.sort(function(a, b) {
      return nvl(a.order, 0) - nvl(b.order, 0);
    });
    executeModule(appRoot, cb, arr, 0);
    return true;
  }

  function nvl(val, defVal, path) {
    if (val === undefined || val === null) {
      return defVal;
    }
    if (path) {
      const v = typeof val[path] === "function" ? val[path]() : val[path];
      if (v === undefined || v === null) {
        return defVal;
      }
      return v;
    }
    return val;
  }

  function addIfNeed(modules2load, depModule) {
    let found = false;
    modules2load.some(function(moduleSpec) {
      if (moduleSpec.name === depModule.name) {
        found = true;
        moduleSpec.order = Math.min(moduleSpec.order, depModule.order);
        return true;
      }
    });
    !found && modules2load.push(depModule);
  }

  function isCacheInStorage(appRoot) {
    return !jiant["disableCache"] && !!appRoot["cacheInStorage"];
  }

  function cacheKey(appRoot, moduleName) {
    return moduleName + "_" + appRoot["id"] + "_" + appRoot["cacheInStorage"];
  }

  function isPresentInCache(appRoot, moduleName) {
    return !!localStorage.getItem(cacheKey(appRoot, moduleName));
  }

  function _loadModule(appRoot, appId, modules2load, initial, cb, moduleSpec, loading) {
    let url;

    function loadDep(relpath, dep, moduleSpec) {
      let url = moduleSpec.path,
          pos = url.lastIndexOf("/") + 1,
          relurl = url.substring(0, pos) + relpath;
      (relurl.lastIndexOf("/") === relurl.length - 1) || (relurl+="/");
      const depObj = typeof dep === "string" ? {name: dep, path: relurl + dep} : dep,
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
        jiant.errorp("Dependencies for module should be array, not string, error in module: !!, module url: !!", moduleName, url);
        modules[moduleName].deps = [modules[moduleName].deps];
      }
      const deps = modules[moduleName].deps,
          darr = modules[moduleName].parsedDeps = [];
      deps && deps.forEach(function(dep) {
        if (typeof dep === "string") {
          darr.push(loadDep("", dep, moduleSpec))
        } else {
          $.each(dep, function(path, arr) {
            if (! Array.isArray(arr)) {
              arr = [arr];
            }
            arr.forEach(function(val) {
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

    const moduleName = moduleSpec.name;
    if (!modules[moduleName]) {
      jiant.DEV_MODE && console.info(appId + ". Loading module " + moduleSpec.name + ", initiated by " + (moduleSpec.j_initiatedBy ? moduleSpec.j_initiatedBy : "application "));
    // } else {
    //   console.info(appId + ". Using module " + moduleSpec.name + ", requested by " + (moduleSpec.j_initiatedBy ? moduleSpec.j_initiatedBy : "application"));
    }
    if (typeof moduleName != "string") {
      console.error("Wrong module declaration, possibly used array instead of object, moduleSpec:");
      console.error(moduleSpec);
      return;
    }
    if (!loading[moduleName]) {
      if (!modules[moduleName]) {
        if (isCacheInStorage(appRoot) && isPresentInCache(appRoot, moduleName)) {
          jiant.DEV_MODE && console.info("           using module cache: " + cacheKey(appRoot, moduleName));
          const moduleContent = localStorage.getItem(cacheKey(appRoot, moduleName));
          $.globalEval(moduleContent);
          preprocessLoadedModule(moduleSpec, modules[moduleName]);
          cbIf0();
        } else {
          loading[moduleName] = 1;
          const useExact = "exactUrl" in moduleSpec;
          url = useExact ? moduleSpec.exactUrl : isCouldBePrefixed(moduleSpec.path) ? ((appRoot.modulesPrefix || "") + moduleSpec.path) : moduleSpec.path;
          if (!useExact) {
            url = url + ".js" + (appRoot.modulesSuffix || "");
          }
          jiant.DEV_MODE && console.info("           module url: " + url);
          $.ajax({
            url: url,
            method: "GET",
            timeout: appRoot.modulesTimeout || 15000,
            cache: true,
            crossDomain: true,
            dataType: "text"
          }).done(function(data) {
            $.globalEval(data);
            if (isCacheInStorage(appRoot)) {
              localStorage.setItem(cacheKey(appRoot, moduleName), data);
            }
            if (modules[moduleName]) {
              preprocessLoadedModule(moduleSpec, modules[moduleName]);
            }
          }).fail(function() {
            console.error("Application " + appId + ". Not loaded module " + moduleName);
          }).always(function() {
            if (loading[moduleName]) {
              delete loading[moduleName];
              cbIf0();
            }
          });
        }
      } else {
        preprocessLoadedModule(moduleSpec, modules[moduleName]);
      }
    }
  }

  function loadModules(appRoot, appId, modules2load, initial, cb) {
    const loading = {};
    moduleLoads.push({
      appRoot: appRoot, modules2load: modules2load, initial: initial, cb: cb, loading: loading
    });
    modules2load.forEach(function(moduleSpec) {
      _loadModule(appRoot, appId, modules2load, initial, cb, moduleSpec, loading);
    });
    cbIf0();
  }

  function parseArrayModules(root, appId) {
    let ret = [], j = 0;
    root.forEach(function(module) {
      if (typeof module === "string") {
        ret.push(parseObjModule(module, {path: module}, appId, j));
      } else {
        $.each(module, function(key, val) {
          if (typeof val === "string") {
            ret.push(parseObjModule(val, {path: key + "/" + val}, appId, j));
          } else if (Array.isArray(val)) {
            val.forEach(function(subval) {
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
    let ret = [], i = 0;
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
    const mname = module.name || name;
    "order" in module || (module.order = j);
    "path" in module || (module.path = name);
    module.j_after = {};
    module.name = mname;
    return module;
  }

  function preparePath(module, path) {
    if (module[path]) {
      if (!Array.isArray(module[path])) {
        module[path] = [module[path]];
      }
      module[path + "Count"] = module[path + "Count"] ? (module[path + "Count"] + module[path].length) : module[path].length;
      module[path + "Loaded"] = {};
    }
  }

  function loadPath(module, path) {
    if (module[path]) {
      module[path].forEach(function(url) {
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
            const waiters = loadingLibs[url];
            delete loadingLibs[url];
            waiters.forEach(function(w) {
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
    if (!modules[name]) {
      modules[name] = cb;
      modules[name].deps = deps;
      jiant.DEV_MODE && console.info("registered module " + name);
    }
  }

// ------------ base staff ----------------

  function isCouldBePrefixed(url) {
    return ! (url.substring(0, 1) === "/" || url.substring(0, 7) === "http://" || url.substring(0, 8) === "https://");
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

  function bindTree(app, tree) {
    _bindUi(app, tree);
    return tree;
  }

  function _bindUi(root, tree) {
    const appLoader = {id: root.id + "_JLoader", modules: ["jiant-log", "jiant-util"], modulesPrefix: jiantPath, cacheInStorage: jiant.version()};
    //todo: xl to module
    //todo: logic extraction
    //todo: storage caching with versioning
    //todo: final cleanup/review

    // order is important
    if (!String.prototype.startsWith || !String.prototype.endsWith) {
      appLoader.modules.push("jiant-poly");
    }
    ["intl", "views", "templates", "ajax", "events", "semaphores", "states", "models", "logic"].forEach(function(moduleName) {
      if (moduleName in tree || (moduleName === "intl" && "logic" in tree && moduleName in tree.logic)) {
        appLoader.modules.push("jiant-" + moduleName);
      }
    });
    __bindUi(appLoader, appLoader);
    onApp(appLoader, function() {
      __bindUi(root, tree, appLoader);
    });
  }

  function __bindUi(root, tree, appLoader) {
    maybeSetDevModeFromQueryString();
    const appId = (root.id ? root.id : "no_app_id");
    if (! root.id) {
      jiant.logError("!!! Application id not specified. Not recommended since 0.20. Use 'id' property of application root to specify application id");
    }
    if (boundApps[appId] && root === tree) {
      jiant.logError("Application '" + appId + "' already loaded, skipping multiple bind call");
      return;
    }
    maybeShort(tree, "logic", "l");
    maybeShort(tree, "intl", "i");
    maybeShort(tree, "views", "v");
    maybeShort(tree, "templates", "t");
    maybeShort(tree, "ajax", "a");
    maybeShort(tree, "events", "e");
    maybeShort(tree, "semaphores", "sem");
    maybeShort(tree, "states", "s");
    maybeShort(tree, "models", "m");
    tree.modules = tree.modules || [];
    if (root === tree) {
      preApping[appId] = root;
      if (pre[appId]) {
        pre[appId].forEach(function(cb) {
          cb($, root, jiant);
        });
        delete pre[appId];
      }
      if (appId !== "*" && pre["*"]) {
        pre["*"].forEach(function(cb) {
          cb($, root, jiant);
        });
      }
      delete preApping[appId];
      bindingCurrently[appId] = root;
    }
    if (tree.modulesSpec) {
      tree.modules = tree.modulesSpec;
    }
    _loadModules(root, tree.modules, appId, true, function() {
      // intlPresent && _bindIntl(root, root.intl, appId);
      // views after intl because of nlabel proxies
      appLoader && $.each(appLoader.modules, function(i, module) {
        if ("apply" in module) {
          module.apply(root, tree);
        }
      });
      if (root === tree) {
        boundApps[appId] = root;
        jiant.DEV_MODE && console.info(appId + " bound");
        if ("jiant-logic" in singletones) {
          singletones["jiant-logic"].afterBind(appId);
        }
        delete bindingCurrently[appId];
        eventBus.trigger(appBoundEventName(appId));
      }
      appLoader && (delete boundApps[appLoader.id]);
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
    if (viewsUrl) {
      let injectionPoint;
      if (injectId) {
        injectionPoint = $("#" + injectId);
        if (!injectionPoint[0]) {
          injectionPoint = $("<div id='" + injectId + "' style='display:none'></div>");
          $("body").append(injectionPoint);
        }
      } else {
        injectionPoint = $("body");
      }
      injectionPoint.load(viewsUrl, null, function () {
        _bindUi(root, root);
      });
    } else {
      _bindUi(root, root);
    }
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
    if (!cb && !dependenciesList) {
      jiant.error("!!! Registering anonymous logic without application id. Not recommended since 0.20");
      cb = appIdArr;
      appIdArr = ["no_app_id"];
    } else if (! cb) {
      cb = dependenciesList;
      dependenciesList = [];
    }
    if (!Array.isArray(appIdArr)) {
      appIdArr = [appIdArr];
    }
    if (appIdArr.length > 1 && Array.isArray(dependenciesList) && dependenciesList.length > 0) {
      dependenciesList.forEach(function(arr) {
        if (!Array.isArray(arr)) {
          jiant.error("Used multiple applications onApp and supplied wrong dependency list, use multi-array, " +
              "like [[app1DepList], [app2DepList]]");
        }
      })
    } else if (appIdArr.length === 1 && dependenciesList && dependenciesList.length) {
      dependenciesList = [dependenciesList];
    } else if (! dependenciesList) {
      dependenciesList = [];
    }
    appIdArr.forEach(function(appId, idx) {
      if (appId === undefined || appId === null) {
        jiant.logError("Called onApp with undefined application, apps array is ", appIdArr);
      } else if ($.isPlainObject(appId)) {
        appId = appId.id;
        appIdArr[idx] = appId;
      }
      if (dependenciesList[idx] && dependenciesList[idx].length > 0) {
        jiant.loadModule(appId, "jiant-logic", function() {
          singletones["jiant-logic"].beforeBind(appId, dependenciesList[idx], cb);
        });
      }
    });
    handleBoundArr(appIdArr, cb);
  }

  function preApp(appId, cb) {
    if (typeof appId != "string") {
      jiant.errorp("preApp first parameter must be application id string, got !!", typeof appId);
    } else if (boundApps[appId]) {
      jiant.errorp("Application !! already bound, preApp should be called before bindUi", appId);
    } else if (bindingCurrently[appId]) {
      jiant.errorp("Application !! binding in progress, preApp should be called before bindUi", appId);
    } else {
      const arr = pre[appId] = nvl(pre[appId], []);
      arr.push(cb);
      if (preApping[appId]) {
        cb($, preApping[appId], jiant);
      }
    }
  }

  function handleBoundArr(appIdArr, cb) {
    let allBound = true;
    appIdArr.some(function(appId) {
      if (! boundApps[appId]) {
        eventBus.one(appBoundEventName(appId), function() {
          handleBoundArr(appIdArr, cb);
        });
        allBound = false;
        return true;
      }
    });
    if (allBound) {
      let allDependsResolved = true, params = [$];
      appIdArr.some(function(appId) {
        if ("jiant-logic" in singletones) {
          allDependsResolved = singletones["jiant-logic"].isDependResolved(appId, {
            depCb: cb,
            callCb: function() {
              handleBoundArr(appIdArr, cb);
            }
          });
        }
        if (!allDependsResolved) {
          return true;
        }
        params.push(boundApps[appId]);
      });
      allDependsResolved && cb.apply(cb, params);
    }
  }

  function appBoundEventName(appId) {
    return appId + "jiant_uiBound_" + appId;
  }

  function optional(tp) {
    return Array.isArray(tp) ? [optional, ...tp] : [optional, tp];
  }

  function fn(f) {
    return [fn, f];
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
    const arr = [meta, ...arguments];
    return arguments.length === 0 ? meta : arr;
  }

  function version() {
    return 402;
  }

  function Jiant() {}

  Jiant.prototype = {
    AJAX_PREFIX: "",
    AJAX_SUFFIX: "",
    DEV_MODE: false,
    ADD_TM_TAGS: true,
    PAGER_RADIUS: 6,
    LIB_LOAD_TIMEOUT: 15000,
    isMSIE: eval("/*@cc_on!@*/!1"),
    STATE_EXTERNAL_BASE: undefined,
    extractApplicationId: extractApplicationId,
    setupLookup: setupLookup,

    bindUi: bindUi,
    app: app,
    module: module,
    loadModule: loadModule,
    onUiBound: onApp,
    onApp: onApp,
    preUiBound: preApp,
    preApp: preApp,
    bindTree: bindTree,

    version: version,
    nvl: nvl,

    getApps: function() {return boundApps},
    getAt: getAt,

    optional: optional,

    comp: comp,

    meta: meta,
    cssFlag: cssFlag,
    cssMarker: cssMarker,
    fn: fn,
    data: data,
    lookup: function (selector) {},
    transientFn: function(val) {},

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
    pager: "jiant.pager",
    slider: "jiant.slider",
    tabs: "jiant.tabs",
    numLabel: "jiant.numLabel",

    et: { // element types
      ctl2state: "jiant.ctl2state",
      ctl2root: "jiant.ctl2root",
      ctlBack: "jiant.ctlBack"
    },
    flags: {},
    intro: {},

    key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
      escape: 27, dot: 190, dotExtra: 110, comma: 188,
      a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
      f1: 112, f2: 113, f3: 114, f4: 115, f5: 116, f6: 117, f7: 118, f8: 119, f9: 120}

  };

  return window.jiant || (window.jiant = new Jiant());

}));
