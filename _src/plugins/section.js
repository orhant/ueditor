/**
 * 目录大纲支持插件
 * @file
 * @author
 * @since 1.3.0
 */

define(function (require) {
    var domUtils = require('../core/domUtils');
    var utils = require('../core/utils');
    var plugin = require('../core/plugin');

    function fn() {

        function Section(option) {
            this.tag = '';
            this.level = -1,
            this.dom = null;
            this.nextSection = null;
            this.previousSection = null;
            this.parentSection = null;
            this.startAddress = [];
            this.endAddress = [];
            this.children = [];
        }
        function getSection(option) {
            var section = new Section();
            return utils.extend(section, option);
        }
        function getNodeFromAddress(startAddress, root) {
            var current = root;
            for (var i = 0; i < startAddress.length; i++) {
                if (!current.childNodes) {
                    return null;
                }

                current = current.childNodes[startAddress[i]];
            }
            return current;
        }

        var me = this;

        return {
            bindMultiEvents: {
                type: 'aftersetcontent afterscencerestore',
                handler: function () {
                    me.fireEvent('updateSections');
                }
            },
            bindEvents: {

                ready: function () {
                    me.fireEvent('updateSections');
                    domUtils.on(me.body, 'drop paste', function () {
                        me.fireEvent('updateSections');
                    });
                },

                afterexeccommand: function (type, cmd) {
                    if (cmd === 'paragraph') {
                        me.fireEvent('updateSections');
                    }

                },

                keyup: function (type, e) {
                    var me = this;
                    var range = me.selection.getRange();
                    if (range.collapsed !== true) {
                        me.fireEvent('updateSections');
                    }
                    else {
                        var keyCode = e.keyCode || e.which;
                        if (keyCode === 13 || keyCode === 8 || keyCode === 46) {
                            me.fireEvent('updateSections');
                        }
                    }
                }
            },
            commands: {
                getsections: {
                    execCommand: function (cmd, levels) {
                        var levelFn = levels || ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

                        for (var i = 0; i < levelFn.length; i++) {
                            if (typeof levelFn[i] === 'string') {
                                levelFn[i] = (function (fn) {
                                    return function (node) {
                                        return node.tagName === fn.toUpperCase();
                                    };
                                })(levelFn[i]);
                            }
                            else if (typeof levelFn[i] !== 'function') {
                                levelFn[i] = function (node) {
                                    return null;
                                };
                            }

                        }
                        function getSectionLevel(node) {
                            for (var i = 0; i < levelFn.length; i++) {
                                if (levelFn[i](node)) {
                                    return i;
                                }

                            }
                            return -1;
                        }

                        var me = this;
                        var Directory = getSection({level: -1, title: 'root'});
                        var previous = Directory;

                        function traversal(node, Directory) {
                            var level;
                            var tmpSection = null;
                            var parent;
                            var child;
                            var children = node.childNodes;
                            for (var i = 0, len = children.length; i < len; i++) {
                                child = children[i];
                                level = getSectionLevel(child);
                                if (level >= 0) {
                                    var address = me.selection.getRange()
                                        .selectNode(child).createAddress(true).startAddress;
                                    var current = getSection({
                                            tag: child.tagName,
                                            title: child.innerText || child.textContent || '',
                                            level: level,
                                            dom: child,
                                            startAddress: utils.clone(address, []),
                                            endAddress: utils.clone(address, []),
                                            children: []
                                        });
                                    previous.nextSection = current;
                                    current.previousSection = previous;
                                    parent = previous;
                                    while (level <= parent.level) {
                                        parent = parent.parentSection;
                                    }
                                    current.parentSection = parent;
                                    parent.children.push(current);
                                    tmpSection = previous = current;
                                }
                                else {
                                    child.nodeType === 1 && traversal(child, Directory);
                                    tmpSection && tmpSection.endAddress[tmpSection.endAddress.length - 1]++;
                                }
                            }
                        }
                        traversal(me.body, Directory);
                        return Directory;
                    },
                    notNeedUndo: true
                },
                movesection: {
                    execCommand: function (cmd, sourceSection, targetSection, isAfter) {

                        var me = this;
                        var targetAddress;
                        var target;

                        if (!sourceSection || !targetSection || targetSection.level === -1) {
                            return;
                        }

                        targetAddress = isAfter ? targetSection.endAddress : targetSection.startAddress;
                        target = getNodeFromAddress(targetAddress, me.body);

                        if (!targetAddress
                            || !target
                            || isContainsAddress(sourceSection.startAddress, sourceSection.endAddress, targetAddress)) {
                            return;
                        }

                        var startNode = getNodeFromAddress(sourceSection.startAddress, me.body);
                        var endNode = getNodeFromAddress(sourceSection.endAddress, me.body);
                        var current;
                        var nextNode;

                        if (isAfter) {
                            current = endNode;
                            while (current
                                && !(domUtils.getPosition(startNode, current) & domUtils.POSITION_FOLLOWING)) {
                                nextNode = current.previousSibling;
                                domUtils.insertAfter(target, current);
                                if (current === startNode) {
                                    break;
                                }

                                current = nextNode;
                            }
                        }
                        else {
                            current = startNode;
                            while (current && !(domUtils.getPosition(current, endNode) & domUtils.POSITION_FOLLOWING)) {
                                nextNode = current.nextSibling;
                                target.parentNode.insertBefore(current, target);
                                if (current === endNode) {
                                    break;
                                }

                                current = nextNode;
                            }
                        }

                        me.fireEvent('updateSections');

                        function isContainsAddress(startAddress, endAddress, addressTarget) {
                            var isAfterStartAddress = false;
                            var isBeforeEndAddress = false;
                            for (var i = 0; i < startAddress.length; i++) {
                                if (i >= addressTarget.length) {
                                    break;
                                }

                                if (addressTarget[i] > startAddress[i]) {
                                    isAfterStartAddress = true;
                                    break;
                                }
                                else if (addressTarget[i] < startAddress[i]) {
                                    break;
                                }

                            }
                            for (i = 0; i < endAddress.length; i++) {
                                if (i >= addressTarget.length) {
                                    break;
                                }

                                if (addressTarget[i] < startAddress[i]) {
                                    isBeforeEndAddress = true;
                                    break;
                                }
                                else if (addressTarget[i] > startAddress[i]) {
                                    break;
                                }

                            }
                            return isAfterStartAddress && isBeforeEndAddress;
                        }
                    }
                },
                deletesection: {
                    execCommand: function (cmd, section, keepChildren) {
                        var me = this;

                        if (!section) {
                            return;
                        }

                        function getNodeFromAddress(startAddress) {
                            var current = me.body;
                            for (var i = 0; i < startAddress.length; i++) {
                                if (!current.childNodes) {
                                    return null;
                                }

                                current = current.childNodes[startAddress[i]];
                            }
                            return current;
                        }

                        var startNode = getNodeFromAddress(section.startAddress);
                        var endNode = getNodeFromAddress(section.endAddress);
                        var current = startNode;
                        var nextNode;

                        if (!keepChildren) {
                            while (current
                                && domUtils.inDoc(endNode, me.document)
                                && !(domUtils.getPosition(current, endNode) & domUtils.POSITION_FOLLOWING)) {
                                nextNode = current.nextSibling;
                                domUtils.remove(current);
                                current = nextNode;
                            }
                        }
                        else {
                            domUtils.remove(current);
                        }

                        me.fireEvent('updateSections');
                    }
                },
                selectsection: {
                    execCommand: function (cmd, section) {
                        if (!section && !section.dom) {
                            return false;
                        }

                        var me = this;
                        var range = me.selection.getRange();
                        var address = {
                                startAddress: utils.clone(section.startAddress, []),
                                endAddress: utils.clone(section.endAddress, [])
                            };
                        address.endAddress[address.endAddress.length - 1]++;
                        range.moveToAddress(address).select().scrollToView();
                        return true;
                    },
                    notNeedUndo: true
                },
                scrolltosection: {
                    execCommand: function (cmd, section) {
                        if (!section && !section.dom) {
                            return false;
                        }

                        var me = this;
                        var range = me.selection.getRange();
                        var address = {
                                startAddress: section.startAddress,
                                endAddress: section.endAddress
                            };
                        address.endAddress[address.endAddress.length - 1]++;
                        range.moveToAddress(address).scrollToView();
                        return true;
                    },
                    notNeedUndo: true
                }
            }
        };
    }
    plugin.register('section', fn);
});
