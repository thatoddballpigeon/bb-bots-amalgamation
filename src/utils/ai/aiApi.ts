import { max } from "lodash";
import { Houseguest, GameState, excludeHouseguests, inJury, hgPreferredName, nonEvictedHouseguests, getHouseguestById, calculateThreatScore, nonEvictedHouseguestsSplit } from "../../model";
import { getRelationshipStrength } from "../relationshipMap";
import { getStrongestAlliance, isAllied } from "../alliances";
import { AllianceTarget } from "../../model/logging/episodeMemory";
import { noiseScale } from "../relationshipMap";
import { archetypeNominationMod } from "../../components/playerPortrait/archetypes";

export interface NumberWithLogic {
    decision: number;
    reason: string;
}

export interface HouseguestWithLogic {
    decision: Houseguest | null;
    reason: string;
}

function getIndexFromLogic(nominees: Houseguest[], logic: NumberWithLogic): NumberWithLogic {
    for (let i = 0; i < nominees.length; i++) {
        if (nominees[i].id === logic.decision) {
            return { decision: i, reason: logic.reason };
        }
    }
    throw new Error(`Attempted to vote for a nominee that was not an option.`);
}

function winningOddsF3(hero: Houseguest, villain1: Houseguest, villain2: Houseguest): number {
    // chance that hero wins final HoH
    const heroVs1: number = hero.superiors[villain1.id];
    const heroVs2: number = hero.superiors[villain2.id];
    const v1Vs2: number = villain1.superiors[villain2.id];

    if (heroVs1 === undefined)
        throw new Error(
            `Tried to get a power comparison that does not exist between ${hgPreferredName(hero)} and ${hgPreferredName(villain1)} [1]`
        );
    if (heroVs2 === undefined)
        throw new Error(
            `Tried to get a power comparison that does not exist between ${hgPreferredName(hero)} and ${hgPreferredName(villain2)} [2]`
        );
    if (v1Vs2 === undefined)
        throw new Error(
            `Tried to get a power comparison that does not exist between ${hgPreferredName(villain1)} and ${hgPreferredName(villain2)} [3]`
        );
    const heroWins: number = Math.max(heroVs1, heroVs2); // evict the person who beats you more often
    const v1wins: number = castF3Vote(villain1, hero, villain2).decision === 0 ? 0 : heroVs1;
    const v2wins: number = castF3Vote(villain2, hero, villain1).decision === 0 ? 0 : heroVs2;
    return (1 / 3) * heroWins + (1 / 3) * v1wins + (1 / 3) * v2wins;
}

function castF3Vote(hero: Houseguest, nom0: Houseguest, nom1: Houseguest): NumberWithLogic {
    const decision = hero.superiors[nom0.id] < hero.superiors[nom1.id] ? 0 : 1;
    return {
        decision,
        reason: `I have better odds of beating ${decision ? hgPreferredName(nom0) : hgPreferredName(nom1)} in the final 2.`,
    };
}

function castF4voteAsHoH(
    hero: Houseguest,
    nom0: Houseguest,
    nom1: Houseguest,
    nom2: Houseguest
): NumberWithLogic {
    const evictNom0 = winningOddsF3(hero, nom1, nom2);
    const evictNom1 = winningOddsF3(hero, nom0, nom2);
    const evictNom2 = winningOddsF3(hero, nom0, nom1);
    const winrates = [evictNom0, evictNom1, evictNom2];
    const maxWinrate = max(winrates);
    const decision = winrates.findIndex((i) => i === maxWinrate);
    return {
        decision,
        reason: `Evicting ${
            hgPreferredName([nom0, nom1, nom2][decision])
        } gives me better odds of making it to the end and winning.`,
    };
}

function castF4vote(hero: Houseguest, nom0: Houseguest, nom1: Houseguest, HoH: Houseguest): NumberWithLogic {
    const evictNom0 = winningOddsF3(hero, nom1, HoH);
    const evictNom1 = winningOddsF3(hero, nom0, HoH);
    const decision = evictNom0 > evictNom1 ? 0 : 1;
    return {
        decision,
        reason: `Evicting ${
            hgPreferredName([nom0, nom1][decision])
        } gives me better odds of making it to the end and winning.`,
    };
}

export function getWorstTarget(hero: Houseguest, options: Houseguest[]): Houseguest {
    const sortedOptions = [...options];
    // worst target is in position 0
    if (sortedOptions.length === 0) throw "Tried to get a worst target from 0 options";
    return sortedOptions[0];
}

