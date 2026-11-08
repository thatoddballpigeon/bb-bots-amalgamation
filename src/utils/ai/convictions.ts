import { GameState, getHouseguestById, Houseguest } from "../../model";
import { isNotNull } from "../utilities";

export interface ConvictionMap {
    [id: number]: Convictions;
    target: number;
}
export interface Convictions {
    strength: number;
    episodesHeld: number;
}

export function setConviction(gameState: GameState, voter: number, target: number) {
    const targets = gameState.convictions[voter];
    if (targets[target]) {
        targets[target].strength = Math.min(5, targets[target].strength + 1);
    } else {
        targets[target] = { strength: 2, episodesHeld: 0 };
    }
}

function decayConvictions(gameState: GameState) {
    if (!gameState.convictions) return;
    gameState.convictions.forEach((targets, vid) => {
        if (!targets) return;

        targets.forEach((c, tid) => {
            if (!c) return;
            
            c.episodesHeld++;
            const voter = getHouseguestById(gameState, vid);
            const target = getHouseguestById(gameState, tid);
            const rel = voter.relationshipWith(gameState, target);
            
            if (rel > 2) c.strength--;
            if (c.episodesHeld >= 3 && rel > -2) c.strength--;
            
            if (c.strength <= 0) {
                delete targets[tid]; 
            }
        });
    });
}