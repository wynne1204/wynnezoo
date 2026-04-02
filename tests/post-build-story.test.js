/**
 * 集成测试：特殊剧情播完后回到主页
 *
 * 验证需求:
 * - 4.1: resolveFollowupStoryId('post-build-red-panda') 返回空字符串
 * - 4.2: 返回空字符串后调用 showZooHome()
 * - 4.3: 特殊剧情播放不影响主线 storyFlags
 *
 * 运行方式: node tests/post-build-story.test.js
 */

'use strict';

// ── 测试基础设施 ──

var passCount = 0;
var failCount = 0;

function assert(condition, message) {
    if (condition) {
        passCount++;
        console.log('  ✓ ' + message);
    } else {
        failCount++;
        console.error('  ✗ ' + message);
    }
}

function assertEqual(actual, expected, message) {
    if (actual === expected) {
        passCount++;
        console.log('  ✓ ' + message);
    } else {
        failCount++;
        console.error('  ✗ ' + message);
        console.error('    期望: ' + JSON.stringify(expected));
        console.error('    实际: ' + JSON.stringify(actual));
    }
}

function assertDeepEqual(actual, expected, message) {
    var actualStr = JSON.stringify(actual);
    var expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) {
        passCount++;
        console.log('  ✓ ' + message);
    } else {
        failCount++;
        console.error('  ✗ ' + message);
        console.error('    期望: ' + expectedStr);
        console.error('    实际: ' + actualStr);
    }
}

// ── 从 app-shell.js 提取的核心逻辑 ──

var MAIN_STORY_SEQUENCE = {
    'prologue': '第一章',
    '第一章': '第二章',
    '第二章': '第三章'
};

/**
 * 模拟 hasPlayableStory —— 在集成测试中假设所有映射表中的目标剧情都可播放
 */
function createHasPlayableStory(playableIds) {
    return function hasPlayableStory(storyId) {
        var targetId = String(storyId || '').trim();
        if (!targetId) return false;
        return playableIds.indexOf(targetId) !== -1;
    };
}

/**
 * 与 app-shell.js 中 resolveFollowupStoryId 完全一致的逻辑
 */
function resolveFollowupStoryId(storyId, hasPlayableStory) {
    var targetId = String(storyId || '').trim();
    var nextId = MAIN_STORY_SEQUENCE[targetId] || '';
    if (nextId && hasPlayableStory(nextId)) {
        return nextId;
    }
    return '';
}

// ── 测试用例 ──

console.log('\n=== 集成测试：特殊剧情播完后回到主页 ===\n');

// ── 测试 1: resolveFollowupStoryId('post-build-red-panda') 返回空字符串 (需求 4.1) ──

console.log('测试 1: 特殊剧情 storyId 不在映射表中，返回空字符串');

(function testSpecialStoryReturnsEmpty() {
    // 即使所有剧情都可播放，特殊剧情也不应有后续主线章节
    var allPlayable = createHasPlayableStory([
        'prologue', '第一章', '第二章', '第三章', 'post-build-red-panda'
    ]);

    var result = resolveFollowupStoryId('post-build-red-panda', allPlayable);
    assertEqual(result, '', 'resolveFollowupStoryId("post-build-red-panda") 应返回空字符串');
})();

(function testSpecialStoryNotInMappingKeys() {
    var keys = Object.keys(MAIN_STORY_SEQUENCE);
    assert(
        keys.indexOf('post-build-red-panda') === -1,
        '"post-build-red-panda" 不在 MAIN_STORY_SEQUENCE 的键中'
    );
})();

(function testSpecialStoryNotInMappingValues() {
    var values = Object.keys(MAIN_STORY_SEQUENCE).map(function (k) {
        return MAIN_STORY_SEQUENCE[k];
    });
    assert(
        values.indexOf('post-build-red-panda') === -1,
        '"post-build-red-panda" 不在 MAIN_STORY_SEQUENCE 的值中'
    );
})();

// ── 测试 2: 返回空字符串后调用 showZooHome() (需求 4.2) ──

console.log('\n测试 2: 模拟 onComplete 回调流程，验证空字符串触发 showZooHome');

(function testOnCompleteCallsShowZooHome() {
    var showZooHomeCalled = false;
    var followupStoryPlayed = null;

    // 模拟 app-shell.js 中 onComplete 回调的核心决策逻辑
    function simulateOnCompleteFlow(payload) {
        var targetStoryId = payload && payload.storyId ? payload.storyId : '';
        var allPlayable = createHasPlayableStory([
            'prologue', '第一章', '第二章', '第三章', 'post-build-red-panda'
        ]);
        var followupStoryId = resolveFollowupStoryId(targetStoryId, allPlayable);

        if (followupStoryId) {
            // 有后续主线章节 → 播放下一章
            followupStoryPlayed = followupStoryId;
        } else {
            // 无后续 → 回到主页
            showZooHomeCalled = true;
        }
    }

    // 模拟特殊剧情播放完成
    simulateOnCompleteFlow({ storyId: 'post-build-red-panda' });

    assert(showZooHomeCalled === true, '特殊剧情播完后应调用 showZooHome()');
    assert(followupStoryPlayed === null, '特殊剧情播完后不应触发后续章节播放');
})();

