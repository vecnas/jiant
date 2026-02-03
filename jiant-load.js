jiant.module("jiant-load", function() {

  this.singleton();

  function loadLibs(arr, cb) {
    const pseudoDeps = [];
    if (!Array.isArray(arr)) {
      arr = [arr];
    }
    jiant.each(arr, function(idx, url) {
      const pseudoName = "ext" + new Date().getTime() + Math.random();
      pseudoDeps.push(pseudoName);
      jiant.declare(pseudoName, url);
    });
    const pseudoAppName = "app" + new Date().getTime() + Math.random();
    jiant.onApp(pseudoAppName, pseudoDeps, function(app) {
      cb && cb(window.jQuery);
      jiant.forget(pseudoAppName);
    });
    jiant.app({id: pseudoAppName});
  }

  function loadCss(arr, cb) {
    let loadedCss = [],
        link,
        style,
        interval,
        timeout = 60000, // 1 minute seems like a good timeout
        counter = 0, // Used to compare try time against timeout
        step = 30, // Amount of wait time on each load check
        docStyles = document.styleSheets, // local reference
        ssCount = docStyles.length; // Initial stylesheet count

    if (!Array.isArray(arr)) {
      arr = [arr];
    }
    jiant.each(arr, function (idx, url) {
      jiant.info("Start loading CSS: " + url);
      loadedCss.push(handleCss(url));
    });

    if (cb) {
      Promise.all(loadedCss).then(function() { cb(); });
    } else {
      return loadedCss;
    }

    function handleCss(url) {
      let resolve, reject;
      const promise = new Promise(function(res, rej) { resolve = res; reject = rej; });
      // IE 8 & 9 it is best to use 'onload'. style[0].sheet.cssRules has problems.
      if (navigator.appVersion.indexOf("MSIE") !== -1) {
        link = document.createElement('link');
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = url;
        link.onload = function () {
          resolve();
        };
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      // Support for FF, Chrome, Safari, and Opera
      else {
        style = document.createElement('style');
        style.textContent = '@import "' + url + '"';
        // Adding this attribute allows the file to still be identified as an external
        // resource in developer tools.
        style.setAttribute('data-uri', url);
        document.body.appendChild(style);
        // This setInterval will detect when style rules for our stylesheet have loaded.
        interval = setInterval(function () {
          try {
            // This will fail in Firefox (and kick us to the catch statement) if there are no
            // style rules.
            style.sheet.cssRules;
            // The above statement will succeed in Chrome even if the file isn't loaded yet
            // but Chrome won't increment the styleSheet length until the file is loaded.
            if (ssCount === docStyles.length) {
              throw (url + ' not loaded yet');
            } else {
              let loaded = false,
                  href,
                  n;
              // If there are multiple files being loaded at once, we need to make sure that
              // the new file is this file
              for (n = docStyles.length - 1; n >= 0; n--) {
                href = docStyles[n].cssRules[0].href;
                if (typeof href != 'undefined' && href === url) {
                  // If there is an HTTP error there is no way to consistently
                  // know it and handle it. The file is considered 'loaded', but
                  // the console should will the HTTP error.
                  loaded = true;
                  break;
                }
              }
              if (loaded === false) {
                throw (url + ' not loaded yet');
              }
            }
            // If an error wasn't thrown by now, the stylesheet is loaded, proceed.
            resolve();
            clearInterval(interval);
          } catch (e) {
            counter += step;
            if (counter > timeout) {
              // Time out so that the interval doesn't run indefinitely.
              clearInterval(interval);
              reject();
            }
          }
        }, step);
      }
      return promise;
    }
  }

  jiant.loadLibs = loadLibs;
  jiant.loadCss = loadCss;

  return {
    loadLibs: loadLibs,
    loadCss: loadCss
  };

});
