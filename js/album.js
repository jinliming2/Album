/**
 * Created by Liming on 2016/5/5.
 */
"use strict";
(function(window) {
    'use strict';
    /**
     * 相册类
     * @param {string|HTMLElement} id 容器ID
     * @constructor
     */
    function Album(id) {
        //容器
        _container = Container(id);
        /**
         * 布局类型
         * @type {{PUZZLE: LAYOUT, WATERFALL: LAYOUT, BARREL: LAYOUT}}
         */
        this.LAYOUT = {
            PUZZLE: Symbol('PUZZLE'),        // 拼图布局
            WATERFALL: Symbol('WATERFALL'),  // 瀑布布局
            BARREL: Symbol('BARREL')         // 木桶布局
        };
        /**
         * 全屏模式
         * @type {{NONE: FULL_SCREEN, PAGE: FULL_SCREEN, WINDOW: FULL_SCREEN}}
         */
        this.FULL_SCREEN = {
            NONE: Symbol('DISABLE_FULL_SCREEN'),  //关闭全屏显示
            PAGE: Symbol('PAGE_FULL_SCREEN'),     //页面内全屏显示
            WINDOW: Symbol('WINDOW_FULL_SCREEN')  //窗口全屏显示
        };
    }

    /**
     * 布局容器
     * @type {Container}
     * @private
     */
    let _container;
    /**
     * 布局类型
     * @type {LAYOUT}
     * @private
     */
    let _layout;
    /**
     * 图片加载完成回调函数
     * @type {Function}
     * @private
     */
    let _imageLoadCallback;
    /**
     * 相册中图片集合
     * @type {Image[]}
     * @private
     */
    let _elements = [];
    /**
     * 图片间隔[X, Y]
     * @type {number[]}
     * @private
     */
    let _gutter = [0, 0];
    /**
     * 点击全屏浏览
     * @type {FULL_SCREEN}
     * @private
     */
    let _fullScreen;
    /**
     * 木桶布局高度限制
     * @type {number[]}
     * @private
     */
    let _barrelHeight = [0, 0];

    /**
     * 拼图布局
     */
    let puzzle = function() {
        //清空容器
        _container.clearChildren();
        //设置拼图布局
        _container
            .removeClass("waterfall")
            .removeClass("barrel")
            .addClass("puzzle")
            .removeClass("puzzle-1")
            .removeClass("puzzle-2")
            .removeClass("puzzle-3")
            .removeClass("puzzle-4")
            .removeClass("puzzle-5")
            .removeClass("puzzle-6");
        //根据图片数目进行对应布局
        switch(_elements.length) {
            //没有图片
            case 0:
                return;
                break;
            //一张图片
            case 1:
            {
                //一张图片布局
                _container.addClass("puzzle-1");
                _container.appendImage(_elements[0]);
            }
                break;
            //两张图片
            case 2:
            {
                //两张图片布局
                _container.addClass("puzzle-2");
                _container.appendImage(_elements[0]);
                _container.appendImage(_elements[1]);
            }
                break;
            //三张图片
            case 3:
            {
                //三张图片布局
                _container.addClass("puzzle-3");
            }
                break;
            //四张图片
            case 4:
            {
                //四张图片布局
                _container.addClass("puzzle-4");
            }
                break;
            //五张图片
            case 5:
            {
                //五张图片布局
                _container.addClass("puzzle-5");
            }
                break;
            //大于等于六张图片，只取前六张
            default:
            {
                //六张图片布局
                _container.addClass("puzzle-6");
            }
                break;
        }
    };

    /************* 以下是本库提供的公有方法 *************/
    /**
     * 初始化并设置相册
     * 当相册原本包含图片时，该方法会替换原有图片
     * @param {string|string[]} image  一张图片的 URL 或多张图片 URL 组成的数组
     * @param {{
     *   layout?: LAYOUT,
     *   fullScreen?: FULL_SCREEN,
     *   gutter?: {x: number, y: number},
     *   barrelHeight?: {min: number, max: number},
     *   imageLoadCallback?: Function
     * }} [option] 配置项
     */
    Album.prototype.setImage = function(image, option) {
        if(!(image instanceof Array)) {
            return this.setImage([image], option);
        }
        //配置
        if(!(option instanceof Object)) {
            option = {};
        }
        //布局
        this.setLayout(option.layout);
        //全屏显示
        this.setFullScreen(option.fullScreen);
        //图片间距
        this.setGutter(option.gutter.x, option.gutter.y);
        //木桶模式每行高度
        this.setBarrelHeight(option.barrelHeight.min, option.barrelHeight.max);
        //缓冲区图片加载完成回调函数
        _imageLoadCallback = option.imageLoadCallback instanceof Function ? option.imageLoadCallback : undefined;
        //移除所有图片
        this.removeImage(this.getImageDomElements());
        //添加图片
        this.addImage(image);
    };

    /**
     * 获取相册所有图像对应的 DOM 元素
     * @return {HTMLElement[]} 相册所有图像对应的 DOM 元素组成的数组
     */
    Album.prototype.getImageDomElements = function() {
        return Array.from(_elements);
    };

    /**
     * 向相册添加图片
     * 在拼图布局下，根据图片数量重新计算布局方式；其他布局下向尾部追加图片
     * @param {string|string[]} image 一张图片的 URL 或多张图片 URL 组成的数组
     */
    Album.prototype.addImage = function(image) {
        if(!(image instanceof Array)) {
            return this.addImage([image]);
        }
        for(let i of image) {
            let img = new Image();
            img.src = i;
            img.onload = () => {
                _elements.push(img);
            };
        }
    };

    /**
     * 移除相册中的图片
     * @param  {HTMLElement|HTMLElement[]} image 需要移除的图片
     * @return {boolean} 是否全部移除成功
     */
    Album.prototype.removeImage = function(image) {
        if(!(image instanceof Array)) {
            return this.removeImage([image]);
        }
        for(let i of image) {
            let index = _elements.indexOf(i);
            if(index >= 0) {
                _elements.splice(index, 1);
            }
        }
    };

    /**
     * 设置相册的布局
     * @param {LAYOUT} layout 布局，Album.LAYOUT 中的值
     */
    Album.prototype.setLayout = function(layout) {
        //noinspection JSUnresolvedVariable
        if(window.values) {  //Chrome
            //noinspection JSUnresolvedFunction
            _layout = window.values(this.LAYOUT).includes(layout) ? layout : this.LAYOUT.WATERFALL;
        } else if(Object.values) {  //Firefox
            _layout = Object.values(this.LAYOUT).includes(layout) ? layout : this.LAYOUT.WATERFALL;
        } else {
            for(let l in this.LAYOUT) {
                if(this.LAYOUT.hasOwnProperty(l) && layout === this.LAYOUT[l]) {
                    _layout = layout;
                    return;
                }
            }
            //noinspection JSValidateTypes
            _layout = this.LAYOUT.WATERFALL;
        }
    };

    /**
     * 获取相册的布局
     * @return {LAYOUT} 布局
     */
    Album.prototype.getLayout = function() {
        return _layout;
    };

    /**
     * 设置图片之间的间距
     * @param {number}  x  图片之间的横向间距
     * @param {number} [y] 图片之间的纵向间距，如果是 undefined 则等同于 x
     */
    Album.prototype.setGutter = function(x, y) {
        if(!Number.isInteger(x)) {
            return;
        }
        _gutter[0] = x;
        _gutter[1] = Number.isInteger(y) ? y : x;
    };

    /**
     * 获取图片间距
     * @returns {{x: number, y: number}} 横向与纵向间距
     */
    Album.prototype.getGutter = function() {
        return {
            x: _gutter[0],
            y: _gutter[1]
        };
    };

    /**
     * 点击图片时全屏浏览图片模式
     * @param {FULL_SCREEN} mode 全屏模式
     */
    Album.prototype.setFullScreen = function(mode) {
        //noinspection JSUnresolvedVariable
        if(window.values) {  //Chrome
            //noinspection JSUnresolvedFunction
            _fullScreen = window.values(this.FULL_SCREEN).includes(mode) ? mode : this.FULL_SCREEN.NONE;
        } else if(Object.values) {  //Firefox
            _fullScreen = Object.values(this.FULL_SCREEN).includes(mode) ? mode : this.FULL_SCREEN.NONE;
        } else {
            for(let fs in this.FULL_SCREEN) {
                if(this.FULL_SCREEN.hasOwnProperty(fs) && mode === this.FULL_SCREEN[fs]) {
                    _fullScreen = mode;
                    return;
                }
            }
            //noinspection JSValidateTypes
            _fullScreen = this.FULL_SCREEN.NONE;
        }
    };

    /**
     * 获取点击图片时全屏浏览图片模式
     * @returns {FULL_SCREEN} 全屏模式
     */
    Album.prototype.getsetFullScreen = function() {
        return _fullScreen;
    };

    /**
     * 设置木桶模式每行高度的上下限，单位像素
     * @param {number} min 最小高度
     * @param {number} max 最大高度
     */
    Album.prototype.setBarrelHeight = function(min, max) {
        if(!Number.isInteger(min) || !Number.isInteger(max)) {
            return;
        }
        _barrelHeight = [min, max];
    };

    /**
     * 获取木桶模式每行高度
     * @returns {{min: number, max: number}} 每行高度范围
     */
    Album.prototype.getBarrelHeightMax = function() {
        return {
            min: _barrelHeight[0],
            max: _barrelHeight[1]
        };
    };

    /************* 以上是本库提供的公有方法 *************/

    /**
     * 容器类
     * @param id
     */
    function Container(id) {
        /**
         * 容器类
         * @param {string|HTMLElement} id 容器ID
         * @constructor
         */
        function Container(id) {
            //容器
            if(typeof id === "string") {
                _container = document.getElementById(id);
            } else {
                _container = id;
            }
        }

        /**
         * 容器
         * @type {HTMLElement}
         * @private
         */
        let _container;

        /**
         * 是否存在class
         * @param {string} cls 类名
         * @returns {boolean}
         */
        Container.prototype.hasClass = function(cls) {
            return _container.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)')) !== null;
        };

        /**
         * 添加class
         * @param {string} cls 类名
         * @returns {Container} 当前链式调用对象
         */
        Container.prototype.addClass = function(cls) {
            if(!this.hasClass(cls)) {
                _container.className += " " + cls
            }
            return this;
        };

        /**
         * 删除class
         * @param {string} cls 类名
         * @returns {Container} 当前链式调用对象
         */
        Container.prototype.removeClass = function(cls) {
            if(this.hasClass(cls)) {
                let reg = new RegExp('(\\s|^)' + cls + '(\\s|$)', 'g');
                _container.className = _container.className
                    .replace(reg, ' ')
                    .replace(/(^ +)|( +$)/g, '')
                    .replace(/(  +)/g, ' ');
            }
            return this;
        };

        /**
         * 清空元素
         * @returns {Container} 当前链式调用对象
         */
        Container.prototype.clearChildren = function() {
            _container.innerHTML = "";
            return this;
        };

        /**
         * 追加图片节点
         * @param {Image} image 图片节点
         * @returns {HTMLElement} 图片容器
         */
        Container.prototype.appendImage = function(image) {
            let div = document.createElement("div");
            div.appendChild(image);
            _container.appendChild(div);
            return div;
        };

        return new Container(id);
    }

    // 实例化
    if(typeof window.Album === 'undefined') {
        // 只有当未初始化时才实例化
        /**
         * 相册类
         * @param id 容器ID
         * @returns {Album} 相册对象
         * @constructor
         */
        window.Album = function(id) {
            return new Album(id);
        };
    }
}(window));
