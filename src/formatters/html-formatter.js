'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _chai = require('chai');

var StyleManager = (function () {
    function StyleManager(content) {
        _classCallCheck(this, StyleManager);

        this._content = content;
        this._stack = [{}];
        this._started = false;
        this._applied = undefined;
    }

    _createClass(StyleManager, [{
        key: 'set',
        value: function set(style, value) {
            this._stack[this._stack.length - 1][style] = value;
        }
    }, {
        key: 'getLineStyles',
        value: function getLineStyles(newStyles) {
            newStyles = newStyles || {};
            newStyles.display = newStyles.display || 'inline-block';
            for (var i = this._stack.length - 1; i >= 0; i--) {
                var styles = this._stack[i];
                for (var key in styles) {
                    if (StyleManager.isLineStyle(key)) {
                        newStyles[key] = newStyles[key] || styles[key];
                    }
                }
            }
            return StyleManager.formatStyles(newStyles);
        }
    }, {
        key: 'push',
        value: function push() {
            this._stack.push({});
        }
    }, {
        key: 'pop',
        value: function pop() {
            _chai.assert.equal(!!this._stack.pop(), true);
        }
    }, {
        key: 'apply',
        value: function apply() {
            var newStyles = {};
            for (var i = this._stack.length - 1; i >= 0; i--) {
                var styles = this._stack[i];
                for (var key in styles) {
                    if (!StyleManager.isLineStyle(key)) {
                        newStyles[key] = newStyles[key] || styles[key];
                    }
                }
            }
            var formattedStyles = StyleManager.formatStyles(newStyles);
            if (this._applied === undefined) {
                this._content.push('<span style="' + formattedStyles + '">');
            } else if (this._applied !== formattedStyles) {
                this._content.push('</span><span style="' + formattedStyles + '">');
            }
            this._applied = formattedStyles;
        }
    }, {
        key: 'begin',
        value: function begin() {
            this._started = true;
            this._applied = undefined;
        }
    }, {
        key: 'end',
        value: function end() {
            this._started = false;
            if (this._applied !== undefined) {
                this._content.push('</span>');
            }
            this._applied = undefined;
        }
    }], [{
        key: 'formatStyles',
        value: function formatStyles(styles) {
            var style = '';
            for (var key in styles) {
                if (!this.ignoreStyle(key, styles[key])) {
                    if (style) {
                        style += ' ';
                    }
                    style += key + ': ' + styles[key] + ';';
                }
            }
            return style;
        }
    }, {
        key: 'isLineStyle',
        value: function isLineStyle(style) {
            if (style === 'text-indent' || style === 'text-align' || style === 'white-space') {
                return true;
            }
        }
    }, {
        key: 'ignoreStyle',
        value: function ignoreStyle(style, value) {
            switch (style) {
                case 'text-indent':
                    return !value;
                case 'white-space':
                    return value === 'normal';
                case 'font-weight':
                    return value === 'normal';
                case 'font-style':
                    return value === 'normal';
            }
        }
    }]);

    return StyleManager;
})();

function twipToPx(twip) {
    return Math.floor(twip / 9);
}

function beginRightAlignedTab(context) {
    context.rightAlignedTab = true;
    context.res[context.divIndex] = '<div style="' + context.styles.getLineStyles({ 'text-align': 'right' }) + ' width: ' + getTabWidth(context) + 'px;">';
}

function endRightAlignedTab(context) {
    if (context.rightAlignedTab) {
        context.rightAlignedTab = false;
    }
}

function getTabWidth(context) {
    var begin = context.tabIndex === 0 ? 0 : context.tabs[context.tabIndex - 1].pos;
    var end = context.tabIndex + 1 < context.tabs.length ? context.tabs[context.tabIndex].pos : getContentWidth(context);
    return end - begin;
}

function getContentWidth(context) {
    return twipToPx((context.width || context.paperWidth) - context.margins[3] - context.margins[1]);
}

function getContentHeight(context) {
    return twipToPx((context.height || context.paperHeight) - context.margins[0] - context.margins[2]);
}

function parseIntCode(code, prefix) {
    if (code.substring(0, prefix.length) === prefix) {
        console.log(code);
        return parseInt(code.substring(prefix.length));
    }
}

function rgbToHex(r, g, b) {
    r = r.toString(16);
    r = r.length == 1 ? '0' + r : r;
    g = g.toString(16);
    g = g.length == 1 ? '0' + g : g;
    b = b.toString(16);
    b = b.length == 1 ? '0' + b : b;
    return '#' + r + g + b;
}

var GroupType = {
    ROOT: -1,
    NORMAL: 0,
    COLORTABLE: 1,
    FONTTABLE: 2
};

