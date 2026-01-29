jiant.module("jiant-intl", ["jiant-logic"], function({$, app, jiant, params, "jiant-logic": Logic}) {

  this.singleton();

  function translate(appRoot, val) {
    if (Array.isArray(val)) {
      const arr = [];
      jiant.each(val, function(i, key) {
        arr.push(appRoot.logic.intl.t(key));
      });
      return arr.join(", ");
    } else {
      return appRoot.logic.intl.t(val);
    }
  }

  function intlProxy(appRoot, elem, fname) {
    if (! appRoot.logic.intl) {
      jiant.error("nlabel used, but no intl declared, degrading nlabel to label");
      return;
    }
    const prev = elem[fname];
    elem[fname] = function(val) {
      if (val === undefined || val === null) {
        return prev.call(elem, val);
      } else {
        if (Logic.isLogicLoaded(appRoot.id, "intl")) {
          prev.call(elem, translate(appRoot, val));
        } else {
          prev.call(elem, val);
          const stack = jiant.getStackTrace();
          jiant.onApp(appRoot, ["intl"], function() {prev.call(elem, translate(appRoot, val))});
        }
      }
    }
  }

  function _bindIntl(root, intl, appId) {
    if (intl) {
      if (root.logic.intl) {
        jiant.info("Both logic.intl and app.intl declared, skipping app.intl");
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

  function isCrossDomainUrl(url) {
    try {
      return new URL(url, window.location.href).origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function loadIntl(intlRoot, appRoot) {
    jiant.infop("Loading intl for app !!", appRoot.id);
    if (! intlRoot.url) {
      //jiant.error("Intl data url not provided, internationalization will not be loaded");
      return;
    }
    let url = intlRoot.url;
    if (appRoot.modulesSuffix) {
      const delim = intlRoot.url.indexOf("?") >= 0 ? "&" : "?";
      url = url + delim + appRoot.modulesSuffix;
    }
    intlRoot.t = function(val) {};
    intlRoot.t.spec = true;
    intlRoot.t.empty = true;
    const crossDomain = isCrossDomainUrl(url);
    const fetchOpts = crossDomain ? {crossDomain: true, withCredentials: !!appRoot.withCredentials} : {};
    jiant.fetchJson(url, fetchOpts).then(function(data) {
      const implSpec = {}, option = intlRoot["i18nOptions"] || {debug: jiant.DEV_MODE};
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
        jiant.each(intlRoot, function(fname, fspec) {
          if (fspec.spec) {
            implSpec[fname] = intlRoot.i18n ? implementIntlFunctionWithI18N(fname, fspec, data, intlRoot.javaSubst) : implementIntlFunction(fname, fspec, data);
          }
        });
        intlRoot.implement(implSpec);
        intlRoot.debugIntl = function(prefix) {
          jiant.each(data, function(key, val) {
            key.startsWith(prefix) && jiant.infop("!! = !!", key, val);
          });
        };
        if (intlRoot.scanDoc) {
          jiant.each($("*[data-nlabel]"), function(i, elem) {
            elem = $(elem);
            const key = elem.attr("data-nlabel"),
                translation = intlRoot.t(key);
            jiant.html(elem, translation);
          });
        }
      }
    }).catch(function(err) {
      jiant.error("Intl data load failed: " + url);
      err && err.message && jiant.error(err.message);
    });
  }

  function prepareTranslation(key, val) {
    if (val || val === "") {
      return val;
    }
    jiant.error("Not found translation for key: ", key);
    return key;
  }

  function ensureIntlKey(data, key) {
    key && (data[key] || jiant.error("Not found translation for key: ", key));
  }

  function implementIntlFunctionWithI18N(fname, fspec, data, javaSubst) {
    if (fname === "t") {
      return function(key) {
        let args = {};
        if (arguments) {
          if (javaSubst) {
            jiant.each(arguments, function(i, a) {i > 0 && (args["" + (i - 1)] = a)});
          } else {
            args = arguments[1];
          }
        }
        ensureIntlKey(data, key);
        return i18ntl().t(key, args);
      }
    } else if (fspec.empty) {
      return function() {
        const args = {};
        if (arguments) {
          if (javaSubst) {
            jiant.each(arguments, function(i, a) {args["" + i] = a});
          } else {
            const paramNames = jiant.getParamNames(fspec);
            jiant.each(arguments, function(i, a) {i > 0 && i < paramNames.length && (args[paramNames[i]] = a)});
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
    const impl = function (key) {
      return prepareTranslation(key, data[key])
    };
    if (fname === "t") {
      return impl;
    } else if (fspec.empty) {
      return function() {
        return impl(fname);
      }
    } else {
      return fspec;
    }
  }

  jiant.loadIntl = loadIntl;
  jiant.intlProxy = intlProxy;

  return {
    apply: function(appRoot, tree) {
      _bindIntl(appRoot, tree.intl, appRoot.id);
    }
  }

});
