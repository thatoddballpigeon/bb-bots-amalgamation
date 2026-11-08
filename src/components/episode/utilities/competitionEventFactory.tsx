import { capitalize, shuffle } from "lodash";
import React from "react";
import { excludeHouseguests, GameState, hgPreferredName, hgPronoun, Houseguest, randomPlayer } from "../../../model";
import { getOrdinalSuffix, is2DArray, randomArrayIndex, randomInt, StatsMap } from "../../../utils";
import { listNames } from "../../../utils/listStrings";
import { HouseEventBox, OverlayBox } from "../../layout/box";
import { Centered, CenteredBold } from "../../layout/centered";
import { getArchetypeClass } from "../../playerPortrait/archetypes";
import { Portraits } from "../../playerPortrait/portraits";
import { CompetitionSceneOptions } from "../scenes/competitionScene";
import { Competition } from "./competitions";
import { pJurorVotesForHero } from "../../../utils/ai/aiApi";

interface CompetitionResult {
    competitor: Houseguest,
    score: number,
    time?: number
}

interface CompetitionScoreOptions {
    timeStart?: number;
}

function applyCompetitorBuffs(rawResults: CompetitionResult[], challenge: Competition) {
    return rawResults.map(r => {
        const buffs = r.competitor.buffs;
        if (!buffs) return r;
        const amount = buffs.exercise?.amount;
        if (!amount) return r;
        r.competitor.buffs.exercise = { amount: 0, episode: 0 };
        let s = r.score;
        if (challenge.scoreType === 'speed') {
            s = Math.round(s * (1 - amount / 100));
        } else {
            s = Math.round(s * (1 + amount / 100));
        }
        return { ...r, score: clampChallengeScore(s, challenge) };
    });
}

export function generateCompetitorGroups(
    competitors: Houseguest[],
    size: number,
): Houseguest[][] | null {
    if (competitors.length % size !== 0) return null;
    const result = [];
    for (let i = 0; i < competitors.length; i += size) result.push(competitors.slice(i, i + size));
    return result;
}

export function generateCompetitionResults(
    minigame: Competition,
    competitors: Houseguest[] | Houseguest[][],
    gameState: GameState,
    options: CompetitionSceneOptions
): [JSX.Element[], Houseguest[]] {
    if (minigame.format === "otev") return otevFormat(minigame, competitors as Houseguest[], gameState, options);
    else if (minigame.format === "stayOrFold") return stayOrFoldFormat(minigame, competitors as Houseguest[], options);
    else if (minigame.format === "wheelOfFirstImpressions") return wheelOfFirstImpressionsFormat(minigame, competitors as Houseguest[], gameState, options);

    return defaultFormat(minigame, competitors, gameState, options);
}

function clampChallengeScore(s: number, ch: Competition) {
    switch (ch.scoreType) {
        case 'speed':    return Math.max(50, Math.min(590, s));
        case 'duration': return Math.max(75, Math.min(8400, s));
        case 'score':    return Math.max(0, Math.min(ch.scoreMax || 20, s));
        default:         return Math.max(0, s);
    }
}

export function generateCompetitionScore(
    player: Houseguest,
    minigame: Competition,
    options?: CompetitionScoreOptions
): number {
    const scoreType = minigame.scoreType;
    if (scoreType === "coin") return Math.random() < 0.5 ? 1 : 0;

    let weightedSum = 0;
    let totalWeight = 0;
    let topKey: string | null = null;
    let topWeight = -Infinity;
    const statsConfig = minigame.stats as Record<keyof StatsMap, number>;
    for (const key in statsConfig) {
        if (Object.prototype.hasOwnProperty.call(statsConfig, key)) {
            const statKey = key as keyof StatsMap;
            const weight = statsConfig[statKey];
            const val = player.stats[statKey] || 0;
            
            weightedSum += val * weight;
            totalWeight += weight;
            
            if (weight > topWeight) { 
                topWeight = weight; 
                topKey = key;
            }
        }
    }

    const stat = totalWeight > 0 ? weightedSum / totalWeight : 5;
    let noiseFactor;
    switch (minigame.difficulty) {
        case "extreme": noiseFactor = 0.35; break;
        case "hard": noiseFactor = 0.25; break;
        case "moderate": noiseFactor = 0.18; break;
        default: noiseFactor = 0.10;
    }
    const physicalDominant = topKey === "physical";

    // PLACE ANY ARCHETYPE BONUS HERE
    if (physicalDominant && getArchetypeClass(player.archetype) === "Comp Beasts") noiseFactor *= 0.9;
    // archetype bonus end

    switch (minigame.scoreType) {
        case 'speed': {
            const base = Math.round(320 - (stat - 1) * 27);
            const noise = Math.round(base * noiseFactor);
            return Math.max(50, Math.min(590, base + randomInt(-noise, noise)));
        }
        case 'duration': {
            // higher!!
            const base = Math.round(stat * 400);
            const noise = Math.round(base * noiseFactor);
            return Math.max(75, Math.min(8400, base + randomInt(-noise, noise)));
        }
        case 'score': {
            const max = minigame.scoreMax || 20;
            const base = Math.round((stat / 10) * max * 0.78 + max * 0.08);
            const noise = Math.max(Math.round(max * 0.25), Math.round(base * noiseFactor));
            return Math.max(0, Math.min(max, base + randomInt(-noise, noise)));
        }
        case 'stayOrFold': {
            const swing = Math.random() < 0.5 ? 1 : 0;
            const num = randomInt(1, 100);
            return swing ? num : -1;
        }
        default: {
            return 10;
        }
    }
}

