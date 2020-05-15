jiant.module("jiant-log", function() {

  this.singleton();

  let alwaysTrace = false;

  function printp(method, args) {
    let s = args[0] + "";
    $.each(args, function(idx, arg) {
      if (idx > 0) {
        const pos = s.indexOf("!!");
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
    let s = "";
    $.each(args, function(idx, arg) {
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
      window.console && window.console[method] && $.each(args, function(idx, arg) {
        window.console[method](arg);
      });
    } catch (ex) {
      // firefox + firebug glitch with recursion workaround
      method !== "info" && print("info", args);
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

  function showTrace() {
    alwaysTrace = true;
  }

  function getStackTrace() {
    const obj = {stack: {}};
    "captureStackTrace" in Error && Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
  }

  const exp = {
    logInfo: logInfo,
    logError: logError,
    info: info,
    error: error,
    infop: infop,
    errorp: errorp,
    getStackTrace: getStackTrace,
    showTrace: showTrace
  };

  for (let key in exp) {
    jiant[key] = exp[key];
  }

  return exp

});