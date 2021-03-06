/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */

// #ifdef __AMLCODEEDITOR || __INC_ALL

/**
 * Element allowing the user to type code.
 *
 * @constructor
 * @define codeeditor
 * @addnode elements
 *
 * @inherits apf.StandardBinding
 *
 * @author      Ruben Daniels (ruben AT ajax DOT org)
 * @author      Fabian Jakobs (fabian AT ajax DOT org)
 * @version     %I%, %G%
 * @since       0.1
 */

define(function(require, exports, module) {
"use strict";

var Editor = require("ace/editor").Editor;
var EditSession = require("ace/edit_session").EditSession;
var VirtualRenderer = require("ace/virtual_renderer").VirtualRenderer;
var UndoManager = require("ace/undomanager").UndoManager;
var Range = require("ace/range").Range;
var MultiSelect = require("ace/multi_select").MultiSelect;
var ProxyDocument = require("ext/code/proxydocument");
var Document = require("ace/document").Document;

require("ace/lib/fixoldbrowsers");

apf.codeeditor = module.exports = function(struct, tagName) {
    this.$init(tagName || "codeeditor", apf.NODE_VISIBLE, struct);

    this.documents = [];
    this.$cache    = {};
};

(function() {
    this.implement(
        //#ifdef __WITH_DATAACTION
        apf.DataAction
        //#endif
    );

    this.$focussable       = true; // This object can get the focus
    this.$childProperty    = "value";
    this.$isTextInput      = true;

    this.value             = "";
    this.multiline         = true;
    this.caching           = true;

    this.$booleanProperties["activeline"]               = true;
    this.$booleanProperties["gutterline"]               = true;
    this.$booleanProperties["caching"]                  = true;
    this.$booleanProperties["readonly"]                 = true;
    this.$booleanProperties["activeline"]               = true;
    this.$booleanProperties["showinvisibles"]           = true;
    this.$booleanProperties["showprintmargin"]          = true;
    this.$booleanProperties["overwrite"]                = true;
    this.$booleanProperties["softtabs"]                 = true;
    this.$booleanProperties["gutter"]                   = true;
    this.$booleanProperties["highlightselectedword"]    = true;
    this.$booleanProperties["autohidehorscrollbar"]     = true;
    this.$booleanProperties["behaviors"]                = true;
    this.$booleanProperties["folding"]                  = true;
    this.$booleanProperties["wrapmode"]                 = true;
    this.$booleanProperties["wrapmodeViewport"]         = true;
    this.$booleanProperties["animatedscroll"]           = true;
    this.$booleanProperties["globalcommands"]           = true;
    this.$booleanProperties["fadefoldwidgets"]          = true;

    this.$supportedProperties.push("value", "syntax", "activeline", "selectstyle",
        "caching", "readonly", "showinvisibles", "showprintmargin", "printmargincolumn",
        "overwrite", "tabsize", "softtabs", "debugger", "model-breakpoints", "scrollspeed",
        "theme", "gutter", "highlightselectedword", "autohidehorscrollbar", "animatedscroll",
        "behaviors", "folding", "newlinemode", "globalcommands", "fadefoldwidgets",
        "gutterline");

    this.$getCacheKey = function(value) {
        var key;
        if (typeof value === "string") {
            if (this.xmlRoot) {
                key = this.xmlRoot.getAttribute(apf.xmldb.xmlIdTag);
            }
            else {
                key = value;
            }
        }
        else if (value.nodeType) {
            key = value.getAttribute(apf.xmldb.xmlIdTag);
        }

        return key;
    };

    this.clearCacheItem = function(xmlNode) {
        if (!this.caching)
            return;

        var key = this.$getCacheKey(xmlNode);
        if (key)
            delete this.$cache[key];
    };

    this.addEventListener("unloadmodel", function() {
        this.syncValue();
    });

    /**
     * @attribute {String} value the text of this element
     * @todo apf3.0 check use of this.$propHandlers["value"].call
     */
    this.$propHandlers["value"] = function(value){ //@todo apf3.0 add support for the range object as a value
        var doc, key;
        var _self = this;

        if (this.caching)
            key = this.$getCacheKey(value);

        //Assuming document
        if (value instanceof EditSession)
            doc = value;

        if (!doc && key)
            doc = this.$cache[key];

        if (!doc) {
            if (value.nodeType) {
                apf.xmldb.addNodeListener(value.nodeType == 1
                    ? value : value.parentNode, this);
            }
            
            doc = new EditSession(new ProxyDocument(new Document(typeof value == "string"
              ? value
              : (value.nodeType > 1 && value.nodeType < 5 //@todo replace this by a proper function
                    ? value.nodeValue
                    : value.firstChild && value.firstChild.nodeValue || ""))));

            doc.cacheId = key;
            doc.setUndoManager(new UndoManager());

            if (key)
                this.$cache[key] = doc;
        }
        //@todo value can also be an xml node and should be updated in a similar fashion as above
        else if (typeof value == "string" && !doc.hasValue) {
            //@todo big hack!
            doc.setValue(value);
            doc.hasValue = true;
        }

        if (!doc.$hasModeListener) {
            doc.$hasModeListener = true;
            doc.on("loadmode", function(e) {
                _self.dispatchEvent("loadmode", e);
            });
        }
        _self.syntax = doc.syntax;
        _self.dispatchEvent("prop.syntax", {
            value : doc.syntax
        });

        doc.setTabSize(parseInt(_self.tabsize, 10));
        doc.setUseSoftTabs(_self.softtabs);
        doc.setUseWrapMode(_self.wrapmode);
        if (_self.wrapmodeViewport) {
            doc.setWrapLimitRange(_self.wraplimitmin, null);
        }
        else {
           doc.setWrapLimitRange(_self.wraplimitmin, _self.printmargincolumn);
        }
        doc.setFoldStyle(_self.folding ? "markbegin" : "manual");
        doc.setNewLineMode(_self.newlinemode);

        _self.$editor.setShowPrintMargin(_self.showprintmargin);

        // remove existing markers
        _self.$clearMarker();

        _self.$editor.setSession(doc);

        // clear breakpoints
        doc.setBreakpoints([]);
    };

    this.afterOpenFile = function(doc) {
        this.$updateMarker();
        this.$updateBreakpoints(doc);
    };

    this.$clearMarker = function () {
        if (this.$marker) {
            this.$editor.renderer.removeGutterDecoration(this.$lastRow[0], this.$lastRow[1]);
            this.$editor.getSession().removeMarker(this.$marker);
            this.$marker = null;
        }
    };

    /**
     * Indicates whether we are going to set a marker
     */
    this.$updateMarkerPrerequisite = function () {
        return this.$debugger && this.$debugger.$updateMarkerPrerequisite();
    };

    this.$updateMarker = function () {
        this.$clearMarker();

        var frame = this.$updateMarkerPrerequisite();
        if (!frame) {
            return;
        }

        var script = this.xmlRoot;
        if (script.getAttribute("scriptid") !== frame.getAttribute("scriptid")) {
            return;
        }

        var head = this.$debugger.$mdlStack.queryNode("frame[1]");
        var isTop = frame == head;
        var lineOffset = parseInt(script.getAttribute("lineoffset") || "0", 10);
        var row = parseInt(frame.getAttribute("line"), 10) - lineOffset;
        var range = new Range(row, 0, row + 1, 0);
        this.$marker = this.$editor.getSession().addMarker(range, isTop ? "ace_step" : "ace_stack", "line");
        var type = isTop ? "arrow" : "stack";
        this.$lastRow = [row, type];
        this.$editor.renderer.addGutterDecoration(row, type);
        this.$editor.gotoLine(row + 1, parseInt(frame.getAttribute("column"), 10), false);
    };

    this.$updateBreakpoints = function(doc) {
        doc = doc || this.$editor.getSession();

        doc.setBreakpoints([]);
        if (!this.$breakpoints) {
            return;
        }

        if (this.xmlRoot) {
            var scriptName = this.xmlRoot.getAttribute("scriptname");
            if (!scriptName)
                return;

            var breakpoints = this.$breakpoints.queryNodes("//breakpoint[@script='" + scriptName + "']");

            var rows = [];
            for (var i=0; i<breakpoints.length; i++) {
                rows.push(parseInt(breakpoints[i].getAttribute("line"), 10) - parseInt(breakpoints[i].getAttribute("lineoffset"), 10));
            }
            if (rows.length)
                doc.setBreakpoints(rows);
        }
    };

    this.$toggleBreakpoint = function(row, content) {
        this.$debugger.toggleBreakpoint(this.xmlRoot, row, content);
    };

    this.$propHandlers["theme"] = function(value) {
        this.$editor.setTheme(value);
    };

    this.$propHandlers["newlinemode"] = function(value) {
        this.newlinemode = value || "auto";
        this.$editor.getSession().setNewLineMode(this.newlinemode);
    };

    this.$propHandlers["syntax"] = function(value) {
        this.$editor.getSession().setMode(this.getMode(value));
    };

    this.getMode = function(syntax) {
        syntax = (syntax || "text").toLowerCase();
        if (syntax.indexOf("/") == -1)
            syntax = "ace/mode/" + syntax;

        return syntax;
    };

    this.$propHandlers["activeline"] = function(value) {
        this.$editor.setHighlightActiveLine(value);
    };

    this.$propHandlers["gutterline"] = function(value) {
        if(this.$editor.setHighlightGutterLine)
            this.$editor.setHighlightGutterLine(value);
    };

    this.$propHandlers["selectstyle"] = function(value) {
        this.$editor.setSelectionStyle(value);
    };

    this.$propHandlers["showprintmargin"] = function(value, prop, initial) {
        this.$editor.setShowPrintMargin(value);
    };

    this.$propHandlers["printmargincolumn"] = function(value, prop, initial) {
        this.$editor.setPrintMarginColumn(value);
        if (!this.wrapmodeViewport) {
            this.$editor.getSession().setWrapLimitRange(this.wraplimitmin, value);
        }
    };

    this.$propHandlers["showinvisibles"] = function(value, prop, initial) {
        this.$editor.setShowInvisibles(value);
    };

    this.$propHandlers["animatedscroll"] = function(value, prop, initial) {
        this.$editor.setAnimatedScroll(value);
    };

    this.$propHandlers["overwrite"] = function(value, prop, initial) {
        this.$editor.setOverwrite(value);
    };

    this.$propHandlers["readonly"] = function(value, prop, initial) {
        this.$editor.setReadOnly(value);
    };

    this.$propHandlers["tabsize"] = function(value, prop, initial) {
        this.$editor.getSession().setTabSize(parseInt(value, 10));
    };

    this.$propHandlers["folding"] = function(value, prop, initial) {
        this.$editor.setShowFoldWidgets(value);
        this.$editor.getSession().setFoldStyle(value ? "markbegin" : "manual");
    };

    this.$propHandlers["fadefoldwidgets"] = function(value, prop, initial) {
        if(this.$editor.setFadeFoldWidgets)
            this.$editor.setFadeFoldWidgets(value);
    };

    this.$propHandlers["softtabs"] = function(value, prop, initial) {
        this.$editor.getSession().setUseSoftTabs(value);
    };

    this.$propHandlers["scrollspeed"] = function(value, prop, initial) {
        this.$editor.setScrollSpeed(value || 2);
    };

    this.$propHandlers["gutter"] = function(value, prop, initial) {
        this.$editor.renderer.setShowGutter(value);
        this.$corner.style.display = value ? "block" : "none";
    };

    this.$propHandlers["fontsize"] = function(value, prop, initial) {
        this.$ext.style.fontSize = value + "px";
    };
    this.$propHandlers["wrapmode"] = function(value, prop, initial) {
        this.$editor.getSession().setUseWrapMode(value);
    };
    this.$propHandlers["wraplimitmin"] = function(value, prop, initial) {
        this.$editor.getSession().setWrapLimitRange(value, this.wraplimitmax);
    };
    this.$propHandlers["wraplimitmax"] = function(value, prop, initial) {
        this.$editor.getSession().setWrapLimitRange(this.wraplimitmin, value);
    };
    this.$propHandlers["wrapmodeViewport"] = function(value, prop, initial) {
        if (value === true)
            this.$editor.getSession().setWrapLimitRange(this.wraplimitmin, null);
        else {
            this.$editor.getSession().setWrapLimitRange(this.wraplimitmin, this.printmargincolumn);
        }
    };
    this.$propHandlers["highlightselectedword"] = function(value, prop, initial) {
        this.$editor.setHighlightSelectedWord(value);
    };
    this.$propHandlers["autohidehorscrollbar"] = function(value, prop, initial) {
        this.$editor.renderer.setHScrollBarAlwaysVisible(!value);
    };
    this.$propHandlers["behaviors"] = function(value, prop, initial) {
        this.$editor.setBehavioursEnabled(value);
    };

    this.$propHandlers["model-breakpoints"] = function(value, prop, inital) {
        this.$debuggerBreakpoints = false;

        if (this.$breakpoints)
            this.$breakpoints.removeEventListener("update", this.$onBreakpoint);

        this.$breakpoints = value;

        if (!this.$breakpoints) {
            this.$updateBreakpoints();
            return;
        }

        var _self = this;
        _self.$updateBreakpoints();
        this.$onBreakpoint = function() {
            _self.$updateBreakpoints();
        };
        this.$breakpoints.addEventListener("update", this.$onBreakpoint);
        this.$updateBreakpoints();
    };

    this.$propHandlers["debugger"] = function(value, prop, inital) {
        if (this.$debugger) {
            this.$debugger.removeEventListener("changeframe", this.$onChangeActiveFrame);
            this.$debugger.removeEventListener("break", this.$onChangeActiveFrame);
            this.$debugger.removeEventListener("beforecontinue", this.$onBeforeContinue);
        }

        if (typeof value === "string") {
            //#ifdef __WITH_NAMESERVER
            this.$debugger = apf.nameserver.get("debugger", value);
            //#endif
        } else {
            this.$debugger = value;
        }

        if (!this.$breakpoints || this.$debuggerBreakpoints) {
            this.setProperty("model-breakpoints", this.$debugger ? this.$debugger.$mdlBreakpoints : null);
            this.$debuggerBreakpoints = true;
        }

        if (!this.$debugger) {
            this.$updateMarker();
            return;
        }

        this.$updateMarker();
        var _self = this;
        this.$onChangeActiveFrame = function(e) {
            // if you dont have data, we aren't interested in ya
            if (!e || !e.data) {
                return;
            }

            _self.$updateMarker();
        };
        this.$onBeforeContinue = function() {
            _self.$clearMarker();
        };
        this.$debugger.addEventListener("changeframe", this.$onChangeActiveFrame);
        this.$debugger.addEventListener("break", this.$onChangeActiveFrame);
        this.$debugger.addEventListener("beforecontinue", this.$onBeforeContinue);
    };

    var propModelHandler = this.$propHandlers["model"];
    this.$propHandlers["model"] = function(value) {
        propModelHandler.call(this, value);

        this.$updateMarker();
        this.$updateBreakpoints();
    };

    this.addEventListener("xmlupdate", function(e){
        var id = e.xmlNode.getAttribute(apf.xmldb.xmlIdTag);
        if (this.$cache[id]) {
            //@todo Update document
        }
    });

    this.addEventListener("keydown", function(e){
        if (e.keyCode == 9)
            return false;
    });

    /**** Public Methods ****/

    //#ifdef __WITH_CONVENIENCE_API

    /**
     * Sets the value of this element. This should be one of the values
     * specified in the values attribute.
     * @param {String} value the new value of this element
     */
    this.setValue = function(value){
        return this.setProperty("value", value, false, true);
    };

    //@todo cleanup and put initial-message behaviour in one location
    this.clear = function(){
        this.$propHandlers["value"].call(this, "", null, true);
        this.$editor.resize();

        this.dispatchEvent("clear");//@todo this should work via value change
    };

    /**
     * Returns the current value of this element.
     * @return {String}
     */
    this.getValue = function(){
        return this.$editor.getSession().getValue(); //@todo very inefficient
    };

    this.getDocument =
    this.getSession = function() {
        return this.$editor.getSession();
    };

    this.getSelection = function() {
        return this.$editor.getSession().getSelection();
    };

    this.getLastSearchOptions = function() {
        return this.$editor.getLastSearchOptions();
    };

    //#endif

    /**
     * Selects the text in this element.
     */
    this.select   = function(){

    };

    /**
     * Deselects the text in this element.
     */
    this.deselect = function(){
        this.$editor.clearSelection();
    };

    this.scrollTo = function(){ };

    this.getDefaults = function() {
        return this.$defaults;
    };

    /**** Private Methods *****/

    this.$focus = function(e){
        if (!this.$ext || this.$ext.disabled)
            return;

        this.$setStyleClass(this.$ext, this.$baseCSSname + "Focus");

        this.$editor.focus();
    };

    this.syncValue = function() {
        var doc = this.$editor.getSession();
        if (!doc.cacheId || doc.cacheId == this.$getCacheKey(this.value)) {
            var value = this.getValue();
            if (this.value != value)
                this.setProperty("value", value);
                //this.change(value);
        }
    };

    this.$blur = function(e) {
        if (!this.$ext)
            return;

        // Removed because it was causing problems in some plugins by
        // reloading sessions upon the editor losing focus and it is unknown
        // what's the reasoning behind. Tests show no difference.
        // this.syncValue();

        this.$setStyleClass(this.$ext, "", [this.$baseCSSname + "Focus"]);
        this.$editor.blur();
    };

    //@todo
    this.addEventListener("keydown", function(e){

    }, true);

    /**** Init ****/

    this.$isTextInput = function(e){
        return true;
    };

    this.$draw = function(){
        //Build Main Skin
        this.$ext    = this.$getExternal();
        this.$input  = this.$getLayoutNode("main", "content", this.$ext);
        this.$corner = this.$getLayoutNode("main", "corner", this.$ext);

        this.addEventListener("resize", function(e) {
            this.$editor.resize();
        });

        this.$editor = new Editor(new VirtualRenderer(this.$input), null);
        new MultiSelect(this.$editor);

        this.$editor.renderer.$gutterLayer.addEventListener("changeGutterWidth",
            function(width){
                _self.$corner.style.left = (width - 5) + "px"
            });
            
        if (apf.isTrue(this.getAttribute("globalcommands"))){
            if(this.$editor.keyBinding.setDefaultHandler)
                this.$editor.keyBinding.setDefaultHandler(null);
        }

        // read defaults...
        var ed  = this.$editor;

        var _self = this;
        ed.addEventListener("changeOverwrite", function(e) {
            _self.setProperty("overwrite", e.data);
        });

        ed.addEventListener("gutterclick", function(e) {
            if (_self.$debugger && e.clientX - ed.container.getBoundingClientRect().left < 20) {
                _self.$toggleBreakpoint(e.getDocumentPosition().row,
                    ed.getSession().getLine(e.getDocumentPosition().row));
                e.stop();
            }
            else {
                _self.dispatchEvent("gutterclick", e);
            }
        });

        ed.addEventListener("gutterdblclick", function(e) {
            _self.dispatchEvent("gutterdblclick", e);
        });
    };

    this.$loadAml = function(){
        var ed  = this.$editor,
            doc = ed.getSession();

        if (this.syntax === undefined)
            this.syntax = "text";
        if (this.tabsize === undefined)
            this.tabsize = doc.getTabSize(); //4
        if (this.softtabs === undefined)
            this.softtabs = doc.getUseSoftTabs(); //true
        if (this.scrollspeed === undefined)
            this.scrollspeed = ed.getScrollSpeed();
        if (this.animatedscroll === undefined)
            this.animatedscroll = ed.getAnimatedScroll();
        if (this.selectstyle === undefined)
            this.selectstyle = ed.getSelectionStyle();//"line";
        if (this.activeline === undefined)
            this.activeline = ed.getHighlightActiveLine();//true;
        if (this.gutterline === undefined)
            this.gutterline = ed.getHighlightGutterLine();//true;
        if (this.readonly === undefined)
            this.readonly = ed.getReadOnly();//false;
        if (this.showinvisibles === undefined)
            this.showinvisibles = ed.getShowInvisibles();//false;
        if (this.showprintmargin === undefined)
            this.showprintmargin = ed.getShowPrintMargin();//false;
        if (this.printmargincolumn === undefined)
            this.printmargincolumn = ed.getPrintMarginColumn();//80;
        if (this.overwrite === undefined)
            this.overwrite = ed.getOverwrite();//false

        if (this.fontsize === undefined)
            this.fontsize = 12;
        var wraplimit = doc.getWrapLimitRange();
        if (this.wraplimitmin === undefined)
            this.wraplimitmin = 40;
        if (this.wraplimitmax === undefined)
            this.wraplimitmax = wraplimit.max;
        if (this.wrapmode === undefined)
            this.wrapmode = doc.getUseWrapMode(); //false
        if (this.gutter === undefined)
            this.gutter = ed.renderer.getShowGutter();
        if (this.highlightselectedword === undefined)
            this.highlightselectedword = ed.getHighlightSelectedWord();
        if (this.autohidehorscrollbar)
            this.autohidehorscrollbar = !ed.renderer.getHScrollBarAlwaysVisible();
        if (this.behaviors === undefined)
            this.behaviors = !ed.getBehavioursEnabled();
        if (this.folding === undefined)
            this.folding = true;
        if (this.newlinemode == undefined)
            this.newlinemode = "auto";
    };

// #ifdef __WITH_DATABINDING
}).call(apf.codeeditor.prototype = new apf.StandardBinding());
/* #else
}).call(apf.textbox.prototype = new apf.Presentation());
#endif*/

apf.config.$inheritProperties["initial-message"] = 1;

apf.aml.setElement("codeeditor", apf.codeeditor);

});
// #endif
