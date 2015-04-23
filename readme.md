## Install

```
$ npm install --save-dev gulp-angular-app-builder
```


## Usage

```js
var gulp = require('gulp');
var appBuilder = require('gulp-angular-app-builder');

gulp.task('default', function () {
  return gulp.src('src/**/app.js')
    .pipe(appBuilder({
      db: 'db.dat'
    }))
    .pipe(gulp.dist('dist'))
});
```

## License

MIT © [Miguel Jimenez](https://github.com/miguelrjim)
