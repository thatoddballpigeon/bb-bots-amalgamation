import { every } from "lodash";
import { Houseguest, GameState, excludeHouseguests, getHouseguestById, nonEvictedHouseguestsSplit, calculatePopularity, nonEvictedHouseguests, calculateThreatScore } from "../../../model";
import { backdoorNPlayers, HouseguestWithLogic, NumberWithLogic, voteTargetScore } from "../../../utils/ai/aiApi";
import { TargetStrategy } from "../../../utils/ai/targets";
import { isAllied } from "../../../utils/alliances";
import { getRelationshipStrength } from "../../../utils";
import { applyEventPopularity } from "../utilities/houseEventFactory";
import { generateVetoReason } from "../utilities/nominationReasons";

export interface Veto {
    name: string;
    emoji: string;
    use: (
        hero: Houseguest,
        nominees: Houseguest[],
        gameState: GameState,
        HoH: number,
        optionals: VetoOptionals
    ) => HouseguestWithLogic;
}

export const GoldenVeto: Veto = {
    name: "Golden Power of Veto",
    emoji: "",
    use: useGoldenVeto,
};

export const DiamondVeto: Veto = {
    name: "Diamond Power of Veto",
    emoji: "💎",
    use: useDiamondVeto,
};

export const SpotlightVeto: Veto = {
    name: "Spotlight Power of Veto",
    emoji: "🔦",
    use: useSpotlightVeto,
};

export const BoomerangVeto: Veto = {
    name: "Boomerang Power of Veto",
    emoji: "🪃",
    use: useBoomerangVeto,
};

// only works for 2 nominees
function useBoomerangVeto(
    hero: Houseguest,
    nominees: Houseguest[],
    gameState: GameState,
    HoH: number,
    optionals: VetoOptionals
): HouseguestWithLogic {
    if (nominees.length !== 2) throw new Error("Boomerang veto only works for 2 nominees.");
    // if you wouldn't use gold veto on either of them, discard
    const veto1 = useGoldenVeto(hero, [nominees[0]], gameState, HoH, optionals);
    const veto2 = useGoldenVeto(hero, [nominees[1]], gameState, HoH, optionals);
    const checks = basicVetoChecks(hero, nominees, gameState, HoH, optionals);
    if (checks) return checks;
    const remainingPlayers = nonEvictedHouseguestsSplit(optionals.splitIndex, gameState).length;
    // Need an additional check for boomerang veto, since there are 2 replacement noms
    if (remainingPlayers - 1 - nominees.length === 2) {
        return {
            decision: null,
            reason: "It doesn't make sense to use the veto here.",
        };
    }

    if (veto1.decision === null && veto2.decision === null) {
        return { decision: null, reason: "I don't want to save either of these noms." };
    }
    // if you would use gold veto on both of them, use
    if (veto1.decision !== null && veto2.decision !== null) {
        nominees.forEach((nom) => applyEventPopularity(nom, 2));
        return { decision: nominees[0], reason: "I want to save both of these noms." };
    }
    // if you would only use it on one of them, only use it if you have low friend counts
    const strategy = 0;
    if (strategy === TargetStrategy.StatusQuo) {
        return { decision: null, reason: "I want to evict at least one of these noms." };
    } else {
        nominees.forEach((nom) => applyEventPopularity(nom, 2));
        return { decision: nominees[0], reason: "I want to save at least one of these noms." };
    }
}

function useSpotlightVeto(
    hero: Houseguest,
    nominees: Houseguest[],
    gameState: GameState,
    HoH: number,
    optionals: VetoOptionals
): HouseguestWithLogic {
    // basically ya forced to use it
    const winner = getHouseguestById(gameState, hero.id);
    const checks = basicVetoChecks(winner, nominees, gameState, HoH, optionals);
    if (checks && checks.decision !== null) return checks;

    const hoh = getHouseguestById(gameState, HoH);

    const saveRels = nominees.map(nom => ({
        nom,
        rel: getRelationshipStrength(gameState, winner, nom),
    }));
    const bestSaveEntry = saveRels.reduce((best, r) => r.rel > best.rel ? r : best, saveRels[0]);
    const saved = getHouseguestById(gameState, bestSaveEntry.nom.id);
    // use the veto on whoever is the worse target between the 2 nominees
    applyEventPopularity(saved, 2);
    return { decision: saved, reason: generateVetoReason(gameState, winner, saved, hoh, "use") };
}

