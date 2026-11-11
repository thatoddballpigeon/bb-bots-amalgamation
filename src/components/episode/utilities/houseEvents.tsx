import {
    excludeHouseguests,
    GameState,
    getHouseguestById,
    hgPreferredName,
    hgPronoun,
    Houseguest,
    nonEvictedHouseguestsSplit,
    randomPlayer,
} from "../../../model";
import React from "react";
import { applyEventPopularity, applyGroupRelationship, applyHouseRelationship, applyRelationship, applyRomance, boldText, validAttractedPair, validFrameTarget, validGroup, validPair, validRelationshipPair, validShowmancePair, validSolo, validTarget, validTrio, validVillain } from "./houseEventFactory";
import { randomArrayIndex, randomInt, updateRomance } from "../../../utils";
import { capitalize } from "lodash";
import { getStrongestAlliance, hasActiveShowmance, showmanceAttractionMatches } from "../../../utils/alliances";
import { listNames } from "../../../utils/listStrings";
import { HouseConfessional } from "./confessionalEventFactory";

export type HouseEvent = { category?: string, portraits?: Houseguest[], locations?: string[], text: JSX.Element, confessional?: HouseConfessional } | null;
export interface HouseEventConfig {
    category: string;
    type?: string;
    timeOfDay?: string[];
    tags?: string[];
    run: (splitIndex: number | null | undefined, gameState: GameState) => HouseEvent;
}

export type LobbyFunction = (n: string, v: string) => string;
export type WhisperAlignFunction = (a: string, b: string, t: string) => string;
export type ConsolidateFunction = (h: string, v: string, t: string) => string;
export type StandFunction = (n: string) => string;
export interface HouseStrategyEventConfig {
    lobby: LobbyFunction[];
    whisper: WhisperAlignFunction[];
    align: WhisperAlignFunction[];
    consolidateEviction: ConsolidateFunction[];
    consolidateVeto: ConsolidateFunction[];
    standWin: StandFunction[];
    standLose: StandFunction[];
}

export const HOUSE_STRATEGY_EVENTS: HouseStrategyEventConfig = {
    lobby: [
        (n, v) => `${n} corners ${v} before the vote and lays it out straight. No drama, no begging. Just the case for why they should still be here.`,
        (n, v) => `${n} catches ${v} in the kitchen and does not let them leave until the whole thing has been said. It takes a while.`,
        (n, v) => `${n} gets to ${v} first, before anyone else has had a chance to get in their ear. That timing is not an accident.`,
        (n, v) => `${n} does not campaign so much as sit down opposite ${v} and ask them, flat out, what it would take.`,
        (n, v) => `${n} loses it slightly halfway through pitching to ${v}. Voice goes up. Hands go everywhere. They pull it back, just about.`,
        (n, v) => `${n} follows ${v} from the garden to the bedroom to the bathroom door, still making their case. ${v} has stopped walking away.`,
        (n, v) => `${n} tells ${v} exactly who has been lying to them and names every single one. Far louder than a campaign needs to be.`,
    ],
    whisper: [
        (a, b, t) => `${a} pulls ${b} aside before the vote and spends ten minutes on ${t}. Specific. Calm. The kind of conversation that does not need to be loud to do damage.`,
        (a, b, t) => `${a} tells ${b} something about ${t} that may or may not be true. It stops mattering once it has gone round twice.`,
        (a, b, t) => `${a} plants one line about ${t} with ${b} and changes the subject immediately. That is the whole trick.`,
        (a, b, t) => `${a} gets ${b} alone and goes through everything ${t} has done, in order, with dates. They have clearly been keeping track.`,
        (a, b, t) => `${a} works ${b} over about ${t} for twenty minutes and does not stop when ${b} tries to end it. The villa can hear the tone if not the words.`,
        (a, b, t) => `${a} tells ${b} that ${t} has been talking about them. ${b} wants names. ${a} gives them, happily.`,
    ],
    align: [
        (a, b, t) => `${a} and ${b} get five minutes alone before the vote and use every second of it. ${t}'s name comes up. Both land on the same answer.`,
        (a, b, t) => `${a} says one name. ${b} nods. That is the entire conversation and it is completely binding.`,
        (a, b, t) => `${a} and ${b} run through every way this week goes wrong. Every version ends with ${t} leaving.`,
        (a, b, t) => `${a} and ${b} shake on ${t} out by the pool where anyone could see them. Neither cares who does.`,
        (a, b, t) => `${a} and ${b} argue about it properly first, then land on ${t} anyway. The argument was the point.`,
    ],
    consolidateEviction: [
        (h, v, t) => `${h} gets ${v} alone before the vote. Friendly, relaxed, totally normal. Also a very clear message about ${t}.`,
        (h, v, t) => `${h} does not ask ${v} for their vote. ${h} tells ${v} how the week is going, and ${t} is not in it.`,
        (h, v, t) => `${h} reminds ${v}, gently, who put them in this position and who did not. ${t} comes up once. Once is enough.`,
        (h, v, t) => `${h} corners ${v} in the Head Hasbeen room and shuts the door. Whatever gets said about ${t}, ${v} comes out very sure.`,
        (h, v, t) => `${h} spells it out to ${v} with no room left to move. It stops sounding like a conversation about halfway through.`,
    ],
    consolidateVeto: [
        (s, v, t) => `${s} catches up to ${v} alone before the Veto ceremony. Friendly, relaxed, totally normal. Also a very clear message about ${t}.`,
        (s, v, t) => `${s} does not ask ${v} for their decision. ${s} tells ${v} how the week is going, and how ${t} should stay in it.`,
        (s, v, t) => `${s} is practically begging ${v} with no room left to move. It stops sounding like a conversation about halfway through.`,
    ],
    standWin: [
        n => `${n} speaks up in the villa before the vote. Not begging. Not performing. Just direct. The kind of moment that clips well.`,
        n => `${n} stands up and says the part everyone has been avoiding all week. Nobody interrupts. Nobody can.`,
        n => `${n} calls the whole villa to the lounge and makes their case to every person at once. A hell of a swing, and it lands.`,
        n => `${n} names names in front of the entire house and does not soften one word of it. Two people cannot look up.`,
    ],
    standLose: [
        n => `${n} tries to say their piece before the vote and it does not land the way they needed it to. The room goes politely quiet.`,
        n => `${n} gets halfway through and realises nobody is with them. They finish anyway. It is worse for finishing.`,
        n => `${n} goes far too big, far too early, and loses the room inside a minute. Somebody actually walks out.`,
        n => `${n} shouts down the one person still willing to defend them. That is the moment the week ends.`,
    ],
};

