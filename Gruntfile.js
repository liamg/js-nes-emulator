module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        qunit: {
            files: ['test/index.html'],
            options: {
                timeout: 30000,
                "--web-security": "no",
                coverage: {
                    src: [ "src/*.js" ],
                    instrumentedFiles: "temp/",
                    coberturaReport: "report/",
                    htmlReport: "dist/report/coverage",
                    lcovReport: "dist/report/lcov",
                    linesThresholdPct: 70
                }
            }
        },
        copy: {
            main: {
                files: [
                    {src: ['src/demo.html'], dest: 'dist/demo.html', filter: 'isFile'}
                ]
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'src/*.js', 'test/*.js']
        },
        concat: {
            options: {
                // define a string to put between each file in the concatenated output
                separator: ';'
            },
            dist: {
                // the files to concatenate
                src: ['src/*.js'],
                // the location of the resulting JS file
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                // the banner is inserted at the top of the output
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        coveralls: {
            options: {
                // LCOV coverage file relevant to every target
                src: 'dist/report/lcov/lcov.info',

                // When true, grunt-coveralls will only print a warning rather than
                // an error, to prevent CI builds from failing unnecessarily (e.g. if
                // coveralls.io is down). Optional, defaults to false.
                force: true
            },
            ci: {
                // Target-specific LCOV coverage file
                src: 'dist/report/lcov/lcov.info'
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint', 'qunit']
        }
    });

    grunt.loadNpmTasks('grunt-qunit-istanbul');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-coveralls');

    grunt.registerTask('default', ['jshint', 'copy', 'concat', 'uglify']);
    grunt.registerTask('test', ['jshint', 'qunit', 'coveralls']);
    grunt.registerTask('coverage', ['coverage']);
};