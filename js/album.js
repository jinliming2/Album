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
        /**
         * 布局容器
         * @type {Container}
         * @private
         */
        this._container = Container(id);
        /**
         * 容器尺寸[宽度, 高度]
         * @type {number[]}
         * @private
         */
        this._containerSize = [0, 0];
        //容器尺寸
        this._containerSize[0] = parseFloat(this._container.css("width"));
        this._containerSize[1] = parseFloat(this._container.css("height"));
        /**
         * 容器尺寸改变事件监视时钟
         * @type {number}
         * @private
         */
        this._containerSizeClock = -1;
        /**
         * 布局类型
         * @type {LAYOUT}
         * @private
         */
        this._layout = this.LAYOUT.WATERFALL;
        /**
         * 图片加载完成回调函数
         * @type {Function}
         * @private
         */
        this._imageLoadCallback = undefined;
        /**
         * 相册中图片集合
         * @type {Image[]}
         * @private
         */
        this._elements = [];
        /**
         * 图片间隔[X, Y]
         * @type {number[]}
         * @private
         */
        this._gutter = [0, 0];
        /**
         * 点击全屏浏览
         * @type {FULL_SCREEN}
         * @private
         */
        this._fullScreen = this.FULL_SCREEN.NONE;
        /**
         * 瀑布布局列数
         * @type {number}
         * @private
         */
        this._waterfallColumn = 4;
        /**
         * 瀑布布局列
         * @type {HTMLElement[]}
         * @private
         */
        this._waterfallColumns = [];
        /**
         * 瀑布布局配置
         * @type {{lastIndex: number, height: number[]}}
         * @private
         */
        this._water = {
            lastIndex: -1,
            height: []
        };
        /**
         * 木桶布局配置
         * @type {{lastIndex: number, height: number, minWidth: number, maxWidth: number, currentLine: HTMLElement, commit: number}}
         * @private
         */
        this._barrel = {
            lastIndex: -1,
            height: 0,
            minWidth: 0,
            maxWidth: 0,
            currentLine: null,
            commit: 0
        };
        /**
         * 木桶布局高度限制
         * @type {number[]}
         * @private
         */
        this._barrelHeight = [250, 300];
        /**
         * 正在加载的图片数
         * @type {number}
         * @private
         */
        this._loading = 0;
    }

    /**
     * 自增id
     * @type {number}
     * @private
     */
    let _autoI = 0;

    /**
     * 操作
     * @type {{Insert: Symbol, Delete: Symbol, Update: Symbol}}
     */
    let CONTROL = {
        Insert: Symbol("Insert"),
        Delete: Symbol("Delete"),
        Update: Symbol("Update")
    };

    /**
     * 全屏DIV
     * @type {HTMLElement|null}
     */
    let FullScreenDiv = null;

    /**
     * 当前this指针
     * @type {Album}
     * @private
     */
    let _that = null;

    /**
     * 全屏图片集合
     * @type {Image[]}
     * @private
     */
    let _elements = null;

    /**
     * 全屏配置
     * @param target 目标图片
     * @constructor
     */
    let FullScreenSetup = function(target) {
        let imageDiv = Container(document.getElementsByClassName("AlbumFullScreenImage")[0]);
        let border = parseFloat(imageDiv.css("width")) / parseFloat(imageDiv.css("height"));
        let image = document.getElementById("AlbumFullScreenImage");
        //缩略图们
        let display = [];
        let num = _elements.length;
        if(num > 7) {
            num = 7;
        }
        for(let i = 1; i <= num; i++) {
            display.push(document.getElementById("AlbumFullScreenDisplay" + i));
        }
        //主图
        let index = _elements.findIndex((img) => {
            return img.dataset.info == target.dataset.info;
        });
        image.src = _elements[index].src;
        if(_elements[index].naturalWidth / _elements[index].naturalHeight >= border) {
            image.classList.add("AlbumFullScreenImageWidth");
        } else {
            image.classList.add("AlbumFullScreenImageHeight");
        }
        //显示缩略图
        let imageIndex = index;
        imageIndex += _elements.length - index > 3 ? 4 : _elements.length - index;
        for(let i = num; i > 0 && imageIndex > 0; i--, imageIndex--){}
        for(let i = 0; i < num; i++, imageIndex++) {
            display[i].src = _elements[imageIndex].src;
            display[i].dataset.info = _elements[imageIndex].dataset.info;
            display[i].className = imageIndex == index ? "AlbumFullScreenDisplaySelected" : "AlbumFullScreenDisplayImage";
        }
    };

    /**
     * 全屏浮层点击事件
     * @param e
     * @constructor
     */
    let FullScreenClick = function(e) {
        let classList = e.target.classList;
        if(classList.contains("AlbumFullScreenCloseButton")) {  //关闭
            //退出全屏
            //noinspection JSUnresolvedVariable
            let fullscreenEnabled = document.fullscreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled;
            if(fullscreenEnabled) {
                //noinspection JSUnresolvedVariable
                if(document.exitFullscreen) {
                    //noinspection JSUnresolvedFunction
                    document.exitFullscreen();
                } else { //noinspection JSUnresolvedVariable
                    if(document.mozCancelFullScreen) {
                        //noinspection JSUnresolvedFunction
                        document.mozCancelFullScreen();
                    } else { //noinspection JSUnresolvedVariable
                        if(document.webkitExitFullscreen) {
                            //noinspection JSUnresolvedFunction
                            document.webkitExitFullscreen();
                        }
                    }
                }
            }
            //删除浮层
            document.body.removeChild(FullScreenDiv);
            FullScreenDiv = null;
        } else if(classList.contains("AlbumFullScreenDisplayImage")) {  //预览切换
            FullScreenSetup(e.target);
        }
    };

    /**
     * 更新布局显示
     * @param {Symbol} control 操作
     * @private
     */
    Album.prototype._update = function(control) {
        switch(this._layout) {
            case this.LAYOUT.PUZZLE:
                this._puzzle();
                break;
            case this.LAYOUT.WATERFALL:
                //noinspection FallThroughInSwitchStatementJS
                switch(control) {
                    case CONTROL.Delete:
                    case CONTROL.Update:
                        this._waterfallReset();
                    case CONTROL.Insert:
                        this._waterfallInsert();
                        break;
                }
                break;
            case this.LAYOUT.BARREL:
                //noinspection FallThroughInSwitchStatementJS
                switch(control) {
                    case CONTROL.Delete:
                    case CONTROL.Update:
                        this._barrelReset();
                    case CONTROL.Insert:
                        this._barrelInsert();
                        break;
                }
                break;
        }
    };

    /**
     * 拼图布局
     * @private
     */
    Album.prototype._puzzle = function() {
        //清空容器
        this._container.clearChildren();
        //设置拼图布局
        this._container
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
        switch(this._elements.length) {
            //没有图片
            case 0:
                return;
                break;
            //一张图片
            case 1:
            {
                //一张图片布局
                this._container.addClass("puzzle-1");
                this._container.appendImage(this._elements[0]);
            }
                break;
            //两张图片
            case 2:
            {
                //两张图片布局
                this._container.addClass("puzzle-2");
                this._container.appendImage(this._elements[0]);
                this._container.appendImage(this._elements[1]);
            }
                break;
            //三张图片
            case 3:
            {
                //三张图片布局
                this._container.addClass("puzzle-3");
                let img1 = this._container.appendImage(this._elements[0]);
                let right = this._container.appendDiv();
                let img2 = this._container.appendImage(this._elements[1], right);
                let img3 = this._container.appendImage(this._elements[2], right);
                let w = this._containerSize[1] / 2;
                img2.style.width = img3.style.width = w + "px";
                img1.style.width = this._containerSize[0] - w + "px";
            }
                break;
            //四张图片
            case 4:
            {
                //四张图片布局
                this._container.addClass("puzzle-4");
                let left = this._container.appendDiv();
                let right = this._container.appendDiv();
                this._container.appendImage(this._elements[0], left);
                this._container.appendImage(this._elements[1], right);
                this._container.appendImage(this._elements[2], left);
                this._container.appendImage(this._elements[3], right);
            }
                break;
            //五张图片
            case 5:
            {
                //五张图片布局
                this._container.addClass("puzzle-5");
                let left = this._container.appendDiv();
                this._container.appendImage(this._elements[0], left);
                let leftBottom = this._container.appendDiv(left);
                this._container.appendImage(this._elements[1], leftBottom);
                this._container.appendImage(this._elements[2], leftBottom);
                let right = this._container.appendDiv();
                let img4 = this._container.appendImage(this._elements[3], right);
                let img5 = this._container.appendImage(this._elements[4], right);
                let w = this._containerSize[0] / 3;
                img4.style.height = w + "px";
                img5.style.height = this._containerSize[1] - w + "px";
            }
                break;
            //大于等于六张图片，只取前六张
            default:
            {
                //六张图片布局
                this._container.addClass("puzzle-6");
                let left = this._container.appendDiv();
                this._container.appendImage(this._elements[0], left);
                let leftBottom = this._container.appendDiv(left);
                this._container.appendImage(this._elements[1], leftBottom);
                this._container.appendImage(this._elements[2], leftBottom);
                let right = this._container.appendDiv();
                this._container.appendImage(this._elements[3], right);
                this._container.appendImage(this._elements[4], right);
                this._container.appendImage(this._elements[5], right);
            }
                break;
        }
    };

    /**
     * 瀑布布局重置
     * @private
     */
    Album.prototype._waterfallReset = function() {
        //设置瀑布布局
        this._container
            .removeClass("puzzle")
            .removeClass("barrel")
            .removeClass("puzzle-1")
            .removeClass("puzzle-2")
            .removeClass("puzzle-3")
            .removeClass("puzzle-4")
            .removeClass("puzzle-5")
            .removeClass("puzzle-6")
            .addClass("waterfall");
        this._container.clearChildren();
        this._waterfallColumns = [];
        this._water.height = [];
        //重新布局
        for(let i = 0; i < this._waterfallColumn; i++) {
            this._waterfallColumns.push(this._container.appendDiv());
        }
        this._water.lastIndex = -1;
        //重新布局
        let gutter = this._gutter[0];
        let margin = Math.round(this._gutter[0] / 2);
        let width = (parseInt(this._containerSize[0]) - gutter * (this._waterfallColumn - 1)) / this._waterfallColumn;
        this._waterfallColumns.forEach(function(div) {
            div.style.width = (width + gutter) + "px";
            div.style.padding = "0 " + margin + "px 0 " + (gutter - margin) + "px";
        });
        this._waterfallColumns[0].style.paddingLeft = this._waterfallColumns[this._waterfallColumn - 1].style.paddingRight = 0;
        this._waterfallColumns[0].style.width = (width + gutter - margin) + "px";
        this._waterfallColumns[this._waterfallColumn - 1].style.width = (width + margin) + "px";
        this._waterfallColumns[0].style.paddingRight = margin + "px";
        this._waterfallColumns[this._waterfallColumn - 1].style.paddingLeft = (gutter - margin) + "px";
        //更新高度信息
        for(let i = 0; i < this._waterfallColumn; i++) {
            this._water.height[i] = parseFloat(this._container.css("height", this._waterfallColumns[i]));
        }
    };

    /**
     * 瀑布布局追加图片
     * @private
     */
    Album.prototype._waterfallInsert = function() {
        while(this._water.lastIndex < this._elements.length - 1) {
            this._water.lastIndex++;
            let min = 0;
            for(let i = 0; i < this._waterfallColumn; i++) {
                if(this._water.height[i] < this._water.height[min]) {
                    min = i;
                }
            }
            this._container.appendImage(this._elements[this._water.lastIndex], this._waterfallColumns[min])
                .style.marginBottom = this._gutter[1] + "px";
            this._water.height[min] = parseFloat(this._container.css("height", this._waterfallColumns[min]));
        }
    };

    /**
     * 木桶布局重置
     * @private
     */
    Album.prototype._barrelReset = function() {
        //设置木桶布局
        this._container
            .removeClass("puzzle")
            .removeClass("waterfall")
            .removeClass("puzzle-1")
            .removeClass("puzzle-2")
            .removeClass("puzzle-3")
            .removeClass("puzzle-4")
            .removeClass("puzzle-5")
            .removeClass("puzzle-6")
            .addClass("barrel");
        //清空容器
        this._container.clearChildren();
        this._barrel.height = (this._barrelHeight[0] + this._barrelHeight[1]) / 2;
        this._barrel.minWidth = this._containerSize[0] * this._barrel.height / this._barrelHeight[1];
        this._barrel.maxWidth = this._containerSize[0] * this._barrel.height / this._barrelHeight[0];
        this._barrel.currentLine = null;
        this._barrel.lastIndex = -1;
        this._barrel.total = [];
        this._barrel.commit = 0;
    };

    /**
     * 木桶布局追加图片
     * @private
     */
    Album.prototype._barrelInsert = function() {
        while(this._barrel.lastIndex < this._elements.length - 1) {
            if(this._barrel.currentLine == null) {
                this._barrel.currentLine = this._container.appendDiv();
                this._barrel.currentLine.style.height = this._barrel.height + "px";
                this._barrel.currentLine.style.marginBottom = this._gutter[1] + "px";

            }
            this._barrel.lastIndex++;
            let record = [this._elements[this._barrel.lastIndex].width, this._elements[this._barrel.lastIndex].height];
            let width = this._elements[this._barrel.lastIndex].width * this._barrel.height / this._elements[this._barrel.lastIndex].height;
            let div = this._container.appendImage(this._elements[this._barrel.lastIndex], this._barrel.currentLine);
            this._barrel.commit += width;
            div.style.marginRight = this._gutter[0] + "px";
            div.dataset.width = record[0];
            div.dataset.height = record[1];
            div.style.width = width + "px";
            if(this._barrel.commit > this._barrel.minWidth) {
                div.style.marginRight = "0";
                let h = this._containerSize[0] * this._barrel.height / this._barrel.commit;
                this._barrel.currentLine.style.height = h + "px";
                let divs = this._barrel.currentLine.getElementsByTagName("div");
                let w = 0;
                for(let i = 0; i < divs.length; i++) {
                    if(i < divs.length - 1) {
                        let width = Math.floor(divs[i].dataset.width * h / divs[i].dataset.height);
                        w += width + this._gutter[0];
                        divs[i].style.width = width + "px";
                    } else {
                        divs[i].style.width = (this._containerSize[0] - w) + "px";
                    }
                }
                this._barrel.currentLine = null;
                this._barrel.commit = 0;
            } else {
                this._barrel.commit += this._gutter[0];
            }
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
     *   waterfallColumn?: Number,
     *   barrelHeight?: {min: number, max: number},
     *   resizeUpdate?: Number,
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
        //全屏显示
        this.setFullScreen(option.fullScreen);
        //图片间距
        if(option.gutter) {
            this.setGutter(option.gutter.x, option.gutter.y);
        }
        //瀑布布局列数
        if(Number.isInteger(option.waterfallColumn)) {
            this.setWaterfallColumn(option.waterfallColumn);
        }
        //木桶模式每行高度
        if(option.barrelHeight) {
            this.setBarrelHeight(option.barrelHeight.min, option.barrelHeight.max);
        }
        //缓冲区图片加载完成回调函数
        this._imageLoadCallback = option.imageLoadCallback instanceof Function ? option.imageLoadCallback : undefined;
        //布局
        this.setLayout(option.layout);
        //移除所有图片
        this.removeImage(this.getImageDomElements());
        //添加图片
        this.addImage(image);
        //尺寸变化事件
        if(Number.isInteger(option.resizeUpdate)) {
            this.resizeUpdate(option.resizeUpdate);
        }
        //全屏事件绑定
        let _this = this;
        this._container.getContainer().addEventListener("click", function(e) {
            _that = _this;
            if(e.target.classList.contains("AlbumImage")) {
                if(_this._fullScreen == _this.FULL_SCREEN.NONE) {
                    return;
                }
                if(FullScreenDiv == null) {
                    FullScreenDiv = document.createElement("div");
                    FullScreenDiv.className = "AlbumFullScreen";
                    let div;
                    //关闭按钮
                    div = document.createElement("div");
                    div.className = "AlbumFullScreenClose";
                    div.innerHTML = `<svg class="AlbumFullScreenCloseButton" width="200" height="200" viewBox="0 0 200 200" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <g class="AlbumFullScreenCloseButton" transform="scale(0.1953125, 0.1953125)">
        <path class="AlbumFullScreenCloseButton" d="M512 6.472C233.891 6.472 8.471 231.905 8.471 510c0 278.108 225.42 503.528 503.529 503.528 278.079 0 503.528-225.42 503.528-503.528C1015.529 231.905 790.079 6.472 512 6.472zM650.489 542.395l130.65 130.68c18.387 18.388 18.387 48.457 0 66.815l-37.223 37.222c-18.357 18.388-48.428 18.388-66.815 0l-130.68-130.68c-18.358-18.357-48.398-18.357-66.756 0l-130.71 130.68c-18.358 18.388-48.428 18.388-66.756 0l-37.252-37.222c-18.358-18.358-18.358-48.428 0-66.815l130.68-130.68c18.358-18.358 18.358-48.413 0-66.771l-130.68-130.694c-18.388-18.373-18.388-48.428 0-66.786l37.222-37.236c18.358-18.373 48.428-18.373 66.786 0l130.71 130.694c18.357 18.358 48.397 18.358 66.756 0l130.71-130.694c18.357-18.373 48.428-18.373 66.785 0l37.252 37.236c18.357 18.358 18.357 48.413 0 66.786l-130.68 130.694C632.101 493.981 632.101 524.036 650.489 542.395z"></path>
    </g>
</svg>`;
                    FullScreenDiv.appendChild(div);
                    //图片展示
                    div = document.createElement("div");
                    div.className = "AlbumFullScreenImage";
                    let img;
                    img = document.createElement("img");
                    img.id = "AlbumFullScreenImage";
                    div.appendChild(img);
                    FullScreenDiv.appendChild(div);
                    //缩略图
                    div = document.createElement("div");
                    div.className = "AlbumFullScreenDisplay";
                    _elements = _this._elements;
                    let num = _this._elements.length;
                    if(num > 7) {
                        num = 7;
                    }
                    for(let i = 1; i <= num; i++) {
                        img = document.createElement("img");
                        img.id = "AlbumFullScreenDisplay" + i;
                        div.appendChild(img);
                    }
                    FullScreenDiv.appendChild(div);
                }
                document.body.appendChild(FullScreenDiv);
                if(_this._fullScreen == _this.FULL_SCREEN.WINDOW) {
                    //全屏
                    //noinspection JSUnresolvedVariable
                    if(FullScreenDiv.requestFullscreen) {
                        //noinspection JSUnresolvedFunction
                        FullScreenDiv.requestFullscreen();
                    } else { //noinspection JSUnresolvedVariable
                        if(FullScreenDiv.mozRequestFullScreen) {
                            //noinspection JSUnresolvedFunction
                            FullScreenDiv.mozRequestFullScreen();
                        } else { //noinspection JSUnresolvedVariable
                            if(FullScreenDiv.webkitRequestFullscreen) {
                                //noinspection JSUnresolvedFunction
                                FullScreenDiv.webkitRequestFullscreen();
                            } else { //noinspection JSUnresolvedVariable
                                if(FullScreenDiv.msRequestFullscreen) {
                                    //noinspection JSUnresolvedFunction
                                    FullScreenDiv.msRequestFullscreen();
                                }
                            }
                        }
                    }
                }
                FullScreenDiv.addEventListener("click", FullScreenClick, true);
                FullScreenSetup(e.target);
            }
        }, true);
    };

    /**
     * 获取相册所有图像对应的 DOM 元素
     * @return {HTMLElement[]} 相册所有图像对应的 DOM 元素组成的数组
     */
    Album.prototype.getImageDomElements = function() {
        return Array.from(this._elements);
    };

    /**
     * 向相册添加图片
     * 在拼图布局下，根据图片数量重新计算布局方式；其他布局下向尾部追加图片
     * @param {string|string[]} image 一张图片的 URL 或多张图片 URL 组成的数组
     * @param {Function} [onload] 图片加载回调
     * @return {Image[]} 添加的图片列表
     */
    Album.prototype.addImage = function(image, onload) {
        if(!(image instanceof Array)) {
            return this.addImage([image], onload);
        }
        let _ret = [];
        let _this = this;
        for(let i of image) {
            this._loading++;
            let img = new Image();
            img.classList.add("AlbumImage");
            img.onload = function() {
                _this._elements.push(img);
                if(onload instanceof Function) {
                    onload.call(_this, true);
                }
                if(--_this._loading == 0) {
                    if(_this._imageLoadCallback instanceof Function) {
                        _this._imageLoadCallback.call(_this);
                    }
                }
                _this._update(CONTROL.Insert);
            };
            img.onerror = function() {
                if(onload instanceof Function) {
                    onload.call(_this, false);
                }
                if(--_this._loading == 0) {
                    if(_this._imageLoadCallback instanceof Function) {
                        _this._imageLoadCallback.call(_this);
                    }
                }
            };
            img.src = i;
            img.dataset.info = _autoI++;
            _ret.push(img);
        }
        return _ret.length == 1 ? _ret[0] : _ret;
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
            let index = this._elements.indexOf(i);
            if(index >= 0) {
                this._elements.splice(index, 1);
            }
        }
        this._update(CONTROL.Delete);
    };

    /**
     * 设置相册的布局
     * @param {LAYOUT} layout 布局，Album.LAYOUT 中的值
     */
    Album.prototype.setLayout = function(layout) {
        //noinspection JSUnresolvedVariable
        if(window.values) {  //Chrome
            //noinspection JSUnresolvedFunction
            this._layout = window.values(this.LAYOUT).includes(layout) ? layout : this.LAYOUT.WATERFALL;
        } else if(Object.values) {  //Firefox
            this._layout = Object.values(this.LAYOUT).includes(layout) ? layout : this.LAYOUT.WATERFALL;
        } else {
            for(let l in this.LAYOUT) {
                if(this.LAYOUT.hasOwnProperty(l) && layout === this.LAYOUT[l]) {
                    this._layout = layout;
                    this._update(CONTROL.Update);
                    return;
                }
            }
            this._layout = this.LAYOUT.WATERFALL;
        }
        this._update(CONTROL.Update);
    };

    /**
     * 获取相册的布局
     * @return {LAYOUT} 布局
     */
    Album.prototype.getLayout = function() {
        return this._layout;
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
        this._gutter[0] = x;
        this._gutter[1] = Number.isInteger(y) ? y : x;
        this._update(CONTROL.Update);
    };

    /**
     * 获取图片间距
     * @returns {{x: number, y: number}} 横向与纵向间距
     */
    Album.prototype.getGutter = function() {
        return {
            x: this._gutter[0],
            y: this._gutter[1]
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
            this._fullScreen = window.values(this.FULL_SCREEN).includes(mode) ? mode : this.FULL_SCREEN.NONE;
        } else if(Object.values) {  //Firefox
            this._fullScreen = Object.values(this.FULL_SCREEN).includes(mode) ? mode : this.FULL_SCREEN.NONE;
        } else {
            for(let fs in this.FULL_SCREEN) {
                if(this.FULL_SCREEN.hasOwnProperty(fs) && mode === this.FULL_SCREEN[fs]) {
                    this._fullScreen = mode;
                    return;
                }
            }
            //noinspection JSValidateTypes
            this._fullScreen = this.FULL_SCREEN.NONE;
        }
    };

    /**
     * 获取点击图片时全屏浏览图片模式
     * @returns {FULL_SCREEN} 全屏模式
     */
    Album.prototype.getsetFullScreen = function() {
        return this._fullScreen;
    };

    /**
     * 设置瀑布布局列数
     * @param column 列数
     * @return {Boolean}
     */
    Album.prototype.setWaterfallColumn = function(column) {
        if(Number.isInteger(column) && column > 0) {
            this._waterfallColumn = column;
            this._update(CONTROL.Update);
            return true;
        }
        return false;
    };

    /**
     * 获取瀑布布局列数
     * @returns {number|*}
     */
    Album.prototype.getWaterfallColumn = function() {
        return this._waterfallColumn;
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
        if(max >= min) {
            this._barrelHeight = [min, max];
        } else {
            this._barrelHeight = [max, min];
        }
        this._update(CONTROL.Update);
    };

    /**
     * 获取木桶模式每行高度
     * @returns {{min: number, max: number}} 每行高度范围
     */
    Album.prototype.getBarrelHeightMax = function() {
        return {
            min: this._barrelHeight[0],
            max: this._barrelHeight[1]
        };
    };

    /**
     * 容器尺寸改变监视器
     * @param {Number} cycle 监视周期（<=0 关闭监视）
     */
    Album.prototype.resizeUpdate = function(cycle) {
        if(this._containerSizeClock != -1) {
            clearInterval(this._containerSizeClock);
        }
        if(cycle > 0) {
            let _this = this;
            this._containerSizeClock = setInterval(function() {
                let w = parseFloat(_this._container.css("width"));
                if(w != _this._containerSize[0]) {
                    _this._containerSize[0] = w;
                    _this._update(CONTROL.Update);
                    return;
                }
                if(_this._layout == _this.LAYOUT.PUZZLE) {
                    w = parseFloat(_this._container.css("height"));
                    if(w != _this._containerSize[1]) {
                        _this._containerSize[1] = w;
                        _this._update(CONTROL.Update);
                    }
                }
            }, cycle);
        } else {
            this._containerSizeClock = -1;
        }
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
                this._container = document.getElementById(id);
            } else {
                this._container = id;
            }
        }

        /**
         * 取元素计算后样式
         * @param {string} property 样式
         * @param {HTMLElement} [_div] 外部元素
         * @returns {string} 值
         */
        Container.prototype._getProperty = function(property, _div) {
            if(_div) {
                if(_div.currentStyle) {
                    return _div.currentStyle.getAttribute(property);
                } else {
                    return getComputedStyle(_div, null).getPropertyValue(property);
                }
            } else {
                if(this._container.currentStyle) {
                    return this._container.currentStyle.getAttribute(property);
                } else {
                    return getComputedStyle(this._container, null).getPropertyValue(property);
                }
            }
        };

        /**
         * 是否存在class
         * @param {string} cls 类名
         * @returns {boolean}
         */
        Container.prototype.hasClass = function(cls) {
            return this._container.classList.contains(cls);
        };

        /**
         * 添加class
         * @param {string} cls 类名
         * @returns {Container} 当前链式调用对象
         */
        Container.prototype.addClass = function(cls) {
            this._container.classList.add(cls);
            return this;
        };

        /**
         * 删除class
         * @param {string} cls 类名
         * @returns {Container} 当前链式调用对象
         */
        Container.prototype.removeClass = function(cls) {
            this._container.classList.remove(cls);
            return this;
        };

        /**
         * 清空元素
         * @returns {Container} 当前链式调用对象
         */
        Container.prototype.clearChildren = function() {
            this._container.innerHTML = "";
            return this;
        };

        /**
         * 追加图片节点
         * @param {Image} image 图片节点
         * @param {HTMLElement} [_div] 外部div
         * @returns {HTMLElement} 图片容器
         */
        Container.prototype.appendImage = function(image, _div) {
            let div = document.createElement("div");
            div.appendChild(image);
            if(_div) {
                _div.appendChild(div);
            } else {
                this._container.appendChild(div);
            }
            return div;
        };

        /**
         * 追加节点
         * @param {HTMLElement} [_div] 外部div
         * @returns {Element} 节点
         */
        Container.prototype.appendDiv = function(_div) {
            let div = document.createElement("div");
            if(_div) {
                _div.appendChild(div);
            } else {
                this._container.appendChild(div);
            }
            return div;
        };

        /**
         * 取样式
         * @param {string} property 样式
         * @param {HTMLElement} [_div] 外部元素
         * @returns {string} 值
         */
        Container.prototype.css = function(property, _div) {
            if(_div) {
                return this._getProperty(property, _div);
            } else {
                return this._getProperty(property);
            }
        };

        /**
         * 取当前容器对象
         * @returns {HTMLElement} 容器对象
         */
        Container.prototype.getContainer = function() {
            return this._container;
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