export function generateCompetitionScores1D(players: Houseguest[], minigame: Competition, options?: CompetitionScoreOptions): CompetitionResult[] {
    return players.map(player => ({ competitor: player, score: generateCompetitionScore(player, minigame, options)}));
}

export function generateCompetitionScores2D(playerGroups: Houseguest[][], minigame: Competition, options?: CompetitionScoreOptions): CompetitionResult[][] {
    return playerGroups.map((group) => generateCompetitionScores1D(group, minigame, options));
}
/*
function calculateSuccessChance(score: number): number {
    const bestPossibleScore = 300; 
    const worstPossibleScore = 600;

    const clampedScore = Math.max(bestPossibleScore, Math.min(worstPossibleScore, score));

    const rawChance = 1 - ((clampedScore - bestPossibleScore) / (worstPossibleScore - bestPossibleScore));

    return 0.20 + (rawChance * 0.65); 
}
*/
export function formatResult(score: number, minigame: Competition) {
    switch (minigame.scoreType) {
        case "speed":
        case "duration": {
            if (score >= 3600) {
                const h = Math.floor(score / 3600);
                const m = Math.floor((score % 3600) / 60);
                const s = score % 60;
                return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
            const m = Math.floor(score / 60);
            const sRaw = score % 60;
            const s = Number.isInteger(sRaw)
                ? String(sRaw).padStart(2, '0')
                : sRaw.toFixed(1).padStart(4, '0');
            return `${String(m).padStart(2, '0')}:${s}`;
        }
        case "score": {
            const max = minigame.scoreMax || 20;
            const pfx = minigame.scorePrefix || '';
            const scoreStr = pfx ? Math.round(score).toLocaleString('en-US') : Math.round(score);
            const maxStr = pfx ? Math.round(max).toLocaleString('en-US') : Math.round(max);
            return `${pfx}${scoreStr} / ${pfx}${maxStr}`;
        }
        case 'stayOrFold': {
            const pfx = score === -1 ? "FOLD" : "STAY:";
            const scoreStr = pfx ? Math.round(score).toLocaleString('en-US') : "";
            return `${pfx} ${scoreStr}`;
        }
        case 'coin':
            return score === 1 ? 'Right' : 'Wrong';
        default:
            return `#${score}`;
    }
}

export function wheelOfFirstImpressionsFormat(
    minigame: Competition,
    competitors: Houseguest[],
    gameState: GameState,
    options: CompetitionSceneOptions
): [JSX.Element[], Houseguest[]] {
    let activeCompetitors = [...competitors];
    let round = 1;
    const voters: Houseguest[] = [];

    const gameplayEvents: JSX.Element[] = [];
    while (activeCompetitors.length > 2) {
        const randomHgs: Houseguest[] = [];
        while (randomHgs.length < 4) randomHgs.push(randomPlayer(activeCompetitors, [...randomHgs, ...voters]));

        const [random, picked1, picked2] = randomHgs;
        const chosen = randomHgs[3] || random;
    
        const loser = Math.random() > pJurorVotesForHero(gameState, chosen, picked1, picked2) ? picked1 : picked2;
        voters.push(loser);

        gameplayEvents.push(
            <div className="is-centered">
                <CenteredBold style={{fontSize: "24px"}}>Round {round}</CenteredBold>
                <OverlayBox className="column">
                    <Portraits centered={true} houseguests={[random]} />
                    <Centered>{random.preferredName()} is selected to pick two cards from the stack.</Centered>
                    <Portraits centered={true} houseguests={[random, picked1, picked2]} />
                    <Centered>After reading both of the cards' descriptions, {random.preferredName()} decides "{picked1.preferredName()} and {picked2.preferredName()}" are the best match.</Centered>
                    {activeCompetitors.length === 3 ? (
                        <>
                            <Portraits centered={true} houseguests={[chosen, "➡️", picked1, picked2]} />
                            <Centered>{chosen.preferredName()} must now choose to eliminate either {picked1.preferredName()} or {picked2.preferredName()}.</Centered>
                        </>
                    ) : (
                        <>
                            <Portraits centered={true} houseguests={[random]} />
                            <Centered>{random.preferredName()} spins the wheel. It lands on...</Centered>
                            <Portraits centered={true} houseguests={[chosen, "➡️", picked1, picked2]} />
                            <Centered>{chosen.preferredName()}, who must now choose to eliminate either {picked1.preferredName()} or {picked2.preferredName()}.</Centered>
                        </>
                    )}
                    <Centered>...</Centered>
                    <Portraits centered={true} houseguests={[chosen]} />
                    <CenteredBold>I choose {loser.preferredName()}.</CenteredBold>
                    <Portraits centered={true} houseguests={[loser]} />
                    <CenteredBold>{loser.preferredName()} has been eliminated from the challenge!</CenteredBold>
                </OverlayBox>
            </div>
        );
        activeCompetitors = activeCompetitors.filter(comp => comp.id !== loser.id);
        round++;
    }

    gameplayEvents.push(
        <Portraits centered={true} houseguests={[...voters]} />,
        <Centered>All eliminated houseguests will now decide who the new Head of Household should be.</Centered>,
    );
    const winners: Houseguest[] = [activeCompetitors[randomArrayIndex(activeCompetitors)]];
    return [gameplayEvents, [...winners]];
}

export function otevFormat(
    minigame: Competition,
    competitors: Houseguest[],
    gameState: GameState,
    options: CompetitionSceneOptions
): [JSX.Element[], Houseguest[]] {
    let activeCompetitors = [...competitors];
    let remainingAllowed = options.doubleVeto ? 2 : 1;
    let round = 1;

    const reciteText = [
        "a previously evicted houseguest",
        "two previously evicted houseguests",
        "a previously played competition",
        "the day for a specific event in the house",
        "a specific event"
    ];
    const gameplayEvents: JSX.Element[] = [];
    while (activeCompetitors.length > remainingAllowed) {
        gameplayEvents.push(
            <CenteredBold style={{fontSize: "24px"}}>Round {round}</CenteredBold>,
            <Portraits centered={true} houseguests={activeCompetitors} />,
            <Centered>The {activeCompetitors.length} houseguests kneel before the OTEV, who is reciting a rhyme involving {reciteText[randomArrayIndex(reciteText)]}.</Centered>,
            <Centered>Afterwards, the OTEV says "Go," and the contestants are off!</Centered>
        );

        let time = 320;
        let placement = 0;
        let stillSearching = applyCompetitorBuffs(activeCompetitors
        .map(c => ({
            competitor: c,
            score: generateCompetitionScore(c, minigame, { timeStart: time })
        })), minigame)
        .sort((a, b) => a.score - b.score);

        const safeContestants = [];
        let finalText: string = "";
        let resultants: Houseguest[] = [];

        while (stillSearching.length > 1) {
            const nextSearchers = [];
            for (let i = 0; i < stillSearching.length; i++) {
                const current = stillSearching[i];
                const competitor = current.competitor;
                const isWrong = Math.random() > 0.5;
                
                const result = formatResult(current.score, minigame);

                let text;

                if (isWrong) {
                    text = `${hgPreferredName(competitor)} comes back to the kneeling spots with the wrong item. ${capitalize(hgPronoun(competitor, 4))} still capable of collecting the right one in time.`;
                    nextSearchers.push(current);
                } else {
                    text = `${hgPreferredName(competitor)} returns to the kneeling spots with the correct item!`
                    safeContestants.push(current);
                }
                if (placement !== activeCompetitors.length - 1)
                    gameplayEvents.push(
                        <HouseEventBox
                            houseguests={[competitor]}
                            category={isWrong ? result : getOrdinalSuffix(++placement)}
                            location={isWrong ? "" : result}
                            text={text}
                        />
                    );
            }

            time += randomInt(50, 150);
            stillSearching = nextSearchers
            .map(c => {
                const newScore = generateCompetitionScore(c.competitor, minigame, { timeStart: time });
                return {
                    competitor: c.competitor,
                    score: newScore
                }
            })
            .sort((a, b) => a.score - b.score);
        }

        let recTime: number;
        const lastUnsafe = stillSearching[0];
        const lastSafe = safeContestants[safeContestants.length - 1];
        if (lastUnsafe) {
            const loser = lastUnsafe.competitor;
            const lN = hgPreferredName(loser);
            resultants.push(loser);
            recTime = lastUnsafe.score;
            finalText = `${lN} is the last to return. ${capitalize(hgPronoun(loser, 0))} will be eliminated from the challenge.`
            if (Math.abs(lastUnsafe.score - lastSafe.score) <= 30) {
                const tiebreaker = lastSafe.competitor;
                const tN = hgPreferredName(tiebreaker);
                resultants.push(tiebreaker);
                finalText = `${lN} and ${tN} both return at around the same time. However, ${tN} showed up with the correct item, meaning ${lN} is eliminated.`
            }
        } else {
            const loser = lastSafe.competitor;
            recTime = lastSafe.score;
            resultants.push(loser);
            finalText = `${hgPreferredName(loser)} is the last to return. ${capitalize(hgPronoun(loser, 0))} will be eliminated from the challenge.`
        }

        const finalLoser = resultants[0];
        gameplayEvents.push(
            <HouseEventBox
                houseguests={resultants}
                category={getOrdinalSuffix(++placement)}
                location={formatResult(recTime, minigame)}
                text={finalText}
            />
        );
        activeCompetitors = activeCompetitors.filter((comp) => comp.id !== finalLoser.id);
        round++;
    }

    const winners: Houseguest[] = activeCompetitors;
    return [gameplayEvents, [...winners]];
}

export function stayOrFoldFormat(
    minigame: Competition,
    competitors: Houseguest[],
    options: CompetitionSceneOptions
): [JSX.Element[], Houseguest[]] {
    const { coHoH = false, doubleVeto = false } = options;
    const remainingAllowed = (coHoH || doubleVeto) ? 2 : 1;
    const condensedFormat = competitors.length > 15;

    const scores = Object.fromEntries(competitors.map(c => [c.id, 0]));

    let activeCompetitors = [...competitors];
    const winners: Houseguest[] = [];
    let round = 1;
    
    const gameplayEvents: JSX.Element[] = [];
    gameplayEvents.push(
        <Centered>The houseguests take their time and look at their surroundings. ...Now, let the rounds begin!</Centered>
    );

    while (activeCompetitors.length > remainingAllowed && winners.length < remainingAllowed) {
        let startingText: string = condensedFormat
            ? "The houseguests decide whether to STAY or FOLD."
            : "Will the houseguests choose to STAY or FOLD as they write in their answers? Let's find out.";

        gameplayEvents.push(
            <CenteredBold style={{fontSize: "24px"}}>Round {round}</CenteredBold>,
            <Centered>{startingText}</Centered>,
        );

        let chosenNumber = randomInt(1, 100);
        let activeResults = applyCompetitorBuffs(activeCompetitors
            .map(c => ({ competitor: c, score: generateCompetitionScore(c, minigame)})), minigame)
        activeResults = shuffle(activeResults);
        for (let i = 0; i < activeResults.length; i++) {
            const swing = Math.random() < 0.25;
            let text: string;
            const result = activeResults[i];
            if (swing) { // for now its 50/50
                text = `${hgPreferredName(result.competitor)} has decided to FOLD.`
                result.score = -1;
            } else {
                text = `${hgPreferredName(result.competitor)} has decided to STAY with a value of ${result.score}.`
            }
            !condensedFormat && gameplayEvents.push(
                <HouseEventBox
                    houseguests={[result.competitor]}
                    text={text}
                />
            );
        }
        
        activeResults = activeResults.filter(c => c.score !== -1)
        .sort((a, b) => Math.abs(a.score - chosenNumber) - Math.abs(b.score - chosenNumber));

        let finalText: string;
        let resultants: Houseguest[] = [];
        if (activeResults.length === 0) {
            finalText = "Nobody earns a point."
        } else if (activeResults.length === 1) {
            const win = activeResults[0].competitor;
            resultants.push(win);
            finalText = `${hgPreferredName(win)} earns a point.`
            scores[win.id]++;
            if (scores[win.id] >= 3 && !winners.includes(win)) winners.push(win);
        } else {
            const win = activeResults[0].competitor;
            const lose = activeResults[activeResults.length - 1].competitor;
            resultants.push(win, lose);
            finalText = `${hgPreferredName(win)} earns a point, while ${hgPreferredName(lose)} is unfortunately eliminated.`;
            scores[win.id]++;
            if (scores[win.id] >= 3 && !winners.includes(win)) winners.push(win);
        }
        gameplayEvents.push(
            <Centered>The correct answer was {chosenNumber}!</Centered>,
            <HouseEventBox houseguests={resultants} text={finalText} />
        );
        if (activeResults.length > 1) activeCompetitors = activeCompetitors.filter((comp) => comp.id !== resultants[1].id);
        round++;
    }

    if (winners.length === remainingAllowed) {
        const hasHave = winners.length > 1 ? "have" : "has";
        const winS = winners.length > 1 ? "" : "s";
        gameplayEvents.push(
            <CenteredBold style={{fontSize: "20px", color: "green"}}>
                {listNames(winners.map((win) => hgPreferredName(win)))} {hasHave} reached 3 points and win{winS} the challenge!
            </CenteredBold>
        );
    } else winners.push(...activeCompetitors);
    
    return [gameplayEvents, [...winners]];
}

export function defaultFormat(
    minigame: Competition,
    competitors: Houseguest[] | Houseguest[][],
    gameState: GameState,
    options: CompetitionSceneOptions
): [JSX.Element[], Houseguest[]] {
    const { coHoH = false, doubleVeto = false, compType } = options;
    const isSpeed = minigame.scoreType === "speed";
    const isGroup = is2DArray(competitors);
    const remainingAllowed = (coHoH || doubleVeto) ? 2 : 1;

    let activeResults: CompetitionResult[] | CompetitionResult[][];
    if (isGroup) {
        const results = generateCompetitionScores2D(competitors as Houseguest[][], minigame);
        const rowSumMap = new Map(results.map(row => [row, row.reduce((sum, item) => sum + item.score, 0)]));
        results.sort((rowA, rowB) => {
            const sumA = rowSumMap.get(applyCompetitorBuffs(rowA, minigame))!;
            const sumB = rowSumMap.get(applyCompetitorBuffs(rowB, minigame))!;
            return sumA - sumB;
        });
        activeResults = results;
    } else {
        const results = applyCompetitorBuffs(generateCompetitionScores1D(competitors as Houseguest[], minigame), minigame);
        results.sort((a, b) => isSpeed ? b.score - a.score : a.score - b.score);
        activeResults = results;
    }

    const length = activeResults.length;
    const gameplayEvents: JSX.Element[] = activeResults
    .slice(0, activeResults.length - remainingAllowed)
    .map((current, i) => {
        const isArray = Array.isArray(current);
        const ordinal = getOrdinalSuffix(activeResults.length - i);

        const houseguests = isArray 
            ? current.map(comp => comp.competitor) 
            : [current.competitor];

        const totalScore = isArray
            ? current.reduce((acc, val) => acc + val.score, 0) / current.length
            : current.score;

        const names = listNames(houseguests.map(hg => hgPreferredName(hg)));
        const text = isArray 
            ? `${names} finish in ${ordinal}.` 
            : `${hgPreferredName(current.competitor)} finishes in ${ordinal}.`;

        return (
            <HouseEventBox
                key={`competition-losers-${i}`}
                houseguests={[...houseguests]}
                category={ordinal}
                location={formatResult(totalScore, minigame)}
                text={text}
            />
        );
    });

    let winners: Houseguest[] = [];
    const firstPlace = activeResults[length - 1];
    const secondPlace = activeResults[length - 2];
    if (Array.isArray(firstPlace)) {
        winners.push(...firstPlace.map(comp => comp.competitor));
    } else {
        if (firstPlace) winners.push(firstPlace.competitor);
        if (secondPlace && (coHoH || doubleVeto) && !Array.isArray(secondPlace)) winners.push(secondPlace.competitor);
    }

    const plural = winners.length > 1 || isGroup;
    const isAre = plural ? "are" : "is";
    const hasHave = plural ? "have" : "has";
    const oneS = (plural || isGroup) ? "s" : "";
    const names = listNames(winners.map((win) => hgPreferredName(win)));
    gameplayEvents.push(
        <HouseEventBox
            key="competition-winners"
            houseguests={[...winners]}
            text={isSpeed ? `${names} ${hasHave} the fastest time!` : `${names} ${isAre} the last one${oneS} standing!`}
        />
    );

    if (Array.isArray(firstPlace) && compType === "HoH" && !coHoH) {
        winners = [firstPlace[randomArrayIndex(firstPlace)].competitor];
    }
    return [gameplayEvents, [...winners]];
}