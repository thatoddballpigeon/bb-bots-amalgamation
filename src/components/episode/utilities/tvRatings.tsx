import React from "react";
import { GameState, getHouseguestById, Houseguest, nonEvictedHouseguests, nonEvictedHouseguestsSplit } from "../../../model";
import { popSnapshot, takePopularitySnapshot } from "../../../utils/popularity";
import { Alliances, isAllied } from "../../../utils/alliances";
import { VetoCeremonyInformation } from "../scenes/vetoCeremonyScene";
import { NominationInformation } from "../scenes/nominationCeremonyScene";
import { EvictionInformation } from "../scenes/evictionScene";
import _ from "lodash";
import { EpisodeLog } from "../../../model/logging/episodeLog";
import { isNotNull } from "../../../utils";

export let nomCeremonyInformation: NominationInformation[] = [];
export let vetoCeremonyInformation: VetoCeremonyInformation[] = [];
export let evictionInformation: EvictionInformation[] = [];

export interface TVRatings {
    cycleRating?: number;
    demographics?: { [id: string]: number };
    demoOffset?: { [id: string]: number };
    hohAllianceId?: string | null;
    hohIds?: number[];
    rawDelta?: number;
    debug?: any;
}
interface TVDemoDebug {
    base?: number;
    delta?: number;
    posTotal?: number;
    negTotal?: number;
    noise?: number;
    signals?: any;
}

const TV_RATING_BASELINE = 5.0;
const TV_DEMO_SHARE = { teen: 0.20, youngAdult: 0.35, midAge: 0.25, older: 0.20 };
const TV_DEMO_OFFSET_CAP = { teen: 2.0, youngAdult: 1.2, midAge: 1.6, older: 2.0 };
const TV_RATING_DEMO_WEIGHTS = {
    teen: { hoh: 0.6, alliance: 0.7, loneWolf: 0.8, nomLow: 0.8, nomHigh: 1.0, showmance: 1.8, eviction: 1.0, likability: 0.8, blindside: 1.0, betrayal: 0.7, twistDensity: 1.4, chalk: 0.7, voteMargin: 1.5, stagnant: -0.3, powerShift: 0.6, castQuality: 0.7, entrance: 1.4, vetoUsed: 1.6, allianceFormed: 1.0, minorityWin: 0.8, departure: 0.7 },
    youngAdult: { hoh: 1.0, alliance: 1.8, loneWolf: 1.4, nomLow: 1.2, nomHigh: 1.0, showmance: 1.1, eviction: 1.0, likability: -0.6, blindside: 1.3, betrayal: 1.2, twistDensity: 1.1, chalk: 1.2, voteMargin: 1.7, stagnant: 1.1, powerShift: 1.1, castQuality: -0.3, entrance: 1.2, vetoUsed: 1.0, allianceFormed: 1.6, minorityWin: 1.4, departure: 0.7 },
    midAge: { hoh: 1.3, alliance: 1.1, loneWolf: 0.9, nomLow: 0.7, nomHigh: 0.8, showmance: -0.6, eviction: 1.0, likability: 0.8, blindside: 1.1, betrayal: 1.4, twistDensity: 0.8, chalk: 1.3, voteMargin: 1.1, stagnant: 1.2, powerShift: 1.3, castQuality: 1.1, entrance: -0.3, vetoUsed: 1.2, allianceFormed: 1.0, minorityWin: 0.9, departure: -0.7 },
    older: { hoh: 0.9, alliance: -0.9, loneWolf: 0.7, nomLow: 0.6, nomHigh: 0.6, showmance: 0.4, eviction: 1.1, likability: 1.6, likabilityNeg: 2.5, blindside: 0.9, betrayal: 1.5, twistDensity: -0.5, chalk: 1.0, voteMargin: 0.9, stagnant: 0.9, powerShift: 1.4, castQuality: 1.3, entrance: 0.5, vetoUsed: 1.0, allianceFormed: 1.0, minorityWin: 0.7, departure: -0.7 },
};
const TV_RATING_LIKABLE_LABELS = new Set([
    'Hero', 'Fan Favorite', 'Quotable', 'Mastermind', 'Underdog', 'Sweetheart',
    'Tragic', 'Narrator', 'Comic Relief', 'Airhead',
]);
const TV_RATING_MESSY_LABELS = new Set([
    'Spotlight Chaser', 'Puppet', 'Floater', 'Messy', 'Villain', 'Goat', 'Invisible', 'Dictator',
]);

