import {
    GameState,
    Houseguest,
    randomPlayer,
    nonEvictedHouseguestsSplit,
    excludeHouseguests,
    hgPreferredName,
    getHouseguestById,
    nonEvictedHouseguests,
} from "../../../model";
import React from "react";
import { getArchetypeClass, isRomanceArchetype } from "../../playerPortrait/archetypes";
import { getRomanceStrength, isNotNull, linear_transform, randomArrayIndex, randomInt, StatsMap, updateRelationship, updateRomance } from "../../../utils";
import { HOUSE_EVENTS, HOUSE_STRATEGY_EVENTS, HouseEvent, HouseEventConfig } from "./houseEvents";
import { checkAllianceFormation, hasActiveShowmance, SHOWMANCE_FORM_THRESHOLD, showmanceAttractionMatches } from "../../../utils/alliances";
import { personalityRelMulti } from "../../playerPortrait/personalities";
import { HouseEventsSceneOptions } from "../scenes/houseEventsScene";
import _, { shuffle } from "lodash";
import { generateConfessionalEvents } from "./confessionalEventFactory";
import { voteTargetScore } from "../../../utils/ai/aiApi";
import { allianceEvents } from "./allianceEventFactory";
import { updateEventPopularity } from "../../../utils/popularity";

let currentCategory: string | null = null;
let confessionals: any[] = [];

export function boldText(text: string) {
    return <strong style={{color: "white", fontWeight:800}}>{text}</strong>;
}

export function generateHouseEvents(
    splitIndex: number | null | undefined,
    gameState: GameState,
    povWinners: Houseguest[],
    hohWinners: Houseguest[],
    nominees: Houseguest[],
    options: HouseEventsSceneOptions
): HouseEvent[] {
    let events: any[] = [];
    const house = nonEvictedHouseguestsSplit(splitIndex, gameState);
    const len = house.length;

    let moodSum = 0, moodCount = 0;
    if (len > 1) {
        const sampleTarget = len > 100 ? 2000 : (len * (len - 1)) / 2;
        for (let s = 0; s < sampleTarget; s++) {
            const i = Math.floor(Math.random() * len);
            let j = Math.floor(Math.random() * len);
            while (i === j) { j = Math.floor(Math.random() * len); }

            const rel = house[i].relationshipWith(gameState, house[j]);
            if (rel != null) {
                moodSum += rel;
                moodCount++;
            }
        }
    }
    const houseMood = moodCount > 0 ? moodSum / moodCount : 0;
    const posProb = 0.5 + houseMood * 0.2;
    const negProb = 1 - posProb;

    const currentTimeOfDay = gameState.timeOfDay;
    let weighted: { item: HouseEventConfig; category: string; key: number }[] = [];
    for (let i = 0; i < HOUSE_EVENTS.length; i++) {
        const item = HOUSE_EVENTS[i];
        
        // Quick time-of-day cull
        if (item.timeOfDay && !item.timeOfDay.includes(currentTimeOfDay)) continue;

        // Calculate weighting
        const cat = item.category;
        const isPos = cat === "bonding" || cat === "spotlight" ||
            (cat === "showmance" && item.type !== "negative") ||
            ((cat === "communal" || cat === "exercise" || cat === "romance" || cat === "confessional") && item.type === "positive");

        const weightMultiplier = isPos ? posProb : negProb;
        const w = getEventWeight(gameState, item) * weightMultiplier;
        
        if (w <= 0) continue;

        weighted.push({
            item,
            category: cat,
            key: -Math.log(Math.random()) / w
        });
    }
    weighted.sort((a, b) => a.key - b.key);

    if (!["sunrise", "night"].includes(currentTimeOfDay)) {
        options.veto && events.push(...generateBeforeVetoEvents(gameState, splitIndex, povWinners, hohWinners, nominees));
        options.eviction && events.push(...generateBeforeEvictionEvents(gameState, splitIndex, hohWinners, nominees));
    }

    const max = randomInt(7, 9);
    for (let i = 0; i < weighted.length; i++) {
        if (events.length >= max) break;
        
        const { item, category } = weighted[i];
        currentCategory = category;
        
        const event = item.run(splitIndex, gameState);
        currentCategory = null;
        
        if (event) {
            events.push(event);
            if (event.confessional) {
                confessionals.push({ ...event.confessional, tags: item.tags || [] });
            }
        }
    }
    return events;
}

export function generateHouseConfessionalEvents(
    gameState: GameState,
    splitIndex: number | null | undefined,
    options: HouseEventsSceneOptions
) {
    const events = generateConfessionalEvents(gameState, splitIndex, confessionals, options);
    confessionals = [];
    return events;
}

export function generateHouseSpecialEvents(
    gameState: GameState,
    splitIndex: number | null | undefined,
) {
    let events: any[] = [];
    const entering = nonEvictedHouseguests(gameState).filter(c => {
        const intruder = c.intruder;
        return intruder.isIntruder && c.isHidden && intruder.introWeek === gameState.episode;
    });
    entering.forEach((enter) => {
        enter.isHidden = false;
        events.push({
            category: "intruder",
            portraits: [enter],
            locations: ["Backyard", "Diary Room"],
            text: `${enter.preferredName()} enters the Big Brother house completely unnoticed. Who will spot ${enter.pronoun(3)} first...?`,
        });
    });
    return events;
}

