"use strict";

var util = require("util");
var c9util = require("../cloud9.core/util");
var ShellRunner = require("../cloud9.run.shell/shell").Runner;

/**
 * Run node scripts with restricted user rights
 */

var exports = module.exports = function setup(options, imports, register) {
    var pm = imports["process-manager"];

    imports.sandbox.getUnixId(function(err, unixId) {
        if (err) return register(err);

        pm.addRunner("npm", exports.factory(unixId));

        register(null, {
            "run-npm": {}
        });
    });
};

exports.factory = function(uid) {
    return function(args, eventEmitter, eventName) {
        var options = {};
        c9util.extend(options, args);
        options.uid = uid;
        options.eventEmitter = eventEmitter;
        options.eventName = eventName;
        options.args = args.args;
        options.command = "npm";
        return new Runner(options);
    };
};

var Runner = exports.Runner = function(options) {
    ShellRunner.call(this, options);
};

util.inherits(Runner, ShellRunner);

Runner.prototype.name = "npm";