function tvRatingSoftClamp(v: number) {
    if (v > 9) return 9 + (v - 9) * 0.5;
    if (v < 1) return 1 - (1 - v) * 0.5;
    return v;
}

function tvRatingEvictees() {
    return evictionInformation.flatMap(info => info.evicted).filter(isNotNull);
}

function tvRatingNomineesFor(vetoCer: VetoCeremonyInformation[], nomData: NominationInformation[]) {
    const houseguests: Houseguest[] = [];
    /*
    if (svCers?.length) {
        for (let i = svCers.length - 1; i >= 0; i--) {
            if (svCers[i]?.finalNominees?.length) return svCers[i].finalNominees;
        }
    }
    if (bvCer?.finalNominees?.length) return bvCer.finalNominees;
    */
    if (vetoCer.length) houseguests.push(...vetoCer.flatMap(veto => veto.finalNominees));
    // if (nomData?.type === 'direct') return (nomData.nominated || []).map(n => n.contestant || n);
    houseguests.push(...nomData.flatMap(nom => nom.nominated));
    return houseguests;
}

function tvRatingNominees(): Houseguest[] {
    const cycle1 = tvRatingNomineesFor(vetoCeremonyInformation, nomCeremonyInformation);
    return cycle1;
}

function tvRatingAliveMemberIds(gameState: GameState, al: Alliances) {
    return al?.members.filter(id => !gameState.houseguests.find(c => c.id === id)?.isEvicted);
}

function tvRatingHasAnyAlliance(gameState: GameState, winner: number) {
    if (winner === null) return false;
    return (gameState.alliances || []).some(a =>
        a.isActive && !a.isShowmance && a.members.includes(winner));
}

function tvRatingWinnerAllianceId(gameState: GameState, winner: number, preferred?: string | null) {
    if (winner === null) return null;
    const candidates = gameState.alliances.filter(a =>
        a.isActive && !a.isShowmance && tvRatingAliveMemberIds(gameState, a).length >= 2 && a.members.includes(winner));
    if (!candidates.length) return null;
    if (preferred != null) {
        const kept = candidates.find(a => (a.id ?? a.name) === preferred);
        if (kept) return preferred;
    }
    const al = candidates.reduce((best, a) => {
        const bestSize = tvRatingAliveMemberIds(gameState, best).length, aSize = tvRatingAliveMemberIds(gameState, a).length;
        if (aSize !== bestSize) return aSize > bestSize ? a : best;
        const bestStrength = best.strength ?? 0, aStrength = a.strength ?? 0;
        if (aStrength !== bestStrength) return aStrength > bestStrength ? a : best;
        return (a.episodeFormed ?? 0) < (best.episodeFormed ?? 0) ? a : best;
    });
    return al.id ?? al.name ?? null;
}

function tvRatingAlliancesOppose(gameState: GameState, a: string | null, b?: string | null) {
    if (a === null || b === null || a === b) return false;
    const alliances = gameState.alliances;
    const aId = alliances.find(al => (al.id ?? al.name) === a);
    const bId = alliances.find(al => (al.id ?? al.name) === b);
    if (!aId || !bId) return false;
    const membersA = tvRatingAliveMemberIds(gameState, aId), membersB = new Set(tvRatingAliveMemberIds(gameState, bId));
    if (Math.max(membersA.length, membersB.size) < 2) return false;
    const smaller = Math.min(membersA.length, membersB.size);
    const overlap = membersA.filter(id => membersB.has(id)).length;
    return (overlap / smaller) < 0.34;
}

function tvRatingIsUnderdogAlliance(gameState: GameState, allianceId: string) {
    if (allianceId === null) return false;
    const alliances = gameState.alliances || [];
    const winner = alliances.find(al => (al.id ?? al.name) === allianceId);
    if (!winner) return false;
    const winnerSize = tvRatingAliveMemberIds(gameState, winner).length;
    const biggestRival = alliances
        .filter(al => al.isActive && !al.isShowmance && tvRatingAliveMemberIds(gameState, al).length >= 3
            && (al.id ?? al.name) !== allianceId && tvRatingAlliancesOppose(gameState, allianceId, al.id ?? al.name))
        .reduce((max, al) => Math.max(max, tvRatingAliveMemberIds(gameState, al).length), 0);
    return biggestRival - winnerSize >= 2;
}