export const HOUSE_EVENTS: HouseEventConfig[] = [
    // BONDING
    // solo
    {
        category: "bonding", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3); applyHouseRelationship(splitIndex, gameState, a, 50);
        return { category: "bonding", portraits: [a], locations: ["Backyard"], text: <>{boldText(a.preferredName())} takes {a.pronoun()} off to the pool with a notebook and sits, alone, with {a.pronoun(1)} own thoughts for once. Maybe everyone will turn out better for it in the long-term...</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3); applyHouseRelationship(splitIndex, gameState, a, 50);
        return { category: "bonding", portraits: [a], locations: ["Living Room"], text: <>{boldText(a.preferredName())} is a bit different this week, and for the better, too. {a.pronoun(4)} acting a lot more chill lately, making the house feel just that little bit more calm.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyHouseRelationship(splitIndex, gameState, a, 20); applyHouseRelationship(splitIndex, gameState, a, 10);
        return { category: "bonding", portraits: [a], locations: ["Backyard"], text: <>{boldText(a.preferredName())} is found painstakingly washing the house's laundry by hand after the washing machine breaks down. {a.preferredName()} doesn't complain once throughout the whole ordeal, and the rest of the house takes grateful notice of this.</> }; },
    },
    {
        category: "bonding", tags: ["late night"], timeOfDay: ["night"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyHouseRelationship(splitIndex, gameState, a, 30); applyHouseRelationship(splitIndex, gameState, a, 10);
        const text = gameState.episode > 1 ? " or so" : "";
        return { category: "bonding", portraits: [a], locations: ["Living Room", "Bedroom"], text: <>{boldText(a.preferredName())} has been staying up with whoever is having the worst night for the past week{text}. The houseguests are noticing these kind gestures...</> }; },
    },
    {
        category: "bonding", timeOfDay: ["morning"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyHouseRelationship(splitIndex, gameState, a, 20); applyHouseRelationship(splitIndex, gameState, a, 10);
        return { category: "bonding", portraits: [a], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} learns every single person's breakfast preferences and starts making them. As expected, the houseguests react positively to this.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyHouseRelationship(splitIndex, gameState, a, 10); applyHouseRelationship(splitIndex, gameState, a, 10);
        return { category: "bonding", portraits: [a], locations: ["Living Room"], text: <>{boldText(a.preferredName())} takes the blame for a broken glass {a.pronoun(0)} didn't break. Though the Big Brother house doesn't terribly care, no more arguments come out of it.</> }; },
    },
    // solo + group
    {
        category: "bonding", timeOfDay: ["morning"], run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const aN = a.preferredName(); const ok = a.stats.temper >= 5; const text = ok ? `yet everyone's already in a better mood` : `much to the detriment and disappointment of ${aN}`
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, ok ? 2 : -2); others.forEach(x => { applyRelationship(gameState, a, x, ok ? 10 : -10); applyEventPopularity(x, ok ? 1 : -1); });
        return { category: "bonding", portraits: [a, ...others], locations: ["Living Room", "Backyard"], text: <>{boldText(aN)} organizes a morning workout and gets a couple of houseguests to show up. Fifteen minutes in and no one is focused on finishing the circuit, {text}.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, 3); others.forEach(x => { applyRelationship(gameState, a, x, 10); applyEventPopularity(x, 1); });
        const aN = a.preferredName();
        return { category: "bonding", portraits: [a, ...others], locations: ["Living Room", "Backyard"], text: <>It's {boldText(aN)}'s birthday, and a couple of houseguests pull something together for {a.pronoun(3)}. Good food, a better cake, and some signed cards later, {boldText(aN)} is practically filled with tears of joy.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, 2); others.forEach(x => { applyRelationship(gameState, a, x, 10); applyEventPopularity(x, 1); });
        return { category: "bonding", portraits: [a, ...others], locations: ["Lounge"], text: <>{boldText(a.preferredName())} sets up a film night in the lounge and gets some of the houseguests to show up. One by one, people start to leave before the end of the movie. The conversations they had were better, anyway.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, 3); others.forEach(x => applyRelationship(gameState, a, x, 10));
        return { category: "bonding", portraits: [a, ...others], locations: ["Living Room"], text: <>Several houseguests pull together a surprise for {boldText(a.preferredName())}. It's disorganized, embarrassing, hectic, and {a.preferredName()} is completely overwhelmed. ...What more could {a.pronoun(0)} possibly ask for?!</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); const ok = ((a.stats.temper + others.reduce((a, b) => a + b.stats.temper, 0)) / others.length + 1 >= 4); applyEventPopularity(a, ok ? 20 : -20); others.forEach(x => { applyRelationship(gameState, a, x, ok ? 10 : -10); applyEventPopularity(x, ok ? 10 : -10); });
        const aN = a.preferredName(); const text = ok ? `and soon everyone is laughing so hard that the game's completely on hold` : `and now ${aN}'s kind of pissed. Pissed enough to slam down on the table and leave.`;
        return { category: "bonding", portraits: [a, ...others], locations: ["Living Room"], text: <>{boldText(aN)} is teaching a few of the other houseguests a game from {a.hometown || `${a.pronoun(1)} hometown`}. Half the table cheats, {text}.</> }; },
    },
    {
        category: "bonding", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, 3); others.forEach(x => applyRelationship(gameState, a, x, 10));
        return { category: "bonding", portraits: [a, ...others], locations: ["Living Room"], text: <>{boldText(a.preferredName())} announces it is dad-joke night and refuses to back down. By the end of dinner the entire villa is groaning at the same rhythm. Everyone loves it. {a.preferredName()} is unbearable but adored.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, 2); others.forEach(x => { applyEventPopularity(x, 1); applyRelationship(gameState, a, x, 10); });
        return { category: "bonding", portraits: [a, ...others], locations: ["Living Room"], text: <>{boldText(a.preferredName())} declares a no phones hour and drags out an old board game that came from somewhere in the house. Surprisingly - or perhaps not - everyone's into it.</> }; },
    },
    // pair
    {
        category: "bonding", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} end up in the kitchen at 2 AM arguing over who used the last of the milk. They eventually realize how stupid the argument is, and laugh it off while having a <i>real</i> conversation.</> }; },
    },
    {
        category: "bonding", tags: ["late night"], timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} are still out in the backyard when the 3 AM alarm goes off and they stay put regardless. They both seem to have bonded well.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} end up sharing the same sunbed together for several hours straight. Cute!</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Bedroom"], text: <>{boldText(a.preferredName())} notices {boldText(b.preferredName())} hasn't eaten properly all day, leaving a plate outside their door without a word. {a.preferredName()} doesn't know it, but {b.preferredName()} truly appreciates the motion.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1); // make THIS one have the 2 selected people LOCK TF IN on someone, like actually fr.
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Backyard", "Bedroom"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} figure out they have the exact same read on someone in this villa. Once it clicks, something between them shifts. The alliance is unofficial. Both know exactly what it is.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Bedroom"], text: <>{boldText(a.preferredName())} folds {boldText(b.preferredName())}'s clean laundry and leaves it on their bed. It's one of those small gestures that ends up going a long way.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Backyard", "Bedroom"], text: <>A drinking game in the house gets out of hand fast. {boldText(a.preferredName())} and {boldText(b.preferredName())} end up completely hysterical about something nobody else understands.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} had been acting pretty cautious of each other for days... before just now learning that they were both involved in a shared part of history prior. Their sentiments towards one another change.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Living Room"], text: <>{boldText(b.preferredName())} had a rough night and doesn't hide it very well. {boldText(a.preferredName())} happens to be the one who sits with them.</> }; },
    },
    {
        category: "bonding", timeOfDay: ["sunrise"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} fall into a workout routine at 6 in the morning together. They bond over that before long, somehow.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} cooks dinner for the entire house, while {boldText(b.preferredName())} tasks themselves with dishwashing duty long after everyone has eaten. The two of them manage to strike up pretty good conversation during the entire experience.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Bathroom"], text: <>{boldText(a.preferredName())} catches {boldText(b.preferredName())} crying about home in the bathroom. {capitalize(a.pronoun(0))} sits on the floor with {hgPronoun(b, 3)} for a while, and when they're done, they come out feeling a little closer.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} discover they grew up forty miles apart and start swapping local references nobody else gets. The whole villa is excluded for an hour and neither of them notices.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} braids {boldText(b.preferredName())}'s hair on the backyard patio for forty-five minutes while they both converse about passing topics.</> }; },
    },
    {
        category: "bonding", timeOfDay: ["morning"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} take the same morning swim three days in a row. Nobody coordinated it. By the third day they have inside jokes the rest of the villa is not invited to.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Bedroom"], text: <>{boldText(b.preferredName())} runs out of medication that Big Brother is slow to replace. {boldText(a.preferredName())} stays up with them through the worst of it. The villa learns about it from someone else weeks later.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} get put on dish duty together and end up choreographing a routine to a song nobody else likes. The clip is the first thing they show on the recap.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} stays back to keep {boldText(b.preferredName())} company since they weren't feeling so hot. They eat some leftovers in the kitchen and end up laughing a lot more than the others.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(b, 3);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Bedroom", "Backyard"], text: <>{boldText(b.preferredName())} bombs a confessional and {boldText(a.preferredName())} catches them spiralling about it after. Talks them through it without making it a moment.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} end up on the backyard balcony talking about nothing special in particular. That didn't include the game itself, mind.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Bedroom", "Backyard"], text: <>{boldText(a.preferredName())} spends twenty minutes teaching {boldText(b.preferredName())} a cool trick that {boldText(b.preferredName())} botches, before getting it on the fourth try. {boldText(a.preferredName())} is more satisfied with it than {boldText(b.preferredName())} is.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Bedroom", "Backyard"], text: <> {boldText(b.preferredName())} is visibly spiraling before a confessional and {boldText(a.preferredName())} sits with them until the nerves pass, saying almost nothing the whole time.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Bedroom", "Backyard"], text: <> {boldText(a.preferredName())} and {boldText(b.preferredName())} could not be more different on paper and somehow spend two hours deep in a conversation about a show they both apparently love. Neither of them saw that coming.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} get put on dish duty together as a punishment and somehow turn it into the best two hours either of them has had in here.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Bathroom"], text: <>{boldText(b.preferredName())} gets bad news from home. {boldText(a.preferredName())} sits with them on the bathroom floor for an hour and does not try to fix anything. That is the right call.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Backyard", "Bedroom"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} discover they grew up twenty minutes apart, and bond about it.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 2);
        return { category: "bonding", portraits: [...p], locations: ["Bedroom"], text: <>{boldText(b.preferredName())} has been spiralling for days about something back home. {boldText(a.preferredName())} talks them all the way down. {b.preferredName()} sleeps properly for the first time in a week.</> }; },
    },
    {    
        category: "bonding", run: (splitIndex, gameState) => { if (gameState.episode < 2) return null; const p = validPair(splitIndex, gameState); if (!p) return null; const[a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], text: <>{boldText(a.preferredName())} is on a panic spiral about the vote and {boldText(b.preferredName())} talks them down without ever making it about themselves. Just listens until the spiral runs out. Nobody else sees it. Both of them remember.</> }; },
    },
    // pair (relationship)
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, true, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20);
        return { category: "bonding", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} both reach for the last slice of pizza, freeze, then slooooowly split the thing in half. A couple of onlooking houseguests find the whole situation pretty funny.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, true, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Living Room", "Kitchen", "Backyard"], text: <>When a group of houseguests turn on {boldText(b.preferredName())}, {boldText(a.preferredName())} shuts it down fast. The feeling of {boldText(a.preferredName())} having {hgPronoun(b, 1)} back was a nice one, indeed.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, true, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "bonding", portraits: [...p], locations: ["Living Room"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} end up at the fire pit after the villa clears out. Nobody planned it. By the time they go back inside they are the most solid pair in this building.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, true, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 30); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "bonding", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} slip away to the backyard and come back twenty minutes later, both having made and sealed a pinky promise. What kind? Who knows!</> }; },
    },
    // trio
    {
        category: "bonding", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; t.forEach(x => applyEventPopularity(x, 2)); applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10);
        return { category: "bonding", portraits: [...t], locations: ["Lounge"], text: <>{boldText(a.preferredName())}, {boldText(b.preferredName())} and {boldText(c.preferredName())} build a fort in the lounge out of every blanket they can find. It manages to stay up, despite Big Brother's efforts.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyGroupRelationship(gameState, t, 10);
        return { category: "bonding", portraits: [...t], locations: ["Kitchen"], text: <>{boldText(a.preferredName())}, {boldText(b.preferredName())} and {boldText(c.preferredName())} take over the house speaker and get some karaoke going. Not long after, the entire house is getting groovy in the kitchen.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; t.forEach(x=>applyEventPopularity(x, 1)); applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10);
        return { category: "bonding", portraits: [...t], text: <>{boldText(a.preferredName())}, {boldText(b.preferredName())}, and {boldText(c.preferredName())} decide they can cook. They cannot cook. The smoke alarm goes off twice. The pasta is inedible. Nobody cares. Best hour of the week.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; t.forEach(x=>applyEventPopularity(x, 2)); applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10);
        return { category: "bonding", portraits: [...t], text: <>{boldText(a.preferredName())}, {boldText(b.preferredName())}, and {boldText(c.preferredName())} hijack the card table. It gets competitive. Then it gets messy. Then it gets genuinely fun. Two hours disappear. Nobody's mad about it.</>}; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; t.forEach(x=>applyEventPopularity(x, 1)); applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10);
        return { category: "bonding", portraits: [...t], text: <>{boldText(a.preferredName())}, ${boldText(b.preferredName())}, and {boldText(c.preferredName())} take over the speaker. Three songs in, the entire villa is dancing in the kitchen. Nobody planned this. It is the best the villa has felt all week.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10); t.forEach(x => applyEventPopularity(x, 1));
        return { category: "bonding", portraits: [...t], text: <>{boldText(a.preferredName())}, {boldText(b.preferredName())}, and {boldText(c.preferredName())} raid the kitchen at 3am for cereal and get caught red handed by the one camera nobody remembers is there. All three go down laughing.</> }; },
    },
    // group
    {
        category: "bonding", tags: ["late night"], timeOfDay: ["night"], run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 1)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "bonding", portraits: [...g], locations: ["Backyard"], text: <>{boldText(bold.join(', '))} and {boldText(last!)} spend the night naming every constellation they can find.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "bonding", portraits: [...g], text: <>{boldText(bold.join(', '))} and {boldText(last!)} end up in the hot tub for a group session nobody announced. No strategy, no campaigning. Just the villa being people for an hour. All of it airs.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "bonding", portraits: [...g], text: <>{boldText(bold.join(', '))} and {last} build a fort out of every cushion in the villa. It collapses twice. They rebuild it twice. Big Brother gives up asking them to stop.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "bonding", portraits: [...g], text: <>{boldText(bold.join(', '))} and {last} throw a birthday thing for someone whose birthday it is not, just to have something to celebrate. The cake is terrible. Everyone has seconds.</> }; },
    },
    {
        category: "bonding", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 1)); applyGroupRelationship(gameState, g, 20);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "bonding", portraits: [...g], text: <>{boldText(bold.join(', '))} and {last} make a pact that whatever happens at the vote, none of it follows them out the door. They actually mean it when they say it.</> }; },

    },
    // COMMUNAL
    // positive
    // solo
    {
        category: "communal", type: "positive", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 2);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} spends the afternoon cleaning out the pool. Nobody asked. By evening it is clear enough to see the bottom and the whole villa ends up out there.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 3);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} puts together a charcuterie board and sets up a charades game in the living room. The whole villa shows up. Nobody wants it to end.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 1);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} goes room to room with baking soda and deodorises the entire villa. Nobody asked for it. Everyone notices immediately. The whole place feels different.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 2);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} does a full round of laundry for everyone before anyone is up. Clothes folded, sorted by person, left on their beds. Nobody says much but the mood in the villa is noticeably lighter.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 1);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} quietly clears the bathroom drain that nobody wanted to deal with, cleans up without mentioning it, and goes back to what they were doing. The house notices anyway.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 2);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} restocks the fridge and organises the kitchen before anyone else is awake. By the time the house is up, there is coffee made and everything is in order. It sets the whole day.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 3);
        return { category: "communal", portraits: [a], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} turns brunch into a full drag show. Wigs appear out of nowhere, someone lip-syncs on the kitchen island, and the whole villa is screaming by the second number. Big Brother keeps every second of it.</> }; },
    },
    {
        category: "communal", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id!==a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a,3);
        return { category: "communal", portraits: [a], locations: ["Living Room"], text: <>{boldText(a.preferredName())} throws a full prom night with streamers, a disco ball, and a hand-drawn photo backdrop. Someone even gets crowned Big Brother Royalty with a paper tiara. It was an all-around blast!</> }; },
    },
    {
        category: "communal", type: "positive", timeOfDay: ["sunrise"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3); applyHouseRelationship(splitIndex, gameState, a, 10);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} deep cleans the kitchen at 6am because they could not sleep and could not look at it any longer. The villa wakes up to a different room.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 2); applyHouseRelationship(splitIndex, gameState, a, 50);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} works out the washing machine actually has a second setting. The villa reacts like a discovery has been made.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 2);
        return { category: "communal", portraits: [a], locations: ["Backyard"], text: <>{boldText(a.preferredName())} runs a full spa day on the terrace: cucumber eyes, clay masks, the works. The whole villa lies out in matching robes looking like a cult, and honestly nobody is complaining.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 3);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} hosts a full villa awards ceremony with tinfoil trophies and categories like Most Likely To Cry On Camera. Every acceptance speech runs too long. The house eats it up.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.stats.charisma >= 6); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.slice(0, Math.min(rest.length, 5)).forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 3);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} teaches the whole villa a viral dance and drills it until everyone actually nails it. The group video goes up and it does numbers. For once the comments are nice.</> }; },
    },
    {
        category: "communal", type: "positive", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, 10)); applyEventPopularity(a, 2);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} tips half a bottle of bubble bath into the pool jets and turns the afternoon into an accidental foam party. The pool is unusable for a day. The house decides it was worth it.</> }; },
    },
    // pair
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} take over the cooking for the whole week without being asked. It is not restaurant standard. Nobody goes hungry.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} rearrange the whole bedroom so the person who cannot sleep is away from the door. Took them an hour. They tell nobody.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 2); applyEventPopularity(b, 1);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} offers to cut hair and {boldText(b.preferredName())} is the first to sit down. Some houseguests gather to watch and by <i>god</i> is it a good cut</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; const _flavs = ['red velvet','chocolate','strawberry','fruit']; const _flav = _flavs[Math.floor(Math.random()*_flavs.length)]; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 3); applyEventPopularity(b, 2);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} bakes a ${_flav} cake for ${boldText(b.preferredName())}'s birthday. Properly decorated, candles and all. The villa gathers. ${b.preferredName()} was not expecting it.</> }; },
    },
    // trio
    {
        category: "communal", tags: ["kitchen"], type: "positive", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; t.forEach(x => applyEventPopularity(x, 1)); applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10);
        return { category: "communal", portraits: [...t], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} starts cleaning the kitchen, with {boldText(b.preferredName())} and {boldText(c.preferredName())} joining not long after. It smells better already.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyEventPopularity(a, 2); applyEventPopularity(b, 1); applyEventPopularity(c, 1);
        return { category: "communal", portraits: [...t], text: <>{boldText(a.preferredName())} mops every floor in the villa. ${boldText(b.preferredName())} and ${boldText(c.preferredName())} step in to help without being asked. The three of them do not say much but the house feels different after.</> }; },
    },
    {
        category: "communal", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10); t.forEach(x => applyEventPopularity(x, 2));
        return { category: "communal", portraits: [...t], text: <>{boldText(a.preferredName())}, ${boldText(b.preferredName())}, and {boldText(c.preferredName())} hold a midnight séance with a wine-glass ouija board. Something knocks a candle over at the worst possible moment and all three scream loud enough to wake the villa. Nobody sleeps. Everybody bonds.</> }; },
    },
    {
        category: "communal", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, c, 10); applyRelationship(gameState, b, c, 10); t.forEach(x => applyEventPopularity(x, 1));
        return { category: "communal", portraits: [...t], text: <>{boldText(a.preferredName())}, {boldText(b.preferredName())}, and {boldText(c.preferredName())} build a blanket fort in the living room and refuse to sleep in their actual beds. Truth or dare runs until 4 AM. A couple of secrets come out that probably should not have.</> }; },
    },
    // group
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "communal", portraits: [...g], text: <>{bold.join(', ')} and {last} build a chore rota and pin it to the fridge. They're hoping it manages to stay up for long enough, but in the Big Brother house, who really knows.</> }; },
    },
    {
        category: "communal", type: "positive", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 1)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "communal", portraits: [...g], text: <>{bold.join(', ')} and {last} strip the beds and get every sheet in the villa washed in one afternoon. Grim work. They put music on and get through it.</> }; },
    },
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        const text = gameState.houseguests.length > 30 ? "It's a valiant effort, but with the size of the house as is..." : "It works, and just about everyone appreciates it.";
        return { category: "communal", portraits: [...g], text: <>{bold.join(', ')} and {last} try to ration the last of the food so it stretches until the storage room is restocked with the stuff. {text}</> }; },
    },

    // negative
    // solo
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const fn = a.preferredName(); const _pre = fn.slice(0,3); const _puns = [`${_pre}ius`, `${_pre}uine`, `${_pre}sa Member`, `${_pre}Slays`, `${_pre}Gate`]; const _punList = _puns.slice(0,3).map(p=>`"${p}"`).join(', '); const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, -10)); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [a], locations: ["Living Room"], text: <>{boldText(a.preferredName())} gifts the house custom shirts, which have {a.pronoun(1)} name followed by a "pun" on it, including {_punList}. The house reluctantly accepts these shirts to be nice, but there was no way in hell they were getting any extra.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, -10)); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [a], locations: ["Kitchen"], text: <>Everything looks better with edible glitter, thought a curious {boldText(a.preferredName())} as they tip it onto everyone's food and drink without permission. Reactions... were not very pleasant, to say the least.</> }; },
    },
    {
        category: "communal", type: "negative", timeOfDay: ["night"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, -10)); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [a], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} remembers reading one article about microplastics and bins every plastic bottle, container, and utensil in the villa overnight. Nobody can find a cup. Nobody can find their leftovers. {a.preferredName()} calls it a favour and will not let it go.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, -10)); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [a], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} replaces every snack in the villa with seed crackers and green powder and announces the house is going clean whether it likes it or not. The house does not like it. The chocolate was hidden. It has been found.</> }; },
    },
    {
        category: "communal", type: "negative", timeOfDay: ["breakfast"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const tgt = validTarget(splitIndex, gameState, a); if (!tgt) return null; applyRelationship(gameState, a, tgt, -10); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [a, tgt], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} corners {boldText(tgt.preferredName())} at breakfast to explain, again, exactly how many microplastics are in the villa tap water. {tgt.preferredName()} was just trying to make tea. The lecture outlasts the meal and most of the morning.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2); applyHouseRelationship(splitIndex, gameState, a, -10);
        return { category: "communal", portraits: [a], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} has not done a single dish and actively leaves whenever the sink fills up. This displeases just about everyone.</> }; },
    },
    {
        category: "communal", type: "negative", timeOfDay: ["breakfast"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyHouseRelationship(splitIndex, gameState, a, -10);
        return { category: "communal", portraits: [a], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} decides to make breakfast for everyone in the house. It tasted horrible, but, well, it's the thought that counts...?</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -3); applyHouseRelationship(splitIndex, gameState, a, -10);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} eats the last of the shared snacks and puts the empty box back in the cupboard. Someone finds it. Word travels fast.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.forEach(c => applyRelationship(gameState, a, c, -10)); applyEventPopularity(a, -3);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} mixes bleach with a second cleaning product while doing the floors. The smell reaches every room within minutes. Big Brother evacuates the whole villa to the garden for two hours while it airs out.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const rest = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id); rest.slice(0, 3).forEach(c => applyRelationship(gameState, a, c, -10)); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [a], text: <>{boldText(a.preferredName())} cleans the bathroom and the hot water runs out for the rest of the house. They were in there thirty minutes. The villa decides it was two hours. The correction goes unheard.</> }; },
    },
    // pair
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; applyRelationship(gameState, v, tgt, -10);
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        return { category: "communal", portraits: [v, tgt], locations: ["Kitchen"], text: <>{boldText(vN)} thought it would be really funny if {v.pronoun(0)} poured a bit of lemonade into {boldText(tN)}'s cereal while {tgt.pronoun(4)} not looking. {tN} ends up thinking someone genuinely pissed in {tgt.pronoun(1)} cereal.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const tgt = validTarget(splitIndex, gameState, a); if (!tgt) return null; applyRelationship(gameState, a, tgt, -10); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [a, tgt], locations: ["Living Room"], text: <>{boldText(a.preferredName())} goes out of {a.pronoun(1)} way to help around the house all day. {boldText(tgt.preferredName())}, meanwhile, pulls someone aside and mentions how performative the whole act feels. Word eventually reaches {a.preferredName()}.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} have a lengthy argument about whose turn it is to haul the trash over to the storage room. By the time the arguing's come to pass, the garbage bags are still there.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(b, -2);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} finds ${boldText(b.preferredName())} hiding a private stash of the good coffee under their bed. It comes up at breakfast. In front of everyone.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} runs a full load of laundry for the house. ${boldText(b.preferredName())}'s whites come out pink. The apology is sincere. The clothes are not recoverable.</> }; },
    },
    // pair (relationship)
    {
        category: "communal", type: "negative", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} cooks up a scrumptious meal for all to enjoy. Most eat it without complaint... with the sole exception of {b.preferredName()}, claiming to the entire table that {a.preferredName()} was, quote unquote, "pushing an agenda" halfway through dinner.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -2);
        return { category: "communal", portraits: [...p], text: <>{boldText(a.preferredName())} works their way through every room in the Big Brother house with a cloth. Most people appreciate it... everyone but {boldText(b.preferredName())}, who notes and whispers to someone it looked a lot more like eavesdropping from conversation to conversation.</> }; },
    },
    {
        category: "communal", type: "negative", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -3);
        const aN = a.preferredName(), bN = b.preferredName();
        return { category: "communal", portraits: [...p], text: <>{boldText(aN)} serves dinner and tells the Big Brother house they cooked it from scratch. {boldText(bN)} then turns to find some empty TV dinner tupperware in the bin and holds it up. {aN} has zero comment.</> }; },
    },
    {
        // note to self: give different negative reactions based on personality/archetype? maybe stats too
        category: "communal", type: "negative", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -2);
        const aN = a.preferredName(), bN = b.preferredName();
        return { category: "communal", portraits: [...p], text: <>{boldText(aN)} cooks dinner for the house. It tasted horrendous, but nobody was willing to say that out loud. {boldText(bN)} <i>was</i> certainly willing to make a face, however. The leftovers are secretly tossed in the bin when {aN} isn't looking.</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(b, -2);
        const aN = a.preferredName(), bN = b.preferredName();
        return { category: "communal", portraits: [...p], text: <>{boldText(aN)} gives {boldText(bN)} a haircut they asked for. The result is so horrible that {bN} might as well have requested to go bald entirely.</> }; },
    },
    // trio
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 3); if (!a) return null; const _pPool = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id).sort((x, y) => x.relationshipWith(gameState, a) - y.relationshipWith(gameState, a)); if (_pPool.length < 2) return null; const b = _pPool[0]; const c = _pPool[1]; applyRelationship(gameState, a, b, -10); applyRelationship(gameState, a, c, -10); applyEventPopularity(a, -1);
        const aN = a.preferredName(), bN = b.preferredName(), cN = c.preferredName();
        return { category: "communal", portraits: [a, b, c], text: <>{boldText(aN)} offers to reorganise the shared pantry and then throws out ingredients that {boldText(bN)} and {boldText(cN)} were saving. Not on purpose. The explanation does not help.</> }; },
    },
    // group
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -2)); applyGroupRelationship(gameState, g, -10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "communal", portraits: [...g], locations: ["Kitchen"], text: <>{bold.join(', ')} and {last} decide, separately, that the mess in the kitchen is someone else's problem. This totally won't affect the cleanliness of the Big Brother house in any way.</> }; },
    },

    // CONFESSIONAL
    // positive
    // solo
    {
        category: "confessional", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>{boldText(a.preferredName())} says something in a confessional that nobody expected and it immediately becomes the quote of the week. Merch edits are already circulating. The editors make sure it opens the next episode.</> }; },
    },
    {
        category: "confessional", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>Big Brother accidentally airs a longer cut of ${boldText(a.preferredName())}'s confessional than intended. What was left in changes everything. ${a.preferredName()}'s popularity spikes because of what they said when they thought the cameras were off.</> }; },
    },
    {
        category: "confessional", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 5);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>{boldText(a.preferredName())} talks about losing someone close to them in a confessional that Big Brother almost cuts. They keep it. The audience response is overwhelming. The fan account count doubles overnight.</> }; },
    },
    {
        category: "confessional", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>{boldText(a.preferredName())} delivers a confessional monologue about their game theory that fans immediately dub the "${a.preferredName()} Doctrine." The think pieces are out by morning.</> }; },
    },
    {
        category: "confessional", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>{boldText(a.preferredName())}'s confessional this week makes the official highlights. They were just being honest. That is apparently what does it. The quote is everywhere before the episode is over.</> }; },
    },
    {
        category: "confessional", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>{boldText(a.preferredName())} sits down for a producer interview and tells a rather private story {a.pronoun(0)} wouldn't have otherwise. Unbeknownst to them, it was screenshotted, shared, and soon {a.preferredName()}'s fanbase shoots up.</> }; },
    },
    {
        category: "confessional", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.stats.charisma >= 7); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>{boldText(a.preferredName())} sits down for a producer interview and tells a story they have never told publicly. The kind that gets screenshotted and shared in silence. Fanbase goes up overnight.</> }; },
    },
    // pair
    {
        category: "confessional", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "confessional", portraits: [...p], locations: ["Diary Room"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} are asked the same question in back-to-back confessionals. The answers directly contradict each other. Producers put them side by side and air them together.</> }; },
    },
    // negative
    // solo
    {
        category: "confessional", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -3);
        return { category: "confessional", portraits: [a], locations: ["Diary Room"], text: <>{boldText(a.preferredName())} mouths off at a producer during a confessional, pauses, then looks directly into the camera and says it better not air. It airs. The clip is up before the episode is even over.</> }; },
    },
    // pair
    {
        category: "confessional", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyEventPopularity(a, -2);
        return { category: "confessional", portraits: [...p], locations: ["Diary Room"], text: <>{boldText(a.preferredName())}'s confessional contains a comment about {boldText(b.preferredName())} that sounds like a compliment until you actually listen to it. Big Brother serves it exactly as delivered.</> }; },
    },
    // pair (attracted)
    {
        category: "confessional", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "confessional", portraits: [...p], locations: ["Diary Room"], text: <>Something {boldText(a.preferredName())} says about {boldText(b.preferredName())} gets back to the audience out of context and ends up changing how they see the two of them.</> }; },
    },

    // DRAMA
    // solo
    {
        category: "drama", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2);
        return { category: "drama", portraits: [a], text: <>{boldText(a.preferredName())} says something in the group that nobody asked for. The room goes quiet for four full seconds. Someone changes the subject. It still ends up in the recap.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2);
        return { category: "drama", portraits: [a], text: <>{boldText(a.preferredName())} has a moment in the villa that the cameras catch fully. The edit is careful. The comment section is not.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2);
        return { category: "drama", portraits: [a], text: <>{boldText(a.preferredName())} completely loses it in the backyard. Fully, dramatically, loudly. The villa clusters around them. Half of them are not helping.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -3);
        return { category: "drama", portraits: [a], locations: ["Bathroom"], text: <>{boldText(a.preferredName())} clogs the only working toilet for the second time this week. The villa finds out before they can clean it up. The villa meeting that follows is not gentle.</> }; },
    },
    {
        category: "drama", timeOfDay: ["night"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2);
        return { category: "drama", portraits: [a], text: <>{boldText(a.preferredName())} announces they are done with everybody and goes to sleep in the day room. They are back in the bedroom by midnight. Nobody says a word about it.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3);
        return { category: "drama", portraits: [a], text: <>{boldText(a.preferredName())} finally says the thing everyone has been circling for a week. Room goes silent. Half of them are relieved somebody did.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 2);
        return { category: "drama", portraits: [a], text: <>{boldText(a.preferredName())} walks out mid argument, sits by the pool for ten minutes, comes back and apologises to the room. Not the ending anyone expected.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -1);
        return { category: "drama", portraits: [a], text: <>{boldText(a.preferredName())} answers a completely normal question like it was an accusation. The villa clocks how tightly wound they have got.</> }; },
    },
    // pair
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -2);
        const aN = a.preferredName(), bN = b.preferredName();
        return { category: "drama", portraits: [a], locations: ["Bathroom"], text: <>{boldText(aN)} vents into the bathroom mirror about the Big Brother house, certain nobody can hear. {boldText(bN)} sure did.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} go at it in the kitchen loud enough for the whole Big Brother house to hear. It's not exactly the most pleasant background noise.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} catches their own name in a hallway conversation involving ${boldText(b.preferredName())}. Gets about five words. It is enough. The rest of the week is cold.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have a conversation in the garden that the mics do not catch. Both come back inside looking like they lost something. The villa knows something happened.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} makes a pointed comment about ${boldText(b.preferredName())}'s game in the group interview. Framed as just being honest. Nobody is buying it.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} gets pulled to the viewing room and comes out looking like they have been physically harmed. Whatever ${boldText(b.preferredName())} said about them in the confessional has now aired. The confrontation happens immediately.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>The villa splits. ${boldText(a.preferredName())} and ${boldText(b.preferredName())} go at it and the villa has to pick a lane. The fallout lasts three days. Nobody is neutral about this one.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, 1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} catches ${boldText(b.preferredName())} going through their corner of the room. The excuse does not land. Nobody in the villa is going to forget this happened.</> }; },
    },
    {
        category: "drama", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -2);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} loses it about ${boldText(b.preferredName())}'s snoring at three in the morning. Throws a pillow. Threatens to sleep in the kitchen. The villa is awake. The clip is brutal.</> }; },
    },
    {
        category: "drama", timeOfDay: ["night"], run: (splitIndex, gameState) => { if (gameState.episode < 2) return null; const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -30); applyEventPopularity(a, -3);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} destroys ${boldText(b.preferredName())}'s snack stash in a rage when their name comes up in the vote chatter. Big Brother seizes the footage. The villa is silent for the rest of the night.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} gets up mid-conversation, pushes the chair back, and walks out of the room without a word. The door does not slam but everyone flinches anyway. {boldText(b.preferredName())} is left mid-sentence.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} corners ${boldText(b.preferredName())} in the bathroom and accuses them of cheating in the last challenge. No proof. Just vibes. The villa overhears every word.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} spend twenty minutes arguing over whose turn it is to do the dishes. It escalates fast enough that neither of them remembers how it started.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} ruin a villa birthday party with a screaming match over the cake. Whoever the birthday was for is not even in the shot. The clip travels.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,-3); applyEventPopularity(a, 1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} brings up something ${boldText(b.preferredName())} said back at the start, word for word. ${b.preferredName()} did not think anyone was keeping track. Somebody was.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} argue about who apologised last time. Neither can remember. They argue about that instead for another twenty minutes.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(b, 2);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} tries to make ${boldText(b.preferredName())} look small in front of the group. ${b.preferredName()} does not rise to it once. The room quietly picks a side.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,3); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have the blazing row everyone saw coming, then sit down twenty minutes later and sort it properly. Both look lighter for it.</> }; },
    },
    // pair (relationship)
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have not spoken in three days. The villa is not large enough for this to go unnoticed. The villa has started routing around them like traffic cones.</> }; },
    },
    {
        category: "drama", tags: ["clash"], run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p;
        applyRelationship(gameState, a, b, -30); applyEventPopularity(a, 40); applyEventPopularity(b, 40);
        const aN = a.preferredName(), bN = b.preferredName();
        return { category: "drama", portraits: [...p], locations: ["Living Room"], text: <>{boldText(aN)} and {boldText(bN)} have been building toward this all week and it finally happens in the living room in front of everyone. It is LOUD. Both of them say things they absolutely mean. The villa does not know whether to leave or pull up a chair. The clip becomes the most-shared moment of the week. Both of their fanbases go completely feral.</>, confessional: { houseguests: p, type: "negative" } }; },
    },
    {
        category: "drama", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} comes downstairs for dinner, sees ${boldText(b.preferredName())} is already seated, makes a plate to take upstairs. Does not explain. Does not look at them. The villa eats in complete silence.</> }; },
    },
    {
        category: "drama", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -30); applyEventPopularity(b, -2);
        return { category: "drama", portraits: [...p], text: <>{boldText(b.preferredName())} airs ${boldText(a.preferredName())}'s confessional out in the open at the dinner table. Word for word. Everyone stops eating. ${a.preferredName()} did not know it had aired. They know now.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "drama", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} get assigned to laundry duty together and turn it into forty five minutes of pointed silence and aggressive folding. The villa notices. Nobody says anything.</> }; },
    },
    // group
    {
        category: "drama", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const size = randomInt(3, 5); const g = validGroup(splitIndex, gameState, size); if (!g) return null; const v = validVillain(splitIndex, gameState, size); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const watchers = g.filter(c => c.id !== v.id && c.id !== tgt.id).slice(0, 3); if (!watchers.length) return null;
        applyRelationship(gameState, v, tgt, -20); watchers.forEach(w => { applyRelationship(gameState, w, v, -10); applyEventPopularity(v, -20); });
        const wBold = watchers.map(c => c.preferredName()); const wLast = wBold.pop();
        return { category: "drama", portraits: [v, tgt, ...watchers], locations: ["Kitchen"], text: <>{boldText(hgPreferredName(v))} goes at {boldText(tgt.preferredName())} at the dinner table. Out loud. In front of everyone. {boldText(wBold.join(', '))} and {boldText(wLast!)} witness the whole thing. {tgt.preferredName()} handles it better than they should have to. {hgPreferredName(v)} does not realise the room has turned until it is too late.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1);
        return { category: "drama", portraits: [...t], text: <>{boldText(a.preferredName())} makes a joke about ${boldText(b.preferredName())} in front of ${boldText(c.preferredName())} that gets a laugh from everyone except ${b.preferredName()}. ${b.preferredName()} leaves the room without a word. ${boldText(c.preferredName())} is left holding the silence.</> }; },
    },
    {
        category: "drama", timeOfDay: ["breakfast"], run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -1)); applyGroupRelationship(gameState, g, -10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "drama", portraits: [...g], text: <>{bold.join(', ')} and {last} get into it over something that happened at breakfast. By the time it ends nobody can explain what breakfast had to do with it.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "drama", portraits: [...g], text: <>{bold.join(', ')} and {last} call a proper villa meeting and let everyone say the thing they have been sitting on. It is tense. It clears the air.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -2)); applyGroupRelationship(gameState, g, -20);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "drama", portraits: [...g], text: <>{bold.join(', ')} and {last} split into two camps over a rumour none of them can source. The villa runs on it for three days anyway.</> }; },
    },
    {
        category: "drama", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 1));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "drama", portraits: [...g], text: <>{bold.join(', ')} and {last} all try to defuse the same argument at the same time and make it considerably worse. Eventually everyone just laughs.</> }; },
    },

    // EXERCISE
    // positive
    // solo
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: 10, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} squeezes in a quick session before the house wakes up. Nothing flashy, just work. They head into the week feeling a step ahead.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.stats.physical >= 6); if (!a) return null; a.buffs.exercise = { amount: 20, episode: gameState.episode };
        return { category: "exercise", portraits: [a], locations: ["Backyard"], text: <>{boldText(a.preferredName())} runs the villa through a training circuit out on the terrace. Half the house taps out early. ${a.preferredName()} does not.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: 30, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} puts themselves through a brutal session in the yard, the kind that leaves them shaking afterward. They walk away knowing exactly what they can do this week.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: 15, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} swims lengths until their arms give out, then sits on the steps working out how many they managed.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.stats.endurance >= 6); if (!a) return null; a.buffs.exercise = { amount: 25, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} holds a wall sit against the garden fence for so long that people start timing it. They are still there when the timer stops.</> }; },
    },
    // pair
    {
        category: "exercise", type: "positive", timeOfDay: ["morning"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; a.buffs.exercise = { amount: 15, episode: gameState.episode }; b.buffs.exercise = { amount: 15, episode: gameState.episode }; applyRelationship(gameState, a, b, 10);
        return { category: "exercise", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} start training together every morning. Neither will be the one who skips it first.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; a.buffs.exercise = { amount: 20, episode: gameState.episode }; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 1);
        return { category: "exercise", portraits: [...p], text: <>{boldText(b.preferredName())} spots ${boldText(a.preferredName())} through a set they had no business finishing. ${a.preferredName()} finishes it.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; b.buffs.exercise = { amount: 20, episode: gameState.episode }; applyRelationship(gameState, a, b, 20);
        return { category: "exercise", portraits: [...p], text: <>{boldText(a.preferredName())} teaches ${boldText(b.preferredName())} how to actually breathe through a set instead of holding it. Small fix. Big difference.</> }; },
    },
    // group
    {
        category: "exercise", type: "positive", timeOfDay: ["morning"], run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => { x.buffs.exercise = { amount: 10, episode: gameState.episode }; }); for(let i=0;i<g.length;i++) for(let j=i+1;j<g.length;j++) applyRelationship(gameState, g[i],g[j],1);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "exercise", portraits: [...g], text: <>{bold.join(', ')} and {last} run a circuit in the garden every morning this week. Half of them hate it. All of them keep turning up.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => { x.buffs.exercise = { amount: 15, episode: gameState.episode }; });
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "exercise", portraits: [...g], text: <>{bold.join(', ')} and {last} set up a proper obstacle course out of garden furniture and run it until somebody's time is unbeatable.</> }; },
    },
    {
        category: "exercise", type: "positive", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => { x.buffs.exercise = { amount: 10, episode: gameState.episode }; applyEventPopularity(x, 1); });
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "exercise", portraits: [...g], text: <>{bold.join(', ')} and {last} turn a stretching session into an hour of nonsense that somehow leaves all of them looser than when they started.</> }; },

    },
    // negative
    // solo
    {
        category: "exercise", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: -10, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} tweaks something small during a training session and spends the rest of the day favoring it. Nothing serious, just bad timing.</> }; },
    },
    {
        category: "exercise", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: -20, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} pushes past where they should have stopped and pulls something in the process. They will be competing at less than full strength this week.</> }; },
    },
    {
        category: "exercise", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: -30, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} goes too hard trying to prove something and comes away genuinely hurt. This week is going to be rough for them.</> }; },
    },
    {
        category: "exercise", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: -15, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} pulls something reaching for a bag of ice. Nothing dramatic. It just will not settle down all week.</> }; },
    },
    {
        category: "exercise", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; a.buffs.exercise = { amount: -20, episode: gameState.episode };
        return { category: "exercise", portraits: [a], text: <>{boldText(a.preferredName())} has not slept properly in four nights and has stopped pretending otherwise. They are running on nothing.</> }; },
    },
    // pair
    {
        category: "exercise", type: "negative", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; a.buffs.exercise = { amount: -15, episode: gameState.episode }; b.buffs.exercise = { amount: -15, episode: gameState.episode }; applyRelationship(gameState, a, b, -10);
        return { category: "exercise", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} push each other into a competition neither should have entered. Both of them are wrecked for days.</> }; },
    },
    // group
    {
        category: "exercise", type: "negative", timeOfDay: ["night"], run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => { x.buffs.exercise = { amount: -10, episode: gameState.episode }; });
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "exercise", portraits: [...g], text: <>{bold.join(', ')} and {last} stay up until four for the third night running. Nobody is in any state to compete at anything.</> }; },
    },

    // RIVALRY
    // solo
    {
        category: "rivalry", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2);
        return { category: "rivalry", portraits: [a], text: <>{boldText(a.preferredName())} starts keeping a mental list of who has crossed them and is not subtle about the fact they are keeping it.</> }; },
    },
    // pair
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        return { category: "rivalry", portraits: [...p], locations: ["Bedroom"], text: <>{boldText(a.preferredName())} calls {boldText(b.preferredName())} a floater right in their face during a group conversation. {boldText(b.preferredName())} tries defending {hgPronoun(b, 1)} game to everyone, to no avail of course.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        const sA = a.stats.charisma + randomInt(-2, 2), sB = b.stats.charisma + randomInt(-2, 2);
        const win = sA >= sB ? a : b, lose = win.id === a.id ? b : a;
        applyRelationship(gameState, a, b, -10); applyEventPopularity(win, 3); applyEventPopularity(lose, -1);
        return { category: "rivalry", portraits: [...p], text: <>A fan account on social media posts a head-to-head comparison thread on {boldText(a.preferredName())} versus {boldText(b.preferredName())}. {b.preferredName()} wins and it's not even close. Both of them see it. {a.preferredName()} does <i>not</i> handle it very well...</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        const sA = a.stats.physical + a.stats.mental + randomInt(-2, 2), sB = b.stats.physical + b.stats.mental + randomInt(-2, 2);
        const win = sA >= sB ? a : b, lose = win.id === a.id ? b : a;
        applyRelationship(gameState, a, b, -10); applyEventPopularity(win, 3); applyEventPopularity(lose, -1);
        return { category: "rivalry", portraits: [...p], locations: ["Living Room", "Backyard"], text: <>What started as a house activity becomes a competition between {boldText(a.preferredName())} and {boldText(b.preferredName())}. {hgPreferredName(win)} wins it by a <i>landslide</i> and {hgPreferredName(lose)} is forced to smile through it. The clip goes online and shit happens.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} mentions to the group that they and ${boldText(b.preferredName())} are basically playing the same game. ${b.preferredName()} hears about it. That comparison is now a problem for them.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 1); applyEventPopularity(b, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} tells the group that ${boldText(b.preferredName())} had an easy run this week and they are willing to say it to their face. ${b.preferredName()} is in the next room. They heard all of it.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, 1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} accuses ${boldText(b.preferredName())} of running the exact same strategy they were using first. ${b.preferredName()} says that's not a strategy, that's just common sense. ${a.preferredName()} is not satisfied with this answer.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "rivalry", portraits: [...p], text: <>Both ${boldText(a.preferredName())} and ${boldText(b.preferredName())} try to be first to tell the group what happened. It turns into both of them talking at the same time in front of a very entertained audience. Nobody gets the full story. Everyone enjoys it.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        const sA = (a.stats?.charisma) + randomInt(-2, 2), sB = (b.stats.charisma) + randomInt(-2, 2);
        const win = sA >= sB ? a : b, lose = win.id === a.id ? b : a;
        applyRelationship(gameState, a, b, -10); applyEventPopularity(win, 2); applyEventPopularity(lose, -2);
        return { category: "rivalry", portraits: [...p], text: <>An online ranking of the villa contestants drops. ${boldText(hgPreferredName(win))} is well ahead of ${boldText(hgPreferredName(lose))}. Both of them see the same list. The next twelve hours in the villa are chilly.</> }; },
    },
    {
        category: "rivalry", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} both want to take charge of dinner and neither will back down. The chicken is overcooked. The villa eats cold pasta. Both keep insisting they were right.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 2); applyEventPopularity(b,-2);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} calls ${boldText(b.preferredName())} a floater to their face during a group chat. ${b.preferredName()} tries to defend their game. The defence is not convincing. The room knows it.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b,-1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} both want the only mirror in the bathroom and both refuse to give. The standoff lasts forty-five minutes. The villa starts placing bets.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, 1); applyEventPopularity(b,-1);
        if (gameState.episode < 2) return null; return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have been quietly pitching opposite vote plans to the same person all week. The person finally tells them. Now they have to deal with each other.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        const sA = a.stats.mental + randomInt(-2, 2), sB = b.stats.mental + randomInt(-2, 2);
        const win = sA>=sB?a:b, lose = win.id===a.id?b:a;
        applyRelationship(gameState, a, b, -10); applyEventPopularity(win, 2); applyEventPopularity(lose, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} get into a genuine argument about villa trivia neither of them can actually prove. ${boldText(hgPreferredName(win))} wins on confidence alone. ${hgPreferredName(lose)} is still thinking of a comeback an hour later.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        const sA = a.stats.physical + randomInt(-2, 2), sB = b.stats.physical + randomInt(-2, 2);
        const win = sA>=sB?a:b, lose = win.id===a.id?b:a;
        applyRelationship(gameState, a, b, -10); applyEventPopularity(win, 2); applyEventPopularity(lose, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} challenge each other to a push-up contest that spirals out of control. ${boldText(hgPreferredName(win))} wins by a mile. ${hgPreferredName(lose)} insists it does not count.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -30); applyEventPopularity(a, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} starts copying ${boldText(b.preferredName())} back at them, tone and all, whenever they speak. It gets old fast.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} turn a normal pool game into something with genuine edge. Everyone stops to watch. Neither will call it.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(b,-2);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(b.preferredName())} tells the group ${boldText(a.preferredName())} has not won anything yet. ${a.preferredName()} hears it secondhand within the hour, which is how these things go.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have been at each other for weeks and then end up on the same side of a stupid argument. Neither of them knows what to do with that.</> }; },
    },
    // pair (relationship)
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false, true); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "rivalry", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} arrive at the backyard at nearly the exact same time. They're both looking - glaring? - at each other like it's a staring contest...</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false, true); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} throws shade at ${boldText(b.preferredName())} in the group interview. Deniable. Subtle. The kind you could technically call a compliment. ${b.preferredName()} fires back immediately. The internet picks a winner before the episode is even over.</> }; },
    },
    {
        category: "rivalry", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false, true); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())}'s passive-aggressive comment at breakfast earlier made it to a full argument at dinner now. Both look worse for it.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false, true); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, 3); applyEventPopularity(b, 3);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} both go for the same villa game and neither backs down. The villa pulls chairs over and watches. It becomes the moment of the week.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false, true); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 2); applyEventPopularity(b, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} calls out ${boldText(b.preferredName())} directly in front of the group. No buildup, no warning. Just: "I think you should hear this from me directly." The villa goes so quiet you can hear the pool filter. ${b.preferredName()} does not flinch.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false, true); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "rivalry", portraits: [...p], text: <>Big Brother moves things around and ${boldText(a.preferredName())} and ${boldText(b.preferredName())} are now sharing a room. Neither agrees to it. Neither moves out. The tension is physically visible to everyone in the villa.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const p = validRelationshipPair(splitIndex, gameState, false, true); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "rivalry", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} both claim credit for the group's win in a task neither of them actually led. The rest of the villa remembers it differently than either of them.</> }; },
    },
    // trio
    {
        category: "rivalry", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyRelationship(gameState, a, b, -10); applyRelationship(gameState, a, c, -10); applyEventPopularity(b, 1); applyEventPopularity(c, 1);
        return { category: "rivalry", portraits: [...t], text: <>{boldText(a.preferredName())} sees ${boldText(b.preferredName())} and ${boldText(c.preferredName())} laughing in the corner and assumes it is about them. Storms over. It was not. It is now.</> }; },
    },
    {
        category: "rivalry", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t; applyRelationship(gameState, a, b, -10); applyEventPopularity(c, 1);
        return { category: "rivalry", portraits: [...t], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} both try to pull {boldText(c.preferredName())} aside for a one on one the same afternoon. ${boldText(c.preferredName())} has to awkwardly juggle both. Neither ${a.preferredName()} nor ${b.preferredName()} appreciates finding out about the other.</> }; },
    },
    // group
    {
        category: "rivalry", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -1)); applyGroupRelationship(gameState, g, -20);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "rivalry", portraits: [...g], text: <>{bold.join(', ')} and {last} spend the whole week comparing who has done more in here. Nobody wins. Everyone comes out of it smaller.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 1)); applyGroupRelationship(gameState, g, -10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "rivalry", portraits: [...g], text: <>{bold.join(', ')} and {last} turn a garden game into a genuine grudge match. It is very entertaining and slightly concerning.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -2)); applyGroupRelationship(gameState, g, -10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "rivalry", portraits: [...g], text: <>{bold.join(', ')} and {last} all quietly decide the others are coasting. None of them say it out loud. All of them act like it.</> }; },
    },
    {
        category: "rivalry", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, -10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "rivalry", portraits: [...g], text: <>{bold.join(', ')} and {last} argue for an hour about who would actually win in a final. Nobody changes their mind. Everybody enjoys it.</> }; },
    },

    // ROMANCE
    // positive
    // solo
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 2);
        return { category: "romance", portraits: [a], text: <>{boldText(a.preferredName())} admits out loud that {a.pronoun(0)} caught feelings for someone and immediately regrets saying it. It's too late now.</> }; },
    },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3);
        return { category: "romance", portraits: [a], text: <>{boldText(a.preferredName())} decides they are not doing any of this in here and says so plainly. Half the villa respects it. The other half does not believe it.</> }; },
    },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 1);
        return { category: "romance", portraits: [a], text: <>{boldText(a.preferredName())} gets asked who they would pick if they had to and takes a very long time not answering.</> }; },

    },
    // pair (attracted)
    {
        category: "romance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 15); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} end up talking on the loungers long after everyone else has gone to bed. Nothing is said outright. Neither of them moves to leave.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 20); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} keeps finding reasons to sit next to ${boldText(b.preferredName())} tonight. ${b.preferredName()} keeps making room. The villa clocks it before either of them says a word.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 25); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>A shared confessional joke turns into ${boldText(a.preferredName())} and ${boldText(b.preferredName())} whispering to each other across the room for the rest of the night. Big Brother is very interested.</> }; },
        },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 30); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} sneak off during the group's downtime and come back looking very pleased with themselves. Nobody buys the "just talking" line.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 15); applyEventPopularity(b, 2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} brings {boldText(b.preferredName())} a plate at dinner, and sticks around just a tad too long doing it...</> }; },
        },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 20); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} get caught matching outfits by complete accident and lean into the bit all day. It reads as more than a bit to everyone watching.</> }; },
        },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 15); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} end up paired for a challenge rehearsal and neither of them is in a hurry to stop practicing after time's called.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} end up alone in the hot tub, after everyone else has called it a night. The conversation goes places neither of them planned.</> }; },
        },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 25);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} pulls ${boldText(b.preferredName())} aside for what was supposed to be a strategy talk. Strategy does not really happen.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 15); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], locations: ["Kitchen"], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} get stuck cleaning up after a chaotic group dinner together and somehow make it the best part of both their days.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 15);
        return { category: "romance", portraits: [...p], locations: ["Living Room"], text: <>During a lazy afternoon in the living room, ${boldText(a.preferredName())} cannot stop looking at ${boldText(b.preferredName())}. A couple of housemates clock it. ${a.preferredName()} pretends not to notice.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>A 2 AM snack run turns into {boldText(a.preferredName())} and {boldText(b.preferredName())} sitting on the kitchen floor talking until the sun comes up.</> }; },
        },
    {
        category: "romance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], locations: ["Backyard"], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} end up loitering about in the backyard even after everyone else has clocked out for the night. Neither of them seem intent on heading to bed.</> }; },
        },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 10); applyEventPopularity(a, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} saves ${boldText(b.preferredName())} a seat at every single meal this week without ever mentioning it.</> }; },
        },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, 30); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} get caught out in the rain moving the garden furniture and end up laughing so hard neither of them moves anything.</> }; },
    },
    // group
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "romance", portraits: [...g], text: <>{bold.join(', ')} and {last} sit up ranking everyone's chances of finding something real in here. Brutal, funny, and nobody rates themselves.</> }; },
    },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, 9); if (!g) return null; g.forEach(x => applyEventPopularity(x, 1)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()).slice(0, 4); const last = bold.pop();
        return { category: "romance", portraits: [...g.slice(0, 4)], locations: ["Living Room", "Bedroom", "Backyard", "Kitchen"], text: <>{boldText(bold.join(', '))} and {last} start a house match-making session. The pairings they suggest range from {boldText(hgPreferredName(g[5]))} and {boldText(hgPreferredName(g[6]))} to {boldText(hgPreferredName(g[7]))} and {boldText(hgPreferredName(g[8]))}. It's a hilarious time.</> }; },
    },
    {
        category: "romance", type: "positive", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "romance", portraits: [...g], text: <>{bold.join(', ')} and {last} stage a villa wedding for two people who are not together. There are vows. There is a bin liner veil.</> }; },
    },
    // negative
    // solo
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -1);
        return { category: "romance", portraits: [a], text: <>{boldText(a.preferredName())} spends the whole day thinking of how to start a conversation with someone... and never does.</> }; },
    },
    // pair (attracted)
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRomance(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have the where is this going conversation far too early and it does not land well for either of them.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} makes a move on ${boldText(b.preferredName())} and gets gently, unmistakably shut down. ${a.preferredName()} plays it off in front of the house. The house doesn't buy it.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -25); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have a real fight, over something neither of them will name later. Cold shoulders across the villa for the rest of the day.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 3, c => !hasActiveShowmance(gameState, c.id)); if (!a) return null; const alive = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== a.id && !hasActiveShowmance(gameState, c.id) && showmanceAttractionMatches(a, c)); if (alive.length < 2) return null;
        const b = randomPlayer(alive); const jealous = alive.filter(c => c.id !== b.id); const j = randomPlayer(jealous); if (!j) return null;
        applyRelationship(gameState, a, b, 10); applyRelationship(gameState, a, j, -20); applyEventPopularity(a, -1);
        return { category: "romance", portraits: [a, b, j], text: <>{boldText(a.preferredName())} is caught flirting with ${boldText(b.preferredName())} by ${boldText(hgPreferredName(j))}, who very clearly thought something was building there too. It is not a fun conversation later.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -15);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} tries to plan a "just the two of us" moment with {boldText(b.preferredName())} and it falls completely flat. Wrong timing, wrong mood, wrong everything. Both of them agree, silently, to pretend it didn't happen.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} finds out {boldText(b.preferredName())} has been downplaying whatever is going on between them to another housemate. It stings more than ${a.preferredName()} expected.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -15); applyEventPopularity(a, -1); applyEventPopularity(b, -1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} end up on opposite sides of a competition and the trash talk gets a little too real for two people who are supposedly just flirting.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20);
        return { category: "romance", portraits: [...p], text: <>The whole backyard can hear {boldText(a.preferredName())} and {boldText(b.preferredName())} bickering about who said what to whom. They don't look like they're backing down any time soon.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const p = validAttractedPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -25); applyEventPopularity(b, -1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} overhears ${boldText(b.preferredName())} laughing off whatever is going on between them to another housemate. It is not a good look.</> }; },
    },
    {
        category: "romance", type: "negative", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -1)); applyGroupRelationship(gameState, g, -10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "romance", portraits: [...g], text: <>{bold.join(', ')} and {last} get into it over whether anything in here counts as real. It gets sharper than any of them meant it to.</> }; },
    },
    // SABOTAGE
    // solo
    {
        category: "sabotage", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -3);
        return { category: "sabotage", portraits: [a], text: <>{boldText(a.preferredName())} sets an alarm for 4am on somebody else's side of the room and goes back to sleep. Two people are wrecked all day.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2);
        return { category: "sabotage", portraits: [a], text: <>{boldText(a.preferredName())} hides the only working phone charger in the house and is weirdly enthusiastic in joining the search for it...</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 2);
        return { category: "sabotage", portraits: [a], text: <>{boldText(a.preferredName())} gets handed an easy chance to stitch somebody up and just does not take it. Tells nobody. It still gets around.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -1);
        return { category: "sabotage", portraits: [a], text: <>{boldText(a.preferredName())} starts a rumour so vague it cannot be traced and so specific it definitely came from them.</> }; },
    },
    // pair
    {
        category: "sabotage", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -30); applyEventPopularity(a, -2);
        return { category: "sabotage", portraits: [...p], text: <>{boldText(a.preferredName())} uses ${boldText(b.preferredName())}'s toothbrush to clean the bathroom drain as a joke. It is not a joke. ${b.preferredName()} finds out an hour later. The villa hears the scream.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -30); applyEventPopularity(a, -2);
        return { category: "sabotage", portraits: [...p], text: <>{boldText(a.preferredName())} tells ${boldText(b.preferredName())} the vote is going one way when they know full well it is going the other. ${b.preferredName()} finds out on the night.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(a, -1); applyEventPopularity(b, 1);
        return { category: "sabotage", portraits: [...p], text: <>{boldText(a.preferredName())} moves ${boldText(b.preferredName())}'s things into the worst bed in the villa while they are outside, then acts confused about it.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20); applyEventPopularity(b, -1);
        return { category: "sabotage", portraits: [...p], text: <>{boldText(a.preferredName())} gets ${boldText(b.preferredName())} to repeat something unwise in front of exactly the wrong person. Waits. Says nothing.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 2);
        return { category: "sabotage", portraits: [...p], text: <>{boldText(a.preferredName())} warns ${boldText(b.preferredName())} that somebody is working against them, knowing it costs them to say it. ${b.preferredName()} does not forget that.</> }; },
    },
    // trio
    {
        category: "sabotage", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [v, r, tgt] = t;
        applyRelationship(gameState, r, tgt, -10); applyEventPopularity(v, -10);
        return { category: "sabotage", portraits: [...t], text: <>{boldText(hgPreferredName(v))} tells {boldText(hgPreferredName(r))} that {boldText(tgt.preferredName())} called them a floater in the confessional. {tgt.preferredName()} did not. {hgPreferredName(r)} believes it anyway. The damage is real.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [v, a, b] = t;
        applyRelationship(gameState, a, b, -20); applyEventPopularity(v, -20);
        return { category: "sabotage", portraits: [...t], text: <>{boldText(hgPreferredName(v))} tells {boldText(a.preferredName())} that {boldText(b.preferredName())} has a final-two with someone else. Total fabrication. By the time the truth comes out, {a.preferredName()} and {b.preferredName()} have already cooled.</> }; },
    },
    // group
    {
        category: "sabotage", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -2)); applyGroupRelationship(gameState, g, -10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "sabotage", portraits: [...g], text: <>{bold.join(', ')} and {last} agree to feed one person a completely different version of the week. It works. It is also deeply unpleasant to watch.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -1)); applyGroupRelationship(gameState, g, -20);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "sabotage", portraits: [...g], text: <>{bold.join(', ')} and {last} each try to set the others up in the same week. All of it lands at once. None of it works.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "sabotage", portraits: [...g], text: <>{bold.join(', ')} and {last} work out somebody has been playing them off each other and compare notes instead of turning on one another.</> }; },
    },
    {
        category: "sabotage", timeOfDay: ["night"], run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -1));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "sabotage", portraits: [...g], text: <>{bold.join(', ')} and {last} spend the night trying to work out who moved the nomination whiteboard. It was one of them. Nobody confesses.</> }; },
    },
    // villain
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -3); applyEventPopularity(v,- 2);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(vN)} floats a story about {boldText(tN)}'s backstory not being entirely true. It spreads through the villa, then reaches the fan boards. By evening it is trending. By morning the source has been traced back. {vN}'s apology post gets more engagement than the original story.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; const third = validSolo(splitIndex, gameState, 3, c => c.id !== v.id && c.id !== tgt.id); if (!third) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName(), thN = hgPreferredName(third);
        applyRelationship(gameState, v, tgt, -10); applyRelationship(gameState, third, tgt, -10);
        return { category: "sabotage", portraits: [v, tgt, third], text: <>{boldText(vN)} gets {boldText(tN)} alone and spends fifteen deliberate minutes on a very specific breakdown of everything {boldText(tN)} is and is not in this villa. {thN} files it away. Relationships shift without anyone knowing why.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const tN = tgt.preferredName(); applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -20);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(hgPreferredName(v))} repeats something {boldText(tgt.preferredName())} said but in a completely different context. {tN} finds out from the villa's reaction, not from being told directly. The damage is already done.</> }; },
    },
    {
        category: "sabotage", timeOfDay: ["night"], run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const tN = tgt.preferredName(); applyRelationship(gameState, v, tgt, -10); applyEventPopularity(v, -1);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(hgPreferredName(v))} corners ${boldText(tgt.preferredName())} the night before a big day and delivers a detailed, sincere-sounding breakdown of every mistake ${tN} is making. It is framed as support. ${tN} goes to bed overthinking everything.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(v, -20); applyEventPopularity(tgt, -10);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(vN)} makes a big public point of questioning {boldText(tN)}'s motives in front of the group. The move is too obvious. The villa sees it. Viewers see it. Both numbers drop.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; const ally = validSolo(splitIndex, gameState, 3, c => c.id !== v.id && c.id !== tgt.id); if (!ally) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName(), aN = hgPreferredName(ally);
        applyRelationship(gameState, v, tgt, -10); applyRelationship(gameState, ally, tgt, -10);
        return { category: "sabotage", portraits: [v, tgt, ally], text: <>{boldText(vN)} works on {boldText(aN)} quietly all week. Small comments, selective edits on the truth. By the end of it {aN} is keeping distance from {boldText(tN)} without knowing exactly why.</>}; },
    },
    {
        category: "sabotage", timeOfDay: ["night"], run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const ok = Math.random() < 0.45; const vN = hgPreferredName(v), tN = tgt.preferredName(); applyRelationship(gameState, v, tgt, -10);
        if (!ok) applyEventPopularity(v, -10);
        return { category: "sabotage", portraits: [v, tgt], text: ok
            ? <>{boldText(vN)} keeps {boldText(tN)} talking in the lounge until well past 2am. Question after question. {tN} eventually clocks the game but the damage is done.</>
            : <>{boldText(vN)} tries to run out {boldText(tN)}'s night. {tN} wraps it up early with a smile: "early start tomorrow." {vN} sits there alone.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -20); applyEventPopularity(v, -10);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(vN)} leaks something unflattering about ${boldText(tN)} to a fan account. The comments are not kind. The source is obvious to anyone paying attention. Nobody comes out of it well.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; const ally = validSolo(splitIndex, gameState, 3, c => c.id !== v.id && c.id !== tgt.id); if (!ally) return null;
        const tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyRelationship(gameState, ally, tgt, -10);
        return { category: "sabotage", portraits:[v, tgt, ally], text: <>{boldText(hgPreferredName(v))} walks directly into a conversation between {boldText(tN)} and {boldText(hgPreferredName(ally))} and does not stop talking until the other person leaves. {tN} watches the whole thing happen in real time.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; const third = validSolo(splitIndex, gameState, 3, c => c.id !== v.id && c.id !== tgt.id); if (!third) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName(), thN = hgPreferredName(third);
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -20);
        return { category: "sabotage", portraits:[v, tgt, third], text: <>{boldText(vN)} casually drops into conversation that ${boldText(tN)} said something they absolutely did not say about ${boldText(thN)}. It gets back to everyone within the hour. ${tN} is furious and the denial just makes it worse.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(v, -10);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(hgPreferredName(v))} makes a "joke" at {boldText(tgt.preferredName())}'s expense in the group setting. The delivery is light. The actual content is not. The villa laughs nervously. ${tN} smiles through it. The confessional tells a different story.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -1);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(vN)} is reportedly asleep when {boldText(tN)} has a conversation in the room. {vN} is not asleep. What they hear becomes currency for the rest of the week.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(v, -2);
        if (gameState.episode < 2) return null; return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(vN)} tries to move votes against {boldText(tN)} in a group setting. It is too aggressive and everyone in the room can see the machinery. {vN} loses ground instead of gaining it. ${tN} says nothing and lets it happen.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -20); applyEventPopularity(v, -1);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(vN)} hides {boldText(tN)}'s comp gear before the next competition, then claims {v.pronoun(0)} can help {v.pronoun(1)} look for them. {tN} later finds it themselves under {vN}'s pillow.</> }; },
    },
    {
        category: "sabotage", timeOfDay: ["morning"], run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -1);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(hgPreferredName(v))} resets the only clock in the villa an hour early and says nothing. ${boldText(tgt.preferredName())} wakes up thinking they slept in and spends the morning apologizing for a mistake they never made.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; const third = validSolo(splitIndex, gameState, 3, c => c.id !== v.id && c.id !== tgt.id); if (!third) return null;
        applyRelationship(gameState, tgt, third, -10);
        return { category: "sabotage", portraits: [v, tgt, third], text: <>{boldText(hgPreferredName(v))} swaps the name tags on the snack shelf so {boldText(tgt.preferredName())}'s hidden stash reads as {boldText(hgPreferredName(third))}'s. {hgPreferredName(third)} gets blamed for eating it first. {hgPreferredName(v)} watches the fallout from the couch.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null;
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -1);
        return { category: "sabotage", portraits: [v, tgt], text: <>{boldText(hgPreferredName(v))} swaps {boldText(tgt.preferredName())}'s favorite hoodie for an identical one two sizes too small right before a confessional. {tgt.preferredName()} spends the whole segment tugging at their sleeves and never figures out why.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; const scape = validSolo(splitIndex, gameState, 3, c => c.id !== v.id && c.id !== tgt.id); if (!scape) return null;
        applyRelationship(gameState, tgt, scape, -20); applyEventPopularity(v, -1);
        return { category: "sabotage", portraits: [v, tgt, scape], text: <>{boldText(hgPreferredName(v))} tells {boldText(tgt.preferredName())} that {boldText(scape.preferredName())} is the one who called them fake in the confessional. It was actually {v.preferredName()}. {tgt.preferredName()} confronts the wrong person entirely.</> }; },
    },
    {
        category: "sabotage", run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validFrameTarget(splitIndex, gameState, v); if (!tgt) return null;
            const vN = hgPreferredName(v), tN = tgt.preferredName();
            const _ch = v.stats.charisma;
            const _ok = Math.random() < Math.max(0.15, Math.min(0.85, 0.3 + (_ch / 10) * 0.55));
            if (_ok) {
                applyHouseRelationship(splitIndex, gameState, tgt, -20);
                const text = Math.random() < 0.5
                    ? <>{boldText(vN)} carefully repositions {boldText(tN)} as the problem in every conversation this week. By the end nobody can point to a single moment — but the feeling is there.</>
                    : <>{boldText(vN)} drops just enough about {boldText(tN)} to the right people. No one source, no one conversation. The house just collectively cools on {tN} without knowing why.</>;
                return { category: "sabotage", portraits: [v, tgt], text: text };
            } else {
                applyHouseRelationship(splitIndex, gameState, v, -20);
                const text = Math.random() < 0.5
                    ? <>{boldText(vN)} pushes too hard to make {boldText(tN)} the villain. The villa starts wondering why {vN} is so invested. The framing falls apart. {vN} ends the week worse off than {tN}.</>
                    : <>{boldText(vN)}'s attempt to quietly turn the house against {boldText(tN)} gets back to too many people. The villa loses trust in {vN} faster than it ever would have in {tN}.</>;
                return { category: "sabotage", portraits: [v, tgt], text: text };
            }
        },
    },
    // SHOWMANCE (STATUS)
    // positive
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} are the couple everyone in the villa is rooting for this week. It shows.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 25);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} have an earnest talk about where things stand between them. Thanks to that, their bond grows ever stronger.</>, confessional: { houseguests: p, tags: "heart-to-heart" } }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 15); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} publicly has {boldText(b.preferredName())}'s back in a Big Brother house disagreement, no hesitation. {b.preferredName()} notices.</> }; },
    },
    {
        category: "showmance", type: "positive", timeOfDay: ["morning"], run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 30); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} spend the whole morning being disgustingly sweet to each other in the kitchen. Nobody has the heart to interrupt them.</> }; },
    },
    {
        category: "showmance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20);
        return { category: "romance", portraits: [...p], text: <>Late at night in the pantry, {boldText(a.preferredName())} and {boldText(b.preferredName())} start a running inside joke that only the two of them get. It becomes the highlight of both their weeks.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,2.5); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} vouches hard for ${boldText(b.preferredName())} the moment their name comes up as a target. The house notices how far they're willing to go.</> }; },
    },
    {
        category: "showmance", type: "positive", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>A slow song comes on during a group hangout and ${boldText(a.preferredName())} and ${boldText(b.preferredName())} do not let go of each other for the rest of the night.</> }; },
    },
    {
        category: "showmance", type: "positive", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 15);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} get stuck cooking a chaotic group dinner together and somehow make it feel like a date.</> }; },
    },
    {
        category: "showmance", type: "positive", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, 2);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} spends the whole afternoon defending the showmance to people who did not ask. ${b.preferredName()} has no idea.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -15); applyEventPopularity(a, -1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} goes quiet on ${boldText(b.preferredName())} for a full day and will not say what it is about. It is about something.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} gives up their spot in a villa game so ${boldText(b.preferredName())} can play instead. Makes nothing of it.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyEventPopularity(a, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} gets asked whether it is real and answers honestly instead of doing the bit. It is a decent answer.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,2.5); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} work out they have been planning the same thing for after all this without ever having said it out loud.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,-2.5); applyEventPopularity(a, -1); applyEventPopularity(b,-1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have the same argument for the third time this week. Neither of them is even angry any more.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} realise they have completely different ideas about what happens to this on the outside.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} spend a whole day apart on purpose and both admit afterwards it was probably good for them.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; applyRelationship(gameState, a,b,1.5); g.forEach(x => applyEventPopularity(x, 1));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "romance", portraits: [a, b, ...g], text: <>{bold.join(', ')} and {last} corner ${boldText(a.preferredName())} and ${boldText(b.preferredName())} for a full interrogation about the showmance. Both of them hold up well.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; applyRelationship(gameState, a,b,-1.5); g.forEach(x => applyEventPopularity(x, 1));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "romance", portraits: [a, b, ...g], text: <>{bold.join(', ')} and {last} start openly taking bets on how long ${boldText(a.preferredName())} and ${boldText(b.preferredName())} last. It gets back to both of them.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 1); applyEventPopularity(b, 1);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "romance", portraits: [a, b, ...g], text: <>{bold.join(', ')} and {last} throw ${boldText(a.preferredName())} and ${boldText(b.preferredName())} a villa anniversary for no particular milestone. There is a certificate.</> }; },
    },
    {
        category: "showmance", type: "positive", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 1));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "romance", portraits: [a, b, ...g], text: <>{bold.join(', ')} and {last} spend an evening arguing about whether ${boldText(a.preferredName())} and ${boldText(b.preferredName())} would have found each other on the outside. No conclusion.</> }; },

    },
    // neutral
    {
        category: "showmance", type: "neutral", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} keep doing what they're doing. Nothing new to report. Still very much a thing.</> }; },
    },
    {
        category: "showmance", type: "neutral", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} have settled into a routine. Comfortable, unremarkable, steady.</> }; },
    },
    {
        category: "showmance", type: "neutral", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        return { category: "romance", portraits: [...p], text: <>Quiet week for ${boldText(a.preferredName())} and ${boldText(b.preferredName())}. They're around each other as usual. Nothing to flag either way.</> }; },
    },
    {
        category: "showmance", type: "neutral", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} sit through another full house dinner together, hands linked under the table. Business as usual.</> }; },
    },
    {
        category: "showmance", type: "neutral", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} split the chore list like it's nothing. Same routine, same each other, week after week.</> }; },

    },
    // negative
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} snap at each other over something small. It blows over, but it was there in front of everyone.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,-2.5); applyEventPopularity(a, -1);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} spends the day glued to the rest of the house instead of ${boldText(b.preferredName())}. ${b.preferredName()} clocks it and says nothing. For now.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,-3);
        return { category: "romance", portraits: [...p], text: <>Game talk turns into a real argument between ${boldText(a.preferredName())} and ${boldText(b.preferredName())} about who's actually running their partnership. Neither backs down.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,-1.5);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} barely speak today. Nothing happened, exactly. It just feels different.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,-2.5);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} disagree about who to target next and it turns into something bigger than either of them intended.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20);
        return { category: "romance", portraits: [...p], text: <>{boldText(b.preferredName())} campaigns against someone ${boldText(a.preferredName())} actually likes and ${a.preferredName()} cannot let it go. The tension follows them for the rest of the day.</> }; },
    },
    {
        category: "showmance", type: "negative", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a,b,-1.5);
        return { category: "romance", portraits: [...p], text: <>{boldText(a.preferredName())} spends a whole afternoon deep in strategy talk with someone else while ${boldText(b.preferredName())} watches from across the room.</> }; },
    },
    {
        category: "showmance", type: "negative", run: (splitIndex, gameState) => { const p = validShowmancePair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -20);
        return { category: "romance", portraits: [...p], text: <>A joke ${boldText(a.preferredName())} makes about their showmance gets back to ${boldText(b.preferredName())} out of context. It does not land the way ${a.preferredName()} meant it.</> }; },
    },

    // SPOTLIGHT
    // solo
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 2);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} gets openly written off by half the villa this week and says nothing. Just gets on with it. It reads well.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} refuses to pile on when the group turns on somebody. Stands there and says they are not doing this. The room shifts.</> }; },
    },
    {
        category: "spotlight", timeOfDay: ["afternoon"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 5);
        return { category: "spotlight", portraits: [a], text: <>A clip of ${boldText(a.preferredName())} just being themselves in the villa goes out without warning. No setup, no staging. By afternoon it has more engagement than the official show account. Nobody manufactured it.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const swing = Math.random() < 0.6 ? 4 : -3; applyEventPopularity(a, swing);
        return { category: "spotlight", portraits: [a], text: swing > 0
            ? <>An old post from ${boldText(a.preferredName())} resurfaces. Fans dig it up and the response is overwhelmingly warm.</>
            : <>An old post from ${boldText(a.preferredName())} resurfaces. Some fans are charmed. A louder group is not.</>
        }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.stats.charisma >= 7); if (!a) return null; applyEventPopularity(a, 3);
        return { category: "spotlight", portraits: [a], text: <>A fan account posts a supercut of every ${boldText(a.preferredName())} moment from the season so far. Four and a half minutes. Quarter million views by morning. Nobody in the villa knows yet.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const swing = Math.random() < 0.65 ? 5 : -2; applyEventPopularity(a, swing);
        return { category: "spotlight", portraits: [a], text: swing > 0
            ? <>A message from home for ${boldText(a.preferredName())} airs in the recap. Viewer response is immediate and warm.</>
            : <>A message from home for ${boldText(a.preferredName())} airs. The intention was sweet. The execution was slightly off. The comment section is not entirely unkind but they are comments.</>
        }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())}'s reaction to the week's events is caught on camera and goes instantly viral. Not meanly. They have become a meme but the affection behind it is real. ${a.preferredName()} does not know yet.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, 3); others.forEach(x => { applyEventPopularity(x, 1); applyRelationship(gameState, a, x, 10); });
        return { category: "spotlight", portraits: [a, ...others], text: <>{boldText(a.preferredName())} does an impression of someone in the villa. The villa loses it. The person being impersonated is also laughing. It is the loosest, most human the villa has felt all week.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 40);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} does something genuinely decent this week that nobody expected and the villa does not know how to process it. The confessional makes clear they have been misjudged. Viewers start defending them online.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} has been counted out all week. The moment they stop managing that perception is the moment the cameras find something worth filming. The villa votes them their favourite person of the week.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const size = randomInt(3, 5); const a = validSolo(splitIndex, gameState, size); if (!a) return null; const g = validGroup(splitIndex, gameState, size); if (!g) return null;
        const others = g.filter(c => c.id !== a.id); applyEventPopularity(a, 3); others.forEach(x => applyEventPopularity(x, 1));
        return { category: "spotlight", portraits: [a, ...others], text: <>{boldText(a.preferredName())} says something completely throwaway in a group conversation. The villa repeats it back within the hour. By end of the week it is the villa's catchphrase and ${a.preferredName()} cannot explain how.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} gets a surprise shoutout from a celebrity fan account and does not find out until someone in the villa shows them the notification count.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.stats.charisma >= 7); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} improvises a full toast at a random villa dinner and it is somehow the most quotable thing said all season. Clips of just the toast start circulating on their own.</> }; },
    },
    {
        category: "spotlight", timeOfDay: ["evening"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 4);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} tells a story at dinner that has the entire table gone. Perfect timing, perfect ending. They know exactly what they just did.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 3);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} tries to hold the room for the third time today. The room is not really there for it this time.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, 2);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} says one line about why they are still here that lands harder than anything else said this week.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState); if (!a) return null; applyEventPopularity(a, -2);
        return { category: "spotlight", portraits: [a], text: <>{boldText(a.preferredName())} has been quiet for days and then says exactly the right thing at exactly the right moment. Everyone turns.</> }; },
    },
    // pair
    {
        category: "spotlight", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(a, 2); applyEventPopularity(b,3);
        return { category: "spotlight", portraits: [...p], text: <>Someone asks ${boldText(a.preferredName())} in a fan Q&A who they respect most in this villa. Without pausing: ${boldText(b.preferredName())}. The clip spreads immediately. ${b.preferredName()}'s numbers jump overnight.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a,3); applyEventPopularity(b,3);
        return { category: "spotlight", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} are caught having a genuinely funny unscripted moment by the pool. Nobody planned it. It is the most-shared clip of the week.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 10); applyEventPopularity(a,3); applyEventPopularity(b,3);
        return { category: "spotlight", portraits: [...p], text: <>{boldText(a.preferredName())} pranks ${boldText(b.preferredName())} with a fake elimination announcement that fools the whole villa for ninety seconds. ${b.preferredName()}'s reaction is the clip of the season. Both of them are everywhere.</> }; },
    },
    {
        category: "spotlight", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        const success = a.stats.mental >= 5 && b.stats.mental >= 5; applyRelationship(gameState, a, b, 10); applyEventPopularity(a, success ? 15 : 30); applyEventPopularity(b, success ? 10 : 30);
        const aN = a.preferredName(), bN = b.preferredName();
        return { category: "spotlight", portraits: [...p], text: success
            ? <>{boldText(aN)} and {boldText(bN)} sing their hearts out at movie night and realize they make for a pretty good duet.</>
            : <>{boldText(aN)} and {boldText(bN)} attempt a duet at movie night - which, funny enough, they couldn't sing. It's not like the two particularly mind, anyhow.</> }; },
    },
    {
        category: "spotlight", timeOfDay: ["breakfast"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p;
        const success = a.stats.charisma >= 4 && b.stats.charisma >= 4; applyRelationship(gameState, a, b, success ? 10 : -10); applyEventPopularity(a, success ? 20 : -10); applyEventPopularity(b, success ? 20 : -10);
        const aN = a.preferredName(), bN = b.preferredName();
        return { category: "spotlight", portraits: [...p], text: success
            ? <>{boldText(aN)} and {boldText(bN)} do a bit together at breakfast that ends up being a hit amongst the table. The two could not be happier.</>
            : <>{boldText(aN)} and {boldText(bN)} try doing a bit together at breakfast. {aN} messes one thing up, then {bN} screws over another, and the entire routine inevitably falls flat on its face. It was an overall humiliating way to start the day.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyEventPopularity(a, 3); applyEventPopularity(b, -1);
        return { category: "spotlight", portraits: [...p], text: <>{boldText(a.preferredName())} and ${boldText(b.preferredName())} tell the same story at the same table an hour apart. Only one version is getting repeated.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, 20); applyEventPopularity(b, 3);
        return { category: "spotlight", portraits: [...p], text: <>{boldText(a.preferredName())} steps back mid conversation and lets {boldText(b.preferredName())} finish the point. {b.preferredName()} lands it. {a.preferredName()} did that on purpose.</> }; },
    },
    {
        category: "spotlight", timeOfDay: ["night"], run: (splitIndex, gameState) => { const p = validPair(splitIndex, gameState); if (!p) return null; const [a, b] = p; applyRelationship(gameState, a, b, -10); applyEventPopularity(a, 2); applyEventPopularity(b, 2);
        return { category: "spotlight", portraits: [...p], text: <>{boldText(a.preferredName())} and {boldText(b.preferredName())} spend the whole night trying to outdo each other in front of the group. Both of them come out of it looking good.</> }; },
    },
    // trio
    {
        category: "spotlight", timeOfDay: ["night"], run: (splitIndex, gameState) => { const t = validTrio(splitIndex, gameState); if (!t) return null; const [a, b, c] = t;
        const success = (a.stats.mental + b.stats.mental + c.stats.mental / 3) >= 4; t.forEach(x => applyEventPopularity(x, success ? 20 : -15));
        const text1 = success ? `finishing the final note perfectly on a song that they hadn't even heard about until now.` : `fumbling the entire song - from start to finish, no less. This likely won't go over well with fans...`
        return { category: "spotlight", portraits: [...t], locations: ["Lounge", "Bedroom"], text: <>{boldText(a.preferredName())}, {boldText(b.preferredName())}, and {boldText(c.preferredName())} stage an impromptu karaoke night that ends with all three of them {text1}</> }; },
    },
    // group
    {
        category: "spotlight", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "spotlight", portraits: [...g], text: <>{bold.join(', ')} and {last} put on a talent show with no talent involved. It goes on far too long. It is the best thing that happens all week.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 30)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "spotlight", portraits: [...g], text: <>{bold.join(', ')} and {last} get the whole villa doing a routine they made up in about nine minutes. Somehow it is word perfect by the end.</> }; },
    },
    {
        category: "spotlight", run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, -1));
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "spotlight", portraits: [...g], locations: ["Living Room", "Backyard"], text: <>{bold.join(', ')} and {last} all try to have a conversation while speaking at the same time. No one can get a full sentence out, and it ends up becoming a pain to sit through.</> }; },
    },
    {
        category: "spotlight", timeOfDay: ["night"], run: (splitIndex, gameState) => { const g = validGroup(splitIndex, gameState, randomInt(3, 5)); if (!g) return null; g.forEach(x => applyEventPopularity(x, 2)); applyGroupRelationship(gameState, g, 10);
        const bold = g.map(c => c.preferredName()); const last = bold.pop();
        return { category: "spotlight", portraits: [...g], locations: ["Living Room", "Backyard"], text: <>{bold.join(', ')} and {last} all stay up doing impressions of each other until somebody's laughter is loud enough to wake the house up.</> }; },
    },

    // special
    // age-restricted
    {
        category: "spotlight", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.age >= 18); if (!a) return null; applyEventPopularity(a, 40);
        return { category: "spotlight", portraits: [a], locations: ["Backyard"], text: <>{boldText(a.preferredName())} hops in the pool fully clothed for a dare. The thirst comments <i>alone</i> could fuel a small city.</> }; },
    },

    // HoH
    {
        category: "sabotage", tags: ["HoH", "nomination"], run: (splitIndex, gameState) => { const v = validVillain(splitIndex, gameState); if (!v) return null; const tgt = validTarget(splitIndex, gameState, v); if (!tgt) return null; const hoh = validSolo(splitIndex, gameState, 3, c => c.hoh.isHoH); if (!hoh) return null;
        const vN = hgPreferredName(v), tN = tgt.preferredName();
        applyRelationship(gameState, v, tgt, -10); applyEventPopularity(tgt, -2); applyEventPopularity(v, -1);
        if (gameState.episode < 2) return null; return { category: "sabotage", portraits: [v, hoh, tgt], locations: ["Head of Household Room"], text: <>{boldText(vN)} gets one-on-one time with the Head of Household and makes sure {boldText(tN)}'s name comes up in the worst possible framing. Whether it worked will show in the nominations.</> }; },
    },
    {
        category: "communal", tags: ["HoH"], run: (splitIndex, gameState) => { const hoh = validSolo(splitIndex, gameState, 1, c => c.hoh.isHoH); if (!hoh) return null;
        const hN = hgPreferredName(hoh);
        return { category: "communal", portraits: [hoh], locations: ["Head of Household Room"], text: <>{boldText(hN)} is having a good time in the Head of Household room—from eating {hgPronoun(hoh, 1)} favorite snacks and candy, to listening to some relaxing tunes, it is a godsend compared to the rest of the house.</> }; },
    },
    {
        category: "communal", tags: ["HoH"], run: (splitIndex, gameState) => { const hoh = validSolo(splitIndex, gameState, 1, c => c.hoh.isHoH); if (!hoh) return null;
        const hN = hgPreferredName(hoh);
        return { category: "communal", portraits: [hoh], locations: ["Head of Household Room"], text: <>{boldText(hN)} reads a personal letter addressed directly to {hgPronoun(hoh, 1)}. The message is genuine and the delivery is even better.</> }; },
    },
    {
        category: "communal", tags: ["HoH"], run: (splitIndex, gameState) => { const hohs = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.hoh.isHoH); if (!hohs || hohs.length < 2) return null;
        const bold = hohs.map(c => c.preferredName());
        return { category: "communal", portraits: [...hohs], locations: ["Head of Household Room"], text: <>Nothing is more awkward than having to share a luxurious room together, as {listNames(bold)} would find out firsthand.</> }; },
    },
    {
        category: "communal", tags: ["HoH"], run: (splitIndex, gameState) => { const hoh = validSolo(splitIndex, gameState, 1, c => c.hoh.isHoH); if (!hoh) return null;
        const hN = hgPreferredName(hoh);
        return { category: "communal", portraits: [hoh], locations: ["Head of Household Room"], text: <>The large bed, private bathroom, separate mini-fridge... {hN} wishes {hgPronoun(hoh, 0)} could stay here for the entirety of the season.</> }; },
    },
    {
        // this might have to be the most effort ive put in a... single house event
        category: "drama", tags: ["HoH"], run: (splitIndex, gameState) => { const hoh = validSolo(splitIndex, gameState, 1, c => c.hoh.isHoH); if (!hoh) return null;
        const hN = hgPreferredName(hoh), [text, others] = generateTVMonitoring(splitIndex, gameState, [hoh]);
        return { category: "drama", portraits: [hoh, ...others], locations: ["Head of Household Room"], text: <>{hN} decides to use the TV monitor in the Head of Household room to spy on some houseguests. {text}</> }; },
    },

    // (ARCHETYPE-EXCLUSIVES)
    // goth exclusive. people are NOT getting tarot cards / doing "sunrise manifestations" in their daily lives
    {
        category: "communal", type: "positive", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 2, c => c.archetype === "Goth"); if (!a) return null; const b = validSolo(splitIndex, gameState, 2, c => c.id !== a.id); if (!b) return null;
        const charisma = a.stats.charisma >= 5, mental = b.stats.mental <= 4; applyRelationship(gameState, a, b, charisma && mental ? 10 : -10); applyEventPopularity(a, charisma && mental ? 20 : -10); applyEventPopularity(b, charisma && mental ? 10 : -20);
        const aN = a.preferredName(), bN = b.preferredName();
        const text1 = charisma ? <>gives {boldText(bN)}</> : <>stumbles a bit in trying to give {boldText(bN)}</>, text2 = mental ? `One of the selected cards reveals The Tower, resulting in ${aN} gasping for the cameras and ${bN} pretending not to be rattled (they are incredibly rattled).` : `${bN} thinks of it as nothing more than a hoax, and leaves.`;
        return { category: "communal", portraits: [a, b], text: <>{boldText(aN)} sets up a tarot table and {text1} a reading. {text2}</> }; },
    },
    {
        category: "communal", type: "negative", run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 1, c => c.archetype === "Goth"); if (!a) return null; const tgt = validTarget(splitIndex, gameState, a); if (!tgt) return null;
        applyRelationship(gameState, a, tgt, -10); applyEventPopularity(a, -1);
        return { category: "communal", portraits: [a, tgt], text: <>{boldText(a.preferredName())} leads a sunrise manifestation circle with crystals and a gratitude journal. {boldText(tgt.preferredName())} loudly asks the universe for a bacon sandwich instead. Half the circle laughs. The moment is gone.</> }; },
    },
    // paranoid exclusive
    {
        category: "communal", type: "negative", tags: ["secretTwin"], run: (splitIndex, gameState) => { const a = validSolo(splitIndex, gameState, 2, c => c.archetype === "Paranoid"); if (!a) return null;
        const tG = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.secretTwin.isTwin); if (!tG.length) return null; const id = tG[randomArrayIndex(tG)].secretTwin.twinPartner; if (!id) return null; const twin = getHouseguestById(gameState, id);
        const aN = a.preferredName(), tN = twin.preferredName(); applyRelationship(gameState, a, twin, -15); applyEventPopularity(a, -15);
        return { category: "communal", portraits: [a, twin], text: <>{boldText(aN)} gets all up close and personal on {boldText(tN)}. Something about {twin.pronoun(3)} didn't seem right. Maybe it was {twin.pronoun(1)} way of presenting {twin.pronoun()}, but before {aN} could get anywhere, {tN} backed up and brushed past {a.pronoun(3)}. Not exactly the most respectful thing to do, there.</> }; },
    },
];

