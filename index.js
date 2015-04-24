'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var nedb = require('nedb');
var glob = require('glob');
var _ = require('lodash');
var concat = require('gulp-concat');
var path = require('path');
var vinyl_fs = require('vinyl-fs');
var fs = require('fs');

module.exports = function (options) {
  if (!options.db) {
    throw new gutil.PluginError('gulp-angular-app-builder', '`db` required');
  }

  // Regex to get dependencies of module
  var moduleRegex = /\.module\(\s*(?:'|")[^'"]+(?:'|")\s*,\s*(\[[^\]]*\])/g;

  // Load specified database
  var db = options.db;

  return through.obj(function (file, enc, cb) {

    var dependencies = [];
    var dependenciesAdded = [];
    var filesToAdd = [];
    var that = this;

    // Get dependencies needed for the file
    db.find({
      path: file.path.substr(process.cwd().length+1)
    }, function(err, docs) {
      docs.forEach(function(doc) {
        dependencies = dependencies.concat(doc.dependencies);
      })
      if(dependencies.length == 0)
        fs.readFile(file.path, function(err, data) {
          file.contents = data;
          that.push(file);
          cb();
        })
      else
        look();
    })

    // Look up the database for the needed dependencies
    function lookForDependencies(fn) {
      if(dependencies.length == 0) {
        fn();
        return;
      }
      db.find({
        name: {
          $in: dependencies
        }
      }, function(err, docs) {
        dependenciesAdded = dependenciesAdded.concat(dependencies);
        dependencies = [];
        docs.forEach(function(doc) {
          dependencies = dependencies.concat(_.difference(doc.dependencies, dependenciesAdded));
          filesToAdd.push(doc.path);
        });
        lookForDependencies(fn);
      })
    }

    function look() {
      lookForDependencies(function() {
        if(filesToAdd.length == 0) {
          fs.readFile(file.path, function(err, data) {
            file.contents = data;
            that.push(file);
            cb();
          });
          return;
        }

        filesToAdd = _.uniq(filesToAdd);

        vinyl_fs.src(filesToAdd)
          .pipe(through.obj(function(file, enc, cb) {
            this.push(file);
            cb();
          }, function(cb) {
            this.push(file);
            cb();
          }))
          .pipe(concat(path.basename(file.relative)))
          .pipe(through.obj(
            function(file, enc, icb) {
              that.push(file);
              icb();
              cb();
            }
          ));
      });
    }

  });
};
