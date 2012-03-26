var P = require("../")
P({ path: "./" })
  .on("package", function () {
    console.error(this.package)
  })
  .on("child", function (e) {
    console.error(e.path.substr(e.root.path.length + 1))
  })

