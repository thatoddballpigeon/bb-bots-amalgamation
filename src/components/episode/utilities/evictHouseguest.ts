import _ from "lodash";
import {
    Houseguest,
    GameState,
    nonEvictedHouseguests,
    calculatePopularity,
    getHouseguestById,
    getJurors,
    inJury,
    MutableGameState,
    getNonEvictedSplitMembers,
} from "../../../model";
import { average, roundTwoDigits } from "../../../utils";
import { pHeroWinsTheFinale } from "../../../utils/ai/aiUtils";
import { classifyRelationship, RelationshipType } from "../../../utils/ai/classifyRelationship";

export function evictHouseguest(gameState: MutableGameState, id: number): GameState {
    const evictee = getHouseguestById(gameState, id);
    if (gameState.currentLog) gameState.currentLog.evicted.push(evictee.id);
    evictee.isEvicted = true;
    evictee.isNominated = false;
    if (gameState.remainingPlayers - gameState.finalFinalistsSize() <= gameState.finalJurySize()) {
        evictee.isJury = true;
    }
    gameState.nonEvictedHouseguests.delete(evictee.id);
    gameState.remainingPlayers--;
    refreshHgStats(gameState, gameState.split);
    return gameState;
}

export function refreshHgStats(
    gameState: MutableGameState,
    split: { members: Set<number> }[],
    updateDelta: boolean = false
) {
    if (inJury(gameState)) {
        if (getJurors(gameState).length === 0) populateSuperiors(gameState);
        updatePowerRankings(nonEvictedHouseguests(gameState));
    }

    const splits =
        split.length > 0
            ? split
            : [{ members: new Set<number>(nonEvictedHouseguests(gameState).map((hg) => hg.id)) }];
    splits.forEach((split) => {
        const hgs = getNonEvictedSplitMembers(split, gameState);
        updatePopularity(gameState, hgs, updateDelta);
        updateFriendCounts(hgs, gameState);
    });
}

function populateSuperiors(gameState: GameState) {
    const houseguests = nonEvictedHouseguests(gameState);
    for (let i = 0; i < houseguests.length; i++) {
        const hero = houseguests[i];
        for (let j = i + 1; j < houseguests.length; j++) {
            const villain = houseguests[j];
            const pHeroWins = pHeroWinsTheFinale(gameState, { hero, villain }, houseguests);
            hero.superiors[villain.id] = pHeroWins;
            villain.superiors[hero.id] = 1 - pHeroWins;
        }
    }
}

function updatePowerRankings(houseguests: Houseguest[]) {
    houseguests.forEach((hg) => {
        let superiors: { [id: number]: number } = { ...hg.superiors };
        const nonEvictedHouseguests: Set<number> = new Set<number>(houseguests.map((h) => h.id));
        superiors = _.filter(superiors, (_, id) => nonEvictedHouseguests.has(parseInt(id)));
        hg.powerRanking = average(Object.values(superiors));
    });
}

function updatePopularity(gameState: GameState, houseguests: Houseguest[], updateDelta: boolean = false) {
    houseguests.forEach((hg) => {
        hg.targetingMe = 0;
        const result = calculatePopularity(gameState, hg, houseguests);
        if (updateDelta)
            hg.deltaPopularity = (roundTwoDigits(result) - roundTwoDigits(hg.previousPopularity)) / 100;
        hg.housePopularity = result;
    });
}

function updateFriendCounts(houseguests: Houseguest[], gameState: GameState) {
    houseguests.forEach((hero: Houseguest) => {
        let friends = 0;
        let enemies = 0;
        houseguests.forEach((villain) => {
            if (hero.id === villain.id) return;
            const type = classifyRelationship(
                hero.housePopularity,
                villain.housePopularity,
                hero.relationshipWith(gameState, villain)
            );
            if (type === RelationshipType.Friend) {
                friends++;
            } else if (type === RelationshipType.Enemy) {
                enemies++;
            }
        });
        hero.friends = friends;
        hero.enemies = enemies;
    });
}