function processFontTable(context, data) {
    var font = {
        index: 0
    };
    for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (Array.isArray(item)) {
            for (var j = 0; j < item.length; j++) {
                var code = item[j];
                font.index = parseIntCode(code, 'f') || font.index;
            }
        } else if (typeof item === 'string') {
            font.name = item.substring(0, item.length - 1); // trim ';'
            var dashIndex = font.name.indexOf('-');
            if (dashIndex >= 0) {
                font.name = font.name.substring(0, dashIndex);
            }
        }
    }
    if (font.index !== undefined) {
        context.fonts.length = Math.max(context.fonts.length, font.index + 1);
        context.fonts[font.index] = font;
    }
}

function processString(context, localState, item) {
    if (localState.childGroupType === GroupType.COLORTABLE) {
        context.colors.push(rgbToHex(context.redColor, context.greenColor, context.blueColor));
        context.redColor = 0;
        context.greenColor = 0;
        context.blueColor = 0;
    } else if (!localState.ignoreNextText) {
        if (context.divIndex < 0) {
            context.divIndex = context.res.length;
            context.res.push('<div style="' + context.styles.getLineStyles() + ' width: ' + getContentWidth(context) + 'px;">');
            context.styles.begin();
        }
        context.styles.apply();
        context.res.push(item);
    } else {
        localState.ignoreNextText = false;
    }
}

function format(context, data, groupType) {
    var localState = {
        childGroupType: GroupType.NORMAL
    };
    for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (Array.isArray(item)) {
            var resetTabs = true;
            var tabAlign = undefined;
            var insertText = undefined;
            for (var j = 0; j < item.length; j++) {
                var code = item[j];
                switch (code) {
                    case 'par':
                        endRightAlignedTab(context);
                        if (context.divIndex >= 0) {
                            context.styles.end();
                            context.res.push('</div>');
                            context.divIndex = -1;
                        }
                        context.tabIndex = 0;
                        context.res.push('<br>\n');
                        break;
                    case 'tab':
                        if (context.tabIndex < context.tabs.length) {
                            if (context.divIndex < 0) {
                                context.divIndex = context.res.length;
                                context.res.push('<div style="' + context.styles.getLineStyles() + ' width: ' + getContentWidth(context) + 'px;">');
                                context.styles.begin();
                            }
                            if (context.rightAlignedTab) {
                                endRightAlignedTab(context);
                                context.styles.end();
                                context.res.push('</div>');
                                context.divIndex = context.res.length;
                                context.res.push('<div style="' + context.styles.getLineStyles() + '">');
                                context.styles.begin();
                            }
                            var tab = context.tabs[context.tabIndex];
                            context.res[context.divIndex] = '<div style="' + context.styles.getLineStyles() + ' width: ' + getTabWidth(context) + 'px;">';
                            if (tab.align === 'right') {
                                beginRightAlignedTab(context);
                                context.tabIndex++;
                            } else {
                                context.tabIndex++;
                                context.styles.end();
                                context.res.push('</div>');
                                context.divIndex = context.res.length;
                                context.res.push('<div style="' + context.styles.getLineStyles() + ' width: ' + (getContentWidth(context) - tab.pos) + 'px;">');
                                context.styles.begin();
                            }
                        }
                        break;
                    case 'fonttbl':
                        localState.childGroupType = GroupType.FONTTABLE;
                        context.fonts = [];
                        break;
                    case 'colortbl':
                        localState.childGroupType = GroupType.COLORTABLE;
                        context.colors = [];
                        context.redColor = 0;
                        context.greenColor = 0;
                        context.blueColor = 0;
                        break;
                    case 'stylesheet':
                        localState.ignoreAll = true;
                        break;
                    case 'expndtw':
                    case 'up':
                        localState.ignoreNextText = true;
                        break;
                    case 'tqr':
                        context.tabs = resetTabs ? [] : context.tabs;
                        resetTabs = false;
                        tabAlign = 'right';
                        break;
                    case 'i':
                        context.styles.set('font-style', 'italic');break;
                    case 'i0':
                        context.styles.set('font-style', 'normal');break;
                    case 'b':
                        context.styles.set('font-weight', 'bold');break;
                    case 'b0':
                        context.styles.set('font-weight', 'normal');break;
                    case 'ql':
                    case 'qc':
                    case 'qr':
                        context.styles.set('text-align', code === 'qc' ? 'center' : code === 'qr' ? 'right' : 'left');
                        break;
                    case '\'8e':
                        insertText = '&#xe9';break;
                    case '\'8f':
                        insertText = '&#xe8';break;
                    case '\'90':
                        insertText = '&#xeA';break;
                    case '\'91':
                        insertText = '&#xeA';break;
                    case '\'95':
                        insertText = '&#xeE';break;
                    case '\'ca':
                        insertText = '&nbsp;';break;
                    case '\'d0':
                        insertText = '&ndash;';break;
                }
                if (groupType === GroupType.ROOT) {
                    context.paperWidth = parseIntCode(code, 'paperw') || context.paperWidth;
                    context.paperHeight = parseIntCode(code, 'paperh') || context.paperHeight;
                    context.marginLeft = parseIntCode(code, 'margl') || context.marginLeft;
                    context.marginRight = parseIntCode(code, 'margr') || context.marginRight;
                    context.marginTop = parseIntCode(code, 'margt') || context.marginTop;
                    context.marginBottom = parseIntCode(code, 'margb') || context.marginBottom;
                } else if (localState.childGroupType === GroupType.COLORTABLE) {
                    context.redColor = parseIntCode(code, 'red') || context.redColor;
                    context.greenColor = parseIntCode(code, 'green') || context.greenColor;
                    context.blueColor = parseIntCode(code, 'blue') || context.blueColor;
                }
                var fontSize = code.match(/fs(\d+)/);
                if (fontSize) {
                    context.styles.set('font-size', fontSize[0].substring(2) + 'px');
                }
                var tabStop = code.match(/tx(\d+)/);
                if (tabStop) {
                    context.tabs = resetTabs ? [] : context.tabs;
                    resetTabs = false;
                    context.tabs.push({
                        pos: twipToPx(tabStop[0].substring(2)),
                        align: tabAlign || 'left'
                    });
                    tabAlign = undefined;
                }
                var leftIndent = parseIntCode(code, 'li');
                if (leftIndent !== undefined) {
                    context.styles.set('text-indent', leftIndent ? twipToPx(leftIndent) + 'px' : 0);
                    context.styles.set('white-space', leftIndent ? 'nowrap' : 'normal');
                }
                if (insertText) {
                    if (!localState.ignoreAll) {
                        processString(context, localState, insertText);
                    }
                    insertText = undefined;
                }
            }
        } else {
            if (!localState.ignoreAll) {
                if (typeof item === 'string') {
                    processString(context, localState, item);
                } else {
                    if (localState.childGroupType === GroupType.FONTTABLE) {
                        context.styles.push();
                        processFontTable(context, item.group);
                        context.styles.pop();
                    } else {
                        context.styles.push();
                        format(context, item.group, localState.childGroupType);
                        context.styles.pop();
                    }
                }
            }
        }
    }
    return context.res;
}

