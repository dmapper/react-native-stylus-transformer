var fs = require("fs");
var path = require("path");
var semver = require("semver");
var css2rn = require("css-to-react-native-transform").default;
var stylus = require("stylus");

var upstreamTransformer = null;

var reactNativeVersionString = require("react-native/package.json").version;
var reactNativeMinorVersion = semver(reactNativeVersionString).minor;

if (reactNativeMinorVersion >= 52) {
  upstreamTransformer = require("metro/src/transformer");
} else if (reactNativeMinorVersion >= 47) {
  upstreamTransformer = require("metro-bundler/src/transformer");
} else if (reactNativeMinorVersion === 46) {
  upstreamTransformer = require("metro-bundler/build/transformer");
} else {
  // handle RN <= 0.45
  var oldUpstreamTransformer = require("react-native/packager/transformer");
  upstreamTransformer = {
    transform({ src, filename, options }) {
      return oldUpstreamTransformer.transform(src, filename, options);
    }
  };
}

module.exports.transform = function(src, filename, options) {
  if (typeof src === "object") {
    // handle RN >= 0.46
    ({ src, filename, options } = src);
  }

  if (filename.endsWith(".styl")) {
    var STYLES_PATH = path.join(process.cwd(), 'styles');
    var compiled
    var compiler = stylus(src);
    compiler.set('filename', filename);

    // TODO: Make this a setting
    if (fs.existsSync(STYLES_PATH)) {
      compiler.import(STYLES_PATH);
    }
    compiler.render(function (err, res) {
      if (err) {
        throw new Error(err);
      }
      compiled = res;
    });
    var cssObject = css2rn(compiled, { parseMediaQueries: true });

    return upstreamTransformer.transform({
      src: "module.exports = " + JSON.stringify(cssObject),
      filename,
      options
    });
  }
  return upstreamTransformer.transform({ src, filename, options });
};
