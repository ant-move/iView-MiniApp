const utils = require('../../api/utils');
const { warnLife } = utils;
const config = require('../../api/config');
const createNode = require('./relation');
const Relations = require('../../api/relations');
const processRelationHandle = require('./processRelation');
const { connectNodes } = require('./utils');

const getUrl = function () {
    let pages = getCurrentPages();
    let url = pages[pages.length - 1].route;
    let _arr = url.split('/');
    let _name = _arr[_arr.length - 1];
    my.setStorageSync({
        key: '_pageMsg',
        data: {
            pageName: _name,
            pagePath: url
        }
    });
    return url;
};
const watchShakes = function () {
    let pages = getCurrentPages();
    let url = pages[pages.length - 1].route;
    let logUrl = "pages/ant-move-runtime-logs/index"; 
    let specificUrl = "pages/ant-move-runtime-logs/specific/index";
    if ( url ===logUrl || url===specificUrl ) {
        watchShakes();
    }  
    my.watchShake({
        success: function () {
            watchShakes();
            my.confirm({
                title: '温馨提示',
                content: '是否进入警告日志页面',
                confirmButtonText: '马上进入',
                cancelButtonText: '暂不需要',
                success: function (res) {
                    if (res.confirm) {
                        my.navigateTo({
                            url: '/pages/ant-move-runtime-logs/index'
                        });
                    }
                }
            });
        }
    }); 
};
module.exports = {
    processTransformationPage (_opts, options) {
        _opts = Object.assign(_opts, options);

        _opts.onLoad = function (res) {
            // 初始化节点树
            createNode(null, null, null, true);
            processRelations(this, Relations);
            if (typeof options.data === 'function') {
                options.data = options.data();
            }
            
            getUrl();
            if (config.env === "development") {
                watchShakes();
            } 
            if (options.onResize) {
                warnLife("There is no onResize life cycle", "onResize");
            }
            if (options.onLoad) {
                options.onLoad.call(this, res);
            }
        };

        _opts.onReady = function (param) {
            let ast = this.$node.getRootNode();
            processRelationNodes(ast);

            this.selectComponent = function (...p) {
                return this.$node.selectComponent(...p);
            }; 
            this.selectAllComponents = function (...p) {
                return this.$node.selectComponents(...p);
            };
            if (options.onReady) {
                options.onReady.call(this, param);
            }
            ast.isPageReady = true;
        };
    }
};


function processRelationNodes (ast = {}) {
    let $nodes = ast.$nodes;
    let destoryArray = ast.destoryArray;
  
    /**
     * componentNodes onPageReady
     */
    Object.keys($nodes)
        .forEach(function (item) {
            let node = $nodes[item];
            connectNodes(node, ast);
        
            if (node.$self && typeof node.$self.onPageReady === 'function') {
                node.$self.onPageReady();
            }
        });

    ast.mountedHandles
        .forEach(function (fn, i) {
            fn();
        });
    ast.mountedHandles = [];
}


function processRelations (ctx, relationInfo = {}) {
    let route = ctx.route;
    if (route[0] !== '/') route = '/' + route;
    let info = relationInfo[route] || relationInfo[route.substring(1)];
    if (info) {
        processRelationHandle(info, function (node) {
            let id = node.$id;
            if (id === 'saveChildRef0') {
                ctx[id] = function () {};
                node.$index = 0;
                node.$route = route;
                createNode(ctx, null, node);
                return false;
            }
            ctx[id] = function (ref) {
                ctx.$antmove = ctx.$antmove || {};
                if (ctx.$antmove[id] === undefined) {
                    ctx.$antmove[id] = 0;
                } else {
                    ctx.$antmove[id] += 1;
                }

                node.$index = ctx.$antmove[id];
                node.$route = route;
                createNode(ref, null, node);
            };
        });
    } else {
        console.warn('Missing nodes relation of ', route);
    }
}