jiant.module("t2_pre", function() {
  if (window.__jiantTestState) {
    window.__jiantTestState.count = (window.__jiantTestState.count || 0) + 1;
  }
  return {name: "pre"};
});
