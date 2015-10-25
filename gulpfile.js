var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var uglify = require('gulp-uglify');
var runSequence = require('run-sequence');
 
var tsProject = ts.createProject('lib/tsconfig.json');

gulp.task('scripts', function() {
    var tsResult = tsProject.src()
                    .pipe(ts(tsProject));
 
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done. 
        tsResult.dts.pipe(gulp.dest('dist/definitions')),
        tsResult.js.pipe(gulp.dest('dist/js'))
    ]);
});

gulp.task('minify', function() {
	return gulp.src('dist/js/appkit.js')
		.pipe(uglify())
		.pipe(gulp.dest('dist/js'));
});

gulp.task("dist", function(callback) {
	return runSequence("scripts", "minify", callback);
});

gulp.task('watch', ['scripts'], function() {
    gulp.watch('lib/**/*.ts', ['scripts']);
});
