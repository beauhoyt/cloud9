var sys = require("sys");

exports.HttpError = function(message, code) {
    Error.call(this, message);
    //Error.captureStackTrace(this, arguments.callee);
    this.message = message;
    this.code = code;
};
sys.inherits(exports.HttpError, Error);

(function() {
    
    this.toString = function() {
        return this.message;
    };
    
}).call(exports.HttpError.prototype);


var statusCodes = {
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    420: "Enhance Your Calm",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    425: "Unordered Collection",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    444: "No Response",
    449: "Retry With",
    499: "Client Closed Request",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    509: "Bandwidth Limit Exceeded",
    510: "Not Extended",
    511: "Network Authentication Required"
};

for (var status in statusCodes) {
    var defaultMsg = statusCodes[status];
    
    var error = (function(defaultMsg, status) {
        return function(msg) {
            this.defaultMessage = defaultMsg;
            exports.HttpError.call(this, msg || status + ": " + defaultMsg, status);
            
            if (status >= 500)
                Error.captureStackTrace(this, arguments.callee);
        };
    })(defaultMsg, status);
    
    sys.inherits(error, exports.HttpError);
    
    var className = toCamelCase(defaultMsg);
    exports[className] = error;
    exports[status] = error;
}

function toCamelCase(str) {
    return str.toLowerCase().replace(/(?:(^.)|(\s+.))/g, function(match) {
        return match.charAt(match.length-1).toUpperCase();
    });
}