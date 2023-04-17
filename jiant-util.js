jiant.module("jiant-util", ["jiant-log"], function() {

  this.singleton();

  const _tmplCache = {};
  let pickTime;

  function isEmptyFunction(funcSpec) {
    const s = ("" + funcSpec).replace(/\s/g, '');
    return s.indexOf("{}") === s.length - 2;
  }

  function isWebComponentName(name) {
    return name.includes("-");
  }

  function toWebComponentName(name, suffix) {
    if (isWebComponentName(name)) {
      return name;
    }
    const kebabName = toKebabCase(name);
    return kebabName !== name ? kebabName : (kebabName + "-" + suffix);
  }

  function copy2cb(txt) {
    if (document.execCommand) {
      const input = document.createElement("input");
      input.type = "text";
      input.style.opacity = "0";
      input.style.position = "absolute";
      input.style.zIndex = "-1";
      input.value = txt;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  }

  function randomIntBetween(from, to) {
    return Math.floor((Math.random()*(to - from + 1)) + from);
  }

  function toDate(val) {
    const num = Number(val);
    return ((num === 0 && val !== 0 && val !== "0") || isNaN(num)) ? null : new Date(num);
  }

  function formatMoney(amount, grpDelim, decDelim, decimals) {
    let total, num, ret;
    grpDelim = grpDelim !== undefined ? grpDelim : ",";
    decDelim = decDelim !== undefined ? decDelim : '.';
    amount = amount.toString().replace(/\s+/g, '');
    num = (typeof decimals === 'undefined' || decimals === 0) ? Math.round(parseFloat(amount)) : num = amount.split('.');
    if (isNaN(num) && !num[0]) {
      return "";
    }
    if (num[1]) {
      num[1] = Math.round((num[1])).toString().substring(0, decimals);
      ret = "" + num[0];
    } else {
      ret = "" + num;
    }
    for (let idx = ret.length; idx > 0; idx -= 3) {
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
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getFullYear()) + "-" + lfill(dt.getMonth() + 1) + "-" + lfill(dt.getDate());
  }

  function formatDateUsa(millis) {
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getMonth() + 1) + "/" + lfill(dt.getDate()) + "/" + lfill(dt.getFullYear());
  }

  function formatTime(millis) {
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes());
  }

  function formatTimeSeconds(millis) {
    const dt = toDate(millis);
    return dt == null ? "" : lfill(dt.getHours()) + ":" + lfill(dt.getMinutes()) + ":" + lfill(dt.getSeconds());
  }

  function lfill(val) {
    val = "" + val;
    return val.length === 0 ? "00" : val.length === 1 ? "0" + val : val;
  }

  function getURLParameter(name) {
    const results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    return (results !== null) ? decodeURIComponent(results[1]) : null;
  }

  function pick(marker, threshold) {
    const now = new Date().getTime(),
        ms = now - pickTime;
    threshold = threshold || -1;
    if (pickTime && ms >= threshold) {
      jiant.info((marker ? marker : "jiant.pick:") + " " + ms + "ms");
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
    return $(elem).html().trim().replace(/!!/g, "!! ").replace(/e2013e03e11eee /g, "!! ");
  }

  function parseTemplate(that, data, tmId, mapping) {
    data = data || {};
    if (mapping) {
      data = $.extend({}, data);
      $.each(mapping, function(key, val) {
        data[key] = data[val];
      });
    }
    let err = "";
    try {
      let func = tmId ? _tmplCache[tmId] : null;
      if (!func) {
        let str = (typeof that === "string" ? $("<i></i>").html(that) : $(that)).html().trim();
        if (!jiant.isMSIE) {
          str = str.replace(/!!/g, "!! ");
        } else {
          str = msieDom2Html($(that));
        }
        const strFunc =
            "var p=[],print=function(){p.push.apply(p,arguments);};" +
            "with(obj){p.push('" +
            str.replace(/[\r\t\n]/g, " ")
                .replace(/'(?=[^#]*#>)/g, "\t")
                .split("'").join("\\'")
                .split("\t").join("'")
                .replace(/!! (.+?)!! /g, "', typeof $1 === 'undefined' ? '' : typeof $1 === 'function' ? $1() : $1,'")
                .split("!?").join("');")
                .split("?!").join("p.push('")
            + "');}return p.join('');";
        func = new Function("obj", strFunc);
        _tmplCache[tmId] = func;
      }
      return func(data).trim();
    } catch (e) {
      err = e.message;
      jiant.logError("Error parse template: " + tmId, mapping, e);
    }
    return "!!! ERROR: " + err.toString() + " !!!";
  }

  function parseTemplate2Text(tm, data, cacheKey) {
    return parseTemplate(tm, data, cacheKey);
  }

  function getParamNames(func) {
    let funcStr = func.toString();
    funcStr = funcStr.slice(funcStr.indexOf('(') + 1, funcStr.indexOf(')')).match(/([^\s,]+)/g);
    return funcStr ? funcStr : [];
  }

  function isNumberString(s) {
    return (parseInt(s) + "") === s;
  }

  function asObjArray(arr, name, idxName) {
    const ret = [];
    arr.forEach(function(val, i) {
      const obj = {};
      obj[name] = val;
      idxName && (obj[idxName] = i);
      ret.push(obj);
    });
    return ret;
  }

  function check(bool, err) {
    if (! bool) {
      const args = [...arguments];
      args.splice(0, 1);
      jiant.logError(args);
      jiant.DEV_MODE && alert(err);
    }
  }

  function toArray(arr) {
    return $.isArray(arr) ? arr : [arr];
  }

  function fluent(name) {
    return function(val) {
      arguments.length !== 0 && (this.data[name] = val);
      return arguments.length !== 0 ?  this : this.data[name]
    }
  }

  const toKebabCase = s => s
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, '-')
      .toLowerCase();

  const exp = {
    parseTemplate: function(text, data) {return $(parseTemplate(text, data));},
    parseTemplate2Text: parseTemplate2Text,
    _parseTemplate: parseTemplate,
    getFunctionParamNames : getParamNames,
    isNumberString: isNumberString,
    getParamNames: getParamNames,
    getURLParameter: getURLParameter,
    pick: pick,
    formatDate: formatDate,
    formatDateUsa: formatDateUsa,
    formatMoney: formatMoney,
    formatTime: formatTime,
    formatTimeSeconds: formatTimeSeconds,
    randomIntBetween: randomIntBetween,
    copy2clipboard: copy2cb,
    asObjArray: asObjArray,
    check: check,
    lfill: lfill,
    fluent: fluent,
    isEmptyFunction: isEmptyFunction,
    toArray: toArray,
    isWebComponentName: isWebComponentName,
    toWebComponentName: toWebComponentName,
    toKebabCase: toKebabCase
  };

  for (let key in exp) {
    jiant[key] = exp[key];
  }

  return exp

});