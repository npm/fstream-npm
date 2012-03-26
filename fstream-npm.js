var Ignore = require("fstream-ignore")
, inherits = require("inherits")
, path = require("path")

module.exports = Packer

inherits(Packer, Ignore)

function Packer (props) {
  if (!(this instanceof Packer)) {
    return new Packer(props)
  }

  props.ignoreFiles = [ ".npmignore",
                        ".gitignore",
                        "package.json" ]

  Ignore.call(this, props)

  // if there is a .gitignore, then we're going to
  // rename it to .npmignore in the output.
  this.on("entry", function (entry) {
    if (entry.basename === ".gitignore") {
      entry.basename = ".npmignore"
      entry.path = path.resolve(entry.dirname, entry.basename)
    }
  })

  // when reading the contents of node_modules, exclude
  // everything that isn't a bundleDependency
  if (this.basename === "node_modules") {
    this.on("entryStat", function (entry, stat) {
      // XXX: do fancy symlink bundling crap
      var bd = this.package && this.package.bundleDependencies
      var shouldBundle = bd && bd.indexOf(entry.basename) !== -1
      if (!shouldBundle) entry.abort()
    })

    // prevent packages in node_modules from being affected
    // by rules set in the containing package, so that
    // bundles don't get busted.
    this.applyIgnores = function () { return true }
  }
}

Packer.prototype.applyIgnores = function (entry, partial) {
  // package.json files can never be ignored.
  if (entry === "package.json") return true

  // some files are *never* allowed under any circumstances
  if (entry === ".git" ||
      entry === ".lock-wscript" ||
      entry.match(/^\.wafpickle-[0-9]+$/) ||
      entry === "CVS" ||
      entry === ".svn" ||
      entry === ".hg" ||
      entry.match(/^\..*\.swp/) ||
      entry === ".DS_Store" ||
      entry.match(/^\._/) ||
      entry === "npm-debug.log" ||
      entry === "" ||
      entry.charAt(0) === "/" ) {
    return false
  }

  return Ignore.prototype.applyIgnores.call(entry, partial)
}

Packer.prototype.addIgnoreFiles = function (entries) {
  // if there's a .npmignore, then we do *not* want to
  // read the .gitignore.
  if (-1 !== entries.indexOf(".npmignore")) {
    var i = entries.indexOf(".gitignore")
    if (i !== -1) {
      entries.splice(i, 1)
    }
  }

  Ignore.prototype.addIgnoreFiles.call(this, entries)
}

Packer.prototype.readRules = function (buf, e) {
  if (e !== "package.json") {
    return Ignore.prototype.readRules.call(this, buf, e)
  }

  var p = this.package = JSON.parse(buf.toString())
  this.packageRoot = true
  this.emit("package", p)

  // make bundle deps predictable
  if (p.bundledDependencies && !p.bundleDependencies) {
    p.bundleDependencies = p.bundledDependencies
    delete p.bundledDependencies
  }

  if (!p.files || !Array.isArray(p.files)) return []

  // ignore everything except what's in the files array.
  return ["*"].concat(p.files.map(function (f) {
    return "!" + f
  }))
}

Packer.prototype.getChildProps = function (stat) {
  var props = Ignore.prototype.getChildProps.call(this, stat)
  props.package = this.package
  return props
}

Packer.prototype.emitEntry = function (entry) {
  // don't emit entry events for dirs, but still walk through
  // and read them.
  if (entry.type === "Directory") return
  Ignore.prototype.emitEntry.call(this, entry)
}
