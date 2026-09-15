/*jshint -W069*/
/*jshint -W108*/
/*global module,Buffer*/
var through = require('through2'),
    path = require('path'),
    gutil = require('gulp-util'),
    semver = require("semver"),
    xml2js = require("xml2js"),
    spawn = require("child_process").spawn,
    parser = new xml2js.Parser(),
    builder = new xml2js.Builder({
        renderOpts: { pretty: true, indent: "    ", newline: "\n" },
        xmldec:     { standalone: null, encoding: "utf-8" }
    }),
    shelljs = require('shelljs'),
    currentFolder = shelljs.pwd().toString(),
    mendixApp = require("node-mendix-modeler-path");

/*********************************
    GENERATE PATHS
**********************************/

module.exports.generatePaths = function (pkg) {
    var paths = {
        TEST_PATH : path.join(currentFolder, "/test/Test.mpr"),
        WIDGET_XML : path.join(currentFolder, "/src/", pkg.name, "/", pkg.name + ".xml"),
        PACKAGE_XML : path.join(currentFolder, "/src/package.xml"),
        TEST_WIDGETS_FOLDER : path.join(currentFolder, "./test/widgets"),
        TEST_WIDGETS_DEPLOYMENT_FOLDER : path.join(currentFolder, "./test/deployment/web/widgets")
    };

    if (pkg.paths && pkg.paths.testProjectFolder && pkg.paths.testProjectFileName) {
        var folder = pkg.paths.testProjectFolder;
        if (folder.indexOf(".") === 0) {
            folder = path.join(currentFolder, folder);
        }
        paths.TEST_PATH = path.join(folder, pkg.paths.testProjectFileName);
        paths.TEST_WIDGETS_FOLDER = path.join(folder, "/widgets");
        paths.TEST_WIDGETS_DEPLOYMENT_FOLDER = path.join(folder, "/deployment/web/widgets");
    }

    paths.WIDGET_DIST_DEST = path.join("./dist", pkg.name + ".mpk");
    paths.WIDGET_TEST_DEST = path.join(paths.TEST_WIDGETS_FOLDER, pkg.name + ".mpk");

    paths.showPaths = function () {
        console.log("\nShowing file paths that Gulp will use. You can edit the package.json accordingly\n");
        console.log("TEST_PATH:                      ", gutil.colors.cyan(paths.TEST_PATH));
        console.log("WIDGET_XML:                     ", gutil.colors.cyan(paths.WIDGET_XML));
        console.log("PACKAGE_XML:                    ", gutil.colors.cyan(paths.PACKAGE_XML));
        console.log("TEST_WIDGETS_FOLDER:            ", gutil.colors.cyan(paths.TEST_WIDGETS_FOLDER));
        console.log("TEST_WIDGETS_DEPLOYMENT_FOLDER: ", gutil.colors.cyan(paths.TEST_WIDGETS_DEPLOYMENT_FOLDER), "\n");
    };

    return paths;
};

/*********************************
    CHANGE PACKAGE>XML
**********************************/

function changeXML(file, callback, version) {
    if (!file || !file.isBuffer() || !file.contents) {
        throw new gutil.PluginError('xmlversion', 'error, cannot read file or file is not a buffer');
    }
    var contents = file.contents.toString();
    //console.dir(Object.keys(file));
    parser.parseString(contents, function (err, res) {
        if (err) {
            throw new gutil.PluginError('xmlversion', err);
        }
        if (res.package.clientModule[0]["$"]["version"]) {
            var currentVersion = res.package.clientModule[0]["$"]["version"];
            if (!version) {
                console.log();
                gutil.log("Current version is " + gutil.colors.cyan(currentVersion));
                gutil.log("Set new version by running '" + gutil.colors.cyan("gulp version --n=x.y.z"));
                gutil.log("                        or '" + gutil.colors.cyan("npm run version -- --n=x.y.z") + "'\n");
                callback(null, file);
                return;
            } else {
                if (!semver.valid(version) || !semver.satisfies(version, ">= 1.0.0")) {
                    throw new gutil.PluginError('xmlversion', "Please provide a valid version that is higher than 1.0.0. Current version: " + currentVersion);
                } else {
                    res.package.clientModule[0]["$"]["version"] = version;
                    var xmlString = builder.buildObject(res);
                    file.contents = new Buffer(xmlString);
                    callback(null, file);
                }
            }
        } else {
            throw new gutil.PluginError('xmlversion', "Cannot find current version number");
        }
    });
}

module.exports.xmlversion = function(version) {
  return through.obj(function(file, encoding, callback) {
      changeXML(file, callback, version);
  });
};

/*********************************
    RUN MODELER
**********************************/

module.exports.runmodeler = function (path, args, project, cb) {
    if (path !== null || (mendixApp.err === null && mendixApp.output !== null && mendixApp.output.cmd && mendixApp.output.arg)) {
        var cmd = spawn(path || mendixApp.output.cmd, [
            (path !== null ? args : mendixApp.output.arg).replace("{path}", project)
        ], { stdio: "inherit"});
        cmd.on("close", function (code) {
            console.log("modeler task exited with code " + code);
            cb(code);
        });
    } else {
        console.error("Cannot start Modeler, see error:");
        console.log(mendixApp.err);
        cb();
    }
};
