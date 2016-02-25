var fs = require('graceful-fs')
var join = require('path').join

var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var test = require('tap').test

var Packer = require('..')

var pkg = join(__dirname, 'test-package')

var json = {
  'name': 'test-package',
  'version': '3.1.4',
  'main': 'elf.js'
}

test('setup', function (t) {
  setup()
  t.end()
})

function packAndVerify (t, included) {
  var subject = new Packer({ path: pkg, type: 'Directory', isDirectory: true })
  var filenames = []
  subject.on('entry', function (entry) {
    t.equal(entry.type, 'File', 'only files in this package')

    filenames.push(entry.basename)
  })
  // need to do this so fstream doesn't explode when files are removed from
  // under it
  subject.on('end', function () {
    // ensure we get *exactly* the results we expect by comparing in both
    // directions
    filenames.forEach(function (filename) {
      t.ok(
        included.indexOf(filename) > -1,
        filename + ' is included'
      )
    })
    included.forEach(function (filename) {
      t.ok(
        filenames.indexOf(filename) > -1,
        filename + ' is not included'
      )
    })
    t.end()
  })
}

test('renames first .gyp file to binding.gyp', function (t) {
  var included = [
    'package.json',
    'binding.gyp'
  ]

  packAndVerify(t, included)
})

test('does not rename first .gyp file when binding.gyp present', function (t) {
  var included = [
    'package.json',
    'binding.gyp',
    'test.gyp'
  ]

  fs.writeFileSync(
    join(pkg, 'binding.gyp'),
    JSON.stringify({}, null, 2)
  )

  packAndVerify(t, included)
})

test('cleanup', function (t) {
  // rimraf.sync chokes here for some reason
  rimraf(pkg, function () { t.end() })
})

function setup () {
  rimraf.sync(pkg)
  mkdirp.sync(pkg)
  fs.writeFileSync(
    join(pkg, 'package.json'),
    JSON.stringify(json, null, 2)
  )

  fs.writeFileSync(
    join(pkg, 'test.gyp'),
    JSON.stringify({}, null, 2)
  )
}