// save ppl on hit list above friendship threshold
function useGoldenVeto(
    hero: Houseguest,
    nominees: Houseguest[],
    gameState: GameState,
    HoH: number,
    optionals: VetoOptionals
): HouseguestWithLogic {
    const winner = getHouseguestById(gameState, hero.id);
    const checks = basicVetoChecks(winner, nominees, gameState, HoH, optionals);
    if (checks) return checks;
    
    const hoh = getHouseguestById(gameState, HoH);

    const saveThreshold = hero.housePopularity;
    const saveRels = nominees.map(nom => ({
        nom,
        rel: getRelationshipStrength(gameState, winner, nom),
    }));
    const bestSaveEntry = saveRels.reduce((best, r) => r.rel > best.rel ? r : best, saveRels[0]);
    const bestSaveDir = bestSaveEntry.rel;
    const saved = getHouseguestById(gameState, bestSaveEntry.nom.id);

    if (bestSaveDir > saveThreshold) {
        applyEventPopularity(saved, 2);
        return { decision: saved, reason: generateVetoReason(gameState, winner, saved, hoh, "use") };
    } else {
        return { decision: null, reason: generateVetoReason(gameState, winner, saved, hoh, "discard") };
    }
}

// only works with 2 nominees
function useDiamondVeto(
    hero: Houseguest,
    nominees: Houseguest[],
    gameState: GameState,
    HoH: number,
    optionals: VetoOptionals
): HouseguestWithLogic {
    const checks = basicVetoChecks(hero, nominees, gameState, HoH, optionals);
    if (checks) return checks;
    // get the 2 best targets out of the pool of all options
    const options = nonEvictedHouseguestsSplit(optionals.splitIndex, gameState);
    const idealTargets: NumberWithLogic[] = backdoorNPlayers(
        hero,
        excludeHouseguests(options, [hero, getHouseguestById(gameState, HoH)]),
        gameState,
        2
    );
    // if ideal targets is equal to nominees, do nothing
    const ids1 = idealTargets.map((n) => n.decision);
    const ids2 = nominees.map((n) => n.id);
    if ((ids1[0] === ids2[0] && ids1[1] === ids2[1]) || (ids1[0] === ids2[1] && ids1[1] === ids2[0])) {
        return {
            decision: null,
            reason: "These are my ideal nominations.",
        };
    }

    return { decision: nominees[0], reason: "I would rather see someone else nominated." };
}

interface VetoOptionals {
    immunePlayers?: Houseguest[];
    splitIndex?: number;
}