export function generateBeforeVetoEvents(
    gameState: GameState,
    splitIndex: number | null | undefined,
    povWinners: Houseguest[],
    hohWinners: Houseguest[],
    nominees: Houseguest[],
) {
    let events: any[] = [];

    const preVetoPool: any[] = [];
    const gameMemory = gameState.memory;
    const houseguests = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(hg => !hg.isHidden);
    if (povWinners && houseguests.length > 3) {
        const pushTarget = randomPlayer(nominees);
        const pov = randomPlayer(povWinners);
        const povIsNom = nominees.some(nom => nom.id === pov.id)

        const restrictedHohIds = new Set(
            hohWinners
                .filter(record => record.hoh.nominated.some(nom => nom.id === pushTarget.id))
                .map(record => record.id)
        );
        const swingPool = houseguests.filter(guest => !restrictedHohIds.has(guest.id));
        const swing = swingPool.length ? randomPlayer(swingPool) : null;
        if (swing && nominees.length && !povIsNom) {
            const povIsHoH = hohWinners.some(hoh => hoh.id === pov.id)
            const charisma = swing.stats.charisma;
            const baseChance = (povIsHoH ? 0.3 : 0.03) + (charisma - 5) * (povIsHoH ? 0.06 : 0.02);
            const persuaded = Math.random() < baseChance;
            const sN = hgPreferredName(swing);
            const vN = hgPreferredName(pov);
            const tN = hgPreferredName(pushTarget);
            preVetoPool.push(() => {
                if (!gameMemory.lobbyingLog[pov.id]) gameMemory.lobbyingLog[pov.id] = {};
                gameMemory.lobbyingLog[pov.id][pushTarget.id] = { target: pushTarget, direction: 'veto_save', persuaded };
                const consolidateEvents = HOUSE_STRATEGY_EVENTS.consolidateVeto;
                persuaded && applyRelationship(gameState, pov, swing, 10, 0.5);
                return {
                    category: 'strategy',
                    portraits: [pov, swing],
                    locations: ["Living Room", "Kitchen", "Backyard", "Bedroom"],
                    text: `${consolidateEvents[randomArrayIndex(consolidateEvents)](sN, vN, tN)} Whether it worked will have to wait for the ceremony.`,
                };
            });
        }
    }

    const max = randomInt(7, 9);
    const shuffledPool = shuffle(preVetoPool);
    const poolCount = Math.min(shuffledPool.length, Math.floor(max / 2));
    for (let i = 0; i < poolCount; i++) {
        const evt = shuffledPool[i]();
        if (evt) events.push(evt);
    }
    return events;
}

