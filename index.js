'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var nedb = require('nedb');
var glob = require('glob');
var _ = require('lodash');
var concat = require('gulp-concat');
var path = require('path');
var vinyl_fs = require('vinyl-fs');

module.exports = function (options) {
	if (!options.db) {
		throw new gutil.PluginError('gulp-<%= pluginName %>', '`db` required');
	}

  // Regex to get dependencies of module
  var moduleRegex = /\.module\(\s*(?:'|")[^'"]+(?:'|")\s*,\s*(\[[^\]]*\])/;

	// Load specified database
	var db = new nedb({
		filename: options.db,
		autoload: true
	});

	return through.obj(function (file, enc, cb) {

		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-<%= pluginName %>', 'Streaming not supported'));
			return;
		}

		// Get dependencies needed for the file
		var dependencies = moduleRegex.exec(file.contents.toString())[1];
    var dependenciesAdded = [];
    var filesToAdd = [];
    var filesBuffers = [];
    var that = this;

		if(!dependencies) {
			this.push(file);
			cb();
			return;
		}

    dependencies = eval(dependencies);  

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

    lookForDependencies(function() {
      if(filesToAdd.length == 0) {
        that.push(file);
        cb();
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

	});
};
