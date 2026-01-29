/*
  4.00 jiant broken on modules, loaded when used by application
  4.01 bindXXX methods (see docs), bindTree initial version
  4.02 app.cacheInStorage enables modules cache in local storage
  4.03 jiant cache disabling - jiant.disableCache = true, core log calls filtered by DEV_MODE again
  4.04 jiant-xl autoload with app definition
  4.05 proper source for modules including cached
  4.06 jiant-events refactored to pure js, no batch off more, internal extra info storage for fields changed to object
  4.07 customRenderer replaced by renderer per element cb({obj, field, view, elem}), onRender added, module called with obj instead of array
  4.08 some renderer related tunings/debugs because of testing
  4.09 separation of spec for views/templates
  4.10 jsdoc commented, some fixes
 */
"use strict";
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    factory(jQuery);
  }
}(function($) {

  /**
   * Temp variables just to parse jiantPath
   * @type {string}
   */
  const jsrc = document.currentScript.src, j2s = "jiant.js";
  /**
   * Path to jiant location from jiant script url, used for jiant itself modules load as <b>app.modulesPrefix</b>
   * @type {string}
   */
  const jiantPath = jsrc.substring(0, jsrc.indexOf(j2s));

  /**
   * Tracks loaded external libs by url (external lib - {css: , js:, html:}), key is url, value is 1.
   * Used during load of external lib to prevent load of already loaded library
   * @type {{string:number}}
   */
  const addedLibs = {},
      /**
       * Used for loading external libs, contains content of loaded external lib (including css, html, js)
       * @type {Object}
       */
      loadedLibs = {},
      /**
       * Contains currently loading external lib url, and list of callbacks waiting for load
       * @type {{string:[string]}}
       */
      loadingLibs = {},
      /**
       * Contains list of module descriptors to load, starting with application modules
       * and with added dependencies for all modules.
       * @type {[{appRoot, modules2load, initial, cb, loading}]}
       */
      moduleLoads = [],
      /**
       * Contains all modules, already loaded by jiant. Key is module name, value is module definition function.
       * For module function set attribute deps - containing list of module dependencies
       * @type {{string: function}}
       */
      loadedModules = {},
      /**
       * Contains list of all modules, defined as singletones (module function executed only once, even if module used multiple times).
       * Key is module name, value is module definition function
       * @type {{string: function}}
       */
      singletones = {},
      /**
       * Event bus for application bound events, events identified by application id
       * @type {jQuery|HTMLElement|*}
       */
      appBoundEventBus = $({}),
      /**
       * List of application ids, on a stage of pre-app - code that should be executed before application binding.
       * Possible use is inter-application integration. Key - application id, value - application definition tree.
       * @type {{string:app}}
       */
      preApping = {},
      /**
       * List of successfully bound applications. Key is application id, value - application definition tree
       * @type {{string:app}}
       */
      boundApps = {},
      /**
       * List of applications currently in binding progress. Key is application id, value - application definition tree
       * @type {{string: app}}
       */
      bindingCurrently = {},
      /**
       * List of registered pre app binding callbacks. Key is application id, value - array of callbacks
       * @type {{string:[function]}}
       */
      preAppCallbacks = {};

  /**
   * Global singleton jiant instance
   * @type {jiant}
   */
  let jiantInstance;

  /**
   * Loads specified module or array of modules and possibly executes callback
   * loadModule before .app puts module into list of app modules, cb ignored
   * loadModule during .app executes module immediately
   * loadModule after .app executes module immediately
   */
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

  /**
   * Performs specified module or modules array loading
   */
  function _loadModules(appRoot, modules, appId, initial, cb, replace, injectTo) {
    let modules2load = [];
    cb = cb || function() {};
    if (isPlainObject(modules)) {
      modules2load = parseObjectModules(modules, appId);
    } else if (Array.isArray(modules)) {
      modules2load = parseArrayModules(modules, appId);
    } else {
      jiant.logError("Unrecognized modules type", modules);
    }
    if (modules2load.length) {
      modules2load.forEach((m) => {
        m.replace = replace;
        m.injectTo = injectTo;
      });
      loadModules(appRoot, appId, modules2load, initial, cb);
    } else {
      cb();
    }
  }

  /**
   * Executes loaded external module. Stores flag to addedLibs for loaded urls (css, html, javascript - all urls)
   * css is added to document head,
   * html appended to specified inject point or body
   * javascript executed immediately, like it was added as script tag
   */
  function executeExternal(appRoot, cb, arr, idx, module) {
    module.css && module.css.some(function(url) {
      if (addedLibs[url]) {
        return true;
      }
      addedLibs[url] = 1;
      if (module.cssLoaded[url]) {
        const css = module.cssLoaded[url] + "\r\n/*# sourceURL=" + url + " */\r\n";
        const style = $("<style>");
        jHtml(style, css);
        style.appendTo("head");
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
          jHtml(inj, html);
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
        globalEval(js);
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
        module = loadedModules[mname];
    if (typeof module === "function") {
      const args = {$, app: appRoot, jiant, params: moduleSpec};
      module.parsedDeps && module.parsedDeps.forEach(function(name) {
        args[name] = appRoot.modules[name];
        // args.push(appRoot.modules[name]);
      });
      if (!module.singleton) {
        console.info("Executing module " + mname);
        appRoot.modules[mname] = module.apply({singleton: function() {
            module.singleton = true;
          }}, [args]);
        if (module.singleton) {
          singletones[mname] = appRoot.modules[mname];
        }
        console.info("        executed " + mname);
      } else {
        appRoot.modules[mname] = singletones[mname];
      }
      executeModule(appRoot, cb, arr, idx + 1);
    } else if (isPlainObject(module)) {
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
          m = loadedModules[mName];
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

  function each(obj, cb) {
    if (!obj) {
      return obj;
    }
    if (Array.isArray(obj) || typeof obj.length === "number") {
      const len = obj.length;
      for (let i = 0; i < len; i++) {
        if (cb.call(obj[i], i, obj[i]) === false) {
          break;
        }
      }
      return obj;
    }
    for (const key in obj) {
      if (cb.call(obj[key], key, obj[key]) === false) {
        break;
      }
    }
    return obj;
  }

  function isFunction(val) {
    return typeof val === "function";
  }

  function isPlainObject(obj) {
    if (!obj || Object.prototype.toString.call(obj) !== "[object Object]") {
      return false;
    }
    const proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null;
  }

  function inArray(val, arr) {
    if (!arr) {
      return -1;
    }
    return arr.indexOf ? arr.indexOf(val) : Array.prototype.indexOf.call(arr, val);
  }

  function isNumeric(val) {
    if (val === null || val === undefined) {
      return false;
    }
    if (typeof val === "number") {
      return Number.isFinite(val);
    }
    if (typeof val === "string") {
      const s = val.trim();
      if (!s) {
        return false;
      }
      return Number.isFinite(Number(s));
    }
    return false;
  }

  function deepClone(val) {
    if (Array.isArray(val)) {
      return val.map(deepClone);
    }
    if (isPlainObject(val)) {
      const out = {};
      for (const key in val) {
        if (Object.prototype.hasOwnProperty.call(val, key)) {
          out[key] = deepClone(val[key]);
        }
      }
      return out;
    }
    return val;
  }

  function extend() {
    let deep = false;
    let idx = 0;
    if (typeof arguments[0] === "boolean") {
      deep = arguments[0];
      idx = 1;
    }
    let target = arguments[idx] || {};
    for (idx = idx + 1; idx < arguments.length; idx++) {
      const src = arguments[idx];
      if (!src) {
        continue;
      }
      for (const key in src) {
        const val = src[key];
        target[key] = deep ? deepClone(val) : val;
      }
    }
    return target;
  }

  function merge(first, second) {
    if (!first) {
      first = [];
    }
    if (!second) {
      return first;
    }
    for (let i = 0; i < second.length; i++) {
      first.push(second[i]);
    }
    return first;
  }

  function grep(arr, cb, invert) {
    const out = [];
    if (!arr) {
      return out;
    }
    for (let i = 0; i < arr.length; i++) {
      const match = !!cb(arr[i], i);
      if (invert ? !match : match) {
        out.push(arr[i]);
      }
    }
    return out;
  }

  function globalEval(code) {
    (0, eval)(code);
  }

  function fetchRequest(url, options) {
    const opts = options || {};
    const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
    const crossDomain = !!opts.crossDomain;
    const fetchOpts = {
      method: "GET",
      mode: crossDomain ? "cors" : "same-origin",
      cache: "default",
      credentials: opts.withCredentials ? "include" : (crossDomain ? "omit" : "same-origin")
    };
    if (controller) {
      fetchOpts.signal = controller.signal;
    }
    let timer;
    if (controller && opts.timeout) {
      timer = setTimeout(function() { controller.abort(); }, opts.timeout);
    }
    return fetch(url, fetchOpts).then(function(res) {
      if (timer) {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const err = new Error("HTTP " + res.status);
        err.status = res.status;
        throw err;
      }
      return res;
    }).catch(function(err) {
      if (timer) {
        clearTimeout(timer);
      }
      throw err;
    });
  }

  function fetchText(url, options) {
    return fetchRequest(url, options).then(function(res) { return res.text(); });
  }

  function fetchJson(url, options) {
    return fetchRequest(url, options).then(function(res) { return res.json(); });
  }

  function empty(elem) {
    return elem.empty();
  }

  function jHtml(elem, val) {
    return arguments.length > 1 ? elem.html(val) : elem.html();
  }

  function addClass(elem, cls) {
    return elem.addClass(cls);
  }

  function hide(elem) {
    return elem.hide();
  }

  function show(elem) {
    return elem.show();
  }

  function css(elem) {
    return elem.css.apply(elem, Array.prototype.slice.call(arguments, 1));
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
      if (typeof loadedModules[moduleName].deps == "string") {
        jiant.errorp("Dependencies for module should be array, not string, error in module: !!, module url: !!", moduleName, url);
        loadedModules[moduleName].deps = [loadedModules[moduleName].deps];
      }
      const deps = loadedModules[moduleName].deps;
      loadedModules[moduleName].parsedDeps = [];
      deps && deps.forEach(function(dep) {
        if (typeof dep === "string") {
          loadedModules[moduleName].parsedDeps.push(loadDep("", dep, moduleSpec))
        } else {
          each(dep, function(path, arr) {
            if (! Array.isArray(arr)) {
              arr = [arr];
            }
            arr.forEach(function(val) {
              loadedModules[moduleName].parsedDeps.push(loadDep(path, val, moduleSpec));
            });
          });
        }
      });
    }
    function preprocessLoadedModule(moduleSpec, moduleObj) {
      handleModuleDeps(moduleSpec.name, moduleSpec);
      if (isPlainObject(moduleObj)) {
        preparePath(moduleObj, "css");
        preparePath(moduleObj, "js");
        preparePath(moduleObj, "html");
        loadPath(moduleObj, "css");
        loadPath(moduleObj, "js");
        loadPath(moduleObj, "html");
      }
    }

    const moduleName = moduleSpec.name;
    if (!loadedModules[moduleName]) {
      jiant.DEV_MODE && console.info(appId + ". Loading module " + moduleSpec.name + ", initiated by "
          + (moduleSpec.j_initiatedBy ? moduleSpec.j_initiatedBy : "application "));
    }
    if (typeof moduleName != "string") {
      console.error("Wrong module declaration, possibly used array instead of object, moduleSpec:");
      console.error(moduleSpec);
      return;
    }
    if (!loading[moduleName]) {
      if (!loadedModules[moduleName]) {
        if (isCacheInStorage(appRoot) && isPresentInCache(appRoot, moduleName)) {
          jiant.DEV_MODE && console.info("           using module cache: " + cacheKey(appRoot, moduleName));
          let moduleContent = localStorage.getItem(cacheKey(appRoot, moduleName));
          globalEval(moduleContent);
          preprocessLoadedModule(moduleSpec, loadedModules[moduleName]);
          cbIf0();
        } else {
          loading[moduleName] = 1;
          const useExact = "exactUrl" in moduleSpec;
          url = useExact ? moduleSpec.exactUrl : isCouldBePrefixed(moduleSpec.path) ? ((appRoot.modulesPrefix || "") + moduleSpec.path) : moduleSpec.path;
          if (!useExact) {
            url = url + ".js" + (appRoot.modulesSuffix || "");
          }
          jiant.DEV_MODE && console.info("           module url: " + url);
          fetchText(url, {timeout: appRoot.modulesTimeout || 15000, crossDomain: true}).then(function(data) {
            data += "\r\n//# sourceURL= " + url;
            globalEval(data);
            if (isCacheInStorage(appRoot)) {
              localStorage.setItem(cacheKey(appRoot, moduleName), data);
            }
            if (loadedModules[moduleName]) {
              preprocessLoadedModule(moduleSpec, loadedModules[moduleName]);
            }
          }).catch(function() {
            console.error("Application " + appId + ". Not loaded module " + moduleName);
          }).finally(function() {
            if (loading[moduleName]) {
              delete loading[moduleName];
              cbIf0();
            }
          });
        }
      } else {
        preprocessLoadedModule(moduleSpec, loadedModules[moduleName]);
      }
    }
  }

  function loadModules(appRoot, appId, modules2load, initial, cb) {
    const loading = {};
    moduleLoads.push({
      appRoot: appRoot, modules2load: modules2load, initial: initial, cb: cb, loading: loading
    });
    modules2load.forEach((moduleSpec) => {
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
        each(module, function(key, val) {
          if (typeof val === "string") {
            ret.push(parseObjModule(val, {path: key + "/" + val}, appId, j));
          } else if (Array.isArray(val)) {
            val.forEach(function(subval) {
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
    let ret = [], i = 0;
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
          fetchText(url, {timeout: jiant.LIB_LOAD_TIMEOUT, crossDomain: true}).then(function(data) {
            module[path + "Loaded"][url] = data;
            loadedLibs[url] = data;
            const waiters = loadingLibs[url];
            delete loadingLibs[url];
            waiters.forEach(function(w) {
              w();
            });
          }).finally(function() {
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
    if (!(name in loadedModules)) {
      loadedModules[name] = cb;
      loadedModules[name].deps = deps;
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
    startAppLoader(app, tree);
    return tree;
  }

  function startAppLoader(root, tree) {
    console.info("Starting application loader (startAppLoader) for application");
    console.info(root);
    const appLoader = {
      id: root.id + "_JLoader",
      modules: ["jiant-log", "jiant-util", "jiant-spec"],
      modulesPrefix: jiantPath,
      cacheInStorage: jiant.version()};
    // order is important
    if (!String.prototype.startsWith || !String.prototype.endsWith) {
      appLoader.modules.push("jiant-poly");
    }
    ["intl", "views", "templates", "components", "ajax", "events", "semaphores", "states",
      "models", "logic", "xl", "xl2"].forEach(moduleName => {
      if (moduleName in tree || (moduleName === "intl" && "logic" in tree && moduleName in tree.logic)) {
        appLoader.modules.push("jiant-" + moduleName);
      }
    });
    startApp(appLoader, appLoader);
    onApp(appLoader, function() {
      startApp(root, tree, appLoader);
    });
  }

  function startApp(root, tree, appLoader) {
    maybeSetDevModeFromQueryString();
    const appId = root.id;
    if (boundApps[appId] && root === tree) {
      jiant.logError("Application '" + appId + "' already loaded, skipping multiple bind call");
      return;
    }
    maybeShort(tree, "logic", "l");
    maybeShort(tree, "intl", "i");
    maybeShort(tree, "views", "v");
    maybeShort(tree, "templates", "t");
    maybeShort(tree, "components", "c");
    maybeShort(tree, "ajax", "a");
    maybeShort(tree, "events", "e");
    maybeShort(tree, "semaphores", "sem");
    maybeShort(tree, "states", "s");
    maybeShort(tree, "models", "m");
    tree.modules = tree.modules || [];
    if (root === tree) {
      preApping[appId] = root;
      if (preAppCallbacks[appId]) {
        preAppCallbacks[appId].forEach(function(cb) {
          cb($, root, jiant);
        });
        delete preAppCallbacks[appId];
      }
      if (appId !== "*" && preAppCallbacks["*"]) {
        preAppCallbacks["*"].forEach(function(cb) {
          cb($, root, jiant);
        });
      }
      delete preApping[appId];
      bindingCurrently[appId] = root;
    }
    if (tree.modulesSpec) {
      tree.modules = tree.modulesSpec;
    }
    console.info("Loading modules");
    console.info(tree.modules);
    _loadModules(root, tree.modules, appId, true, function() {
      // intlPresent && _bindIntl(root, root.intl, appId);
      // views after intl because of nlabel proxies
      appLoader && each(appLoader.modules, function(i, module) {
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
        appBoundEventBus.trigger(appBoundEventName(appId));
      }
      appLoader && (delete boundApps[appLoader.id]);
    });
  }

  function app(appCb) {
    if ("jiant-types" in loadedModules) {
      prepareApp(appCb(jiantInstance));
    } else {
      const typesLoader = {
        id: "JTypesLoader",
        modules: ["jiant-types"],
        modulesPrefix: jiantPath,
        cacheInStorage: jiant.version()};
      startApp(typesLoader, typesLoader);
      onApp(typesLoader, function() {
        prepareApp(appCb(jiantInstance));
      });
    }
  }

  function prepareApp(app) {
    app.appPrefix = app.appPrefix || "";
    if (!("id" in app)) {
      app.id = "app_" + Math.random();
    } else {
      app.id = app.id.replaceAll(" ", "_");
    }
    if ("viewsUrl" in app) {
      let injectionPoint;
      if ("injectId" in app) {
        injectionPoint = $("#" + app.injectId);
        if (!injectionPoint[0]) {
          injectionPoint = $("<div id='" + app.injectId + "' style='display:none'></div>");
          $("body").append(injectionPoint);
        }
      } else {
        injectionPoint = $("body");
      }
      injectionPoint.load(app.viewsUrl, null, function () {
        startAppLoader(app, app);
      });
    } else {
      startAppLoader(app, app);
    }
  }

  function extractApplicationId(appId) {
    return isPlainObject(appId) ? appId.id : appId
  }

  // onApp(cb);
  // onApp(depList, cb); - INVALID, treated as onApp(appIdArr, cb);
  // onApp(appIdArr, cb);
  // onApp(appIdArr, depList, cb);
  // onApp(appId, cb);
  // onApp(appId, depList, cb)
  function onApp(appIdArr, dependenciesList, cb) {
    if (!cb && !dependenciesList) {
      jiant.error("!!! Registering anonymous logic without application id. Not recommended");
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
      } else if (isPlainObject(appId)) {
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
      const arr = preAppCallbacks[appId] = nvl(preAppCallbacks[appId], []);
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
        appBoundEventBus.one(appBoundEventName(appId), function() {
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

  function isObject(val) {
    return (typeof val === "object")
  }

  function optional(tp) {
    // return Array.isArray(tp) ? [optional, ...tp] : [optional, tp];
    console.info(tp);
    return tp.optional ? tp.optional(true) : (isObject(tp) ? {...tp, optional: true} : {tp: tp, optional: true});
  }

  function wrapType(tp) {
    return isObject(tp) ? tp : {tp: tp}
  }

  function isVisualType(tp) {
    return [jiant.label, jiant.ctl, jiant.container, jiant.pager, jiant.image, jiant.input, jiant.nlabel, jiant.numLabel].includes(tp);
  }

  function required(val, field) {
    if (val === undefined) {
      console.error(`%c Field ${field} is required`, "color: lime; background-color: darkblue; font-weight: bold");
      return false;
    }
    return true;
  }

  function version() {
    return 410;
  }

  function Jiant() {}

  Jiant.prototype = {
    disableCache: true, //temporary disabled due to problems with async vs sync loading

    AJAX_PREFIX: "",
    AJAX_SUFFIX: "",
    DEV_MODE: false,
    ADD_TM_TAGS: true,
    PAGER_RADIUS: 6,
    LIB_LOAD_TIMEOUT: 15000,
    isMSIE: eval("/*@cc_on!@*/!1"),
    STATE_EXTERNAL_BASE: undefined,
    extractApplicationId,
    required,

    app: app,
    module: module,
    loadModule: loadModule,
    onUiBound: onApp,
    onApp: onApp,
    preUiBound: preApp,
    preApp: preApp,
    bindTree: bindTree,
    getAppPrefix: (appRoot, content) => ("appPrefix" in content) ? content.appPrefix : ("appPrefix" in appRoot) ? appRoot.appPrefix : "",

    version: version,
    nvl: nvl,
    each: each,
    isFunction: isFunction,
    isPlainObject: isPlainObject,
    inArray: inArray,
    isNumeric: isNumeric,
    extend: extend,
    merge: merge,
    grep: grep,
    empty: empty,
    html: jHtml,
    addClass: addClass,
    hide: hide,
    show: show,
    css: css,
    globalEval: globalEval,
    fetchText: fetchText,
    fetchJson: fetchJson,

    getApps: function() {return boundApps},

    wrapType: wrapType,
    optional: optional,
    isVisualType: isVisualType,
    isObject: isObject,
    lookup: function (selector) {},
    transientFn: function(val) {},
    isCouldBePrefixed: isCouldBePrefixed,
    flags: {},
    intro: {},

    key: {left: 37, up: 38, right: 39, down: 40, del: 46, backspace: 8, tab: 9, end: 35, home: 36, enter: 13, ctrl: 17,
      escape: 27, dot: 190, dotExtra: 110, comma: 188,
      a: 65, c: 67, u: 85, w: 87, space: 32, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
      f1: 112, f2: 113, f3: 114, f4: 115, f5: 116, f6: 117, f7: 118, f8: 119, f9: 120}

  };

  return jiantInstance = window.jiant || (window.jiant = new Jiant());

}));