export function generateBeforeEvictionEvents(
    gameState: GameState,
    splitIndex: number | null | undefined,
    hohWinners: Houseguest[],
    nominees: Houseguest[],
) {
    let events: any[] = [];

    const committedAgainst = new Map<number, Set<Number>>();
    const preEvictionPool: any[] = [];
    const gameMemory = gameState.memory;
    const houseguests = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(hg => !hg.isHidden);

    const hgMap = new Map(houseguests.map(hg => [hg.id, hg]));

    const alliancePairs: Houseguest[][] = gameState.alliances
        .filter(al => al.isActive)
        .map(al => al.members.map(id => hgMap.get(id)))
        .filter(pair => pair.every(Boolean)) as Houseguest[][];

    if (alliancePairs.length === 0) {
        const len = houseguests.length;
        for (let i = 0; i < len; i++) {
            const hg1 = houseguests[i];
            for (let j = i + 1; j < len; j++) {
                const hg2 = houseguests[j];
                if (
                    hg1.relationshipWith(gameState, hg2) >= 50 && 
                    hg2.relationshipWith(gameState, hg1) >= 50
                ) {
                    alliancePairs.push([hg1, hg2]);
                }
            }
        }
    }

    if (nominees.length) {
        const nom = randomPlayer(nominees);
        const nN = hgPreferredName(nom);
        const charisma = nom.stats.charisma || 5;
        const popSwing = charisma >= 7 ? 2 : charisma <= 3 ? -2 : 1;
        preEvictionPool.push(() => {
            const standWinEvents = HOUSE_STRATEGY_EVENTS.standWin;
            const standLoseEvents = HOUSE_STRATEGY_EVENTS.standLose;
            applyEventPopularity(nom, popSwing);
            return {
                category: popSwing > 0 ? 'spotlight' : 'drama',
                portraits: [nom],
                locations: ["Living Room"],
                text: popSwing > 0
                    ? standWinEvents[randomArrayIndex(standWinEvents)](nN)
                    : standLoseEvents[randomArrayIndex(standLoseEvents)](nN),
            };
        });

        gameState.alliances.forEach(al => {
            if (!al.isActive) return;
            const members = al.members.map(id => houseguests.find(c => c.id === id)).filter(isNotNull);
            if (members.length < 2) return;
            members.forEach(member => {
                if (nominees.some(n => n.id === member.id)) return;
                const validNominees = nominees.filter(n => n.id !== member.id);
                if (!validNominees.length) return;
                const scores = validNominees.map(n => ({
                    id: n.id,
                    score: voteTargetScore(splitIndex, gameState, nom, n, 'eviction'),
                })).sort((a, b) => b.score - a.score);
                const likelyTargetId = scores[0].id;
                if (likelyTargetId == null) return;
                if (!committedAgainst.has(member.id)) committedAgainst.set(member.id, new Set<number>());
                committedAgainst.get(member.id)!.add(likelyTargetId);
            });
        });

        nominees.forEach((nom) => {
            const nominee = getHouseguestById(gameState, nom.id);
            const voters = excludeHouseguests(houseguests, hohWinners || []).filter(c => c.id !== nominee.id && !nominees.some(n => n.id === c.id));
            if (!voters.length) return;

            const voter = randomPlayer(voters);
            const nN = nominee.preferredName();
            const vN = hgPreferredName(voter);
            const charisma = nominee.stats.charisma;
            const baseChance = 0.35 + (charisma - 5) * 0.06;
            // If this voter is committed to evict this nominee, persuasion fails regardless
            const voterCommittedAgainst = committedAgainst.get(voter.id);
            const voterIsCommitted = voterCommittedAgainst?.has(nominee.id);
            const persuaded = voterIsCommitted ? false : Math.random() < baseChance;

            preEvictionPool.push(() => {
                if (!gameMemory.lobbyingLog[voter.id]) gameMemory.lobbyingLog[voter.id] = {};
                gameMemory.lobbyingLog[voter.id][nominee.id] = { direction: 'protect', persuaded };
                applyRelationship(gameState, nominee, voter, 1, 0.3);
                const lobbyEvents = HOUSE_STRATEGY_EVENTS.lobby;
                const result = voterIsCommitted
                    ? `${vN} hears them out. The answer is already no.`
                    : persuaded
                        ? `${vN} is quiet for a second. Then: "I hear you." That is all. It is enough.`
                        : `${vN} listens the whole way through. At the end they just say "yeah" and change the subject.`;
                return {
                    category: 'strategy',
                    portraits: [nom, voter],
                    locations: ["Living Room", "Bedroom", "Kitchen", "Storage Room", "Backyard"],
                    text: `${lobbyEvents[randomArrayIndex(lobbyEvents)](nN, vN)} ${result}`,
                };
            });
        });

        const schemers = excludeHouseguests(houseguests, hohWinners || []).filter(c => !nominees.some(n => n.id === c.id));
        if (schemers.length) {
            const schemer = randomPlayer(schemers);
            const target = randomPlayer(nominees);
            const recipient = randomPlayer(houseguests.filter(c => c.id !== schemer.id && c.id !== target.id)) || null;
            if (recipient) {
                const sN = hgPreferredName(schemer);
                const tN = hgPreferredName(target);
                const rN = hgPreferredName(recipient);
                preEvictionPool.push(() => {
                    if (!gameMemory.whispers[schemer.id]) gameMemory.whispers[schemer.id] = [];
                    gameMemory.whispers[schemer.id].push({ recipient: recipient.id, about: target.id, valence: -1 });
                    const whisperEvents = HOUSE_STRATEGY_EVENTS.whisper;
                    updateRelationship(gameState, recipient.id, target.id, -10);
                    return {
                        category: 'sabotage',
                        portraits: [schemer, recipient, target],
                        locations: ["Living Room", "Bedroom", "Kitchen", "Storage Room", "Backyard"],
                        text: `${whisperEvents[randomArrayIndex(whisperEvents)](sN, rN, tN)} ${rN} and ${tN} will feel it.`,
                    };
                });
            }
        }

        if (alliancePairs.length) {
            const [pa, pb] = alliancePairs[randomArrayIndex(alliancePairs)];
            const targetPool = nominees.filter(n => n.id !== pa.id && n.id !== pb.id);
            if (targetPool.length) {
                const aN = hgPreferredName(pa);
                const bN = hgPreferredName(pb);
                const agreedTarget = randomPlayer(targetPool);
                const tN = hgPreferredName(agreedTarget);
                preEvictionPool.push(() => {
                    gameMemory.alignmentChecks.push({ aId: pa.id, bId: pb.id, targetId: agreedTarget.id });
                    if (!gameMemory.lobbyingLog[pa.id]) gameMemory.lobbyingLog[pa.id] = {};
                    if (!gameMemory.lobbyingLog[pb.id]) gameMemory.lobbyingLog[pb.id] = {};
                    gameMemory.lobbyingLog[pa.id][agreedTarget.id] = { direction: 'evict', persuaded: true };
                    gameMemory.lobbyingLog[pb.id][agreedTarget.id] = { direction: 'evict', persuaded: true };
                    const alignEvents = HOUSE_STRATEGY_EVENTS.align;
                    applyRelationship(gameState, pa, pb, 10, 1);
                    checkAllianceFormation(gameState, pa, pb);
                    return {
                        category: 'bonding',
                        portraits: [pa, pb],
                        locations: ["Living Room", "Bedroom", "Kitchen", "Storage Room", "Backyard"],
                        text: `${alignEvents[randomArrayIndex(alignEvents)](aN, bN, tN)} Neither is surprised.`,
                    };
                });
            }
        }

        if (gameState.timeOfDay === "afternoon") { // should only happen once, really
            const activeAlliances = (gameState.alliances || []).filter(al => {
                if (!al.isActive) return false;
                const aliveMembers = al.members.filter(id => houseguests.some(c => c.id === id));
                return aliveMembers.length >= 2;
            });
            if (activeAlliances.length) {
                if (!gameMemory.allianceTargets) gameMemory.allianceTargets = [];
                const sortedByStrength = [...activeAlliances].sort((a, b) => b.strength - a.strength);
                // Track players already committed to a stronger alliance this episode
                const committedElsewhere = new Set();
                sortedByStrength.forEach((al, idx) => {
                    const allAliveMembers = al.members.map(id => houseguests.find(c => c.id === id)).filter(isNotNull);
                    const nominated = allAliveMembers.filter(m => nominees.some(n => n.id === m.id));
                    const voterMembers = allAliveMembers.filter(m => !nominees.some(n => n.id === m.id) && !m.hoh.isHoH);
                    const hasNomineeInAlliance = nominated.length > 0;

                    if (voterMembers.length < 2) return;

                    const memberVotes = voterMembers.map(member => {
                        // Already committed to a stronger alliance -- force to fence
                        if (committedElsewhere.has(member.id)) return { member, likelyTarget: null, topScore: 0, forcedFence: true };
                        const validNominees = nominees.filter(n => n.id !== member.id);
                        if (!validNominees.length) return { member, likelyTarget: null, topScore: 0 };
                        const scores = validNominees.map(nom => ({
                            nom,
                            score: voteTargetScore(splitIndex, gameState, member, nom, 'vote'),
                        }));
                        scores.sort((a, b) => b.score - a.score);
                        return { member, likelyTarget: scores[0].nom, topScore: scores[0].score };
                    });

                    const tally = new Map();
                    memberVotes.forEach(mv => {
                        if (!mv.likelyTarget) return;
                        tally.set(mv.likelyTarget.id, (tally.get(mv.likelyTarget.id) || 0) + 1);
                    });
                    if (!tally.size) return;
                    const targetId = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
                    const target = getHouseguestById(gameState, targetId);
                    if (!target) return;

                    gameMemory.allianceTargets.push({ allianceId: al.id, targetId, strength: al.strength });

                    const allCommitted = memberVotes.filter(mv => mv.likelyTarget?.id === targetId);
                    const fence = voterMembers.length - allCommitted.length;
                    if (allCommitted.length < 2) return;

                    // Mark committed members as occupied so weaker alliances treat them as absent
                    allCommitted.forEach(mv => committedElsewhere.add(mv.member.id));
                    const campaigner = allCommitted.sort((a, b) => b.topScore - a.topScore)[0].member;
                    const tN = target.preferredName();
                    const cN = campaigner.preferredName();
                    const alN = al.name;
                    const nomineeInAllianceNote = hasNomineeInAlliance
                        ? ` (${nominated.map(m => `<strong>${m.preferredName()}</strong>`).join(', ')} ${nominated.length === 1 ? 'is' : 'are'} nominated)`
                        : '';

                    let villaNarrative, eventDetail;
                    if (fence === 0) {
                        villaNarrative = hasNomineeInAlliance
                            ? `${cN} rallies ${alN} around ${tN}, even with one of their own nominated.`
                            : `${cN} brings up ${tN} and nobody pushes back. ${alN} doesn't need a second conversation.`;
                        eventDetail = `Target: <strong>${tN}</strong>. <strong>${cN}</strong> campaigned and everyone is on board${nomineeInAllianceNote}.`;
                    } else if (allCommitted.length > fence) {
                        villaNarrative = hasNomineeInAlliance
                            ? `${cN} is campaigning against ${tN} within ${alN}, but not everyone is there with an ally nominated.`
                            : `${cN} is campaigning against ${tN} within ${alN}. Most are with them, a couple are still weighing it.`;
                        eventDetail = `Target: <strong>${tN}</strong>. <strong>${cN}</strong> campaigned hard. ${allCommitted.length} of ${voterMembers.length} voters aligned${nomineeInAllianceNote}.`;
                    } else {
                        villaNarrative = hasNomineeInAlliance
                            ? `${cN} wants ${tN} out but ${alN} is divided, partly because one of their own is also nominated.`
                            : `${cN} wants ${tN} out and is making the case inside ${alN}. The alliance is not fully there yet.`;
                        eventDetail = `Target: <strong>${tN}</strong>. <strong>${cN}</strong> campaigned but the alliance is split (${allCommitted.length}/${voterMembers.length})${nomineeInAllianceNote}.`;
                    }

                    const committed = allCommitted.map(mv => mv.member);
                    if (idx === 0) {
                        events.push({
                            category: "strategy",
                            portraits: [...committed],
                            locations: ["Bedroom"],
                            text: villaNarrative,
                        });
                    }
                    const fenced = voterMembers.filter(m => !committed.some(c => c.id === m.id));
                    allianceEvents.push({ type: 'coord', alliance: al, target, campaigner, committed, fenced, nominated });
                });
            }
        }
    }

    if (hohWinners && houseguests.length > 3) {
        const swingPool = excludeHouseguests(houseguests, hohWinners || []).filter(c => !nominees?.some(n => n.id === c.id));
        const swing = swingPool.length ? randomPlayer(swingPool) : null;
        if (swing && nominees.length) {
            const hoh = randomPlayer(hohWinners);
            const hN = hgPreferredName(hoh);
            const sN = hgPreferredName(swing);
            const pushTarget = randomPlayer(nominees);
            const tN = hgPreferredName(pushTarget);
            preEvictionPool.push(() => {
                if (!gameMemory.lobbyingLog[swing.id]) gameMemory.lobbyingLog[swing.id] = {};
                gameMemory.lobbyingLog[swing.id][pushTarget.id] = { direction: 'evict', persuaded: true };
                const consolidateEvents = HOUSE_STRATEGY_EVENTS.consolidateEviction;
                applyRelationship(gameState, hoh, swing, 10, 0.5);
                return {
                    category: 'strategy',
                    portraits: [hoh, swing],
                    locations: ["Head of Household Room"],
                    text: `${consolidateEvents[randomArrayIndex(consolidateEvents)](hN, sN, tN)} It came straight from the Head of Household, which is the part that matters.`,
                };
            });
        }
    }

    const max = randomInt(7, 9);
    const shuffledPool = shuffle(preEvictionPool);
    const poolCount = Math.min(shuffledPool.length, Math.floor(max / 2));
    for (let i = 0; i < poolCount; i++) {
        const evt = shuffledPool[i]();
        if (evt) events.push(evt);
    }

    return events;
}