function generateTVMonitoring(splitIndex: number | null | undefined, gameState: GameState, HoHs: Houseguest[]): [string, Houseguest[]] {
    let fallback: [string, Houseguest[]] = ["Nothing very interesting is happening right now, unfortunately.", []];

    let text: string = "";
    let portraits: Houseguest[] = [];
    if (Math.random() < 0.01) {
        const p = validPair(splitIndex, gameState); if (!p) return fallback;
        p.filter(c => !HoHs.some(h => h.id === c.id)); if (p.length < 2) return fallback;
        const [a, b] = p, aN = a.preferredName(), bN = b.preferredName(), hNs = listNames(HoHs.map(hoh => hoh.preferredName()));
        if (a.age < 18 || b.age < 18) return fallback;
        const catchES = HoHs.length > 1 ? "catch" : "catches";
        text = `${hNs} ${catchES} ${aN} and ${bN} making out somewhere in the garage, and promptly decides that's enough viewing for now.`;
        portraits.push(...p);
    } else if (Math.random() < 0.1) {
        const all = gameState.alliances.filter(al => al.isActive && !al.isShowmance)[randomArrayIndex(gameState.alliances)];
        if (!all) return fallback;
        const mems = all.members.map(al => getHouseguestById(gameState, al));
        const hNs = listNames(HoHs.map(hoh => hoh.preferredName())), mNs = listNames(mems.map(m => m.preferredName()));
        const whoSwore = mems.length > 2 ? "who all swore" : "who swore";
        text = `${hNs} can't help but notice ${mNs}, ${whoSwore} they never talked to each other, whispering in the kitchen.`;
        portraits.push(...mems);
    }
    return [text, portraits];
}