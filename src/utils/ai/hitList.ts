import { GameState, nonEvictedHouseguests, hgPreferredName } from "../../model/gameState";
import { Houseguest } from "../../model";
import { RelationshipType, classifyRelationshipHgs } from "./classifyRelationship";
import { TargetStrategy, WinrateStrategy, computeEnemyCentrality } from "./targets";
import { linear_transform } from "../utilities";

export interface HitListEntry {
    id: number;
    value: number;
    alias: string;
    name: string;
}

export function getFromHitlist(hitList: HitListEntry[], id: number): HitListEntry {
    for (const entry of hitList) {
        if (entry.id === id) return entry;
    }
    throw new Error(`getFromHitlist: ${id} not found in hitlist`);
}

export function determineWinrateStrategy(hero: Houseguest): WinrateStrategy {
    if (hero.powerRanking <= 0) return WinrateStrategy.High; // For pre-jury gameplay, or people who are drawing 100% dead
    if (hero.powerRanking >= 0.45) return WinrateStrategy.High;
    if (hero.powerRanking <= 1 / 3) return WinrateStrategy.Low;
    return WinrateStrategy.Medium;
}

export function determineTargetStrategy(hero: Houseguest): TargetStrategy {
    return hero.friends > hero.enemies ? TargetStrategy.StatusQuo : TargetStrategy.Underdog;
}

export function generateHitList(hero: Houseguest, gameState: GameState): HitListEntry[] {
    const list: HitListEntry[] = [];
    const s = (a: any, b: any) => a.value - b.value;
    const targetStrategy: TargetStrategy = determineTargetStrategy(hero);

    const winrateStrategy: WinrateStrategy = determineWinrateStrategy(hero);

    if (winrateStrategy === WinrateStrategy.High) {
        if (targetStrategy === TargetStrategy.Underdog)
            return generateHitList_high_underdog(list, hero, gameState).sort(s);
        return generateHitList_high_statusquo(list, hero, gameState).sort(s);
    } else if (winrateStrategy === WinrateStrategy.Medium) {
        if (targetStrategy === TargetStrategy.Underdog)
            return generateHitList_med_underdog(list, hero, gameState).sort(s);
        return generateHitList_med_statusquo(list, hero, gameState).sort(s);
    } else {
        if (targetStrategy === TargetStrategy.Underdog)
            return generateHitList_low_underdog(list, hero, gameState).sort(s);
        return generateHitList_low_statusquo(list, hero, gameState).sort(s);
    }
}

// low statusquo: vote solely based on winrate
function generateHitList_low_statusquo(hitList: HitListEntry[], hero: Houseguest, gameState: GameState) {
    for (const villain of nonEvictedHouseguests(gameState)) {
        if (hero.id === villain.id) continue;
        pushWinrate(hitList, villain, hero);
    }
    return hitList;
}

// low underdog: {enemies i can't beat, sorted by centrality} {friends i can't beat, by rel.} {enemies i can beat, by centrality} {friends i can beat, by rel.}
function generateHitList_low_underdog(hitList: HitListEntry[], hero: Houseguest, gameState: GameState) {
    for (const villain of nonEvictedHouseguests(gameState)) {
        if (hero.id === villain.id) continue;
        const heroWins: boolean = hero.superiors[villain.id] > hero.powerRanking;
        const isFriend: boolean = classifyRelationshipHgs(gameState, hero, villain) === RelationshipType.Friend;
        const friend_midpoint = (hero.housePopularity + 1) / 2;
        const enemy_midpoint = (hero.housePopularity - 1) / 2;
        if (heroWins) {
            const value = isFriend
                ? linear_transform(hero.relationshipWith(gameState, villain), hero.housePopularity, 1, friend_midpoint, 1)
                : linear_transform(
                      -computeEnemyCentrality(gameState, hero, villain),
                      -1,
                      1,
                      hero.housePopularity,
                      friend_midpoint
                  );
            hitList.push({ id: villain.id, value, alias: villain.alias, name: hgPreferredName(villain) });
        } else {
            const value = isFriend
                ? linear_transform(
                      hero.relationshipWith(gameState, villain),
                      -1,
                      hero.housePopularity,
                      enemy_midpoint,
                      hero.housePopularity
                  )
                : linear_transform(
                      -computeEnemyCentrality(gameState, hero, villain),
                      -1,
                      1,
                      -1,
                      enemy_midpoint
                  );
            hitList.push({ id: villain.id, value, alias: villain.alias, name: hgPreferredName(villain) });
        }
    }
    return hitList;
}

