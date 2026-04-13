(function initZooHomeSelectors(globalScope) {
    'use strict';

    function create(deps = {}) {
        const balance = deps.balance || null;
        const hasUnfinishedRound = typeof deps.hasUnfinishedRound === 'function'
            ? deps.hasUnfinishedRound
            : function fallbackHasUnfinishedRound() {
                return false;
            };
        const getInfoHabitat = typeof deps.getInfoHabitat === 'function'
            ? deps.getInfoHabitat
            : function fallbackGetInfoHabitat() {
                return null;
            };

        function shouldShowCollectionFollowupGuide(snapshot) {
            if (!snapshot) {
                return false;
            }

            const pendingGuideSpeciesId = snapshot.collection
                ? String(snapshot.collection.pendingGuideSpeciesId || '').trim()
                : '';
            if (pendingGuideSpeciesId) {
                return true;
            }

            const storyFlow = snapshot.storyFlow && typeof snapshot.storyFlow === 'object'
                ? snapshot.storyFlow
                : null;
            return Boolean(
                storyFlow
                && String(storyFlow.pendingReturnStoryId || '').trim()
            );
        }

        function getSlotCardCopy(slotSnapshot, zooSnapshot) {
            const theme = zooSnapshot && zooSnapshot.slotTheme
                ? zooSnapshot.slotTheme
                : (balance ? balance.SLOT_THEME : null);
            const ticketName = theme ? theme.ticketName : '\u6e38\u56ed\u60ca\u559c\u5238';
            const machineName = theme ? theme.machineName : '\u793c\u76d2\u673a';
            const unlockedHabitats = zooSnapshot && Array.isArray(zooSnapshot.habitats)
                ? zooSnapshot.habitats.filter((habitat) => habitat && habitat.unlocked)
                : [];

            if (unlockedHabitats.length <= 0
                && !hasUnfinishedRound(slotSnapshot)
                && (!zooSnapshot || !zooSnapshot.resources || zooSnapshot.resources.playTicket <= 0)) {
                return {
                    status: '\u52a8\u7269\u56ed\u6682\u672a\u5f00\u653e',
                    hint: `\u9996\u4e2a\u6816\u606f\u5730\u8fd8\u6ca1\u5f00\u653e\uff0c\u5f53\u524d\u4f1a\u4fdd\u6301\u7a7a\u56ed\u72b6\u6001\uff0c\u4e0d\u4f1a\u4ea7\u51fa${ticketName}\u3002`,
                    entryText: '\u6682\u672a\u5f00\u653e',
                    disabled: true
                };
            }

            if (hasUnfinishedRound(slotSnapshot)) {
                if (slotSnapshot.isBonusGameActive) {
                    return {
                        status: `${machineName} · Bonus \u8fdb\u884c\u4e2d`,
                        hint: `\u7ee7\u7eed\u5f53\u524d\u5c40\u5373\u53ef\u8854\u63a5 Bonus\uff0c\u5df2\u7ffb\u5f00 ${slotSnapshot.revealedCount}/${slotSnapshot.totalCells} \u683c\u3002`,
                        entryText: '\u7ee7\u7eed\u5f53\u524d\u5c40',
                        disabled: false
                    };
                }

                if (slotSnapshot.isFreeSpinActive) {
                    return {
                        status: `${machineName} · Free Spin`,
                        hint: `\u5f53\u524d\u500d\u7387 ${Number(slotSnapshot.currentMultiplier || 1).toFixed(1)}x\uff0c\u8fd4\u56de\u540e\u53ef\u4ee5\u7ee7\u7eed\u514d\u8d39\u56de\u5408\u3002`,
                        entryText: '\u7ee7\u7eed\u514d\u8d39\u56de\u5408',
                        disabled: false
                    };
                }

                return {
                    status: `${machineName} · \u8fdb\u5ea6\u4fdd\u7559\u4e2d`,
                    hint: `\u5df2\u7ffb\u5f00 ${slotSnapshot.revealedCount}/${slotSnapshot.totalCells} \u683c\uff0c\u7ee7\u7eed\u65f6\u4e0d\u4f1a\u989d\u5916\u6d88\u8017${ticketName}\u3002`,
                    entryText: '\u7ee7\u7eed\u5f53\u524d\u5c40',
                    disabled: false
                };
            }

            if (!zooSnapshot || !zooSnapshot.resources || zooSnapshot.resources.playTicket <= 0) {
                return {
                    status: `${ticketName}\u4e0d\u8db3`,
                    hint: '\u7b49\u5f85\u5c0f\u718a\u732b\u680f\u820d\u4ea7\u5238\uff0c\u6216\u70b9\u51fb\u6c14\u6ce1\u9886\u53d6\u65b0\u4ea7\u51fa\u7684\u76f2\u76d2\u5238\u3002',
                    entryText: '\u6682\u65e0\u76f2\u76d2\u5238',
                    disabled: true
                };
            }

            return {
                status: `${machineName}\u5df2\u5f85\u547d`,
                hint: `\u5f53\u524d\u6301\u6709 ${zooSnapshot.resources.playTicket} \u5f20${ticketName}\uff0c\u70b9\u51fb\u53f3\u4e0b\u89d2\u5165\u53e3\u62c6\u76f2\u76d2\u3002`,
                entryText: '\u62c6\u76f2\u76d2',
                disabled: false
            };
        }

        function getMainTaskCopy(snapshot) {
            const habitat = getInfoHabitat(snapshot);
            if (!habitat) {
                return '\u67e5\u770b\u52a8\u7269\u56ed\u4e3b\u9875';
            }

            const habitatLabel = habitat.speciesLabel
                ? `${habitat.speciesLabel}\u680f\u820d`
                : habitat.name;

            if (habitat.isConstructing) {
                return `\u5efa\u9020\u4e2d · ${habitatLabel}`;
            }

            if (habitat.isStoryLocked) {
                return '\u5efa\u9020\u5c0f\u718a\u732b\u680f\u820d';
            }

            if (!habitat.unlocked) {
                return habitat.unlockActionText || `\u89e3\u9501${habitatLabel}`;
            }

            if (habitat.hasClaimableTickets && habitat.claimableTickets > 0) {
                return '\u9886\u53d6\u76f2\u76d2\u5238';
            }

            if (habitat.nextTier) {
                return `\u5347\u7ea7${habitatLabel}`;
            }

            return `\u67e5\u770b${habitatLabel}`;
        }

        return {
            getMainTaskCopy,
            getSlotCardCopy,
            shouldShowCollectionFollowupGuide
        };
    }

    globalScope.WynneZooHomeSelectors = {
        create
    };
}(window));