function tvRatingEvictionSignals(gameState: GameState) {
    let blindside = 0, betrayal = 0, chalk = 0, voteMargin = 0;
    evictionInformation.filter(isNotNull).forEach(evData => {
        const evicted = evData.evicted;
        const votes = evData.votes;
        if (evicted && votes.length) {
            const evictedIds = _.map(evicted, 'id');
            const strengths = _(votes)
            .filter(v => v.voter != null && !evictedIds.includes(v.voter.id))
            .flatMap(v => evicted.map(e => v.voter.relationshipWith(gameState, e)))
            .value();

            if (strengths.length) {
                const avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length;
                if (avgStrength > 5) blindside += 0.5;
                if (avgStrength < -2) chalk -= 0.3;
            }
        }

        const nomineeIds = [...new Set(votes.map(v => v.target.id).filter(id => id != null))];
        votes.forEach(v => {
            if (v.voter === null || v.target === null || v.voter.id === v.target.id) return;
            if (!isAllied(gameState, v.voter, v.target)) return;
            const hadNonAlliedOption = nomineeIds.some(id => id !== v.target.id && !isAllied(gameState, v.voter, getHouseguestById(gameState, id)));
            if (hadNonAlliedOption) betrayal += 0.2;
        });
        const counts = Object.values(evData.tally).sort((a, b) => b - a);
        if (counts.length) {
            const top = counts[0], second = counts[1] || 0;
            const total = top + second;
            if (total > 0) {
                const closeness = (top - second) / total; // 0 = dead tie, 1 = unanimous
                voteMargin += Math.max(-0.4, Math.min(0.45, 0.45 - closeness * 1.1));
            }
        }
    });
    return {
        blindside: Math.min(0.6, blindside),
        betrayal: Math.min(0.6, betrayal),
        chalk: Math.max(-0.4, chalk),
        voteMargin: Math.max(-0.4, Math.min(0.5, voteMargin)),
    };
}

function tvRatingTwistCount(gameState: GameState) {
    return 0 //HH_TWIST_RULES.filter(t => t.name !== 'Villa Veto' && t.name !== 'Sit Out' && t.has(ep)).length;
}

function tvRatingSeasonBuzz(gameState: GameState) {
    let buzz = 0;
    /*
    if (hhState.groupAlliancesEnabled) buzz += 0.1;
    if (hhState.showmancesEnabled) buzz += 0.1;
    if (hhState.teamsEnabled) buzz += 0.1;
    if (hhState.supermajorityAlliancesEnabled) buzz += 0.1;
        */
    if (gameState.houseguests.length >= 16) buzz += 0.1;
    return Math.min(0.5, buzz);
}

function tvRatingSeasonTrend(gameState: GameState, idx: number) {
    const log = gameState.log;
    let trend = 0, weightSum = 0, weight = 1;
    for (let i = idx; i >= 0; i--) {
        for (let j = log[idx].length - 1; i >= 0; i--) {
            const past = log[idx][j].tvRatings;
            if (!past || past.rawDelta === undefined) continue;
            trend += past.rawDelta * weight;
            weightSum += weight;
            weight *= 0.75;
        }
    }
    return weightSum > 0 ? trend / weightSum : 0;
}

