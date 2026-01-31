(function(jiant) {

  jiant.DEV_MODE = true;

  jiant.module("m1", ["m0"], function({app, jiant, params, m0}) {
    const h1 = document.createElement("h1");
    h1.textContent = "M1 text";
    jiant.dom.append(document.body, h1);
    document.addEventListener("click", () => m0.setColor("lime"));
  });

  const app = {
    id: "modules-basics",
    modules: ["m0", "m1"]
  };

  jiant.app(app);

})(jiant);