function getEventWeight(gameState: GameState, event: HouseEventConfig): number {
    if (event.timeOfDay?.includes("morning") && gameState.timeOfDay === "morning") return 25;
    if (event.tags?.includes("HoH")) return 10;
    if (event.tags?.includes("secretTwin")) return 5;
    return 1;
}

function groupSizeWeight(c: Houseguest, size: number) {
    const groupWeights = GROUP_SIZE_EVENT_WEIGHTS as Record<string, Record<number, number>>;
    const archetype = c.archetype;
    const cls = getArchetypeClass(archetype);
    return cls ? groupWeights[cls]?.[(size || 1)] ?? 1 : 1;
}

function traitWeightForCategory(category: string, stats: StatsMap, traits: number[]) {
    const warmth = traits[0];
    const loyalty = traits[1];
    const authenticity = traits[2];
    const cooperation = traits[3];
    const composure = traits[4];
    const ego = traits[5];
    const trust = traits[6];
    const intensity = traits[7];

    const normalizeStat = (val: number) => -1 + ((val - 1) * 2) / 9;
    const physical = normalizeStat(stats.physical);
    const mental = normalizeStat(stats.mental);
    const endurance = normalizeStat(stats.endurance);
    const charisma = normalizeStat(stats.charisma);
    const luck = normalizeStat(stats.luck);
    const temper = normalizeStat(stats.temper);

    let weight: number = 0;
    switch (category) {
        case "bonding":
            weight = ((charisma * 0.9) + (loyalty * 0.7) + (trust * 0.6) + (authenticity * 0.5) + (warmth * 0.3)) / 3.0;
            break;
        case "communal":
            weight = ((cooperation * 0.8) + (charisma * 0.7) + (temper * 0.5) + (warmth * 0.4) + (-ego * 0.4)) / 2.8;
            break;
        case "confessional":
            const baseFrequencyBoost = 1.3; 
            const personalityInfluence = ((charisma * 0.7) + (ego * 0.6) + (intensity * 0.5) + (-temper * 0.4)) / 2.2;
            weight = Math.min(1, baseFrequencyBoost + (personalityInfluence * 0.5));
            break;
        case "drama":
            weight = ((intensity * 0.8) + (-temper * 0.8) + (ego * 0.6) + (-composure * 0.6)) / 2.8;
            break;
        case "exercise":
            weight = (physical + (intensity * 0.7) + (endurance * 0.5) + (composure * 0.2)) / 2.4;
            break;
        case "rivalry":
            weight = ((intensity * 0.8) + (mental * 0.7) + (physical * 0.6) + (ego * 0.5) + (-cooperation * 0.4)) / 3.0;
            break;
        case "romance":
            weight = (charisma + (warmth * 0.7) + (-authenticity * 0.5) + (intensity * 0.4)) / 2.6;
            break;
        case "sabotage":
            weight = ((luck * 0.8) + (mental * 0.7) + (ego * 0.6) + (-loyalty * 0.5) + (-trust * 0.4)) / 3.0;
            break;
        case "spotlight":
            weight = (ego + (intensity * 0.8) + (-composure * 0.3)) / 2.1;
            break;
        case "showmance":
            weight = ((charisma * 0.9) + (endurance * 0.6) + (ego * 0.6) + (warmth * 0.5)) / 2.6;
            break;
        default:
            break;
    }
    return linear_transform(weight, -1, 1, 0.01, 2);
}

