import { GameState, Houseguest, PlayerProfile } from "../model";
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

export type RelationshipMap = Record<number, Relationship>;

const ROMANCE_TRAIT_WEIGHTS = [0.34, 0.04, 0.04, 0.08, 0.14, -0.16, 0.04, 0.34];
const ROMANCE_TRAIT_WEIGHT_SUM = ROMANCE_TRAIT_WEIGHTS.reduce((s, w) => s + Math.abs(w), 0);

const ROMANCE_RELATIONSHIP_ECHO = 0.4;
const SHOWMANCE_RELATIONSHIP_ECHO = 0.65;

export function newRelationshipMap(size: number, exclude: number): RelationshipMap {
    const result: RelationshipMap = {};
    for (let i = 0; i < size; i++) {
        if (i === exclude) continue;
        result[i] = newRelationship();
    }
    return result;
}

export function newRelationship(): Relationship {
    return {
        friendship: 0,
        romance: 100,
        isRelated: false
    };
}

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

export function seedTraitsAndRelationships(gameState: GameState) {
    const cs = gameState.houseguests;
    /*
    const AMP = 0.15;
    cs.forEach(c => {
        const base = computeTraits(c);
        c.traits = base.map(v => Math.max(-1, Math.min(1, v + (Math.random() * 2 - 1) * AMP)));
    });
    */
    cs.forEach(a => {
        if (!gameState.relationships.has(a.id)) gameState.relationships.set(a.id, new Map());
        cs.forEach(b => {
            if (a.id === b.id) return;
            const compatVec = a.traits.map((ta, d) => ta * b.traits[d]);
            const baseAffinity = compatVec.reduce((s, v) => s + v, 0) / 8;
            const romanceAffinity = romanceAffinityFromCompatVec(compatVec);

            const target = gameState.relationships.get(a.id)!;
            const existing = target.get(b.id);
            if (existing) {
                target.set(b.id, { ...existing, compatVec, baseAffinity, romanceAffinity, momentum: existing.momentum ?? 0, romance: existing.romance ?? 0 });
            } else {
                const noise = (Math.random() - 0.5) * 50;
                const strength = Math.max(-100, Math.min(100, baseAffinity * 160 + noise));
                const romance = Math.max(0, Math.min(100, romanceAffinity * 80 + (Math.random() - 0.5) * 40));
                target.set(b.id, { strength, momentum: 0, compatVec, baseAffinity, romanceAffinity, romance });
            }
        });
    });
}

export function getRelationshipStrength(gameState: GameState, a: Houseguest, b: Houseguest) {
    return (a.relationshipWith(gameState, b) + b.relationshipWith(gameState, a)) / 2;
}

export function updateRelationship(gameState: GameState, from: number, to: number, delta: number) {
    if (!gameState.relationships.has(from)) {
        gameState.relationships.set(from, new Map());
    }

    const target = gameState.relationships.get(from)!;
    let existing = target.get(to);
    if (!existing) {
        existing = {
            strength: 0,
            momentum: 0,
            baseAffinity: 0,
            romanceAffinity: 0,
            romance: 0,
            locked: false
        };
        target.set(to, existing);
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
    if (!gameMemory.episodeRelDelta[from]) gameMemory.episodeRelDelta[from] = [];
    gameMemory.episodeRelDelta[from][to] = (gameMemory.episodeRelDelta[from][to] || 0) + delta;
}

export function updateRomance(gameState: GameState, from: number, to: number, delta: number) {
    if (!gameState.relationships.has(from)) {
        gameState.relationships.set(from, new Map());
    }
    const target = gameState.relationships.get(from)!;
    let existing = target.get(to);

    if (!existing) {
        existing = {
            strength: 0,
            momentum: 0,
            baseAffinity: 0,
            romanceAffinity: 0,
            romance: 0,
            locked: false
        };
        target.set(to, existing);
    }

    if (existing.locked) return;

    existing.romance = Math.max(0, Math.min(100, (existing.romance ?? 0) + delta));
    const echo = areShowmanced(gameState, from, to) 
        ? SHOWMANCE_RELATIONSHIP_ECHO 
        : ROMANCE_RELATIONSHIP_ECHO;
    updateRelationship(gameState, from, to, delta * echo);
}
