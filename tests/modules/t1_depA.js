jiant.module("t1_depA", ["t1_depB"], function({app}) {
  if (window.__jiantTestState && window.__jiantTestState.order) {
    window.__jiantTestState.order.push("A");
  }
  return {name: "depA", dep: app.modules.t1_depB};
});