// returns the id of the houseguests you're backdooring
// SHOULD ONLY BE USED for nominations, because it excludes teammates
export function backdoorNPlayers(
    hero: Houseguest,
    options: Houseguest[],
    gameState: GameState,
    n: number
): NumberWithLogic[] {
    // if the number of people you are trying to backdoor is the same as your options,
    // no point in doing any logic for it (plus this fixes an edge case at F5/F4)
    if (options.length === n) {
        return options.map((hg) => ({ decision: hg.id, reason: `I am forced to nominate ${hgPreferredName(hg)}` }));
    }
    // exclude teammates in options[], but if that gives an empty list never mind lol
    const forcedOptions = [];
    if (hero.tribe !== undefined) {
        const teammates = gameState.houseguests.filter((hg) => {
            if (hg.tribe === undefined) return false;
            return hg.tribe.tribeId === hero.tribe!.tribeId;
        });
        const nonTeammates = excludeHouseguests(options, teammates);
        nonTeammates.length >= n && (options = nonTeammates);
        // you are forced to nominate non-teammates along side some teammates here
        if (nonTeammates.length < n && nonTeammates.length > 0) {
            forcedOptions.push(...nonTeammates);
            options = excludeHouseguests(options, nonTeammates);
        }
    }
    if (options.length < n) throw new Error(`Tried to backdoor ${n} players with ${options.length} options.`);
    const result: NumberWithLogic[] = [];
    for (let option of forcedOptions) {
        result.push({
            decision: option.id,
            reason: `I am forced to nominate ${hgPreferredName(option)}`,
        });
    }
    const sortedOptions = [...options];
    // negative value if first is less than second

    while (result.length < n) {
        const decision = sortedOptions[result.length];
        const reason = "";
        result.push({ decision: decision.id, reason });
    }
    return result;
}

export function pJurorVotesForHero(gameState: GameState, juror: Houseguest, hero: Houseguest, villain: Houseguest): number {
    const r1 = juror.relationshipWith(gameState, hero);
    const r2 = juror.relationshipWith(gameState, villain);
    const delta = (r1 - r2) / 2;
    let result = 0.5 + delta;
    if (result > 1) result = 1;
    if (result < 0) result = 0;
    return result;
}

// works with 2+ finalists now
export function castJuryVote(gameState: GameState, juror: Houseguest, finalists: Houseguest[]): number {
    if (finalists.length <= 1) return 0;

    const allFinalists = finalists.map(hg => ({
        hg,
        score: juror.relationshipWith(gameState, hg)
    })).sort((a, b) => b.score - a.score);
    
    const choice = Math.abs(Math.random());
    return choice > pJurorVotesForHero(gameState, juror, allFinalists[0].hg, allFinalists[1].hg) ? 1 : 0;
}

function getConvictionBonus(gameState: GameState, voter: Houseguest, target: Houseguest, context: string) {
    const c = gameState.convictions?.[voter.id]?.[target.id];
    if (!c) return 0;
    return context === 'nomination' ? c.strength * 2.0 : c.strength * 1.5;
}

function convictionOverridesAlliance(gameState: GameState, voter: Houseguest, target: Houseguest) {
    const c = gameState.convictions?.[voter.id]?.[target.id];
    return c && c.strength >= 3;
}

/*
function cleanSlateGap(gameState: GameState, a: number, b: number) {
    const map = gameState;
    if (!map) return null;
    const pk = [a, b].sort((x, y) => x - y).join('-');
    const e = map[pk];
    if (e === null) return null;
    return gameState.episode - e;
}
*/