export function computeEpisodeRating(gameState: GameState) {
    const episodeLog = gameState.log;
    const episodeIdx = gameState.episode;
    const weekIdx = gameState.week;

    let prevEp: EpisodeLog[] | null = null;
    for (let i = episodeIdx - 1; i >= 0; i--) {
        if (episodeLog[i]?.some(eps => eps.tvRatings !== null)) { prevEp = episodeLog[i]; break; }
    }

    if (typeof takePopularitySnapshot === 'function') takePopularitySnapshot(gameState);

    const field = nonEvictedHouseguests(gameState);
    const fieldAvgPop = field.length ? field.reduce((s, c) => s + (c.popularity.popularity ?? 50), 0) / field.length : 50;
    const fieldPops = field.length ? field.map(c => c.popularity.popularity ?? 50) : [50];
    const fieldMinPop = Math.min(...fieldPops), fieldMaxPop = Math.max(...fieldPops);

    let base, debugTrend = 0, debugReversionTarget = null, debugPremiereRoll = null, debugReturneeBoost = 0, debugSeasonBuzz = 0;
    if (!prevEp) {
        const returneeCount = 0 // field.filter(c => c.isReturnee).length;
        const returneeBoost = returneeCount > 0 ? Math.min(1.5, 0.3 + (returneeCount / Math.max(1, field.length)) * 0.7) : 0;
        const premiereRoll = (Math.random() - 0.5) * 3;
        base = Math.max(0, Math.min(10, TV_RATING_BASELINE + returneeBoost + tvRatingSeasonBuzz(gameState) + premiereRoll));
        debugPremiereRoll = premiereRoll; debugReturneeBoost = returneeBoost; debugSeasonBuzz = tvRatingSeasonBuzz(gameState);
    } else {
        const trend = tvRatingSeasonTrend(gameState, episodeIdx);
        const reversionTarget = Math.max(0, Math.min(10, TV_RATING_BASELINE + trend * 4.2));
        const rating = prevEp.reduce((sum, log) => sum + (log.tvRatings?.cycleRating ?? 0), 0);
        base = rating + (reversionTarget - rating) * 0.16;
        debugTrend = trend; debugReversionTarget = reversionTarget;
    }

    const signals = { hoh: 0, alliance: 0, loneWolf: 0, nomLow: 0, nomHigh: 0, showmance: 0, eviction: 0, blindside: 0, betrayal: 0, chalk: 0, voteMargin: 0, stagnant: 0, twistDensity: 0, noStakes: 0, apathy: 0, powerShift: 0, castQuality: 0, entrance: 0, vetoUsed: 0, allianceFormed: 0, minorityWin: 0, departure: 0 };
    signals.castQuality = Math.max(-0.15, Math.min(0.15, (fieldAvgPop - 50) / 80));

    // Entrance: a surprise buyback return, a secret twin activating, or an intruder walking in --
    // all classic "wait, WHAT" reality-TV beats. Each type checked independently since more than
    // one can land the same cycle (a loaded twist week), same round-matching logic the step-list
    // builder already uses to decide when each entry actually happens.
    let entranceCount = 0;
    // if (ep.buyback && ep._buybackComp?.winnerId != null) entranceCount++;
    if (field.some(c => {
        const secretTwin = c.secretTwin;
        return secretTwin.isTwin && !secretTwin.isPrimaryTwin && !secretTwin.twinEntryCancelled && gameState.episode === secretTwin.twinEntryEpisode;
    })) entranceCount++;
    if (field.some(c => c.intruder.isIntruder && c.intruder.introWeek === gameState.episode)) entranceCount++;
    signals.entrance = Math.min(0.6, entranceCount * 0.4);

    if (gameState.alliances.some(al => al.episodeFormed === episodeIdx && !al.isShowmance)) {
        signals.allianceFormed = 0.5;
    }

    const aliveCast = field.filter(hg => !hg.isEvicted);
    const loneWolfCount = aliveCast.filter(c => tvRatingWinnerAllianceId(gameState, c.id) == null && !tvRatingHasAnyAlliance(gameState, c.id)).length;
    const loneWolfIsRare = aliveCast.length > 0 && (loneWolfCount / aliveCast.length) <= 0.30;

    const vetoWinners = vetoCeremonyInformation
        .filter(vc => vc?.saved !== null)
        .map(vc => vc.pov)
        .filter(Boolean);
    if (vetoWinners.length) {
        const hasLoneWolfVetoWin = loneWolfIsRare && vetoWinners.some(w => tvRatingWinnerAllianceId(gameState, w.id) === null);
        signals.vetoUsed = hasLoneWolfVetoWin ? 0.5 : 0.25;
    }

    // Departure (quit/expulsion/medevac): real, unscripted shock. Overall treats it as a flat
    // dramatic beat; demographics genuinely split on it -- Teen/Young Adult find an unscripted
    // shock departure thrilling TV, Middle-Age/Older find it upsetting and disruptive to fair
    // competition, hence the symmetric opposite-sign bracket weights below.
    if (/* ep._departure */false) {
        signals.departure = 0.7;
    }

    const hohIds = nomCeremonyInformation.map(nomInfo => nomInfo.hoh.id);
    let winnerAllianceId: string | null = null;
    hohIds.forEach(hohId => {
        const winner = field.find(c => c.id === hohId);
        if (!winner) return;
        const popDelta = winner.popularity.popularity - fieldAvgPop;
        signals.hoh += Math.max(-1, Math.min(1, popDelta / 30));

        const allianceId = tvRatingWinnerAllianceId(gameState, hohId, prevEp?.[weekIdx].tvRatings?.hohAllianceId);
        if (allianceId === null) {
            if (loneWolfIsRare && !tvRatingHasAnyAlliance(gameState, hohId)) signals.loneWolf += 0.8;
        } else {
            winnerAllianceId = allianceId;
            if (tvRatingIsUnderdogAlliance(gameState, allianceId)) signals.minorityWin += 0.5;
        }
    });

    if (tvRatingAlliancesOppose(gameState, winnerAllianceId, prevEp?.[weekIdx].tvRatings?.hohAllianceId)) {
        signals.powerShift = 0.5;
    }

    if (winnerAllianceId != null && !tvRatingIsUnderdogAlliance(gameState, winnerAllianceId)) {
        let streak = 1;
        for (let i = episodeIdx - 1; i >= 0; i--) {
            if (!episodeLog[i]) continue;
            for (let j = episodeLog[i].length - 1; j >= 0; j--) {
                const past = episodeLog[i][j].tvRatings;
                if (!past || past.hohAllianceId !== winnerAllianceId) break;
                streak++;
            }
        }
        signals.alliance -= Math.min(3, (streak - 1) * 0.65);
    }

    // Stagnant leadership: tracks the individual repeat winner, independent of alliance. Without
    // this, a lone wolf winning HOH over and over gets the +0.5 lone-wolf bonus every single
    // cycle with no diminishing returns -- one real reason ratings only ever climbed before.
    if (hohIds.length) {
        let stagnantPenalty = 0;
        hohIds.forEach(hohId => {
            let streak = 1;
            for (let i = episodeIdx - 1; i >= 0; i--) {
                if (!episodeLog[i]) continue;
                for (let j = episodeLog[i].length - 1; j >= 0; j--) {
                    const past = episodeLog[i][j].tvRatings;
                    if (!past || !past.hohIds?.includes(hohId)) break;
                    streak++;
                }
            }
            stagnantPenalty = Math.max(stagnantPenalty, (streak - 1) * 0.25);
        });
        signals.stagnant = -Math.min(0.5, stagnantPenalty);
    }

    const nominees = tvRatingNominees();
    if (nominees.length && field.length) {
        const popAt = (c: Houseguest) => popSnapshot[c.id].popularity;
        const rankedField = [...field].sort((a, b) => popAt(b) - popAt(a));
        const cutCount = Math.max(1, Math.round(aliveCast.length * 0.25));
        const topIds = new Set(rankedField.slice(0, cutCount).map(c => c.id));
        const bottomIds = new Set(rankedField.slice(-cutCount).map(c => c.id));

        let nomLowRaw = 0, nomHighRaw = 0;
        nominees.forEach(n => {
            if (bottomIds.has(n.id)) nomLowRaw += 0.5;
            if (topIds.has(n.id)) nomHighRaw += 0.3;
        });
        signals.nomLow = Math.min(0.5, nomLowRaw);
        signals.nomHigh = -Math.min(0.3, nomHighRaw);
    }

    const activeShowmances = gameState.alliances.filter(a => a.isShowmance && a.isActive);
    const hasQualifyingShowmance = activeShowmances.some(sh => {
        const members = sh.members.map(id => field.find(c => c.id === id));
        return members.length >= 2 && members.every(m => (m ? m.popularity.popularity : 50) > fieldAvgPop);
    });
    signals.showmance = hasQualifyingShowmance ? (0.2 + Math.random() * 0.2) : 0;

    const evictees = tvRatingEvictees();
    evictees.forEach(ev => {
        if (ev === null) return;
        const hg = getHouseguestById(gameState, ev.id);
        const evPop = hg.popularity.popularity;
        if (evPop - fieldAvgPop > 15) signals.eviction -= 0.4;
    });

    const evictionSignals = tvRatingEvictionSignals(gameState);
    signals.blindside = evictionSignals.blindside;
    signals.betrayal = evictionSignals.betrayal;
    signals.chalk = evictionSignals.chalk;
    signals.voteMargin = evictionSignals.voteMargin;
    const _aliveAfter = field.filter(hg => !hg.isEvicted).length;
    if (_aliveAfter <= 5) {
        signals.voteMargin = 0;
        const _jurySize = gameState.finalJurySize();
        if (_jurySize > 0 && _aliveAfter <= gameState.finalFinalistsSize() + _jurySize) {
            signals.voteMargin *= 0.5;
        }
    }
    signals.twistDensity = Math.min(0.4, tvRatingTwistCount(gameState) * 0.1);

    // No-stakes: a non-elimination cycle with no other twist running -- nobody's actually at
    // risk this week, low stakes, low drama.
    if (false && signals.twistDensity === 0) signals.noStakes = -0.25;

    if (fieldMaxPop - fieldMinPop < 15) signals.apathy = -0.2;

    let structuralBump = 0;
    const totalEpisodes = episodeLog.flat().filter(e => e?.tvRatings !== null && e?.tvRatings !== undefined).length;
    if (totalEpisodes > 1 && weekIdx === totalEpisodes - 1) structuralBump += 0.8;
    if (totalEpisodes > 1 && weekIdx === totalEpisodes) structuralBump += 1.0;

    function tvRatingCombine(posTotal: number, negTotal: number) {
        const BOREDOM_FLOOR = 0.75, K = 0.5;
        const netScore = (posTotal - (negTotal + BOREDOM_FLOOR)) / (posTotal + negTotal + BOREDOM_FLOOR + K);
        return netScore * 1.6;
    }

    const rawSignalValues = [signals.hoh, signals.alliance, signals.loneWolf, signals.nomLow, signals.nomHigh,
        signals.showmance, signals.eviction, signals.blindside, signals.betrayal, signals.chalk,
        signals.voteMargin, signals.stagnant, signals.twistDensity, signals.noStakes, signals.apathy,
        signals.powerShift, signals.castQuality, signals.entrance, signals.vetoUsed, signals.allianceFormed, signals.minorityWin, signals.departure, structuralBump];
    let posTotal = 0, negTotal = 0;
    rawSignalValues.forEach(v => { if (v > 0) posTotal += v; else negTotal += -v; });

    const slumpBonus = debugTrend < -0.3 ? Math.min(0.5, (-debugTrend - 0.3) * 0.6) : 0;
    const noise = Math.random() * (0.4 + slumpBonus) - 0.2;
    const rawDelta = tvRatingCombine(posTotal, negTotal) + noise;
    const delta = Math.max(-1.6, Math.min(1.6, rawDelta));
    const _ratingPenalty = 0 //ep._ratingPenalty || 0;
    const cycleRating = Math.max(0, Math.min(10, tvRatingSoftClamp(base + delta) - _ratingPenalty));

    const demographics: { [id: string]: number } = {};
    const demoDebug: { [id: string]: TVDemoDebug } = {};
    const demoOffsets: { [id: string]: number } = {};
    Object.entries(TV_RATING_DEMO_WEIGHTS).forEach(([bracket, w]) => {
        let likabilityPos = 0, likabilityNeg = 0;
        [...hohIds.map(id => field.find(c => c.id === id)), ...evictees].filter(Boolean).forEach(c => {
            const label = "";
            if (!label) return;
            if (TV_RATING_LIKABLE_LABELS.has(label)) likabilityPos += 0.25;
            if (TV_RATING_MESSY_LABELS.has(label)) likabilityNeg += 0.25;
        });
        const wLikeNeg = "likabilityNeg" in w ? w.likabilityNeg : w.likability;
        const weightedValues = [signals.hoh * w.hoh, signals.alliance * w.alliance, signals.loneWolf * w.loneWolf,
            signals.nomLow * w.nomLow, signals.nomHigh * w.nomHigh, signals.showmance * w.showmance,
            signals.eviction * w.eviction, likabilityPos * w.likability, -likabilityNeg * wLikeNeg,
            signals.blindside * w.blindside, signals.betrayal * w.betrayal, signals.twistDensity * w.twistDensity,
            signals.chalk * w.chalk, signals.voteMargin * w.voteMargin, signals.stagnant * w.stagnant,
            signals.powerShift * w.powerShift, signals.castQuality * w.castQuality, signals.entrance * w.entrance,
            signals.vetoUsed * w.vetoUsed, signals.allianceFormed * w.allianceFormed, signals.minorityWin * w.minorityWin, signals.departure * w.departure, signals.noStakes, signals.apathy, structuralBump];
        let bPos = 0, bNeg = 0;
        weightedValues.forEach(v => { if (v > 0) bPos += v; else bNeg += -v; });
        const bracketNoise = (Math.random() - 0.5) * 0.4;
        const bracketDelta = Math.max(-1.6, Math.min(1.6, tvRatingCombine(bPos, bNeg) + bracketNoise));
        const bracketKey = bracket as keyof typeof TV_DEMO_OFFSET_CAP;

        const diffDelta = bracketDelta - delta;
        const prevOffset = prevEp?.[prevEp.length - 1].tvRatings?.demoOffset?.[bracketKey] ?? 0;
        const cap = TV_DEMO_OFFSET_CAP[bracketKey] ?? 1.5;
        const offset = Math.max(-cap, Math.min(cap, prevOffset * 0.87 + diffDelta * 0.5));
        demoOffsets[bracketKey] = offset;
        demographics[bracketKey] = Math.max(0, Math.min(10, tvRatingSoftClamp(cycleRating + offset)));
        // Named (not positional) copy of weightedValues, for the dev Rating Breakdown's per-demo
        // filter -- lets it render the same "chip per non-zero signal" view Overall gets, but with
        // this bracket's own weighted numbers instead of Overall's flat unweighted ones. base/delta
        // here reflect the actual anchored formula (Overall + offset), not the raw independent
        // read, so the breakdown UI shows numbers that add up to the displayed rating.
        demoDebug[bracketKey] = {
            base: cycleRating, delta: offset, posTotal: bPos, negTotal: bNeg, noise: bracketNoise,
            signals: {
                hoh: signals.hoh * w.hoh, alliance: signals.alliance * w.alliance, loneWolf: signals.loneWolf * w.loneWolf,
                nomLow: signals.nomLow * w.nomLow, nomHigh: signals.nomHigh * w.nomHigh, showmance: signals.showmance * w.showmance,
                eviction: signals.eviction * w.eviction, likability: likabilityPos * w.likability, likabilityNeg: -likabilityNeg * wLikeNeg,
                blindside: signals.blindside * w.blindside, betrayal: signals.betrayal * w.betrayal, twistDensity: signals.twistDensity * w.twistDensity,
                chalk: signals.chalk * w.chalk, voteMargin: signals.voteMargin * w.voteMargin, stagnant: signals.stagnant * w.stagnant,
                powerShift: signals.powerShift * w.powerShift, castQuality: signals.castQuality * w.castQuality, entrance: signals.entrance * w.entrance,
                vetoUsed: signals.vetoUsed * w.vetoUsed, allianceFormed: signals.allianceFormed * w.allianceFormed, minorityWin: signals.minorityWin * w.minorityWin,
                departure: signals.departure * w.departure, noStakes: signals.noStakes, apathy: signals.apathy, structuralBump,
            },
        };
    });

    nomCeremonyInformation = [];
    vetoCeremonyInformation = [];
    evictionInformation = [];
    episodeLog[episodeIdx][weekIdx].tvRatings = {
        cycleRating, demographics, demoOffset: demoOffsets, hohAllianceId: winnerAllianceId, hohIds, rawDelta,
        debug: {
            base, delta, posTotal, negTotal, noise,
            trend: debugTrend, reversionTarget: debugReversionTarget,
            premiereRoll: debugPremiereRoll, returneeBoost: debugReturneeBoost, seasonBuzz: debugSeasonBuzz,
            signals: { ...signals },
            demoDebug,
        },
    };
}