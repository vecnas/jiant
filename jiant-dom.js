jiant.module("jiant-dom", function({jiant}) {

  this.singleton();

  const dom = {
    isJq: function(val) { return !!val && val.jquery; },
    first: function(elem) { return elem && elem.jquery ? elem[0] : elem; },
    forEach: function(elem, cb) {
      if (!elem) { return; }
      if (elem.jquery) {
        for (let i = 0; i < elem.length; i++) {
          cb(elem[i]);
        }
      } else {
        cb(elem);
      }
    },
    on: function(elem, eventName, handler) {
      dom.forEach(elem, function(el) {
        el.addEventListener(eventName, function(evt) { handler(evt, evt.detail); });
      });
    },
    trigger: function(elem, eventName, detail) {
      dom.forEach(elem, function(el) {
        let evt;
        if (typeof CustomEvent === "function") {
          evt = new CustomEvent(eventName, {detail: detail});
        } else {
          evt = document.createEvent("CustomEvent");
          evt.initCustomEvent(eventName, false, false, detail);
        }
        el.dispatchEvent(evt);
      });
    },
    addClass: function(elem, cls) {
      dom.forEach(elem, function(el) { el.classList && el.classList.add(cls); });
    },
    removeClass: function(elem, cls) {
      dom.forEach(elem, function(el) { el.classList && el.classList.remove(cls); });
    },
    toggleClass: function(elem, cls) {
      dom.forEach(elem, function(el) { el.classList && el.classList.toggle(cls); });
    },
    setChecked: function(elem, val) {
      dom.forEach(elem, function(el) { el.checked = !!val; });
    },
    getChecked: function(elem) {
      const el = dom.first(elem);
      return el ? !!el.checked : false;
    },
    getData: function(elem, key) {
      const el = dom.first(elem);
      if (!el) { return undefined; }
      if (el.dataset && key in el.dataset) { return el.dataset[key]; }
      return el.getAttribute ? el.getAttribute("data-" + key) : undefined;
    },
    setDisabled: function(elem, disabled) {
      dom.forEach(elem, function(el) { el.disabled = !!disabled; });
    },
    append: function(parent, child) {
      const p = dom.first(parent);
      if (!p || !child) { return; }
      if (child.jquery) {
        for (let i = 0; i < child.length; i++) { p.appendChild(child[i]); }
      } else if (child.nodeType) {
        p.appendChild(child);
      }
    },
    insertBefore: function(elem, ref) {
      const node = dom.first(elem);
      const refNode = dom.first(ref);
      if (!node || !refNode || !refNode.parentNode) { return; }
      refNode.parentNode.insertBefore(node, refNode);
    },
    remove: function(elem) {
      dom.forEach(elem, function(el) {
        if (el.remove) { el.remove(); }
        else if (el.parentNode) { el.parentNode.removeChild(el); }
      });
    },
    html: function(elem, html) {
      dom.forEach(elem, function(el) { el.innerHTML = html; });
    },
    hide: function(elem) {
      dom.forEach(elem, function(el) { el.style.display = "none"; });
    },
    show: function(elem) {
      dom.forEach(elem, function(el) { el.style.display = ""; });
    },
    getVal: function(elem) {
      if (!elem) { return undefined; }
      if (elem.jquery) { return elem.val(); }
      return "value" in elem ? elem.value : undefined;
    },
    empty: function(elem) {
      if (!elem) { return elem; }
      if (elem.jquery && typeof elem.empty === "function") {
        return elem.empty();
      }
      dom.forEach(elem, function(el) {
        while (el && el.firstChild) {
          el.removeChild(el.firstChild);
        }
      });
      return elem;
    },
    html: function(elem, val) {
      if (!elem) { return undefined; }
      if (elem.jquery && typeof elem.html === "function") {
        return arguments.length > 1 ? elem.html(val) : elem.html();
      }
      if (arguments.length > 1) {
        dom.forEach(elem, function(el) { if (el) { el.innerHTML = val; } });
        return elem;
      }
      const first = dom.first(elem);
      return first ? first.innerHTML : undefined;
    },
    css: function(elem) {
      if (!elem) { return undefined; }
      if (elem.jquery && typeof elem.css === "function") {
        return elem.css.apply(elem, Array.prototype.slice.call(arguments, 1));
      }
      const first = dom.first(elem);
      if (!first) { return undefined; }
      const args = Array.prototype.slice.call(arguments, 1);
      if (args.length === 1 && typeof args[0] === "string") {
        return first.style ? first.style[args[0]] : undefined;
      }
      if (args.length >= 2 && typeof args[0] === "string") {
        dom.forEach(elem, function(el) { if (el && el.style) { el.style[args[0]] = args[1]; } });
        return elem;
      }
      if (args.length === 1 && args[0] && typeof args[0] === "object") {
        dom.forEach(elem, function(el) {
          if (!el || !el.style) { return; }
          Object.keys(args[0]).forEach(function(key) {
            el.style[key] = args[0][key];
          });
        });
        return elem;
      }
      return undefined;
    }
  };

  function empty(elem) {
    return dom.empty(elem);
  }

  function html(elem, val) {
    return arguments.length > 1 ? dom.html(elem, val) : dom.html(elem);
  }

  function addClass(elem, cls) {
    return dom.isJq(elem) && typeof elem.addClass === "function" ? elem.addClass(cls) : dom.addClass(elem, cls);
  }

  function hide(elem) {
    return dom.isJq(elem) && typeof elem.hide === "function" ? elem.hide() : dom.hide(elem);
  }

  function show(elem) {
    return dom.isJq(elem) && typeof elem.show === "function" ? elem.show() : dom.show(elem);
  }

  function css(elem) {
    return dom.css.apply(dom, arguments);
  }

  jiant.dom = dom;
  jiant.empty = empty;
  jiant.html = html;
  jiant.addClass = addClass;
  jiant.hide = hide;
  jiant.show = show;
  jiant.css = css;

  return {
    ...dom,
    empty: empty,
    html: html,
    addClass: addClass,
    hide: hide,
    show: show,
    css: css
  };
});
