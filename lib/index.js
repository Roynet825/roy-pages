

const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()

const {src, dest, series, parallel, watch} = require('gulp')
const del = require('del')
const browserSync = require('browser-sync')

const bs = browserSync.create()
const cwd = process.cwd()

let config = {
  _: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  let loadedConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadedConfig)
}catch (e){}

const clean = () => {
  return del([config._.dist, config._.temp])
}

const style = () => {
  return src(config._.paths.styles, {base: config._.src, cwd: config._.src})
    .pipe(plugins.sass({ outputStyle : 'expanded'}))
    .pipe(dest(config._.dist))
    .pipe(bs.reload({stream:true}))
}

const script = () => {
  return src(config._.paths.scripts, {base: config._.src, cwd: config._.src})
    .pipe(plugins.babel({presets: [require('@babel/preset-env')]}))
    .pipe(dest(config._.temp))
    .pipe(bs.reload({stream:true}))
}

const page = () => {
  return src(config._.paths.pages, {base: config._.src, cwd: config._.src})
    .pipe(plugins.swig({data: config.data, defaults: { cache: false } }))
    .pipe(dest(config._.temp))
    .pipe(bs.reload({stream:true}))
}

const image = () => {
  return src(config._.paths.images, {base: config._.src, cwd: config._.src})
    .pipe(plugins.imagemin())
    .pipe(dest(config._.dist))
}

const font = () => {
  return src(config._.paths.fonts, {base:config._.src, cwd: config._.src})
    .pipe(plugins.imagemin())
    .pipe(dest(config._.dist))
}

const extra = ()=>{
  return src('**', {base: config._.public, cwd: config._.public})
    .pipe(dest(config._.dist))
}

const useref = () => {
  return src(config._.paths.pages, {base: config._.temp, cwd: config._.temp})
    .pipe(plugins.useref({ searchPath: [config._.temp, '.'] }))//dist, 和nodemodules
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({ 
      collapseWhitespace : true,
      minifyCSS : true,
      minifyJS: true
    })))
    .pipe(dest(config._.dist))
}

const serve = () => {
  watch(config._.paths.styles, {cwd: config._.src}, style)
  watch(config._.paths.scripts, {cwd: config._.src}, script)
  watch(config._.paths.pages, {cwd: config._.src}, page)
  watch([
    config._.paths.images,
    config._.paths.fonts
  ], {cwd:config._.src}, bs.reload)
  watch('**', {cwd:config._.public} , bs.reload)


  bs.init({
    notify: false,
    // files: 'dist/**',
    server: {
      baseDir: [config._.temp, config._.src, config._.public],
      routes: {
        '/node_modules' : 'node_modules'
      }
    }
  })
}

//src -> temp
const compile = parallel(style, script, page)
//src -> temp -> dist
const build = series(clean, parallel( series(compile, useref), image, font, extra))
//src -> temp -> server
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}