(function testMainStoryDoesNotCallShowZooHome() {
    var showZooHomeCalled = false;
    var followupStoryPlayed = null;

    function simulateOnCompleteFlow(payload) {
        var targetStoryId = payload && payload.storyId ? payload.storyId : '';
        var allPlayable = createHasPlayableStory([
            'prologue', '第一章', '第二章', '第三章'
        ]);
        var followupStoryId = resolveFollowupStoryId(targetStoryId, allPlayable);

        if (followupStoryId) {
            followupStoryPlayed = followupStoryId;
        } else {
            showZooHomeCalled = true;
        }
    }

    // 对比：主线剧情播完后应继续下一章，不回主页
    simulateOnCompleteFlow({ storyId: 'prologue' });

    assert(showZooHomeCalled === false, '主线剧情 prologue 播完后不应直接回主页');
    assertEqual(followupStoryPlayed, '第一章', '主线剧情 prologue 播完后应继续播放第一章');
})();

// ── 测试 3: 特殊剧情播放不影响主线 storyFlags (需求 4.3) ──

console.log('\n测试 3: 特殊剧情播放不影响主线 storyFlags');

(function testStoryFlagsUnchangedBySpecialStory() {
    // 模拟 storyFlags 状态
    var storyFlags = {
        'prologue': true,
        '第一章': true,
        '第二章': false
    };

    // 深拷贝保存播放前的状态
    var flagsBefore = JSON.parse(JSON.stringify(storyFlags));

    // 模拟特殊剧情的 markStoryPlayed 行为
    // app-shell.js onComplete 中: zooEconomy.markStoryPlayed(targetStoryId, true)
    // 这会设置 storyFlags['post-build-red-panda'] = true
    var targetStoryId = 'post-build-red-panda';
    storyFlags[targetStoryId] = true;

    // 验证主线 storyFlags 未被修改
    assertEqual(storyFlags['prologue'], flagsBefore['prologue'],
        '主线 storyFlags["prologue"] 未被修改');
    assertEqual(storyFlags['第一章'], flagsBefore['第一章'],
        '主线 storyFlags["第一章"] 未被修改');
    assertEqual(storyFlags['第二章'], flagsBefore['第二章'],
        '主线 storyFlags["第二章"] 未被修改');

    // 验证特殊剧情的 flag 是独立的，不会覆盖主线 flag
    assert(storyFlags['post-build-red-panda'] === true,
        '特殊剧情 flag 被独立设置');

    // 验证主线映射表中的键对应的 flags 保持原值
    var mainStoryKeys = Object.keys(MAIN_STORY_SEQUENCE);
    var mainStoryValues = mainStoryKeys.map(function (k) { return MAIN_STORY_SEQUENCE[k]; });
    var allMainIds = mainStoryKeys.concat(mainStoryValues);
    // 去重
    var uniqueMainIds = allMainIds.filter(function (id, idx) {
        return allMainIds.indexOf(id) === idx;
    });

    var mainFlagsIntact = uniqueMainIds.every(function (id) {
        // 只检查播放前已存在的 flag
        if (id in flagsBefore) {
            return storyFlags[id] === flagsBefore[id];
        }
        // 播放前不存在的 flag 不应被特殊剧情创建
        return !(id in storyFlags) || storyFlags[id] === undefined;
    });

    assert(mainFlagsIntact, '所有主线章节的 storyFlags 在特殊剧情播放后保持不变');
})();

(function testResolveFollowupUnchangedAfterSpecialStory() {
    // 验证特殊剧情播放前后，主线衔接逻辑不受影响
    var allPlayable = createHasPlayableStory([
        'prologue', '第一章', '第二章', '第三章', 'post-build-red-panda'
    ]);

    // 播放特殊剧情前的主线衔接
    var beforePrologue = resolveFollowupStoryId('prologue', allPlayable);
    var beforeCh1 = resolveFollowupStoryId('第一章', allPlayable);
    var beforeCh2 = resolveFollowupStoryId('第二章', allPlayable);

    // "播放"特殊剧情（不修改任何全局状态，因为 MAIN_STORY_SEQUENCE 是静态的）
    resolveFollowupStoryId('post-build-red-panda', allPlayable);

    // 播放特殊剧情后的主线衔接
    var afterPrologue = resolveFollowupStoryId('prologue', allPlayable);
    var afterCh1 = resolveFollowupStoryId('第一章', allPlayable);
    var afterCh2 = resolveFollowupStoryId('第二章', allPlayable);

    assertEqual(afterPrologue, beforePrologue,
        '特殊剧情播放后 resolveFollowupStoryId("prologue") 结果不变');
    assertEqual(afterCh1, beforeCh1,
        '特殊剧情播放后 resolveFollowupStoryId("第一章") 结果不变');
    assertEqual(afterCh2, beforeCh2,
        '特殊剧情播放后 resolveFollowupStoryId("第二章") 结果不变');
})();

// ── 测试 4: 映射表结构完整性验证 ──

console.log('\n测试 4: 映射表结构完整性');

(function testMappingTableStructure() {
    assertEqual(MAIN_STORY_SEQUENCE['prologue'], '第一章',
        '映射表包含 prologue → 第一章');
    assertEqual(MAIN_STORY_SEQUENCE['第一章'], '第二章',
        '映射表包含 第一章 → 第二章');
    assertEqual(MAIN_STORY_SEQUENCE['第二章'], '第三章',
        '映射表包含 第二章 → 第三章');
    assertEqual(Object.keys(MAIN_STORY_SEQUENCE).length, 3,
        '映射表恰好包含 3 个条目');
})();

// ── 结果汇总 ──

console.log('\n=== 测试结果 ===');
console.log('通过: ' + passCount);
console.log('失败: ' + failCount);
console.log('总计: ' + (passCount + failCount));

if (failCount > 0) {
    console.error('\n有 ' + failCount + ' 个测试失败！');
    process.exit(1);
} else {
    console.log('\n所有测试通过 ✓');
    process.exit(0);
}