function basicVetoChecks(
    hero: Houseguest,
    nominees: Houseguest[],
    gameState: GameState,
    HoH: number,
    options: VetoOptionals
): HouseguestWithLogic | null {
    const winner = getHouseguestById(gameState, hero.id);
    const hoh = getHouseguestById(gameState, HoH);

    const winnerIsNom = nominees.some(n => n.id === winner.id);
    const nonEvictedHgs = nonEvictedHouseguests(gameState).length;
    const winnerIsHoH = winner.id === hoh.id;

    const hohIsHostile = HoH ? getRelationshipStrength(gameState, winner, hoh) < -50 : false;

    const saveScores = excludeHouseguests(nominees, [winner]).map(nom => ({ nom, score: voteTargetScore(null, gameState, winner, nom, 'veto_save') }));
    const bestSaveEntry = saveScores.reduce((best, r) => r.score < best.score ? r : best, saveScores[0]);

    const allyNom = nominees.some(n => isAllied(gameState, winner, n));
    const log = gameState.memory.lobbyingLog[winner.id]?.[bestSaveEntry.nom.id];
    const use = log ? log.direction === "veto_save" && log.persuaded : false;
    if (winnerIsHoH) {
        const target = use
            ? (log.target ?? null)
            : null;
        return {
            decision: target,
            reason: target ? `I've had a change of heart about ${target.preferredName()}.`: "These are my ideal nominations.",
        };
    }

    const immunePlayers = options.immunePlayers || [];
    const remainingPlayers = nonEvictedHouseguestsSplit(options.splitIndex, gameState);
    // FIXME: don't veto myself out of compassion / wanting to leave
    if (winnerIsNom) {
        const nominee = bestSaveEntry.nom;
        const relationship = winner.relationshipWith(gameState, nominee);
        const traits = winner.traits;
        const norm = (val: number) => (val + 1) / 2;

        const warmth = norm(traits[0]), loyalty = norm(traits[1]), 
            authenticity = norm(traits[2]), cooperation = norm(traits[3]),
            composure = norm(traits[4]), ego = norm(traits[5]), 
            trust = norm(traits[6]), intensity = norm(traits[7]);

        const altruism = ((warmth + cooperation + trust) / 3) * (1 - ego * 0.5);
        const bravery = ((authenticity + composure + intensity) / 3) * (1 - ego * 0.3);
        const gullibility = ((warmth + trust + (1 - composure)) / 3) * (1 - ego * 0.4);

        const isFearful = ["Neurotic", "Avoidant", "Confused"].includes(winner.personality)
            || ["Paranoid", "Train Wreck"].includes(winner.archetype);
        const baseSP = isFearful
            ? (ego + intensity + (1 - trust) + (1 - composure))
            : (ego + composure + (1 - warmth) + (1 - trust));
        const selfPreservation = baseSP / 4;

        let sacrificeScore = 0;
        if (relationship > 50) sacrificeScore += (relationship - 50);
        if (nominee.stats.charisma > 8 && (relationship > 70 || gullibility > 0.65)) {
            sacrificeScore += 15 + (gullibility * 15);
        }
        if (isAllied(gameState, winner, nominee)) sacrificeScore += 15;

        sacrificeScore += (loyalty * 25);
        sacrificeScore += (altruism * 25);
        sacrificeScore += (bravery * 15);
        sacrificeScore -= (Math.max(0, selfPreservation) * 35);

        const variance = 6 + ((1 - composure) * 10);
        sacrificeScore += (Math.random() * (variance * 2)) - variance;
        
        if (sacrificeScore >= 65) {
            let reason = `I like ${nominee.preferredName()}, and they deserve to stay over me.`;
            if (loyalty > 0.75 && relationship > 90) {
                reason = `I swore to protect ${nominee.preferredName()}, so I'm stepping down for them.`;
            } else if (bravery > 0.65 && altruism > 0.8) {
                reason = `It's the right thing to do! ${nominee.preferredName()}'s got to take this all the way.`;
            } else if (calculateThreatScore(gameState, nominee) > 80) {
                reason = `${nominee.preferredName()} is playing a masterclass game, so I'm giving them my spot.`;
            }
            applyEventPopularity(nominee, 2);
            return { decision: nominee, reason: reason };
        } else {
            let selfReason = "I am going to save myself.";
            
            if (selfPreservation > 0.75) {
                selfReason = "Survival comes first. I'm keeping myself safe.";
            } else if (relationship < 50) {
                selfReason = `I'm not throwing my game away for someone like ${nominee.preferredName()}.`;
            }
            return { decision: winner, reason: selfReason };
        }
    }

    if (
        // note that immunePlayers contains the HoH(s)
        every(immunePlayers, (player) => player.id !== hero.id) &&
        remainingPlayers.length - immunePlayers.length - nominees.length <= 1
    ) {
        return {
            decision: null,
            reason: "It doesn't make sense to use the veto here.",
        };
    }
    return null;
}
