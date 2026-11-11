import { GameState, getHouseguestById, Houseguest } from "../../model";
import { NumberWithLogic } from "./aiApi";
import { classifyRelationship, RelationshipType } from "./classifyRelationship";
import { generateExcuse, Intent } from "./generateExcuse";
import { HitListEntry } from "./hitList";

export enum WinrateStrategy {
    Low,
    Medium,
    High,
}

// Statusquo goes with the status quo, underdog tries to disrupt & go after big targets
export enum TargetStrategy {
    StatusQuo,
    Underdog,
}

function computeLocalPopularity(
    gameState: GameState,
    condition: (x: RelationshipType) => boolean,
    hero: Houseguest,
    villain: Houseguest
) {
    const matches: Houseguest[] = Array.from(gameState.nonEvictedHouseguests)
        .map((hg) => getHouseguestById(gameState, hg))
        .filter(
            (villain) =>
                condition(
                    classifyRelationship(hero.housePopularity, villain.housePopularity, hero.relationshipWith(gameState, villain))
                ) && hero.id !== villain.id
        );
    let pop: number = 0;
    let matchCount: number = 0;
    matches.forEach((hg) => {
        if (hg.id !== villain.id) {
            matchCount++;
            pop += villain.relationshipWith(gameState, hg);
        }
    });
    return pop / matchCount;
}

export function computeEnemyCentrality(gameState: GameState, hero: Houseguest, villain: Houseguest): number {
    return computeLocalPopularity(
        gameState,
        (x: RelationshipType) => x !== RelationshipType.Friend,
        hero,
        villain
    );
}
