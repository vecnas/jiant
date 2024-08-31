jiant.module("jiant-render", function({jiant}) {

  this.singleton();

  const keyDelim = ".", {required, extractApplicationId} = jiant;
  const onRenderRegistry = {};

  function onRender({app, viewId, templateId, field, cb}) {
    required(app, "app");
    required(cb, "cb");
    const k = key({app, viewId, templateId, field, cb});
    onRenderRegistry[k]??=[];
    onRenderRegistry[k].push(cb);
    // console.error(onRenderRegistry);
  }

  function key({app, viewId, templateId, field}) {
    return extractApplicationId(app) + keyDelim
      + (viewId !== undefined ? "v" : "t" ) + keyDelim + (viewId || templateId) + keyDelim + (field || "");
  }

  function callOnRender({app, viewId, templateId, field, args}) {
    const k = key({app, viewId, templateId, field});
    // console.error(`Calling on render: ${k}`);
    // console.info(onRenderRegistry);
    if (k in onRenderRegistry) {
      // console.info("found some callbacks")
      for (const cb of onRenderRegistry[k]) {
        cb(args);
      }
    }
  }

  function isOnRenderPresent({app, viewId, templateId, field}) {
    const k = key({app, viewId, templateId, field});
    return (k in onRenderRegistry);
  }

  jiant.onRender = onRender;

  return {
    onRender,
    callOnRender,
    isOnRenderPresent
  }
})