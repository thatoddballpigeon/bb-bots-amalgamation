import { GameState, Houseguest, PlayerProfile } from "../model";
import { cast$ } from "../subjects/subjects";
import { areShowmanced } from "./alliances";

export interface Relationship {
    friendship: number;
    romance: number;
    isRelated: boolean;
}

export interface Relationships {
    locked?: boolean;
    strength?: number;
    romance?: number;
    romanceAffinity?: number;
    compatVec?: number[];
    baseAffinity?: number;
    momentum?: number;
}

const ROMANCE_TRAIT_WEIGHTS = [0.34, 0.04, 0.04, 0.08, 0.14, -0.16, 0.04, 0.34];
const ROMANCE_TRAIT_WEIGHT_SUM = ROMANCE_TRAIT_WEIGHTS.reduce((s, w) => s + Math.abs(w), 0);

const ROMANCE_RELATIONSHIP_ECHO = 0.4;
const SHOWMANCE_RELATIONSHIP_ECHO = 0.65;

export function computeTraits(player: PlayerProfile) {
    const s = player.stats;
    const n = (x: number) => (x - 5.5) / 4.5;
    const sp = n(s.physical), sm = n(s.mental), ss = n(s.endurance),
          sc = n(s.charisma), st = n(s.temper);
    // temper: high = composed/calm.
    return [
         0.60*sc + 0.40*st,                // d0 warmth
         0.55*ss - 0.45*sm,                // d1 loyalty
        -0.70*sm + 0.30*st,                // d2 authenticity
         0.50*sc - 0.30*sp - 0.20*sm,      // d3 cooperation
         0.60*st + 0.40*ss,                // d4 composure
        -0.50*sc - 0.30*sp + 0.20*ss,      // d5 ego (inverted: narcissist = negative)
        -0.50*sm + 0.30*st + 0.20*ss,      // d6 trust
        -0.50*st + 0.30*sp + 0.20*sc,      // d7 intensity
    ];
}

export function noiseScale(traits: number[]) {
    const d4 = traits[4]; // composure: +1 calm, -1 volatile
    const d7 = traits[7]; // intensity: +1 dramatic, -1 low-key
    return 0.5 + (1 - d4) * 0.6 + (d7 + 1) * 0.25;
}

function romanceAffinityFromCompatVec(compatVec: number[]) {
    if (!compatVec) return 0;
    const raw = compatVec.reduce((s, v, d) => s + v * ROMANCE_TRAIT_WEIGHTS[d], 0);
    return Math.max(-1, Math.min(1, raw / ROMANCE_TRAIT_WEIGHT_SUM));
}

export function firstImpressions(gameState: GameState) {
    const hgs = gameState.houseguests;
    
    const initialSource = cast$.value.options?.relationships || firstImpressionsMap(hgs);
    
    for (let i = 0; i < hgs.length; i++) {
        for (let j = 0; j < hgs.length; j++) {
            if (i === j) continue;
            const relationship = initialSource[i]?.[j];
            if (!gameState.relationships[i]) {
                gameState.relationships[i] = {};
            }
            gameState.relationships[i][j] = relationship;
        }
    }
}

export function firstImpressionsMap(hgs: PlayerProfile[]): Record<number, Record<number, Relationships>> {
    /*
    const AMP = 0.15;
    cs.forEach(c => {
        const base = computeTraits(c);
        c.traits = base.map(v => Math.max(-1, Math.min(1, v + (Math.random() * 2 - 1) * AMP)));
    });
    */
    const relationships: Record<number, Record<number, Relationships>> = {};
    hgs.forEach((a, aIdx) => {
        hgs.forEach((b, bIdx) => {
            if (aIdx === bIdx) return;

            const compatVec = a.traits.map((ta, d) => ta * b.traits[d]);
            const baseAffinity = compatVec.reduce((s, v) => s + v, 0) / 8;
            const romanceAffinity = romanceAffinityFromCompatVec(compatVec);
            if (!relationships[aIdx]) {
                relationships[aIdx] = {};
            }

            const existing = relationships[aIdx][bIdx];
            if (existing) {
                relationships[aIdx][bIdx] = { 
                    ...existing, 
                    compatVec, 
                    baseAffinity, 
                    romanceAffinity, 
                    momentum: existing.momentum ?? 0, 
                    romance: existing.romance ?? 0 
                };
            } else {
                const noise = (Math.random() - 0.5) * 50;
                const strength = Math.max(-100, Math.min(100, baseAffinity * 160 + noise));
                const romance = Math.max(0, Math.min(100, romanceAffinity * 80 + (Math.random() - 0.5) * 40));
                
                relationships[aIdx][bIdx] = { 
                    strength, 
                    momentum: 0, 
                    compatVec, 
                    baseAffinity, 
                    romanceAffinity, 
                    romance 
                };
            }
        });
    });
    return relationships;
}

export function getRelationshipStrength(gameState: GameState, a: Houseguest, b: Houseguest) {
    return (a.relationshipWith(gameState, b) + b.relationshipWith(gameState, a)) / 2;
}

export function getRomanceStrength(gameState: GameState, a: Houseguest, b: Houseguest) {
    return (a.romanceWith(gameState, b) + b.romanceWith(gameState, a)) / 2;
}

export function updateRelationship(gameState: GameState, from: number, to: number, delta: number) {
    let existing = gameState.relationships[from][to];
    if (!existing) {
        existing = {
            strength: 0,
            momentum: 0,
            baseAffinity: 0,
            romanceAffinity: 0,
            romance: 0,
            locked: false
        };
        gameState.relationships[from][to] = existing;
    }

    if (existing.locked) return;

    const momentum = existing.momentum ?? 0;
    let effective: number = delta;
    if (Math.abs(delta) < 3 && momentum !== 0 && Math.sign(delta) !== Math.sign(momentum)) {
        effective = delta * 0.55;
    }

    existing.strength = Math.max(-100, Math.min(100, (existing.strength ?? 0) + effective));
    existing.momentum = Math.max(-3, Math.min(3, momentum * 0.7 + Math.sign(effective) * 0.6));

    const gameMemory = gameState.memory;
    if (!gameMemory.episodeRelDelta[from]) gameMemory.episodeRelDelta[from] = {};
    gameMemory.episodeRelDelta[from][to] = (gameMemory.episodeRelDelta[from][to] || 0) + delta;
}

export function updateRomance(gameState: GameState, from: number, to: number, delta: number) {
    let existing = gameState.relationships[from][to];
    if (!existing) {
        existing = {
            strength: 0,
            momentum: 0,
            baseAffinity: 0,
            romanceAffinity: 0,
            romance: 0,
            locked: false
        };
        gameState.relationships[from][to] = existing;
    }

    if (existing.locked) return;

    existing.romance = Math.max(0, Math.min(100, (existing.romance ?? 0) + delta));
    const echo = areShowmanced(gameState, from, to) 
        ? SHOWMANCE_RELATIONSHIP_ECHO 
        : ROMANCE_RELATIONSHIP_ECHO;
    updateRelationship(gameState, from, to, delta * echo);
}