exports['default'] = function (parsedRtf, options) {
    var res = [];
    var context = {
        res: res,
        divIndex: -1,
        styles: new StyleManager(res),
        tabIndex: 0,
        tabs: [],
        colors: [],
        fonts: [],
        margins: options.margins,
        width: options.width,
        height: options.height

    };
    format(context, parsedRtf.group, GroupType.ROOT);
    var bodyStyles = {
        'margin': 0,
        'width': twipToPx(context.width || context.paperWidth) + 'px',
        'height': twipToPx(context.height || context.paperHeight) + 'px',
        'color': context.colors.length ? context.colors[0] : '#000000'
    };
    var font = context.fonts.length ? context.fonts[0].name : undefined;
    if (font) {
        bodyStyles['font-family'] = font;
    }
    var mainDivStyles = {
        'position': 'absolute',
        'left': twipToPx(context.margins[3]) + 'px',
        'top': twipToPx(context.margins[0]) + 'px',
        'width': getContentWidth(context) + 'px',
        'height': getContentHeight(context) + 'px'
    };
    var innerDivStyles = {};
    switch (options.vertAlign) {
        case 'center':
            innerDivStyles = {
                'position': 'relative',
                'top': '50%',
                '-webkit-transform': 'translateY(-50%)',
                '-moz-transform': 'translateY(-50%)',
                '-ms-transform': 'translateY(-50%)',
                '-o-transform': 'translateY(-50%)',
                'transform': 'translateY(-50%)',
                'display': 'block'
            };
            break;
        case 'bottom':
            innerDivStyles = {
                'position': 'absolute',
                'bottom': '0'
            };
            break;
    }
    return '<body style="' + StyleManager.formatStyles(bodyStyles) + '">\n' + ' <div style="' + StyleManager.formatStyles(mainDivStyles) + '">\n' + '  <div style="' + StyleManager.formatStyles(innerDivStyles) + '">\n' + context.res.join('') + '  </div>\n' + ' </div>\n' + '</body>';
};

module.exports = exports['default'];