function totalWeightFuncForCategory(category: string | null, size?: number) {
    if (!category) return null;
    const archClassWeights = ARCHETYPE_CLASS_EVENT_WEIGHTS as Record<string, Record<string, number>>;
    const hasAny = Object.values(archClassWeights).some(m => m[category] !== null);
    if (!hasAny) return null;
    const archWeights = ARCHETYPE_EVENT_WEIGHTS as Record<string, Record<string, number>>;
    const groupWeights = GROUP_SIZE_EVENT_WEIGHTS as Record<string, Record<number, number>>;
    return (c: Houseguest) => {
        const archetype = c.archetype;
        const stats = c.stats;
        const traits = c.traits;
        const cls = getArchetypeClass(archetype);
        const aCW = cls ? archClassWeights[cls]?.[category] ?? 1 : 1;
        const aW = archWeights[archetype]?.[category] ?? 1;
        const tW = traitWeightForCategory(category, stats, traits);
        const gW = cls ? groupWeights[cls]?.[(size || 1)] ?? 1 : 1;
        return aCW * aW * tW * gW;
    };
}

function resolveWeightFunc(weightFunc?: (p: Houseguest) => number, size?: number) {
    return weightFunc || totalWeightFuncForCategory(currentCategory, size);
}

// this is actually just fucking wack
function randomPlayerWeighted<T>(players: T[], weightFunc: (p: T) => number): T {
    const weights = players.map(x => Math.max(0.01, weightFunc(x)));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < players.length; i++) { r -= weights[i]; if (r <= 0) return players[i]; }
    return players[players.length - 1];
}

function randomPlayersWeighted(players: Houseguest[], amount: number, weightFunc: (p: Houseguest) => number): Houseguest[] {
    const pool: Houseguest[] = [...players];
    const chosen: Houseguest[] = [];
    for (let i = 0; i < amount && pool.length; i++) {
        const c: Houseguest = randomPlayerWeighted(excludeHouseguests(pool, chosen), weightFunc);
        chosen.push(c);
    }
    return chosen;
}

function getValidHouseguests(
    splitIndex: number | null | undefined,
    gameState: GameState,
    filter?: (p: Houseguest) => boolean
): Houseguest[] {
    const validHgs = nonEvictedHouseguestsSplit(splitIndex, gameState);
    if (!filter) return validHgs.filter(c => !c.isHidden);
    return validHgs.filter(c => !c.isHidden && filter(c));
}

