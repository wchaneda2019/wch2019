/*----------------------------------------------------------------------------*/
/* Dependencies
/*----------------------------------------------------------------------------*/

const gulp = require('gulp');
const $ = require('gulp-load-plugins')({ pattern: ['gulp-*', 'gulp.*'], replaceString: /\bgulp[\-.]/});
const argv = require('yargs').argv;
const browserSync    = require('browser-sync');
const packageImporter = require('node-sass-package-importer');
const pngquant = require('imagemin-pngquant');
const mozjpeg = require('imagemin-mozjpeg');

/*----------------------------------------------------------------------------*/
/* File Destinations
/*----------------------------------------------------------------------------*/

var deployFlg = false;

/**
 * Get path base
 * @return {Object}
 */
function filePaths() {
  var assetBase = deployFlg ? 'docs/assets' : 'dist/assets';
  return {
    'root'           : './',
    'vhost'          : 'wchaneda2019.local',
    'port'           : 3000,
    'htmlDest'       : 'dist/',
    'imagePath'      : 'src/images/',
    'fontPath'       : assetBase + '/fonts',
    'imageDest'      : assetBase + '/images',
    'htmlPath'       : 'src/pug/',
    'scssPath'       : 'src/scss/',
    'cssDest'        : assetBase + '/css'
  };
}

/**
 * @var {Object} Sass setting
 */
var nodeSassConf = {
  includePaths  : [
    // Here is an entry point for dependencies!
    './src/scss'
  ].concat(
    require("bourbon").includePaths,
    require("bourbon-neat").includePaths,
    './node_modules/font-awesome/scss'
  ),
  outputStyle   : 'expanded',
	importer: packageImporter({
		extensions: ['.scss', '.css']
	})
};

/*----------------------------------------------------------------------------*/
/* BrowserSync
/*----------------------------------------------------------------------------*/

gulp.task('browser-sync', function(callback) {
  var paths = filePaths();
  var args = {};
  if (argv.mode == 'server' ) {
    args.server =  { baseDir: paths.htmlDest };
    args.startPath = './';
  } else {
    args.proxy =  paths.vhost;
    args.open = 'external';
  };
  browserSync.init(args);
  callback();
})

gulp.task('bs-reload', function(callback) {
  browserSync.reload();
  callback();
});

/*----------------------------------------------------------------------------*/
/* image tasks
/*----------------------------------------------------------------------------*/

gulp.task('image-min', function() {
  var paths = filePaths();
  return gulp.src( paths.imagePath + '**/*')
    .pipe($.imagemin({
			optimizationLevel: 3,
			plugins: [
				pngquant({quality: [.7, .85]}),
				mozjpeg({quality: 85}),
			]
		}))
		.pipe(gulp.dest(paths.imageDest));
});


/*----------------------------------------------------------------------------*/
/* Copy font Taks
 /*----------------------------------------------------------------------------*/

gulp.task('copyFont', function() {
  var paths = filePaths();
  return gulp.src( './node_modules/font-awesome/fonts/*' )
	.pipe(gulp.dest(paths.fontPath));
});


/*----------------------------------------------------------------------------*/
 /* Jade Tasks
/*----------------------------------------------------------------------------*/

gulp.task('pug', function() {
  var paths = filePaths(), dest, src;
  if ( deployFlg ) {
    src = [paths.htmlPath + 'index.pug']
    dest = './docs'
  } else {
    src = [
      paths.htmlPath + '**/*.pug',
      '!' + paths.htmlPath + '**/_*.pug'
    ];
    dest = paths.htmlDest;
  }
  return gulp.src(src)
    .pipe($.data(function(file) {
      return require('./src/html-setting.json');
    }))
    .pipe($.plumber({
      errorHandler: $.notify.onError('<%= error.message %>')
    }))
    .pipe($.pug({ pretty: true }))
		.pipe(gulp.dest(dest));
});

/*----------------------------------------------------------------------------*/
/* Sass tasks
/*----------------------------------------------------------------------------*/

gulp.task('sass', function () {
  var paths = filePaths();
  return gulp.src(paths.scssPath + '**/style.scss')
    // .pipe($.changed(paths.cssDest, {extension: '.css'}))
    .pipe($.sourcemaps.init())
    .pipe($.sassVariables({
      $env: deployFlg ? 'production' : 'development'
    }))
    .pipe($.cssGlobbing({ extensions: ['.scss'] }))
		.pipe($.sass(nodeSassConf).on('error', $.sass.logError))
		.pipe($.sourcemaps.write({includeContent: false}))
		.pipe($.sourcemaps.init({loadMaps: true}))
    .pipe($.autoprefixer({
      browsers: ['last 2 versions', 'ie 10'],
      cascade: false
		}))
		//.pipe($.groupCssMediaQueries())
		.pipe($.cssnano({autoprefixer: false}))
		.pipe($.cssnano())
    .pipe($.sourcemaps.write('maps', {
      includeContent: false,
      sourceRoot: paths.scssPath
    }))
    .pipe(gulp.dest(paths.cssDest));
});

/*----------------------------------------------------------------------------*/
/* gulp tasks
/*----------------------------------------------------------------------------*/

gulp.task('deploy-flag', function(callback) {
	deployFlg = true;
	callback();
});

gulp.task('deploy', gulp.series(gulp.parallel('deploy-flag','pug', 'sass', 'image-min', 'copyFont'), function(callback) {
	deployFlg = false;

  console.log( 'Deploy Done. Push them to origin/master!' );
	callback();
}));

gulp.task('watch', function(callback) {
  deployFlg = false;
  var paths = filePaths();
  // gulp.watch([paths.htmlDest  + '**/*'], ['bs-reload']);
  gulp.watch([paths.htmlPath  + '**/*.pug'], gulp.task('pug'));
  gulp.watch([paths.scssPath  + '**/*.scss'], gulp.task('sass'));
	gulp.watch([paths.imagePath + '**/*'], gulp.task('image-min'));
	callback();
});

gulp.task('server', gulp.series(['browser-sync', 'watch']));

gulp.task('default', gulp.series([
  'image-min',
  'pug',
  'sass',
  'copyFont',
  'watch'
]));
