'use strict';

var gulp = require('gulp');
var shelljs = require('shelljs');
var fs = require('fs');

gulp.task('publish', function (done) {
    var registry, content;
    var isMaster = process.env.BRANCH_NAME === 'master';
    var isReleaseBranch = /^((release\/|hotfix\/))/g.test(process.env.BRANCH_NAME);
    registry = isMaster ? process.env.PRIVATE_PRODUCTION_REGISTRY : process.env.PRIVATE_DEV_REGISTRY;
     if(isReleaseBranch){
    registry='//nexus.syncfusion.com/repository/ej2-release/';
    }
    content = 'registry=https://registry.npmjs.org/\n@syncfusion:registry=http:' + registry + '\n';
    fs.writeFileSync('./.npmrc', content);

    shelljs.exec('echo ' + registry + ':username=' + process.env.PRIVATE_NPM_USER + ' >> .npmrc', { silent: true });
    shelljs.exec('echo ' + registry + ':_password=' + process.env.PRIVATE_NPM_PASSWORD + ' >> .npmrc', { silent: true });
    shelljs.exec('echo ' + registry + ':email=' + process.env.PRIVATE_NPM_EMAIL + ' >> .npmrc', { silent: true });
    shelljs.exec('echo ' + registry + ':always-auth=true >> .npmrc', { silent: true });
    shelljs.exec('npm publish --registry http:' + registry, function (exitCode) {
        done();
        if (exitCode !== 0) {
            process.exit(1);
        }
    });
});

const jshint = require('gulp-jshint');
 
gulp.task('lint', async  function() {
  return gulp.src('filesystem-server.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'))
});

gulp.task('ls-log', async function() {
  console.log('ls-log')
});

gulp.task('ci-skip', async function() {
  console.log('ci-skip')
});

gulp.task('ci-report', async function() {
  console.log('ci-report')
})