export function validSolo(
    splitIndex: number | null | undefined,
    gameState: GameState,
    size?: number,
    filter?: (p: Houseguest) => boolean,
    weightFunc?: (p: Houseguest) => number
): Houseguest | null {
    const pool = getValidHouseguests(splitIndex, gameState, filter);
    if (!pool.length) return null;
    const wf = resolveWeightFunc(weightFunc, size ?? 1);
    return wf ? randomPlayerWeighted(pool, wf) : randomPlayer(pool);
}

export function validVillain(splitIndex: number | null | undefined, gameState: GameState, size?: number) {
    const pool = getValidHouseguests(splitIndex, gameState);
    if (!pool.length) return null;
    return randomPlayerWeighted(pool, c => {
        const traits = c.traits;
        const composure = traits[4], intensity = traits[7], ego = traits[5], warmth = traits[0], cooperation = traits[3];
        const weight = ((composure * 0.9) + (intensity * 0.8) + (ego * 0.8) + (-warmth * 0.7) + (-cooperation * 0.6)) / 3.8;
        return linear_transform(weight, -1, 1, 0.01, 2);
    });
}

export function validTarget(splitIndex: number | null | undefined, gameState: GameState, target: Houseguest) {
    const pool = getValidHouseguests(splitIndex, gameState, c => c.id !== target.id);
    if (!pool.length) return null;
    const withRel = pool.filter(c => gameState.relationships[c.id]?.[target.id] !== undefined);
    return withRel.length ? randomPlayer(withRel) : randomPlayer(pool);
}

export function validFrameTarget(splitIndex: number | null | undefined, gameState: GameState, target: Houseguest) {
    const pool = getValidHouseguests(splitIndex, gameState, c => c.id !== target.id);
    if (!pool.length) return null;
    return randomPlayerWeighted(pool, c => {
        const rel = target.relationshipWith(gameState, c);
        return Math.max(5, 60 - rel);
    });
}

export function validPair(splitIndex: number | null | undefined, gameState: GameState, weightFunc?: (p: Houseguest) => number): Houseguest[] | null {
    const pool = getValidHouseguests(splitIndex, gameState);
    if (pool.length < 2) return null;
    const wf = resolveWeightFunc(weightFunc, 2);
    const a = wf ? randomPlayerWeighted(pool, wf) : randomPlayer(pool);
    const b = wf ? randomPlayerWeighted(excludeHouseguests(pool, [a]), wf) : randomPlayer(excludeHouseguests(pool, [a]));
    return [a, b];
}

export function validRelationshipPair(splitIndex: number | null | undefined, gameState: GameState, wantPos?: boolean, wantNeg?: boolean): Houseguest[] | null {
    const pool = getValidHouseguests(splitIndex, gameState);
    const n = pool.length;
    if (n < 2) return null;

    const maxAttempts = n * 2; 
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const i = Math.floor(Math.random() * n);
        let j = Math.floor(Math.random() * n);
        while (i === j) {
            j = Math.floor(Math.random() * n);
        }

        const h1 = pool[i];
        const h2 = pool[j];
        const s = (h1.relationshipWith(gameState, h2) + h2.relationshipWith(gameState, h1)) / 2;

        const matchesPos = wantPos && s > 0;
        const matchesNeg = wantNeg && s < 0;
        const noFilters = !wantPos && !wantNeg;

        if (matchesPos || matchesNeg || noFilters) return [h1, h2];
    }
    return validPair(splitIndex, gameState);
}

export function validAttractedPair(splitIndex: number | null | undefined, gameState: GameState): [Houseguest, Houseguest] | null {
    const pool = getValidHouseguests(splitIndex, gameState);
    if (pool.length < 2) return null;
    const pairs: [Houseguest, Houseguest][] = [];
    for (let i = 0; i < pool.length; i++)
        for (let j = i + 1; j < pool.length; j++) {
            const a = pool[i], b = pool[j];
            if ((hasActiveShowmance(gameState, a.id) || hasActiveShowmance(gameState, b.id)) || !showmanceAttractionMatches(a, b)) continue;
            pairs.push([a, b])
        }
    
    return pairs.length ? randomPlayerWeighted(pairs, ([a, b]) => {
        const avgRomance = getRomanceStrength(gameState, a, b);
        const nearFormation = avgRomance >= SHOWMANCE_FORM_THRESHOLD ? 2 : 0;
        return 1 + (isRomanceArchetype(a) ? 2 : 0) + (isRomanceArchetype(b) ? 2 : 0) + Math.min(avgRomance, 6) + nearFormation;
    }) : null;
}

export function validShowmancePair(splitIndex: number | null | undefined, gameState: GameState): Houseguest[] | null {
    const alive = getValidHouseguests(splitIndex, gameState);
    const aliveIds = new Set(alive.map(c => c.id));
    const activePairs = (gameState.alliances || [])
        .filter(al => al.isActive && al.isShowmance && al.members.every(id => aliveIds.has(id)));
    if (!activePairs.length) return null;
    const al = randomPlayerWeighted(activePairs, pair => {
        const a = alive.find(c => c.id === pair.members[0]);
        const b = alive.find(c => c.id === pair.members[1]);
        if (!a || !b) return 0;
        const avgRomance = getRomanceStrength(gameState, a, b);
        return 1 + (isRomanceArchetype(a) ? 2 : 0) + (isRomanceArchetype(b) ? 2 : 0) + Math.min(avgRomance, 6);
    });
    const a = alive.find(c => c.id === al.members[0]);
    const b = alive.find(c => c.id === al.members[1]);
    if (!a || !b) return null;
    return [a, b];
}

