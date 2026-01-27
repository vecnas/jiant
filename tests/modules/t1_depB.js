jiant.module("t1_depB", function() {
  if (window.__jiantTestState && window.__jiantTestState.order) {
    window.__jiantTestState.order.push("B");
  }
  return {name: "depB"};
});