export function pickNominationTargets(
    splitIndex: number | null | undefined,
    gameState: GameState, 
    hero: Houseguest,
    excluded: Set<number>,
    max: number
) {
    const houseguests = nonEvictedHouseguestsSplit(splitIndex, gameState);
    const candidates = houseguests.filter(c => !excluded.has(c.id));
    const nonEvictedHgs = houseguests.filter(hg => !hg.isHidden).length;
    
    const gameMemory = gameState.memory;

    const scored = candidates.map(c => {
        let reason: string = "STRATEGIC";
        const relationship = getRelationshipStrength(gameState, hero, c);
        const episodeDelta = gameMemory.episodeRelDelta[hero.id]?.[c.id];
        const recency = -episodeDelta * 1.2;
        const score = voteTargetScore(splitIndex, gameState, hero, c, "nomination");

        const cvEntry = gameState.convictions[hero.id]?.[c.id];
        const dramaContrib = Math.max(0, recency);
        const relContrib  = Math.max(0, -relationship * 4.0);
        const nomCompWins = c.hohWins + c.povWins;
        const nomTotalStats = c.stats.physical + c.stats.mental + c.stats.endurance;
        const isThreatBased = nomCompWins >= 1 || nomTotalStats >= 20 || nonEvictedHgs <= 5;

        const episode = gameState.episode;
        if (cvEntry && cvEntry.episodesHeld >= 1) reason = 'CONVICTION';
        else if (relationship <= -60) reason = 'FEUD';
        else if (c.nominations >= 2) reason = 'RECURRING_TARGET';
        else if (dramaContrib > relContrib && episodeDelta <= -10) reason = 'DISRUPTIVE';
        else if (isThreatBased && relationship > -40) reason = 'THREAT';
        else if (relationship <= -40 && episode > 0) reason = 'TENSION';
        else if (isThreatBased) reason = 'THREAT';
        else if (relationship <= -10 && episode > 0) reason = 'GUT';
        return { contestant: c, score, reason };
    }).sort((a, b) => b.score - a.score);
    return scored.slice(0, max);
}
export function voteTargetScore(
    splitIndex: number | null | undefined,
    gameState: GameState,
    voter: Houseguest,
    target: Houseguest,
    context: string,
) {
    const vId = voter.id;
    const tId = target.id;
    const v = getHouseguestById(gameState, vId);
    const t = getHouseguestById(gameState, tId);
    if (!v || !t) return 0;

    const gameMemory = gameState.memory;
    const aliveCount = gameState.remainingPlayers;
    const sm = getHouseguestById(gameState, tId);

    const dirRel = v.relationshipWith(gameState, t);
    const voterTraits = voter.traits;
    const noiseScl = noiseScale(voterTraits);
    const phaseFactor = Math.min(0.14, 0.05 + (12 - aliveCount) * 0.009);

    const epDelta = gameMemory.episodeRelDelta[vId]?.[tId];
    const isTwinTarget = voter.secretTwin.isTwin && voter.secretTwin.twinPartner === tId;
    const allied = isAllied(gameState, v, t);
    const conviction = getConvictionBonus(gameState, v, t, context === 'nomination' ? 'nomination' : 'eviction');
    const strongestAlliance = allied ? getStrongestAlliance(gameState, v, t) : null;
    const allianceStrength = strongestAlliance?.strength ?? 5;
    const loyaltyTrait = voterTraits[1]; // d1 loyalty: -1 to 1
    const loyaltyMult = 1 + loyaltyTrait * 0.35; // 0.65x (disloyal) to 1.35x (very loyal)
    const allianceWeight = context === 'nomination'
        ? -(8 + allianceStrength * 0.7) * loyaltyMult
        : -(2 + allianceStrength * 0.2) * loyaltyMult;
    const allianceMod = isTwinTarget ? -50 : (allied && !convictionOverridesAlliance(gameState, v, t) ? allianceWeight : 0);
    const recencyWeight = context === 'nomination' ? 1.2 : 0.8;
    const recency = -epDelta * recencyWeight;
    const threat = calculateThreatScore(gameState, target) * phaseFactor;
    const archMod = archetypeNominationMod(splitIndex, gameState, v, t, epDelta, aliveCount);
    const noise = (Math.random() - 0.5) * 2 * noiseScl;

    let contextMod = 0;
    if (context === 'nomination') {
        const neverTargeted = !sm.nominatedBy.some(nId => nId === vId);
        contextMod = neverTargeted ? 2.5 : 0;
    } else if (context === 'eviction') {
        const lobbyEntry = gameMemory.lobbyingLog[vId]?.[tId];
        const lobby = lobbyEntry ? (lobbyEntry.direction === 'evict' ? 3 : -3) : 0;

        let allianceCoordMod = 0;
        const allianceTargets = gameMemory.allianceTargets || [];

        const voterAllianceTargets = allianceTargets.filter(at => {
            const al = gameState.alliances.find(a => a.id === at.allianceId && a.isActive);
            return al && al.members.includes(vId);
        });

        const byTarget = new Map<number, AllianceTarget[]>();
        voterAllianceTargets.forEach(at => {
            if (!byTarget.has(at.targetId)) byTarget.set(at.targetId, []);
            byTarget.get(at.targetId)?.push(at);
        });

        const calculateAllianceBonus = (ats: AllianceTarget[], target: Houseguest) => {
            const relWithTarget = v.relationshipWith(gameState, target);
            return ats.reduce((sum, at) => {
                const rawBonus = (at.strength ?? 0) * 0.3;
                return sum + Math.max(0, rawBonus - Math.max(0, relWithTarget) * 0.4);
            }, 0);
        };

        let shouldApplyModifier = false;
        if (byTarget.size <= 1) {
            shouldApplyModifier = true;
        } else {
            let besttId = null;
            let bestCombined = -Infinity;
            byTarget.forEach((ats, currentTargetId) => {
                const target = getHouseguestById(gameState, currentTargetId);
                const relScore = -v.relationshipWith(gameState, target) * 5.5;
                const allianceBonus = calculateAllianceBonus(ats, target);
                const combined = relScore + allianceBonus;

                if (combined > bestCombined) {
                    bestCombined = combined;
                    besttId = currentTargetId;
                }
            });
            shouldApplyModifier = (besttId === tId);
        }

        if (shouldApplyModifier && byTarget.has(tId)) {
            allianceCoordMod += calculateAllianceBonus(byTarget.get(tId)!, t);
        }
        contextMod = lobby + allianceCoordMod;
    }

    if (context === 'veto_save') {
        return -dirRel * 5.5 + allianceMod + noise;
    }

    // Just buried the hatchet: strong reluctance to turn on a reconciliation partner right away, fading
    // over ~2 episodes. Softer for votes than for the HoH's own nominations.
    let reconMod = 0;
    if (context === 'nomination' || context === 'eviction') {
        const g = null;
        if (g != null && g >= 0 && g <= 2) reconMod = -(30 - g * 10) * (context === 'nomination' ? 1 : 0.5);
    }

    return -dirRel * 5.5 + conviction + allianceMod + recency + threat + archMod + contextMod + noise + reconMod;
}