export function validTrio(splitIndex: number | null | undefined, gameState: GameState, weightFunc?: (p: Houseguest) => number): Houseguest[] | null {
    const pool = getValidHouseguests(splitIndex, gameState);
    if (pool.length < 3) return null;
    const wf = resolveWeightFunc(weightFunc, 3);
    if (!wf) return shuffle(pool).slice(0, 3);
    return randomPlayersWeighted(pool, 3, wf);
}
    
export function validGroup(splitIndex: number | null | undefined, gameState: GameState, amount: number, weightFunc?: (p: Houseguest) => number): Houseguest[] | null {
    const pool = getValidHouseguests(splitIndex, gameState);
    if (pool.length < amount) return null;
    const size = Math.min(pool.length, amount);
    const wf = resolveWeightFunc(weightFunc, size);
    if (!wf) return shuffle(pool).slice(0, size);
    return randomPlayersWeighted(pool, size, wf);
}

export function applyRelationship(gameState: GameState, a: Houseguest, b: Houseguest, delta: number, echo = 0.5) {
    updateRelationship(gameState, a.id, b.id, delta);
    const ratio = delta * echo;
    if (ratio !== 0) updateRelationship(gameState, b.id, a.id, ratio);
}

export function applyGroupRelationship(gameState: GameState, houseguests: Houseguest[], amount: number) {
    const length = houseguests.length;
    for (let i = 0; i < length; i++) {
        const hgI = houseguests[i];
        for (let j = i + 1; j < length; j++)
            applyRelationship(gameState, hgI, houseguests[j], amount);
    }
}

export function applyHouseRelationship(splitIndex: number | null | undefined, gameState: GameState, hero: Houseguest, amount: number): void {
    const house = nonEvictedHouseguestsSplit(splitIndex, gameState);
    for (const villain of house) if (villain.id !== hero.id) applyRelationship(gameState, hero, villain, amount);
}

export function applyRomance(gameState: GameState, a: Houseguest, b: Houseguest, delta: number, echo = 0.5) {
    updateRomance(gameState, a.id, b.id, delta);
    const ratio = delta * echo;
    if (ratio !== 0) updateRomance(gameState, b.id, a.id, ratio);
}

export function applyEventPopularity(hero: Houseguest, amount: number) {
    updateEventPopularity(hero, amount > 0 ? amount + 3 : amount - 3);
}

const ARCHETYPE_CLASS_EVENT_WEIGHTS = {
    "Comp Beasts": { spotlight: 1.15, rivalry: 1.1, exercise: 1.20 },
    "Strategists": { sabotage: 1.15, rivalry: 0.85 },
    "Social Butterflies": { bonding: 1.3 },
    "Floaters": { bonding: 1.25, drama: 0.75, spotlight: 0.85, exercise: 0.85, rivalry: 0.85 },
    "Showmances": { romance: 1.35, showmance: 1.3, bonding: 1.15 },
    "Villains": { drama: 1.3, sabotage: 1.2, rivalry: 1.25, communal: 0.85 },
    "Production Pets": { spotlight: 1.3, rivalry: 1.15, sabotage: 0.85 },
    "Jesters": { bonding: 1.2, spotlight: 1.15, sabotage: 1.15, communal: 0.85 },
    "Superfans": { bonding: 1.15, spotlight: 0.85, exercise: 0.75 },
    "Homemakers": { communal: 1.3, bonding: 1.1, exercise: 0.75, sabotage: 0.75, spotlight: 0.85, rivalry: 0.75 },
    "Underdogs": { spotlight: 1.15, exercise: 1.10, rivalry: 1.15 },
    "Outcasts": { rivalry: 1.25, bonding: 0.75, spotlight: 0.85, romance: 0.75, drama: 1.2 },
    "Confessionalists": { spotlight: 1.15, drama: 1.15 },
};