// med underdog: {enemies i can't beat; by cent.} {enemies i can beat; by cent.} {friends i can't beat; by rel} {friends i can beat; by rel}
function generateHitList_med_underdog(hitList: HitListEntry[], hero: Houseguest, gameState: GameState) {
    for (const villain of nonEvictedHouseguests(gameState)) {
        if (hero.id === villain.id) continue;
        const heroWins: boolean = hero.superiors[villain.id] > hero.powerRanking;
        const isFriend: boolean = classifyRelationshipHgs(gameState, hero, villain) === RelationshipType.Friend;
        if (isFriend) {
            const midpoint = (hero.housePopularity + 1) / 2;
            const output_start = heroWins ? midpoint : hero.housePopularity;
            const output_end = heroWins ? 1 : midpoint;
            hitList.push({
                id: villain.id,
                value: linear_transform(
                    hero.relationshipWith(gameState, villain),
                    hero.housePopularity,
                    1,
                    output_start,
                    output_end
                ),
                alias: villain.alias,
                name: hgPreferredName(villain),
            });
        } else {
            const centrailty = -computeEnemyCentrality(gameState, hero, villain);
            const midpoint = (hero.housePopularity - 1) / 2;
            const output_start = heroWins ? midpoint : hero.housePopularity;
            const output_end = heroWins ? hero.housePopularity : midpoint;
            const centrailtyTransformed = linear_transform(
                centrailty,
                -1,
                hero.housePopularity,
                output_start,
                output_end
            );
            hitList.push({ id: villain.id, value: centrailtyTransformed, alias: villain.alias, name: hgPreferredName(villain) });
        }
    }
    return hitList;
}

// med statusquo: {enemies; by winrate.} {friends; by winrate.}
function generateHitList_med_statusquo(hitList: HitListEntry[], hero: Houseguest, gameState: GameState) {
    for (const villain of nonEvictedHouseguests(gameState)) {
        if (hero.id === villain.id) continue;
        pushWinrateWithinRelationshipTier(gameState, hitList, villain, hero);
    }
    return hitList;
}

// high underdog: {enemies by centrality} {friends by rel.}
function generateHitList_high_underdog(hitList: HitListEntry[], hero: Houseguest, gameState: GameState) {
    for (const villain of nonEvictedHouseguests(gameState)) {
        if (hero.id === villain.id) continue;
        if (classifyRelationshipHgs(gameState, hero, villain) !== RelationshipType.Friend) {
            pushEnemyCentrality(hitList, villain, hero, gameState);
        } else {
            pushRelationship(gameState, hitList, villain, hero);
        }
    }
    return hitList;
}

// high statusquo: {all by relationship}
function generateHitList_high_statusquo(hitList: HitListEntry[], hero: Houseguest, gameState: GameState) {
    for (const villain of nonEvictedHouseguests(gameState)) {
        if (hero.id === villain.id) continue;
        pushRelationship(gameState, hitList, villain, hero);
    }
    return hitList;
}
function pushEnemyCentrality(
    hitList: HitListEntry[],
    villain: Houseguest,
    hero: Houseguest,
    gameState: GameState
) {
    // we flip it to make it negative, since its something we as hero dislike
    const centrailty = -computeEnemyCentrality(gameState, hero, villain);
    const value = linear_transform(centrailty, -1, 1, -1, hero.housePopularity);
    hitList.push({ id: villain.id, value, alias: villain.alias, name: hgPreferredName(villain) });
}

function pushRelationship(gameState: GameState, hitList: HitListEntry[], villain: Houseguest, hero: Houseguest) {
    hitList.push({ id: villain.id, value: hero.relationshipWith(gameState, villain), alias: villain.alias, name: hgPreferredName(villain) });
}

function pushWinrate(hitList: HitListEntry[], villain: Houseguest, hero: Houseguest) {
    hitList.push({
        id: villain.id,
        value: linear_transform(hero.superiors[villain.id], 0, 1, -1, 1),
        alias: villain.alias,
        name: hgPreferredName(villain),
    });
}

function pushWinrateWithinRelationshipTier(gameState: GameState, hitList: HitListEntry[], villain: Houseguest, hero: Houseguest) {
    const relationshipType: RelationshipType = classifyRelationshipHgs(gameState, hero, villain);
    if (relationshipType !== RelationshipType.Friend) {
        // map below the enemy space
        hitList.push({
            id: villain.id,
            value: linear_transform(hero.superiors[villain.id], 0, 1, -1, hero.housePopularity),
            alias: villain.alias,
            name: hgPreferredName(villain),
        });
    } else {
        // map above the enemy space
        hitList.push({
            id: villain.id,
            value: linear_transform(hero.superiors[villain.id], 0, 1, hero.housePopularity, 1),
            alias: villain.alias,
            name: hgPreferredName(villain),
        });
    }
}
