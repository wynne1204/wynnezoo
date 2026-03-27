// ============================================================
// Module Registry & Event Bus
// 轻量级模块注册中心，解耦全局变量依赖。
// 所有模块通过 WynneRegistry 注册和获取，通过 WynneEvents 通信。
// 必须在所有业务模块之前加载。
// ============================================================
(function initModuleRegistry(globalScope) {
    'use strict';

    // --------------- Module Registry ---------------
    const modules = Object.create(null);

    const Registry = {
        /**
         * 注册一个模块。同时挂到 window 上保持向后兼容。
         * @param {string} name - 模块名，如 'WynneZooEconomy'
         * @param {object} api  - 模块公开 API
         */
        register(name, api) {
            if (!name || typeof name !== 'string') return;
            modules[name] = api;
            // 向后兼容：仍然挂到 window 上，旧代码不会断
            globalScope[name] = api;
        },

        /**
         * 获取已注册的模块，如果未注册返回 null。
         * @param {string} name - 模块名
         * @returns {object|null}
         */
        get(name) {
            return modules[name] || globalScope[name] || null;
        },

        /**
         * 检查模块是否已注册。
         * @param {string} name
         * @returns {boolean}
         */
        has(name) {
            return Boolean(modules[name] || globalScope[name]);
        },

        /**
         * 列出所有已注册模块名（调试用）。
         * @returns {string[]}
         */
        list() {
            return Object.keys(modules);
        }
    };

    // --------------- Event Bus ---------------
    const listeners = Object.create(null);

    const Events = {
        /**
         * 监听事件。
         * @param {string} event - 事件名
         * @param {Function} callback
         * @returns {Function} 取消监听的函数
         */
        on(event, callback) {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(callback);
            // 返回 unsubscribe 函数
            return function off() {
                const list = listeners[event];
                if (!list) return;
                const idx = list.indexOf(callback);
                if (idx >= 0) list.splice(idx, 1);
            };
        },

        /**
         * 只监听一次。
         * @param {string} event
         * @param {Function} callback
         * @returns {Function} 取消监听的函数
         */
        once(event, callback) {
            const off = Events.on(event, function handler() {
                off();
                callback.apply(null, arguments);
            });
            return off;
        },

        /**
         * 触发事件，所有监听器按注册顺序执行。
         * @param {string} event - 事件名
         * @param {...*} args - 传给监听器的参数
         */
        emit(event) {
            const list = listeners[event];
            if (!list || list.length === 0) return;
            const args = Array.prototype.slice.call(arguments, 1);
            // 复制一份防止回调中修改数组
            const snapshot = list.slice();
            for (let i = 0; i < snapshot.length; i++) {
                try {
                    snapshot[i].apply(null, args);
                } catch (err) {
                    console.error('[WynneEvents] Error in listener for "' + event + '":', err);
                }
            }
        },

        /**
         * 移除某事件的所有监听器，或移除全部。
         * @param {string} [event] - 不传则清除所有
         */
        off(event) {
            if (event) {
                delete listeners[event];
            } else {
                Object.keys(listeners).forEach(function (key) {
                    delete listeners[key];
                });
            }
        }
    };

    // --------------- 常用事件名常量 ---------------
    Events.EVENTS = {
        // 经济系统
        ECONOMY_UPDATED: 'economy:updated',
        SLOT_SETTLEMENT: 'slot:settlement',
        TICKET_CONSUMED: 'ticket:consumed',

        // 屏幕导航
        SCREEN_CHANGE: 'screen:change',
        NAVIGATE_HOME: 'navigate:home',
        NAVIGATE_SLOT: 'navigate:slot',
        NAVIGATE_STORY: 'navigate:story',
        NAVIGATE_COLLECTION: 'navigate:collection',

        // 游戏状态
        ROUND_START: 'round:start',
        ROUND_END: 'round:end',
        BONUS_TRIGGER: 'bonus:trigger',
        BONUS_FINISH: 'bonus:finish',
        FREE_SPIN_TRIGGER: 'freespin:trigger',
        FREE_SPIN_FINISH: 'freespin:finish',

        // 图鉴
        COLLECTION_UNLOCK: 'collection:unlock',

        // 剧情
        STORY_COMPLETE: 'story:complete',
        STORY_BACKDROP_CHANGE: 'story:backdrop-change',

        // 通知
        NOTIFY: 'ui:notify'
    };

    globalScope.WynneRegistry = Registry;
    globalScope.WynneEvents = Events;
}(window));
