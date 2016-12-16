/**
 * @file
 * @author
 */

define(function (require) {
    var plugin = require('../core/plugin');
    var domUtils = require('../core/domUtils');
    var utils = require('../core/utils');

    function fn() {
        var me = this;
        var images = [];
        return {
            commands: {
                wordimage: {
                    execCommand: function () {
                        var images = domUtils.getElementsByTagName(me.body, 'img');
                        var urlList = [];
                        for (var i = 0, ci; ci = images[i++];) {
                            var url = ci.getAttribute('word_img');
                            url && urlList.push(url);
                        }
                        return urlList;
                    },
                    queryCommandState: function () {
                        images = domUtils.getElementsByTagName(me.body, 'img');
                        for (var i = 0, ci; ci = images[i++];) {
                            if (ci.getAttribute('word_img')) {
                                return 1;
                            }

                        }
                        return -1;
                    },
                    notNeedUndo: true
                }
            },
            inputRule: function (root) {
                utils.each(root.getNodesByTagName('img'), function (img) {
                    var attrs = img.attrs;
                    var flag = parseInt(attrs.width, 10) < 128 || parseInt(attrs.height, 10) < 43;
                    var opt = me.options;
                    var src = opt.UEDITOR_HOME_URL + 'themes/default/images/spacer.gif';
                    if (attrs.src && /^(?:(file:\/+))/.test(attrs.src)) {
                        /* eslint-disable */
                        img.setAttr({
                            width: attrs.width,
                            height: attrs.height,
                            alt: attrs.alt,
                            word_img: attrs.src,
                            src: src,
                            style: 'background:url(' + (flag ? opt.themePath + opt.theme + '/images/word.gif' : opt.langPath + opt.lang + '/images/localimage.png') + ') no-repeat center center;border:1px solid #ddd'
                        });
                        /* eslint-enable */
                    }
                });
            }
        };
    }
    plugin.register('wordimage', fn);
});
