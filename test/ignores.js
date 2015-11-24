var fs = require('graceful-fs')
var path = require('path')

var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var test = require('tap').test

var Packer = require('..')

var pkg = path.join(__dirname, 'test-package')

var elfJS = function () {/*
module.exports = function () {
  console.log("i'm a elf")
}
*/}.toString().split('\n').slice(1, -1).join()

var json = {
  'name': 'test-package',
  'version': '3.1.4',
  'main': 'elf.js'
}

test('setup', function (t) {
  setup()
  t.end()
})

var included = [
  'package.json',
  'elf.js',
  'main.gyp',
  path.join('deps', 'foo', 'config', 'config.gypi')
]

test('follows npm package ignoring rules', function (t) {
  var subject = new Packer({ path: pkg, type: 'Directory', isDirectory: true })
  var filepaths = []
  var destpaths = []
  subject.on('entry', function (entry) {
    t.equal(entry.type, 'File', 'only files in this package')

    // include relative path in filepath
    var filepath = entry._path.slice(entry.root._path.length + 1)

    filepaths.push(filepath)
    destpaths.push(path.join(path.dirname(filepath), path.basename(entry.path)))
  })
  // need to do this so fstream doesn't explode when files are removed from
  // under it
  subject.on('end', function () {
    // ensure we get *exactly* the results we expect by comparing in both
    // directions
    filepaths.forEach(function (filepath) {
      t.ok(
        included.indexOf(filepath) > -1,
        filepath + ' is included'
      )
      t.ok(
        destpaths.indexOf(filepath) > -1,
        filepath + ' exists in destination'
      )
    })
    included.forEach(function (filepath) {
      t.ok(
        filepath.indexOf(filepath) > -1,
        filepath + ' is not included'
      )
    })
    t.end()
  })
})

test('cleanup', function (t) {
  // rimraf.sync chokes here for some reason
  rimraf(pkg, function () { t.end() })
})

function setup () {
  rimraf.sync(pkg)
  mkdirp.sync(pkg)
  fs.writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify(json, null, 2)
  )

  fs.writeFileSync(
    path.join(pkg, 'elf.js'),
    elfJS
  )

  fs.writeFileSync(
    path.join(pkg, '.npmrc'),
    'packaged=false'
  )

  fs.writeFileSync(
    path.join(pkg, '.npmignore'),
    '.npmignore\ndummy\npackage.json'
  )

  fs.writeFileSync(
    path.join(pkg, 'dummy'),
    'foo'
  )

  fs.writeFileSync(
    path.join(pkg, 'main.gyp'),
    'main'
  )

  var buildDir = path.join(pkg, 'build')
  mkdirp.sync(buildDir)
  fs.writeFileSync(
    path.join(buildDir, 'config.gypi'),
    "i_wont_be_included_by_fstream='with any luck'"
  )

  var depscfg = path.join(pkg, 'deps', 'foo', 'config')
  mkdirp.sync(depscfg)
  fs.writeFileSync(
    path.join(depscfg, 'config.gypi'),
    "i_will_be_included_by_fstream='with any luck'"
  )

  fs.writeFileSync(
    path.join(buildDir, 'npm-debug.log'),
    '0 lol\n'
  )

  var gitDir = path.join(pkg, '.git')
  mkdirp.sync(gitDir)
  fs.writeFileSync(
    path.join(gitDir, 'gitstub'),
    "won't fool git, also won't be included by fstream"
  )

  var historyDir = path.join(pkg, 'node_modules/history')
  mkdirp.sync(historyDir)
  fs.writeFileSync(
    path.join(historyDir, 'README.md'),
    "please don't include me"
  )
}