const ARCHETYPE_EVENT_WEIGHTS = {
    "Activist": { spotlight: 2, drama: 1.75, rivalry: 1.5, communal: 1.25, bonding: 0.75, exercise: 0.5, showmance: 0.25, romance: 0.25 },
    "Attorney": { spotlight: 1.2, rivalry: 1.4, drama: 1.5, sabotage: 1.3, communal: 0.9, exercise: 0.8, romance: 0.6, showmance: 0.4 },
    "Bookworm": { exercise: 1.5, sabotage: 1.4, rivalry: 1.2, drama: 0.8, bonding: 0.7, communal: 0.5, romance: 0.4, spotlight: 0.3, showmance: 0.1 },
    "Charmer": { showmance: 2, romance: 1.8, bonding: 1.6, communal: 1.4, spotlight: 1.3, rivalry: 0.8, sabotage: 0.5, exercise: 0.4 },
    "Con Artist": { sabotage: 1.75, drama: 1.5, rivalry: 1.4, communal: 1.15, romance: 0.9, showmance: 0.8, spotlight: 0.55, exercise: 0.45 },
    "Crybaby": { drama: 2, spotlight: 1.8, bonding: 1.5, romance: 1.2, showmance: 1.2, exercise: 0.4, sabotage: 0.1 },
    "Den Father": { bonding: 2, communal: 1.8, exercise: 1.5, rivalry: 1.4, spotlight: 1.2, romance: 0.5, showmance: 0.3, sabotage: 0.2 },
    "Enigma": { sabotage: 2, drama: 1.8, rivalry: 1.5, spotlight: 1.2, showmance: 0.5, romance: 0.5, exercise: 0.5, communal: 0.2, bonding: 0 },
    "Farmhand": { exercise: 1.5, bonding: 1.3, communal: 1.2, romance: 1.1, showmance: 0.9, spotlight: 0.7, rivalry: 0.6, drama: 0.5, sabotage: 0.3 },
    "Girl Next Door": { communal: 2, bonding: 2, romance: 1.8, showmance: 1.5, exercise: 1.2, drama: 0.4, rivalry: 0.2, sabotage: 0 },
    "Hero": { spotlight: 2, exercise: 1.5, drama: 0.5, sabotage: 0.2, bonding: 1.3, communal: 1.5 },
    "Hot Mess": { bonding: 1.8, drama: 1.5, communal: 1.4, showmance: 1.2, exercise: 0.5, rivalry: 0.4, sabotage: 0.3, spotlight: 0.2 },
    "Ingenue": { bonding: 2, communal: 1.5, rivalry: 1.4, sabotage: 1.2, showmance: 0.8, spotlight: 0.8, exercise: 0.5, drama: 0.4 },
    "Iron Fist": { sabotage: 2, drama: 2, rivalry: 2, communal: 1.5, spotlight: 1.5, bonding: 0.5, romance: 0.2, showmance: 0.2 },
    "Karen": { drama: 2, rivalry: 1.9, sabotage: 1.5, spotlight: 1.4, exercise: 0.8, bonding: 0.5, romance: 0.2, showmance: 0.1 },
    "Logician": { sabotage: 2, drama: 2, rivalry: 1.5, communal: 0.5, bonding: 0.2 },
    "Lone Wolf": { showmance: 2, romance: 1.8, exercise: 1.6, sabotage: 1.5, rivalry: 1.2, bonding: 0.4, communal: 0.3 },
    "Nerd": { sabotage: 2, spotlight: 1.5, rivalry: 1.5, drama: 1.5, bonding: 0.5, romance: 0.2, showmance: 0.1, exercise: 0 },
    "Paranoid": { sabotage: 2, rivalry: 1.9, drama: 1.8, spotlight: 1.5, exercise: 1.2, communal: 0.5, bonding: 0.4, showmance: 0.3, romance: 0.2 },
    "Romantic": { romance: 2, showmance: 2, bonding: 1.5, drama: 1.5, rivalry: 0.8, exercise: 0.5, sabotage: 0.2 },
    "Rookie": { communal: 2, bonding: 2, romance: 1.5, showmance: 1.5, drama: 1.2, rivalry: 0.5, sabotage: 0.2 },
    "Showman": { spotlight: 2, showmance: 2, drama: 1.8, rivalry: 1.6, romance: 1.5, sabotage: 0.8, bonding: 0.5, exercise: 0.4 },
    "Snob": { spotlight: 2, drama: 1.8, rivalry: 1.7, sabotage: 1.4, exercise: 1.2, romance: 0.5, bonding: 0.4, showmance: 0.3, communal: 0.2 },
    "Sunshine": { bonding: 2, communal: 1.8, spotlight: 1.5, showmance: 1.4, exercise: 1.3, romance: 1.2, rivalry: 0.5, drama: 0.4, sabotage: 0.1 },
    "Sweetheart": { communal: 2, bonding: 2, showmance: 1.8, romance: 1.6, exercise: 0.8, drama: 0.3, rivalry: 0.2, sabotage: 0 },
    "Tank": { exercise: 2, rivalry: 1.5, bonding: 1.3, communal: 1.2, spotlight: 1.1, sabotage: 0.7, showmance: 0.6, romance: 0.5 },
    "Tomboy": { exercise: 1.8, bonding: 1.4, rivalry: 1.4, communal: 1.1, spotlight: 0.9, drama: 0.6, romance: 0.5, showmance: 0.4, sabotage: 0.3 },
    "Wannabe Villain": { drama: 2, sabotage: 1.8, spotlight: 1.7, rivalry: 1.6, showmance: 1.5, romance: 0.8, exercise: 0.7, communal: 0.4, bonding: 0.2 },
};

const GROUP_SIZE_EVENT_WEIGHTS = {
    "Lone Wolf": { 1: 0.45, 2: 0.4, 3: 0.1, 4: 0.04, 5: 0.01 },
    "Strategists": { 1: 1.15, 2: 1.25, 3: 1.00, 4: 0.85, 5: 0.75 },
    "Outcasts": { 1: 1.25, 2: 1.10, 3: 0.85, 4: 0.75, 5: 0.75 },
    "Villains": { 1: 0.85, 2: 1.00, 3: 1.20, 4: 1.25, 5: 0.75 },
    "Social Butterflies": { 1: 0.75, 2: 0.90, 3: 1.05, 4: 1.15, 5: 1.25 },
    "Comp Beasts": { 1: 0.80, 2: 1.20, 3: 1.25, 4: 1.15, 5: 0.90 },
    "Jesters": { 1: 0.75, 2: 0.85, 3: 1.05, 4: 1.15, 5: 1.25 },
    "Homemakers": { 1: 0.90, 2: 1.00, 3: 1.10, 4: 1.25, 5: 1.20 },
    "Superfans": { 1: 1.25, 2: 1.20, 3: 0.95, 4: 0.80, 5: 0.75 },
    "Production Pets": { 1: 1.25, 2: 0.75, 3: 0.90, 4: 1.10, 5: 1.20 },
    "Underdogs": { 1: 1.25, 2: 1.10, 3: 0.85, 4: 0.75, 5: 1.20 },
    "Showmances": { 1: 0.75, 2: 1.25, 3: 0.85, 4: 0.75, 5: 0.75 }
}