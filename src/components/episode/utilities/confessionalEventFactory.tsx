import React from "react";
import { calculateThreatScore, excludeHouseguests, GameState, getHouseguestById, Houseguest, nonEvictedHouseguests, nonEvictedHouseguestsSplit, randomPlayer } from "../../../model";
import { HouseEventsSceneOptions } from "../scenes/houseEventsScene";
import { HouseEvent } from "./houseEvents";
import { randomArrayIndex } from "../../../utils";
import { listNames } from "../../../utils/listStrings";
import { VetoCeremonyInformation } from "../scenes/vetoCeremonyScene";
import { ARCHETYPE_CONFESSIONALS } from "../../playerPortrait/archetypes";
import { PERSONALITY_CONFESSIONALS } from "../../playerPortrait/personalities";
import { NominationInformation } from "../scenes/nominationCeremonyScene";
import { CONFESSIONAL_TEXTS } from "./confessionals";

export interface HouseConfessional {
    houseguests: Houseguest[];
    type: string;
    tags: string[];
}

export function generateNominationConfessionalEvents(gameState: GameState, houseguests: Houseguest[], nomInfo: NominationInformation[]): HouseEvent[] {
    const hohWinners = houseguests.filter(hg => hg.hoh.isHoH);
    const povWinners = houseguests.filter(hg => hg.pov.hasVeto);
    let hohConfessionals: HouseEvent[] = []; 
    let nomConfessionals: HouseEvent[] = []; 
    let nominees: Houseguest[] = [];
    for (let info of nomInfo) {
        const noms = info.nominated;
        hohConfessionals.push({
            category: "confession",
            locations: ["Diary Room"],
            portraits: [info.hoh],
            text: <>{generateHohConfessionalText(gameState, info.hoh, info.nominated)}</>
        });
        for (let nom of noms) {
            nomConfessionals.push({
                category: "confession",
                locations: ["Diary Room"],
                portraits: [nom],
                text: <>{postNominationConfessionalText(gameState, info.hoh, nom)}</>
            });
        }
        nominees.push(...info.nominated);
    }
    const strategicPlayer = getStrategicPlayer(houseguests, [...hohWinners, ...povWinners]);
    if (strategicPlayer) {
        nomConfessionals.push({
            category: "confession",
            locations: ["Diary Room"],
            portraits: [strategicPlayer],
            text: <>{strategicConfessionalText(gameState, houseguests, strategicPlayer, randomPlayer(hohWinners), "HoH")}</>
        });
    }
    return [...hohConfessionals, ...nomConfessionals];
}

export function generateVetoConfessionalEvents(
    gameState: GameState,
    houseguests: Houseguest[],
    povInfo: VetoCeremonyInformation[]
): HouseEvent[] {
    const nominees = houseguests.filter(hg => hg.isNominated);
    let confessionals: HouseEvent[] = [];
    for (let info of povInfo) {
        const hoh = info.hoh;
        const pov = info.pov;
        if (hoh.id != pov.id)
            confessionals.push({
                category: "confession",
                locations: ["Diary Room"],
                portraits: [hoh],
                text: <>{postVetoHohConfessionalText(gameState, hoh, pov, info.saved, info.replacements)}</>
            });
        confessionals.push({
            category: "confession",
            locations: ["Diary Room"],
            portraits: [pov],
            text: <>{postVetoPovConfessionalText(gameState, hoh, pov, info.saved, nominees)}</>
        });
    }
    return confessionals;
}

export function generateConfessionalEvents(
    gameState: GameState,
    splitIndex: number | null | undefined,
    confessions: HouseConfessional[],
    options: HouseEventsSceneOptions
) {
    const houseguests = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => !c.isHidden);
    let confessionals: HouseEvent[] = [];

    confessionals.push(...generateEventReactionConfessionals(splitIndex, gameState, confessions, options));
    if (options.veto) {

    }
    while (confessionals.length < 5 && houseguests.length > confessionals.length) {
        const remainingHgs = houseguests.filter(d =>
            !confessionals.some(conf => conf?.portraits?.includes(d)) &&
            !d.hoh.isHoH
        );
        
        if (remainingHgs.length === 0) break;
        
        const generalConf = generateGeneralConfessionals(splitIndex, gameState, randomPlayer(remainingHgs));
        if (generalConf) {
            confessionals.push(generalConf);
        }
    }
    return confessionals;
}

function generateEventReactionConfessionals(
    splitIndex: number | null | undefined,
    gameState: GameState,
    confessions: HouseConfessional[],
    options: HouseEventsSceneOptions
) {
    let confessionals: HouseEvent[] = [];
    for (let confession of confessions) {
        const confessionalOptions = [];
        const confessionalTimings = [];

        const confessionalists = confession.houseguests;
        const type = confession.type;
        const tags = confession.tags;
        
        const speaking = randomPlayer(confessionalists);
        const other = randomPlayer(confessionalists, [speaking]);

        const sArchetype = speaking.archetype;
        const archChance = Math.random() < 0.3;

        const pName = other.preferredName();
        const currentData = CONFESSIONAL_TEXTS[type as keyof typeof CONFESSIONAL_TEXTS] || CONFESSIONAL_TEXTS.default;
        let matchedGroup = currentData.tags?.find(group => group.keys.some(k => tags.includes(k)));
        let selectedTexts = matchedGroup ? matchedGroup.texts : (currentData.default || []);

        confessionalOptions.push(...selectedTexts.map(t => t.replaceAll('{name}', pName)));
        if (archChance && currentData.archetypes?.[sArchetype]) {
            confessionalOptions.push(...currentData.archetypes[sArchetype].map(t => t.replaceAll('{name}', pName)));
        }
        if (currentData.timings) {
            currentData.timings.forEach(item => {
                if (item.condition(gameState, other)) confessionalTimings.push(...item.texts.map(t => t.replaceAll('{name}', pName)));
            });
        }

        const relationshipStrength = speaking.relationshipWith(gameState, other) + other.relationshipWith(gameState, speaking) / 2;
        const inGoodRelationship = relationshipStrength >= 5 && (type === "positive" || relationshipStrength >= 7);
        const inBadRelationship = relationshipStrength <= -3 || (type === "negative" && relationshipStrength <= 3);
        if (options.veto) {
            if (inGoodRelationship) {
            confessionalTimings.push(
                `With the marking ceremony shaking up the house, I'm more convinced than ever that ${other.preferredName()} is someone I need in my corner.`,
                `The markings happened, but my focus is on protecting the people who matter to my game - and ${other.preferredName()} is definitely one of them.`,
                `After today's events, I know ${other.preferredName()} is going to be crucial for my survival in this house.`
            );
            } else if (inBadRelationship) {
                confessionalTimings.push(
                    `With everything that happened at the marking ceremony, I'm definitely not going out of my way to help ${other.preferredName()} in this game.`,
                    `The markings are done, and frankly, I wouldn't be upset if ${other.preferredName()} found themselves in danger.`,
                    `After today, ${other.preferredName()} has moved way down on my priority list. There are bigger fish to fry.`
                );
            }
        } else if (options.eviction) {
            if (inGoodRelationship) {
                confessionalTimings.push(
                    `With tonight's vote approaching, I feel confident that ${other.preferredName()} and I are solid. That peace of mind is priceless.`,
                    `Going into this elimination, I know exactly who I can count on - and ${other.preferredName()} is at the top of that list.`,
                    `The culling ceremony is tonight, but I'm not worried about ${other.preferredName()}. Our loyalty runs both ways.`
                );
            } else if (inBadRelationship) {
                confessionalTimings.push(
                    `Tonight's vote is going to be interesting, but I know ${other.preferredName()} isn't someone I need to worry about protecting.`,
                    `With the elimination ceremony coming up, I'm reminded that ${other.preferredName()} is definitely not part of my long-term plans.`,
                    `The vote tonight will show everyone's true colors, but I already know where ${other.preferredName()} stands with me - and it's not good.`
                );
            }
        }

        confessionals.push({
            category: "confession",
            locations: ["Diary Room"],
            portraits: [speaking],
            text: <>{confessionalOptions[randomArrayIndex(confessionalOptions)]} {confessionalTimings[randomArrayIndex(confessionalTimings)]}</>
        });
    }
    return confessionals;
}

function generateGeneralConfessionals(
    splitIndex: number | null | undefined,
    gameState: GameState,
    houseguest: Houseguest
): HouseEvent {
    const speaking = getHouseguestById(gameState, houseguest.id);
    const archetype = speaking.archetype;
    const personality = speaking.personality;

    const activeHgs = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => !c.isHidden);
    const currentWeek = gameState.episode;
    const HoHs = activeHgs.filter(hg => hg.hoh.isHoH).sort((a, b) => speaking.relationshipWith(gameState, b) - speaking.relationshipWith(gameState, a));
    const worstHoH = getHouseguestById(gameState, HoHs[0]?.id);
    const nominees = activeHgs.filter(hg => hg.isNominated);

    // Get relationship context
    const closestAlly = getHouseguestById(gameState, activeHgs
        .filter(d => d.id !== speaking.id)
        .sort((a, b) => speaking.relationshipWith(gameState, b) - speaking.relationshipWith(gameState, a))[0].id);
    const biggestThreat = getHouseguestById(gameState, activeHgs
        .filter(d => d.id !== speaking.id)
        .sort((a, b) => calculateThreatScore(gameState, b) - calculateThreatScore(gameState, a))[0].id);

    // Context-aware confession generation
    const confessionalContexts = [
        // Episode progression context
        {
            condition: () => currentWeek <= 3,
            templates: [
                `It's early days but I'm already seeing people's true colors emerge. The social butterflies, the strategic minds, the wildcards - everyone's starting to settle into their roles.`,
                `The honeymoon phase is officially over. People are forming alliances, making enemies, and showing what they're really made of. I'm taking mental notes on everything.`,
                `Listen, I didn't come here to make summer camp friendships. While everyone else is getting comfortable, I'm studying the game and positioning myself strategically.`
            ]
        },
        {
            condition: () => currentWeek >= activeHgs.length - 4,
            templates: [
                `We're in the endgame now and I can practically taste victory. This is where smart players separate themselves from the lucky ones who just survived this long.`,
                `The house is getting smaller and the pressure is mounting. People who coasted all season are suddenly scrambling to make moves - interesting timing.`,
                `This is where legends are made. I didn't fight this hard and play this smart just to stumble at the finish line. Time to lock in and finish strong.`
            ]
        },
        // Relationship-based context
        {
            condition: () => closestAlly && speaking.relationshipWith(gameState, closestAlly) >= 60,
            templates: [
                `${closestAlly && closestAlly.preferredName()} is my ride or die in this house, but let's be crystal clear - if we're sitting in those final two chairs, I'm not handing them the win out of friendship. Love you, but not THAT much.`,
                `Me and ${closestAlly && closestAlly.preferredName()}? We're giving main character energy together. But honey, this story only has room for one winner and I didn't come here to be the sidekick.`,
                `${closestAlly && closestAlly.preferredName()} gets it - we're playing WITH each other, not FOR each other. Trust is cute, but at the end of the day, we both came here to secure the bag.`
            ]
        },
        {
            condition: () => biggestThreat && calculateThreatScore(gameState, biggestThreat) >= 40,
            templates: [
                `${biggestThreat && biggestThreat.preferredName()} is out here acting like they already won this thing. Winning challenges, playing politics, being all charming - it's honestly impressive and completely annoying. Time to humble them.`,
                `Everyone's too chicken to come for ${biggestThreat &&biggestThreat.preferredName()} because they're scared of making waves. Well guess what? I didn't come here to make friends with the competition - someone needs to take the shot.`,
                `${biggestThreat && biggestThreat.preferredName()} really said "I'm the main character" and forgot this is an ensemble cast. Baby, your reign of terror is about to have a very dramatic season finale.`
            ]
        },
        // worstHoH dynamics
        {
            condition: () => worstHoH && worstHoH.id === speaking.id,
            templates: [
                `Being Head of Household is like being the popular kid at lunch - everyone suddenly wants to be your bestie. Too bad for them, I see right through the fake smiles and desperate pitches.`,
                `This crown comes with a target, but it also comes with POWER. And honey, I look good in both. Time to make some nominations that'll have people shook.`,
                `Everyone and their mother is trying to influence my nominations. Cute effort, but I didn't win this power to do YOUR bidding - I'm playing MY game, not yours.`
            ]
        },
        {
            condition: () => worstHoH && speaking.relationshipWith(gameState, worstHoH) <= -3,
            templates: [
                `${worstHoH && worstHoH.preferredName()} is really out here thinking this little crown makes them untouchable. Baby, power is temporary but karma is FOREVER. Your time is coming.`,
                `I cannot STAND ${worstHoH && worstHoH.preferredName()} right now. Acting all high and mighty because they won one little challenge. Sir/ma'am, this is a marathon, not a sprint.`,
                `${worstHoH && worstHoH.preferredName()}'s ego is writing checks their game can't cash. But that's fine - I love watching people get humbled by their own overconfidence. The fall is gonna be SPECTACULAR.`
            ]
        },
        // Nomination context
        {
            condition: () => nominees.some(d => d && d.id === speaking.id),
            templates: [
                `Being on the block? Honestly, rude. But you know what? I'm about to campaign so hard that people forget why they wanted me gone in the first place. Watch me work.`,
                `This nomination just woke up a sleeping giant. I was playing nice-nice but now it's game ON. Time to remind everyone why keeping me is their best move.`,
                `Getting nominated really shows you who your friends are versus who's been plotting your downfall in group chats. The betrayal is noted and will be remembered.`
            ]
        },
        // Archetype-specific modern takes
        {
            condition: () => archetype === 'Social Butterfly',
            templates: [
                `I'm not just collecting friends like Pokemon cards - I'm building a whole empire of people who genuinely want to see me win. That's not luck, that's SKILL.`,
                `Everyone's obsessed with flashy challenge wins, but honey, I'm winning hearts and minds. When it's time to vote, who do you think they're gonna choose - muscles or someone who actually LISTENS to them?`,
                `I might not be throwing people around in competitions, but I can read a room better than anyone here. Social intelligence is the most underrated superpower in this game.`
            ]
        },
        {
            condition: () => archetype === 'Strategist' || archetype === 'Mastermind',
            templates: [
                `While everyone's caught up in today's petty drama, I'm already planning next week's power moves. They're playing checkers, I'm playing 4D chess, and they don't even know the game started.`,
                `I've got a mental spreadsheet of everyone's alliances, betrayals, and dirty secrets. Information is the ultimate currency, and baby, I'm RICH.`,
                `Some people follow their hearts, others flex their muscles. Me? I use my brain, and let me tell you - intelligence never goes out of style.`
            ]
        },
        {
            condition: () => archetype === 'Wannabe Villain',
            templates: [
                `Everyone thinks they know who the real villain is this season, but they have no idea what's coming. I'm orchestrating moves that will go down in reality TV history.`,
                `I'm not just here to play - I'm here to dominate. Every conversation, every alliance, every vote is all part of my master plan. These people are just pawns.`,
                `They want a villain? I'll give them the best villain this show has ever seen. I'm playing on a completely different level than these amateurs.`,
                `The thing about being a true mastermind is that nobody sees you coming until it's too late. By the time they realize what I've been doing, I'll already have won.`
            ]
        }
    ];

    // Find applicable contexts
    const applicableContexts = confessionalContexts.filter(ctx => ctx.condition());

    // Use context-specific templates if available, otherwise fall back to archetype
    let selectedTemplates: string[] = [];
    if (applicableContexts.length > 0) {
        const randomContext = applicableContexts[randomArrayIndex(applicableContexts)];
        selectedTemplates = randomContext.templates;
    } else {
        selectedTemplates.push(...ARCHETYPE_CONFESSIONALS[archetype as keyof typeof ARCHETYPE_CONFESSIONALS] || [])
        selectedTemplates.push(...PERSONALITY_CONFESSIONALS[personality as keyof typeof PERSONALITY_CONFESSIONALS] || [])
        if (!selectedTemplates.length) selectedTemplates = [
            `This game is putting me through it - mentally, physically, socially, strategically. But guess what? I'm built for this chaos and I'm thriving under pressure.`,
            `Every day here is like a masterclass in human psychology and I'm taking detailed notes. These lessons are gonna serve me well in the finale.`,
            `The competition is absolutely FIERCE, but I didn't travel all this way to be background noise. I'm adapting, evolving, and fighting for every single day.`
        ];
    }

    selectedTemplates.push(...[
        // -3
        `I mouth off at a producer during a confessional, pause, then look directly into the camera and says it better not air. It airs. The clip is up before the episode is even over.`,
        // -2
        `My confessional contains a comment about someone that sounds like a compliment until you actually listen to it. Big Brother serves it exactly as delivered.`
    ])

    return {
        category: "confession",
        locations: ["Diary Room"],
        portraits: [speaking],
        text: <>{selectedTemplates[randomArrayIndex(selectedTemplates)]}</>
    };
}

function generateHohConfessionalText(gameState: GameState, hohWinner: Houseguest, nominees: Houseguest[]) {
    const activeNominees = [...nominees];

    if (!activeNominees) return "As Head of Household, I had to make some tough decisions today.";
    
    const houseguests = nonEvictedHouseguests(gameState);

    const allies = houseguests.filter(hg => hohWinner.relationshipWith(gameState, hg) >= 50);
    const nominatedAlly = activeNominees.find(nom => allies.some(a => a.id === nom.id));
    
    const enemies = houseguests.filter(hg => hohWinner.relationshipWith(gameState, hg) <= -30);
    const nominatedEnemy = activeNominees.find(nom => enemies.some(e => e.id === nom.id));

    const threats = houseguests.filter(hg => calculateThreatScore(gameState, hg) >= 50);
    const nominatedThreat = activeNominees.find(nom => threats.some(t => t.id === nom.id));

    const totalThreatLevel = Math.abs(threats.reduce((acc, hg) => { return acc + calculateThreatScore(gameState, hg) }, 0));
    const multipleNoms = activeNominees.length > 1;

    if (nominatedEnemy && nominatedEnemy.housePopularity > 80) {
        return `Everyone loves ${nominatedEnemy.preferredName()}, and that's the problem. This house has become the ${nominatedEnemy.preferredName()} show, and that's not gonna work for my game. Popular players are dangerous players because they never get voted out. I'm doing everyone a favor by putting them up - someone had to make the hard choice.`;
    }

    if (nominatedAlly) return `I know ${nominatedAlly.preferredName()} is going to feel betrayed, and honestly, that hurts me too. But ${nominatedAlly.preferredName()} was getting too comfortable with our alliance. People were starting to see us as a power couple, and that makes me a target. Sometimes you have to cut your closest ally before they cut you. ${nominatedAlly.preferredName()} will understand... eventually.`;
    if (nominatedEnemy) return `${nominatedEnemy.preferredName()} and I have been at odds for weeks now, and I finally had the power to do something about it. They've been undermining me, talking behind my back, and trying to turn people against me. Well, now they're sitting on the block where they belong. This is what happens when you come for the Head of Household.`;
    if (nominatedThreat) return `${nominatedThreat.preferredName()} is a beast in these challenges and everyone loves them. That's exactly why they need to go. I can't let someone cruise to the finals on challenge wins and popularity. If I don't make this move now, ${nominatedThreat.preferredName()} will be impossible to beat later. This is a big game move, and I'm not apologizing for it.`;

    if (gameState.episode > 3) {
        const nominee = randomPlayer(nominees), nN = nominee.preferredName();
        return `I've been watching and listening, and ${nN} has been playing a much sneakier game than people realize. They think they're flying under the radar, but I see them whispering in corners and making side deals. I'm calling them out before they can make their move. Knowledge is power in this house.`;
    }

    if (threats.length > 2 && !nominatedThreat) {
        const biggestThreat = threats.reduce((max, t) => calculateThreatScore(gameState, t) > calculateThreatScore(gameState, max) ? t : max), bigN = biggestThreat.preferredName();
        const nominee = randomPlayer(nominees), nN = nominee.preferredName();
        return `I know people are expecting me to go after ${bigN}, but that's exactly why I didn't. ${bigN} is a huge target, and as long as they're here, people aren't looking at me. ${nN} is the type of player who could slip by unnoticed and win this whole thing. I'm taking out the sneaky threats first.`;
    }
    
    if (nominees && totalThreatLevel < 10 && threats.length > 0) {
        const biggestThreat = threats.find(t => !activeNominees.some(nom => nom.id === t.id));
        if (biggestThreat) {
            return `I made these nominations strategically because I wanted to keep my options open. ${listNames(activeNominees.map((n) => n.preferredName()))} aren't necessarily my biggest concerns this week. There are bigger threats in this house who are watching this ceremony thinking they're safe. But if one of my nominees wins the Power of Veto, suddenly I have a chance to make a much bigger move. That's the beauty of being Head of Household - you control the game, but you don't have to show your cards until you're ready.`;
        }
    }
    
    if (nominees && totalThreatLevel > 20) {
        const primaryTarget = threats.sort((a, b) => calculateThreatScore(gameState, a) - calculateThreatScore(gameState, b))[0], prN = primaryTarget.preferredName();
        const pawn = randomPlayer(nominees, [primaryTarget]), pN = pawn.preferredName();
        return `My real target this week is ${prN}. They've been playing hard and making moves, and I need them gone. ${pN} is more of a pawn in this situation - I needed a second nominee, and they were the safest option. If ${prN} wins the Power of Veto, then fine, ${pN} goes home. Either way, I'm good.`;
    }
    
    if (houseguests.length <= 8) {
        const nominee1 = randomPlayer(nominees), nominee2 = randomPlayer(nominees, [nominee1]);
        const nN1 = nominee1.preferredName(), nN2 = nominee2.preferredName();
        return `We're getting close to the end, and I'm thinking about who I want sitting next to me in those final chairs. ${nN1} is someone who could actually beat me if we're sitting together - they've made big moves and people respect their game. I'd rather face ${nN2} in the finals because I know I can win that argument.`;
    }
    
    if (gameState.episode >= 5 && allies.length < 2) {
        return `This house has gotten way too comfortable, and comfortable houses are boring houses. People have been playing it safe for too long, so I decided to shake things up. ${listNames(activeNominees.map((n) => n.preferredName()))} are about to realize that this game just got a lot more interesting. Sometimes you have to create chaos to create opportunity.`;
    }
    
    // 12. REDEMPTION ARC - Making up for past mistakes
    if (hohWinner.nominations > 0) {
        const nominee = randomPlayer(nominees), nN = nominee.preferredName();
        return `I've been on the block before, and I know how it feels. But being Head of Household gives me a chance to take control of my own game instead of just surviving someone else's moves. ${nN} has been coasting while players like me have been fighting for our lives. It's time for them to feel some pressure.`;
    }

    return `As Head of Household, I had to think about what's best for my game moving forward. ${listNames(activeNominees.map((n) => n.preferredName()))} ${multipleNoms ? "are" : "is a"} strong player${multipleNoms ? 's' : ''} who could cause problems for me down the line. This nomination is about positioning myself for the endgame and making sure I'm sitting in those final chairs. Every decision I make has to serve my strategy.`;
}

function postNominationConfessionalText(gameState: GameState, hohWinner: Houseguest, nominee: Houseguest) {
    const otherHouseguests = nonEvictedHouseguests(gameState).filter(hg => !hg.isHidden && hg.id !== nominee.id);

    const relationshipWithKeeper = hohWinner.relationshipWith(gameState, nominee);
    const currentWeek = gameState.episode;
    const otherNominees = otherHouseguests.filter(hg => hg.isNominated);

    // Find their closest allies and biggest threats
    const allies: Houseguest[] = [];
    const threats: Houseguest[] = [];

    otherHouseguests.forEach(hg => {
        const relationship = nominee.relationshipWith(gameState, hg);
        const threatLevel = calculateThreatScore(gameState, hg);

        if (relationship >= 50) {
            allies.push(hg);
        }
        if (threatLevel >= 40 || relationship <= -30) {
            threats.push(hg);
        }
    });

    // Get recent voting history for context
    const hasBeenNominatedBefore = nominee.nominations > 1;

    // Generate more varied and dramatic confessions based on multiple factors
    const confessionalOptions = [];

    // Betrayal by close ally
    if (relationshipWithKeeper >= 5) {
        confessionalOptions.push(
            `${hohWinner.preferredName()} just stabbed me right in the back! After everything we've shared, all our late-night conversations, they put me on the block like I'm nothing. This betrayal cuts deep, but it also opens my eyes. Game on.`,
            `I'm shook. ${hohWinner.preferredName()} and I had what I thought was a real alliance, but apparently I was just a pawn in their game. Well, if they want to play dirty, I can play dirty too. This war is just beginning.`,
            `The person I trusted most in this house just showed me their true colors. ${hohWinner.preferredName()} thinks they can use me and toss me aside? I'm going to make sure this decision haunts their game forever.`
        );
    }

    // Enemy nomination - expected but still painful
    if (relationshipWithKeeper <= -3) {
        confessionalOptions.push(
            `Of course ${hohWinner.preferredName()} put me on the block - we've been at each other's throats for weeks. The difference is, I'm not going down without a fight. They just gave me nothing left to lose.`,
            `${hohWinner.preferredName()} thinks they're so clever putting me up, but this is exactly the motivation I needed. I'm going to campaign harder than anyone's ever campaigned in this house.`,
            `I saw this marking coming from a mile away. ${hohWinner.preferredName()} and I can't stand each other, and now it's time to see who the house really wants to keep around.`
        );
    }

    // Strategic nomination - respect but determination
    if (relationshipWithKeeper >= 0 && relationshipWithKeeper < 5) {
        confessionalOptions.push(
            `I get it - I'm a threat and ${hohWinner.preferredName()} made a smart game move. But being smart doesn't guarantee you win. I'm about to show everyone why keeping me is the better strategic decision.`,
            `${hohWinner.preferredName()} put me on the block because I'm playing a strong game, and honestly? I respect that. But respect doesn't mean I'm going home quietly. Time to prove I deserve to be here.`,
            `This marking is scary, but it's also validating. ${hohWinner.preferredName()} sees me as enough of a threat to put me on the block, which means I've been playing better than I thought.`
        );
    }

    if (hasBeenNominatedBefore) {
        confessionalOptions.push(
            `Here we go again! I've been on this block before and I've survived every time. At some point, people need to realize that I'm impossible to get rid of.`,
            `Another marking, another chance to prove I belong here. I'm becoming the cockroach of this game - everyone keeps trying to eliminate me, but I just keep surviving.`,
            `I'm getting really tired of seeing my face on this block, but clearly I'm doing something right if people keep seeing me as a threat worth targeting.`
        );
    } else {
        confessionalOptions.push(
            `This is my first time being on the block and my heart is racing. I've watched other people go through this, but experiencing it yourself is completely different. I refuse to let this be my story.`,
            `I've managed to avoid the block until now, but my luck just ran out. The good news is I've been studying everyone's games, and I know exactly how to survive this.`,
            `Being on the block for the first time is terrifying, but it's also a reality check. I've been playing too safe, and now I need to step up my game in every way possible.`
        );
    }


    const totalThreatLevel = Math.abs(otherNominees.reduce((acc, hg) => { return acc + calculateThreatScore(gameState, hg) }, 0));
    if (otherNominees && totalThreatLevel >= 20) {
        confessionalOptions.push(
            `Being on the block next to ${listNames(otherNominees.map(noms => noms.preferredName()))} is actually perfect for me. They're a huge threat and everyone knows it. If I can frame this vote correctly, they're going home instead of me.`,
            `${listNames(otherNominees.map(noms => noms.preferredName()))} is a beast in this game, but that works in my favor. People have been looking for an excuse to get them out, and now they have one. I just need to stay off their radar.`,
            `This is David versus Goliath - me against ${listNames(otherNominees.map(noms => noms.preferredName()))}. Everyone expects them to survive, but I've got some tricks up my sleeve that might surprise people.`
        );
    }

    // Late in the game urgency
    if (currentWeek >= 8) {
        confessionalOptions.push(
            `We're in the final stretch now and every vote matters. This nomination could end my entire game, but it could also be the catalyst that propels me to the finale. Make or break time.`,
            `Being on the block this late in the game is absolutely terrifying. I can taste that final ceremony, but first I have to survive the most important vote of my life.`,
            `This late in the season, being nominated is like being handed a death sentence. But I've made it this far by defying expectations, and I'm not stopping now.`
        );
    }

    // Underdog story
    if (allies.length === 0) {
        confessionalOptions.push(
            `I'm realizing I don't have as many allies as I thought I did. This nomination is showing me exactly where I stand in this house, and it's not good. Time to get creative.`,
            `Being alone in this game is scary, but it's also liberating. I don't owe anyone anything anymore - I can play completely for myself and take whatever shots I need to take.`,
            `I'm the underdog in this vote and honestly? I kind of love it. Everyone's counting me out, which means they won't see my comeback coming.`
        );
    }

    // Strong support network
    if (allies.length >= 2) {
        const mainAlly = allies[0];
        const secondAlly = allies[1];
        confessionalOptions.push(
            `Thank god I have people like ${mainAlly.preferredName()} and ${secondAlly.preferredName()} in my corner. This nomination sucks, but knowing I have real allies makes all the difference in the world.`,
            `My alliance with ${mainAlly.preferredName()} and ${secondAlly.preferredName()} is about to be put to the test. If they come through for me now, we're going to be unstoppable moving forward.`,
            `I've invested so much in my relationships with ${mainAlly.preferredName()} and ${secondAlly.preferredName()}. Now it's time to see if that investment pays off when I need it most.`
        );
    }

    // Default fallbacks if no specific contexts apply
    if (confessionalOptions.length === 0) {
        confessionalOptions.push(
            `This marking is a wake-up call. I thought I was in a better position than this, but clearly I need to reassess my entire game strategy.`,
            `Being on the block is never fun, but it's also an opportunity to show people what I'm made of. I'm going to campaign like my life depends on it.`,
            `The game just got real for me. This marking changes everything about how I need to play moving forward. Time to adapt or go home.`
        );
    }

    return confessionalOptions[randomArrayIndex(confessionalOptions)];
}

function postVetoHohConfessionalText(
    gameState: GameState,
    hohWinner: Houseguest,
    povWinner: Houseguest,
    savedNominee: Houseguest | null,
    replacementNominees: Houseguest[] | null
) {
    if (!replacementNominees || !savedNominee) return "The Power of Veto wasn't used today, so my original nominations stand. We'll see what the house decides.";
    const replacement = randomPlayer(replacementNominees);
    
    const allies = replacementNominees.filter(nom => nom.relationshipWith(gameState, hohWinner) >= 50);
    const threats = replacementNominees.filter(nom => calculateThreatScore(gameState, nom) >= 25);
    
    const isSelf = povWinner.id === savedNominee.id;
    
    // 1. SUCCESSFUL DODGE - They got their target
    if (replacementNominees.length && threats.some(t => t.id === replacement.id)) {
        if (isSelf) {
            return `${povWinner.preferredName()} played that perfectly - saving themselves and forcing me to put up ${replacement.preferredName()}, who's been one of my biggest concerns anyway. Sometimes the Power of Veto ceremony works out exactly how I need it to. ${replacement.preferredName()} didn't get a chance to compete for safety, and now they're vulnerable. This could be the move that changes my entire game.`;
        } else {
            return `${povWinner.preferredName()} actually did me a favor by saving ${savedNominee.preferredName()}. Now I get to put up ${replacement.preferredName()}, who's been one of my biggest concerns in this house. Sometimes the Power of Veto ceremony works exactly how you want it to - ${replacement.preferredName()} didn't get a chance to compete for safety, and now they're vulnerable. This could be the move that changes my entire game.`;
        }
    }
    
    if (replacement && allies.some(a => a.id === replacement.id))
        return `This is the hardest part about being Head of Household - ${povWinner.preferredName()} saved ${povWinner.id === savedNominee.id ? "themselves" : `${savedNominee.preferredName()}`}, and now I'm forced to put up ${replacement.preferredName()}, who I actually work with. But I couldn't show my cards by refusing to nominate them. Sometimes you have to sacrifice a pawn to protect your king. ${replacement.preferredName()} will hopefully understand this was strategy, not personal.`;
    
    if (savedNominee && allies.some(a => a.id === savedNominee.id)) {
        if (isSelf) {
            return `${povWinner.preferredName()} made the smart move saving themselves. I didn't want to see them go home anyway - they're someone I can work with moving forward. ${replacement.preferredName()} was always more of a threat to my game than ${savedNominee.preferredName()} ever was. Sometimes people make the moves you secretly wanted them to make.`;
        } else {
            return `I'm actually relieved that ${povWinner.preferredName()} saved ${savedNominee.preferredName()}. I didn't want to see them go home anyway - they're someone I can work with moving forward. ${replacement.preferredName()} was always more of a threat to my game than ${savedNominee.preferredName()} ever was. Sometimes other people make the moves you secretly wanted to make all along.`;
        }
    }
    
    if (savedNominee && threats.some(t => t.id === savedNominee.id) && savedNominee.id !== povWinner.id)
        return `${povWinner.preferredName()} just made a huge mistake saving ${savedNominee.preferredName()}. They kept one of the biggest threats in this house safe, and now I'm stuck putting up ${replacement.preferredName()} instead. This completely derailed my strategy for the week. But that's this game - you make plans, and other people's decisions can blow them up instantly.`;

    if (savedNominee && savedNominee.id === hohWinner.id)
        return `${povWinner.preferredName()} did what anyone would do - they saved themselves with the Power of Veto. I can't blame them for that move, it's pure self-preservation. Now I have to put up ${replacement.preferredName()} as the replacement nominee. It's not ideal for my game plan, but I understand why they made that choice.`;
    
    if (povWinner) {
        const relationship = hohWinner.relationshipWith(gameState, povWinner);
        if (relationship >= 50) {
            if (povWinner.id === savedNominee.id) {
                return `${povWinner.preferredName()} won the Veto and rightfully took themselves off the block. While having to name ${savedNominee.preferredName()} as a replacement nominee isn't ideal for my game, I completely respect their move to secure their own safety. We didn't explicitly plan this, but a strong ally looks out for themselves first.`;
            } else {
                return `${povWinner.preferredName()} and I have been working together, so I respect their decision to save ${savedNominee.preferredName()}. We didn't discuss this beforehand, but I understand their move. Having to put up ${replacement.preferredName()} isn't ideal for me, but I'll work with whatever the game gives me. Good allies make independent decisions sometimes.`;
            }       
        } else if (relationship <= -30) {
            return `Of course ${povWinner.preferredName()} would save ${isSelf ? savedNominee.pronoun() : `${savedNominee.preferredName()} - they're probably working together`}. Now I have to put up ${replacement.preferredName()}, which wasn't my preferred outcome. ${povWinner.preferredName()} is playing their own game, and it's clearly not aligned with mine. I'll remember this move.`;
        }
    }
    
    if (replacementNominees && replacementNominees.length > 1) {
        return `The Veto ceremony changed the dynamic, but I'm still in control. ${replacement.preferredName()} going up gives me a different path to my goal. Between ${listNames(replacementNominees.map(nom => nom.preferredName()))}, I have options for who goes home. The best Heads of Household adapt their strategy when circumstances change, and that's exactly what I'm doing.`;
    }
    
    return `${povWinner.preferredName()} used the Power of Veto to save ${isSelf ? savedNominee.pronoun() : savedNominee.preferredName()}, so I had to make a replacement nomination. I chose ${replacement.preferredName()} based on what's best for my game moving forward. Every decision I make as Head of Household has to serve my long-term strategy, even when other people force my hand.`;
}

function postVetoPovConfessionalText(gameState: GameState, hohWinner: Houseguest, povWinner: Houseguest, saved: Houseguest | null, nominees: Houseguest[]) {    
    let templates = [
        `I kept the Power of Veto in my pocket because honestly? Both these nominees leaving works for my game. Sometimes the best strategy is doing absolutely nothing.`,
        `Using the Power of Veto would've blown up my whole under-the-radar strategy. Better to let everyone else make the big flashy moves while I play the long game.`,
        `Neither nominee is essential to my endgame plan, so why waste the Power of Veto? I'm saving this power for when it really matters - like when MY allies are on the block.`
    ];

    if (saved) {
        if (povWinner.id === saved.id) {
            templates = [
                `Nothing feels better in this house than holding the Veto and saving yourself.`,
                `They wanted me gone, but I had other plans. Saving myself with the Power of Veto means I'm the one taking control.`,
                `Winning the Veto and pulling myself off the block gives me the ultimate satisfaction.`
            ]
        } else {
            templates = [
                `Using the Power of Veto to save ${saved.preferredName()} was a no-brainer. They're my human shield AND my strategic partner - basically I just invested in my own survival.`,
                `I saved ${saved.preferredName()} because loyalty goes both ways in this house. Now they owe me their game, and trust me, I'm gonna collect on that debt.`,
                `The Power of Veto is the ultimate power move and I just flexed it for ${saved.preferredName()}. Everyone in this house now knows exactly where my loyalties lie - and who's got my protection.`
            ];
        }
    } else if (hohWinner.id === povWinner.id) {
        templates = [
            `Why would I use the Power of Veto when these are precisely the kind of nominations I want?`,
            `My nominees are staying there, I am not changing my mind.`,
            `For a brief moment, I was weighing the option on letting one of the nominees off the block... then I decided to stick to my guts and leave them the way they are.`
        ];
    }
    
    return templates[randomArrayIndex(templates)];
}

function getStrategicPlayer(houseguests: Houseguest[], exclusions: Houseguest[]) {
    const strategicPlayers = excludeHouseguests(houseguests, exclusions).filter(hg => 
        ['Strategist', 'Schemer', 'Leader', 'Free Agent'].includes(hg.archetype)
    );
    return strategicPlayers.length > 0 ? strategicPlayers[Math.floor(Math.random() * strategicPlayers.length)] : null;
}

function strategicConfessionalText(gameState: GameState, houseguests: Houseguest[], hero: Houseguest, hohWinner: Houseguest, type: string) {
    const nominees = houseguests.filter(hg => hg.isNominated) || [];

    const activeHouseguests = excludeHouseguests(houseguests, [hero]);
    
    // Analyze player's actual strategic position
    const allies: Houseguest[] = [];
    const threats: Houseguest[] = [];
    const targets: Houseguest[] = [];
    
    activeHouseguests.forEach(devotee => {
        const relationship = hero.relationshipWith(gameState, devotee);
        const threatLevel = calculateThreatScore(gameState, devotee);
        
        if (relationship >= 50) {
            allies.push(devotee);
        }
        if (threatLevel >= 50) {
            threats.push(devotee);
        }
        if (relationship <= -30 || (threatLevel >= 40 && relationship < 50)) {
            targets.push(devotee);
        }
    });
    
    threats.sort((a, b) => calculateThreatScore(gameState, b) - calculateThreatScore(gameState, a));
    targets.sort((a, b) => calculateThreatScore(gameState, b) - calculateThreatScore(gameState, a));
    
    const markedThreat = nominees.find(d => threats.some(t => t.id === d.id));
    const markedAlly = nominees.find(d => allies.some(a => a.id === d.id));
    
    if (type === "HoH") {
        if (markedThreat) {
            return `Finally! ${hohWinner.preferredName()} actually made a smart move going after ${markedThreat.preferredName()}. I've been watching that threat level climb for weeks. This chaos gives me perfect cover to start positioning against ${targets[0]?.preferredName() || threats[0]?.preferredName() || 'my real target'}.`;
        } else if (markedAlly) {
            return `${hohWinner.preferredName()} just made the biggest strategic blunder of their game placing ${markedAlly.preferredName()} on the block. That's MY shield, MY ally, MY strategy they're messing with. If ${markedAlly.preferredName()} goes home, ${hohWinner.preferredName()} just signed their own eviction notice.`;
        } else {
            const relationship = hero.relationshipWith(gameState, hohWinner);
            if (relationship >= 50) {
                return `${hohWinner.preferredName()} and I are on the same wavelength, so these nominations actually work in my favor. Getting rid of ${nominees[0]?.preferredName()} clears some dead weight while I keep my sights on the real prize - ${targets[0]?.preferredName() || threats[0]?.preferredName() || 'taking down the biggest threat in this house'}.`;
            } else {
                return `${hohWinner.preferredName()} is playing checkers while I'm playing chess. They're going after ${nominees[0]?.preferredName()} when they should be worried about ${threats[0]?.preferredName() || 'the actual threats'}. This Head of Household reign is gonna bite them in the ass later.`;
            }
        }
    } else {
        // General strategic thinking
        if (targets.length > 0) {
            return `I've been running the numbers and ${targets[0].preferredName()} is at the top of my hit list. They're accumulating way too much power and influence. ${allies.length > 0 ? `Good thing I have ${allies[0].preferredName()} in my corner - ` : ''}I'm cooking up the perfect plan to take them down.`;
        } else if (threats.length > 0) {
            return `${threats[0].preferredName()} thinks they're being sneaky but I see EXACTLY what they're doing. Building power, making moves, staying under the radar - classic threat behavior. Time to blow up their game before they blow up mine.`;
        } else {
            return `Right now I'm sitting pretty in this house. ${allies.length > 0 ? `${allies[0].preferredName()} has my back, ` : ''}My threat level is manageable, and I'm building all the right relationships. Sometimes the best strategy is letting everyone else make the messy moves first.`;
        }
    }
    
}

/*

function generateRandomConfessionals(timing) {
    const activeDevotees = gameState.devotees.filter(d => !d.isEliminated && !d.notYetEntered);
    const markedDevotees = gameState.marked?.map(id => gameState.devotees.find(d => d.id === id)) || [];
    const confessionals = [];
    
    if (timing === 'post-marking') {
        // worstHoH STRATEGIC CONFESSIONAL - Always priority
        if (gameState.worstHoH) {
            const worstHoHTargets = markedDevotees.map(d => d.preferredName()).join(' and ');
            const worstHoHConf = generateworstHoHStrategicConfessional('post-marking', worstHoHTargets);
            confessionals.push(worstHoHConf);
        }
        
        // MARKED DEVOTEE CONFESSIONAL - Reaction to being nominated
        if (markedDevotees[0]) {
            const markedConf = generateMarkedDevoteeConfessional(markedDevotees[0]);
            confessionals.push(markedConf);
        }
        
        // STRATEGIC PLAYER CONFESSIONAL - About the nominations
        const strategicPlayer = getStrategicPlayer(activeDevotees, [gameState.worstHoH?.id, ...gameState.marked]);
        if (strategicPlayer) {
            const strategicConf = generateStrategicConfessional(strategicPlayer, 'post-marking');
            confessionals.push(strategicConf);
        }
        
    } else if (timing === 'pre-culling') {
        // PENDANT WINNER CONFESSIONAL - About their decision
        if (gameState.pendantWinner) {
            const pendantConf = generatePendantConfessional(gameState.pendantWinner);
            confessionals.push(pendantConf);
        }
        
        // VOTING STRATEGY CONFESSIONAL
        const voter = getRandomDevotee(activeDevotees.filter(d => 
            d.id !== gameState.worstHoH?.id && 
            !gameState.nominees?.some(nom => nom.id === d.id)
        ));
        if (voter) {
            const votingConf = generateVotingConfessional(voter);
            confessionals.push(votingConf);
        }
        
        // RELATIONSHIP FOCUSED CONFESSIONAL
        const socialPlayer = activeDevotees.find(d => 
            ['Social Butterfly', 'Witty Confessionalist'].includes(d.archetype.preferredName())
        );
        if (socialPlayer) {
            const relationshipConf = generateRelationshipConfessional(socialPlayer);
            confessionals.push(relationshipConf);
        }
    }
    
    // Fill up to 5-6 confessionals as requested
    while (confessionals.length < 5 && activeDevotees.length > confessionals.length) {
        // Add more diverse confessionals
        const remainingDevotees = activeDevotees.filter(d => 
            !confessionals.some(conf => conf.devotee === d.preferredName()) &&
            d.id !== gameState.worstHoH?.id
        );
        
        if (remainingDevotees.length === 0) break;
        
        const randomDevotee = remainingDevotees[Math.floor(Math.random() * remainingDevotees.length)];
        const generalConf = generateGeneralConfessional(randomDevotee);
        if (generalConf) {
            confessionals.push(generalConf);
        }
    }
    
    return confessionals.slice(0, 6); // Limit to 6 confessionals max
}

function generateEntitysDevoteeResultConfessional(devotee, outcome, result) {
    const isSuccess = outcome === 'success';
    let confessionalText = '';
    
    if (isSuccess) {
        // Success confessional
        confessionalText = `I can't believe I actually pulled it off! The Entity gave me this impossible task and somehow I managed to complete it. ${result.preferredName()} - this could be exactly what I need to change my position in this game. The weight is finally off my shoulders, but now I have to be smart about how I use this advantage.`;
    } else {
        // Failure confessional
        confessionalText = `I failed. The Entity trusted me with a task and I couldn't deliver. Now I have to face the consequences - ${result.preferredName()}. This is a disaster for my game. I was already in a tough spot, and now things just got so much worse. I don't know how I'm going to recover from this.`;
    }
    
    // Store this special confessional (it will appear in the next episode's confessionals)
    if (!gameState.specialConfessionals) gameState.specialConfessionals = [];
    gameState.specialConfessionals.push({
        devotee: devotee.preferredName(),
        text: confessionalText,
        tone: isSuccess ? 'triumphant' : 'devastated',
        episode: gameState.currentWeek,
        type: 'entitys-devotee-result'
    });
    
    return {
        devotee: devotee.preferredName(),
        text: confessionalText,
        tone: isSuccess ? 'triumphant' : 'devastated'
    };

    function hhGenFinalistSpeech(finalist) {
    const mental   = finalist.stats?.mental   || 5;
    const charisma = finalist.stats?.charisma || 5;
    const r  = hhBuildFinaleResume(finalist);
    const mk = pool => pool[Math.floor(Math.random() * pool.length)];
    const parts = [];

    // Opening: establish who they are this season.
    if (r.compWins >= 4) parts.push(mk([
        `Let me start with the scoreboard. I won ${r.hhWins} Head Hasbeen comps and ${r.vetoWins} vetoes in that house.`,
        `I did not coast into this seat. ${r.compWins} competition wins is how I got here, and I want that on the record.`,
    ]));
    else if (r.timesNom >= 3) parts.push(mk([
        `You all put me on the block ${r.timesNom} times, and I am still sitting in this chair.`,
        `I was the easiest target in that house. ${r.timesNom} nominations, and I survived every single one.`,
    ]));
    else if (mental >= 7) parts.push(mk([
        `I played this game with a plan from the first night, and I want to walk you through it.`,
        `Nothing I did in that villa was an accident. Every vote I cast had a reason behind it.`,
    ]));
    else if (charisma >= 7) parts.push(mk([
        `The way I see it, this game comes down to people, and I never lost sight of that.`,
        `I built real relationships in that villa, and that is what carried me to this seat.`,
    ]));
    else parts.push(mk([
        `Nobody had me winning this when we walked in, and I understand that.`,
        `I am not the loudest player you sat with this summer, but I am the one still standing.`,
    ]));

    // Specific middle beats, drawn from actual game data.
    const mids = [];
    if (r.evictedJurors.length) {
        const e = r.evictedJurors[0];
        mids.push(e.asHoH
            ? `When I had the power, I used it. I sent ${e.juror.preferredName().split(' ')[0]} home in cycle ${e.week}, because letting that game stay in the house beats me at the end.`
            : `I cast the vote that sent ${e.juror.preferredName().split(' ')[0]} out the door, and I would make that call again tonight.`);
        if (r.evictedJurors.length >= 2) mids.push(`Look around this jury. I had a hand in sending a lot of you home, and I am not going to stand here and apologize for it.`);
    }
    if (r.alliances.length) {
        const a = r.alliances[0];
        const who = _hhAllyList(a.partners);
        if (a.preferredName() && a.ranHouse) mids.push(`${who} built ${a.preferredName()}, and for a long stretch in there that group ran the house.`);
        else if (a.preferredName()) mids.push(`${who} built ${a.preferredName()}, and that alliance had my back when the votes got tight.`);
        else mids.push(`${who} had each other's backs from early on, and that trust is a big part of why I am sitting here.`);
    }
    if (r.nominatedJurors.length && !r.evictedJurors.length) {
        const n = r.nominatedJurors[0];
        mids.push(`I put ${n.juror.preferredName().split(' ')[0]} on the block in cycle ${n.week}. It was never personal. It was the move the game asked me to make.`);
    }
    if (r.timesNom >= 2 && r.compWins < 4) mids.push(`Every time my name went up on that wall, I found a way to win my way to safety or talk myself off the block.`);
    if (r.duelWins >= 1) mids.push(`I went to the eviction duel and fought my way back into this game ${r.duelWins === 1 ? 'when it mattered most' : `${r.duelWins} separate times`}. That is not luck. That is refusing to go home.`);
    if (r.botbWins >= 1) mids.push(`I won the Battle of the Block with my safety on the line, and that one comp kept my whole game breathing.`);
    if (r.bbSaves >= 1) mids.push(`The house threw me in a Blockbuster to get me out, and I won my way off the block anyway.`);
    if (r.twists.length) mids.push(`${r.twists[0].text}.`);
    if (r.twists.length >= 2) mids.push(`${r.twists[1].text}.`);
    if (!mids.length) mids.push(`I adapted week to week, I read the room, and I made the right call when it actually counted.`);

    const firstMid = mk(mids);
    parts.push(firstMid);
    const others = mids.filter(m => m !== firstMid);
    if (others.length && Math.random() < 0.6) parts.push(mk(others));

    // Close: the ask.
    parts.push(mk([
        `So when you vote tonight, vote for the game that actually got somebody to this seat. I believe that game is mine.`,
        `I am not asking you to like the way I played. I am asking you to respect that it worked.`,
        `That is my game, start to finish. I am proud of it, and I am asking for your vote.`,
    ]));

    return parts.join(' ');
}

function hhGenJuryVoteQuote(juror, target, reason, mode) {
    const tn  = target.preferredName().split(' ')[0];
    const dir = hhGetRelStrengthDir(juror.id, target.id);
    const fSm = hhState.seasonMemory?.contestants?.[target.id];
    const hhW = fSm?.hhWins   || 0;
    const vtW = fSm?.vetoWins || 0;
    const tNom = fSm?.timesNominated || 0;
    const mk  = pool => pool[Math.floor(Math.random() * pool.length)];

    // Personal: strong positive directional relationship - quotes split by juror mode
    if (reason === 'personal' || dir >= 6) {
        if (mode === 'bitter') return mk([
            `${tn} was there for me when this game got hard. I do not forget that.`,
            `Do I need to explain this? ${tn}. Done.`,
            `${tn} is the only person in that finale I trust. My vote is not a surprise.`,
            `I walked out of that villa with one person I would stand up for. ${tn}.`,
        ]);
        if (mode === 'respect') return mk([
            `${tn} played with integrity the whole way through. That matters to me tonight.`,
            `${tn}. No question.`,
            `I knew who I was voting for before I walked in here. ${tn}.`,
            `${tn} had my back in that villa. I have theirs tonight.`,
        ]);
        return mk([
            `My vote is ${tn}. No question.`,
            `${tn}. Everything that happened in that villa makes this an easy vote.`,
            `I knew who I was voting for before I walked in here. ${tn}.`,
            `${tn} had my back in that villa. I have theirs tonight.`,
        ]);
    }

    // Comp resume: finalist won a lot - bitter voters are reluctant, respect voters are enthusiastic
    if (reason === 'resume' || hhW + vtW >= 4) {
        if (mode === 'bitter') return mk([
            `I am not going to pretend the wins did not happen. ${tn}.`,
            `${hhW + vtW} wins. ${tn}. That is my vote. I am not thrilled about it.`,
            `The numbers point to ${tn}. I am going with the numbers.`,
        ]);
        return mk([
            `${hhW + vtW} competition wins. You cannot argue with that record. ${tn}.`,
            `I am voting for the person who won when it mattered. ${tn}.`,
            `${tn} ran this game from the front. That kind of play earns this vote.`,
            `When the social game was not enough, ${tn} won comps. That is how you prove yourself. ${tn}.`,
        ]);
    }

    // Grudge: juror voting for the finalist who treated them better (or punishing the one who didn't)
    if (reason === 'grudge') return mk([
        `I am not voting for ${tn} because I like them. I am voting for them because they played the better game. That is all this is.`,
        `Game vote, not a personal one. ${tn} played harder. Done.`,
        `${tn} and I did not always agree in that villa. They still outplayed everyone. I have to respect it.`,
        `I was not ${tn}'s biggest supporter. I am still voting for them. This is about the game.`,
    ]);

    // Scrappy: voting for the underdog who survived a lot of nominations
    if (tNom >= 3) return mk([
        `${tn} was nominated ${tNom} times and is still standing. That is not luck. My vote is ${tn}.`,
        `This jury tried to send ${tn} home ${tNom} times. It did not work. Tonight I am giving them the win.`,
        `I watched ${tn} survive everything this game threw at them. I am not going to disrespect that.`,
    ]);

    // Reluctant: lukewarm relationship, close call - bitter voters are blunter
    if (reason === 'reluctant' || dir < 0) {
        if (mode === 'bitter') return mk([
            `This is not who I wanted to vote for. Here we are. ${tn}.`,
            `Neither of them gave me a reason to feel good about this. ${tn} gave me the least reason to feel bad. ${tn}.`,
            `I sat with this for a long time. ${tn}. That is my answer and I am not happy about it.`,
        ]);
        return mk([
            `This was not an easy vote. At the end of the night it is ${tn}.`,
            `I went back and forth. I am landing on ${tn}.`,
            `Neither option was clear-cut for me. ${tn}.`,
            `I am not at peace with this. But my vote is ${tn}.`,
        ]);
    }

    // Default: strategic
    if (mode === 'respect') return mk([
        `${tn} made the right moves when they counted. That is what this vote is about.`,
        `I am voting for the person who read this game better than anyone else. ${tn}.`,
        `${tn} outplayed everyone here, including me. That earns the win.`,
    ]);
    return mk([
        `I am voting for ${tn}. Better game. End of story.`,
        `This is not personal. ${tn} made the bigger moves and earned this vote.`,
        `${tn} outplayed everyone here, including me. That earns the win.`,
        `I am voting for the best player in this finale. That is ${tn}.`,
    ]);
}

function hhGenJuryQuestionResponse(finalist, questionKey, juror) {
    const charisma  = finalist.stats?.charisma || 5;
    const mental    = finalist.stats?.mental   || 5;
    const sm        = hhState.seasonMemory?.contestants?.[finalist.id];
    const jSm       = hhState.seasonMemory?.contestants?.[juror.id];
    const hhWins    = sm?.hhWins    || 0;
    const vetoWins  = sm?.vetoWins  || 0;
    const timesNom  = sm?.timesNominated || 0;
    const jfn = juror.preferredName().split(' ')[0];
    const mk  = pool => pool[Math.floor(Math.random() * pool.length)];

    // Game history between finalist and juror
    const nominatedJuror    = (jSm?.nominatedBy || []).some(e => e.nominatorId === finalist.id);
    const jurorNominatedMe  = (sm?.nominatedBy  || []).some(e => e.nominatorId === juror.id);
    const totalCompWins     = hhWins + vetoWins;
    // Did the finalist vote to evict the juror in any episode?
    const votedOutJuror = (hhState.episodes || []).some(ep =>
        [ep._evictionVotes, ep._evictionVotes2].filter(Boolean).some(ev =>
            (ev.votes || []).some(v => v.voter?.id === finalist.id && v.target?.id === juror.id)
        )
    );
    // Was the juror evicted in an episode where the finalist was HoH?
    const hhWhenJurorLeft = (hhState.episodes || []).some(ep =>
        ep.hhWinnerId === finalist.id &&
        [ep._evictionVotes, ep._evictionVotes2].filter(Boolean).some(ev => ev.evicted?.id === juror.id)
    );

    // Voice: what kind of player are they
    const isSocial     = charisma >= 7 && charisma >= mental;
    const isStrategic  = mental >= 7 && mental > charisma;
    const isCompBeast  = totalCompWins >= 4;
    const isFighter    = timesNom >= 3;
    const stat         = Math.max(charisma, mental);
    const isWeak       = stat < 5;

    // Impact score: stat quality + small random variance
    let juryImpact = stat >= 9 ? 3 : stat >= 7 ? 2 : stat >= 5 ? 1 : stat >= 4 ? 0 : stat >= 3 ? -2 : -4;
    const roll = Math.random();
    if (roll < 0.15) juryImpact = Math.max(-4, juryImpact - 1);
    else if (roll > 0.85) juryImpact = Math.min(3, juryImpact + 1);

    // Data-driven answer: if there is concrete history with this juror, address it
    // head on before falling back to the generic per-key responses below.
    const _gr = _hhFinaleGrievance(finalist, juror);
    if (typeof questionKey === 'string' && questionKey.indexOf('g_') === 0 &&
        (_gr.kind === 'evicted' || _gr.kind === 'betrayed' || _gr.kind === 'nominated' || _gr.kind === 'ally')) {
        let _gt;
        if (_gr.kind === 'evicted') {
            _gt = mk((isStrategic || isCompBeast) ? [
                `${jfn}, I am not going to dress it up. You were dangerous, so I moved on you before you could move on me. That is not a knock on you. That is me respecting your game enough to get out in front of it.`,
                `${jfn}, getting you out was one of the best calls I made all season. You had the relationships and the resume to beat me at the end, and I was not about to hand you that. I would do it the same way again.`,
            ] : [
                `${jfn}, that vote was hard and I know it stung. But I had to look out for my own game, and leaving you in that house was a risk I could not take. I hope from over there you can see why.`,
                `${jfn}, I actually cared about you in there, and that is exactly why I could not keep you around. It was the game. It was never personal.`,
            ]);
        } else if (_gr.kind === 'betrayed') {
            _gt = mk([
                `${jfn}, I am not going to pretend ${_gr.allianceName ? _gr.allianceName : 'what we had'} did not matter, because it did. But the game got to a point where I had to choose myself, and in cycle ${_gr.week} I made that call. I will own it instead of lying to you about it now.`,
                `${jfn}, you trusted me and I made a move on you anyway. That is the ugly part of this game. I would rather look you in the eye and admit it than insult you with an excuse.`,
            ]);
        } else if (_gr.kind === 'nominated') {
            _gt = mk([
                `${jfn}, I put you up in cycle ${_gr.week} because at that moment it was the play that kept me safe and kept my game moving. I am not going to apologize for a clean strategic move.`,
                `${jfn}, that nomination was strategy, not spite. You were a threat sitting close to me, and I handled it. That is a big part of why I am in this seat.`,
            ]);
        } else {
            _gt = mk([
                `${jfn}, you and me was the realest thing I had in that house. ${_gr.allianceName ? _gr.allianceName + ' carried us both a long way.' : 'We carried each other a long way.'} I am asking you to finish what we started and put me through tonight.`,
                `${jfn}, I never once made a move against you and you know that. The trust we built is one of the things I am proudest of, and I would be honored to have your vote.`,
            ]);
        }
        return { juryImpact, text: _gt };
    }

    // Every other question: answer with a specific, season-data-driven response that
    // cites real weeks, names and moves. Only falls through to the legacy generic pool
    // below if the finalist has no recorded history at all.
    const _specAns = _hhSpecificAnswer(finalist, questionKey, juror, hhBuildFinaleResume(finalist));
    if (_specAns) return { juryImpact, text: _specAns };

    // Pick text for each question key, branching by voice
    let text;

    if (questionKey === 'h1') {
        // "At what point did the game matter more than the people you cared about?"
        if (isWeak) {
            text = mk([
                `${jfn}, I do not have a clean answer to that. The game just got louder week by week and I am still sitting with it.`,
                `I do not know that there was one moment. I think I lost track of the line somewhere along the way.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, that trade-off never felt clean to me. I made game moves and I meant every relationship I built. Both were real at the same time.`,
                `I never chose the game over the people. I chose to stay in it. The people who feel hurt are the ones who thought I would play a different game.`,
                `${jfn}, if I had put people above the game I would be sitting where you are right now. I chose to stay. That is not the same as not caring.`,
            ]);
        } else if (isStrategic) {
            text = mk([
                `${jfn}, that is built into this game from day one. I was never confused about what I came here to do. I made my calls and I stand by every one of them.`,
                `The trade-off you are describing was one I accepted before I walked in. Every decision I made was a game decision. I never apologized for that and I am not starting now.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `${jfn}, I was in comps every week. The game always mattered. I showed up and competed and that is how I stayed. That was never going to change.`,
                `I proved where I stood every week in those competitions. ${hhWins} Head Hasbeen wins. ${vetoWins} vetoes. That is what prioritizing the game looks like.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I never stopped caring about people. I just did not let that stop me from playing the game I came here to play.`,
                `Both things were true the whole time. I cared about the people in that villa and I played to win. Those two things do not cancel each other out.`,
            ]);
        }

    } else if (questionKey === 'h2') {
        // "What you said about me when I was not in the room -- say it to my face."
        if (isWeak) {
            text = mk([
                `${jfn}, I said some things in that house I am not proud of. I do not think repeating them here helps either of us.`,
                `I hear you. I said things I should not have. I own that and I am not going to make it worse right now.`,
            ]);
        } else if (hhWhenJurorLeft) {
            text = mk([
                `${jfn}, I said you were the biggest threat to my game and I had to be the one to do something about it. I was Head Hasbeen that week. I used it. I am saying that to your face right now.`,
                `${jfn}, what I said was that you were coming for me and I needed to get there first. That is why I put you on the block when I had the power. That is the straight answer.`,
            ]);
        } else if (votedOutJuror) {
            text = mk([
                `${jfn}, I said you were a threat I could not let get to the end. And I voted to evict you. I am telling you directly now because you asked me to and you deserve the honest version.`,
                `${jfn}, I told people in that house I needed to vote you out when the moment came. Then the moment came and I did. I am not going to soften that.`,
            ]);
        } else if (nominatedJuror) {
            text = mk([
                `${jfn}, I said you were a threat I needed to handle. I put you on the block to prove it. I am saying it to your face now.`,
                `${jfn}, I told people nominating you was the right game call. I still believe that. I am not going to soften it because you are sitting in front of me.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, I said you were someone I did not want to go up against at the end. That is the version of this you deserve to hear.`,
                `${jfn}, what I said was that you were better at this game than people gave you credit for. That was never a bad thing to say about someone.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I said you were playing a smart game and I was not sure I could beat you if we both made it here. That is what I said. Now you know.`,
                `${jfn}, I said you read the house better than most people in it. I am saying it right now.`,
            ]);
        }

    } else if (questionKey === 'h3') {
        // "Tell me why I am wrong about the way you played."
        if (isWeak) {
            text = mk([
                `${jfn}, I am not sure I can convince you tonight. I played the best game I knew how and I know it did not look clean from where you were sitting.`,
                `I do not think I can change your mind. I just hope the rest of the jury sees it differently.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `${jfn}, ${totalCompWins} competition wins. I did not hide behind anybody. I competed every week and I kept myself safe. That is what good gameplay looks like. I am asking you to call it what it is.`,
                `${jfn}, look at the scoreboard. ${hhWins} Head Hasbeen wins and ${vetoWins} vetoes. If you do not respect that game then I do not know what game you wanted to see played.`,
            ]);
        } else if (isStrategic) {
            text = mk([
                `${jfn}, every call I made had a reason. I can walk you through any one of them right now. Nothing I did was random or cruel. It was calculated. That is the game you came here to play.`,
                `My game was not dirty. It was deliberate. I looked at every situation and made the move that kept me in the best position. I am not going to apologize for being good at it.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I played a hard game. Every person in this jury was affected by my moves for game reasons, not personal ones. I stayed on the right side of that line the whole time.`,
                `${jfn}, I hear you. But I want to push back. What I did was strategic and it worked. I think you can respect the result even if you do not like every step of the path.`,
            ]);
        }

    } else if (questionKey === 'h4') {
        // "Walk me through one decision that hurt someone and tell me if you would do it again."
        if (isWeak) {
            text = mk([
                `There is a call I made that I still think about. I am not sure I would do it the same way. I hurt someone and I do not think the game required it to go that way.`,
                `I made moves that hurt people. Some of them were necessary. Some of them were not. I am still working out which was which.`,
            ]);
        } else if (hhWhenJurorLeft) {
            text = mk([
                `${jfn}, the decision I made when I was Head Hasbeen and you were on the block. I had the power and I used it to send you home. That is the decision you are asking about. Would I do it again? Yes. You were the biggest threat in that house at that point.`,
                `${jfn}, when I won Head Hasbeen I put you up and used that week to get you out. That was the call and it hurt someone I had a real connection with in that villa. I would still make it because I came here to win.`,
            ]);
        } else if (votedOutJuror) {
            text = mk([
                `${jfn}, I voted to evict you. I knew what it would cost and I made the call anyway because you were a real threat to my game. That is the decision. I would make it again.`,
                `The vote I cast that sent ${jfn} home. I knew it would hurt. I knew it would cost me. I made it because at that point it was the right game move. I would make the same call.`,
            ]);
        } else if (nominatedJuror) {
            text = mk([
                `${jfn}, putting you on the block. I did not have to do it that week. I had another option. I chose you because you were the bigger threat to my game. Would I do it again? Yes.`,
                `${jfn}, nominating you. I knew it would cost me your vote and I made the call anyway. I would make it again.`,
            ]);
        } else if (jurorNominatedMe) {
            text = mk([
                `${jfn}, the week after you nominated me. I had to make a decision to protect my game. It hurt someone I had trusted. I would make the same call again because that is what survival looked like that week.`,
            ]);
        } else {
            text = mk([
                `The hardest call I made was voting out someone I considered a genuine ally. I told them we were good. I broke that. The game shifted and I shifted with it. I would do it again because it kept me here.`,
                `I made a deal that I broke when the numbers changed. The person on the other end of that deal is in this room. I would make the same call again. That move is part of why I am sitting here.`,
                `I put a friend on the block. I told them I would not. I did it anyway because the game required it. That one cost me sleep. I would still do it again.`,
            ]);
        }

    } else if (questionKey === 'h5') {
        // "Is there a line between ruthless and dirty? Do you think you crossed it?"
        if (isWeak) {
            text = mk([
                `I do not think I crossed that line but I understand why some people see it that way. I played harder than people expected.`,
                `I was trying to play the right way. I may have stepped over that line at times. That is something I am still sitting with.`,
            ]);
        } else if (isStrategic) {
            text = mk([
                `Ruthless means making the best game call even when it is painful. Dirty means lying for no reason or making it personal. Every move I made had a game reason. That is not dirty. That is the game.`,
                `There is a line and I did not cross it. I played hard. I did not lie to people's faces for fun. Show me the move I made that had no game logic behind it and I will answer for it.`,
            ]);
        } else {
            text = mk([
                `Ruthless and dirty are not the same thing. I stayed on the right side of that line. Every person in this jury was affected by my game for strategic reasons, not personal ones. I stand by that.`,
                `${jfn}, I was ruthless. I was not dirty. Ruthless means you play to win. Dirty means you hurt people outside the game. I never did that.`,
            ]);
        }

    } else if (questionKey === 'n1') {
        // "Name one thing you did that you are proud of."
        if (isWeak) {
            text = mk([
                `I am proud I am still here. A lot of people did not think I would make it and I proved them wrong.`,
                `I am proud I kept going when it would have been easy to check out.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `${hhWins} Head Hasbeen wins and ${vetoWins} vetoes. I am most proud of that record because I earned every one of those. I did not hide and I did not float. I showed up and I won.`,
                `I am most proud of the comp record. ${totalCompWins} wins across this whole season. People knew I was a threat and they could not stop me.`,
            ]);
        } else if (isFighter) {
            text = mk([
                `I am most proud of surviving ${timesNom} nominations. Every week this house tried to send me home. I am still here. That took a different kind of fight than any comp win.`,
                `Being nominated ${timesNom} times and still making it to this seat. I earned this the hardest way.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `The thing I am most proud of is that I kept real relationships in a game designed to destroy them. That is harder than winning a comp and I do not think it gets enough credit.`,
                `I built an alliance that held together until it needed to break. Keeping people aligned that long took real work. I am proud of that.`,
            ]);
        } else {
            text = mk([
                `The thing I am most proud of is staying steady when this game tried to rattle me. There were weeks I could have panicked. I did not. I made clear calls under pressure and that is what kept me here.`,
                `I am most proud of the week I turned the game in my favor through conversations alone. No comp win, no veto. Pure game.`,
            ]);
        }

    } else if (questionKey === 'n2') {
        // "What did people miss about you?"
        if (isWeak) {
            text = mk([
                `People just underestimated me. I do not have a more complicated answer than that.`,
                `They probably thought I would not last. I lasted.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `They missed that I was coming for every comp. People thought I would tire out or get complacent. I never did. ${totalCompWins} wins is the proof.`,
                `People kept counting me out after wins because they thought the target on my back would get me. It never did. That mental edge is what they missed.`,
            ]);
        } else if (isFighter) {
            text = mk([
                `They missed how hard I was fighting to stay. I was nominated ${timesNom} times and every single week I found a way to stay. People thought I was on borrowed time. I was never on borrowed time.`,
                `They missed the survival instinct. Every time I was on the block, people wrote me off. That is exactly what I wanted them to think.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `They missed how many conversations I was having that no one knew about. I was always talking to people. Always building something. It just looked effortless because I worked to make it look that way.`,
                `People thought I was just likable. They missed that I was using every relationship to move the game in my direction.`,
            ]);
        } else {
            text = mk([
                `They missed that I was running a game from the moment I walked in. People thought I was just getting by. I was watching every vote, every conversation, every shift. I was never along for the ride.`,
                `They read me as a number. I was never just a number. I had a plan every week and I worked it.`,
            ]);
        }

    } else if (questionKey === 'n3') {
        // "Which jury member did you read wrong?"
        // Always name the juror asking -- that is the specific, personal answer
        if (isWeak) {
            text = mk([
                `${jfn}, honestly, I think I misread a few people in this room and you were one of them. I did not have the full picture.`,
                `${jfn}, you. I did not always know where you stood and it cost me.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, I am going to be straight with you. I misread you. I thought I knew where our relationship stood and I was wrong. You had a stronger read on this house than I gave you credit for and I should have paid closer attention to that.`,
                `${jfn}, you. I thought the connection we built gave me a clear picture of how you were playing. It did not. You were doing more than I saw and I respect that now.`,
            ]);
        } else if (isStrategic) {
            text = mk([
                `${jfn}, honestly, you. I had you placed in my read of the house and I placed you wrong. You made moves I did not account for and they affected my game in ways I only understood after the fact.`,
                `${jfn}, I got your game wrong. I thought I knew how you would vote in certain situations. I was off and that gap cost me.`,
            ]);
        } else {
            text = mk([
                `${jfn}, you. I thought I had a read on you and it was not accurate. You had more influence on what happened in that villa than I understood at the time.`,
                `I am going to be direct, ${jfn}. I misread you. I underestimated your game and that was a mistake I carried for longer than I should have.`,
            ]);
        }

    } else if (questionKey === 'n4') {
        // "What was your biggest weakness?"
        if (isWeak) {
            text = mk([
                `My biggest weakness was probably playing it too safe. I did not always make the bold call when the game asked for it.`,
                `I overthought decisions. I had the right read and then second-guessed myself. That slowed me down.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `My biggest weakness was the target that came with every comp win. After a while I knew people were gunning for me and I let that make me reactive instead of proactive. I should have got out ahead of it more.`,
                `The comp record put a giant target on my back. Managing that relationship pressure was harder than any challenge I won. I could have handled it better socially.`,
            ]);
        } else if (isFighter) {
            text = mk([
                `My biggest weakness was being on the block ${timesNom} times. Every time I was up there I was playing defense instead of offense. I never got comfortable enough to run the game the way I wanted to.`,
                `Surviving nominations takes energy. My weakness was that I spent so much time surviving that I did not always get to play the game I had planned.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `My biggest weakness was staying loyal to people longer than the game required. I knew when certain relationships had stopped serving my game and I waited anyway. That cost me votes I could have had.`,
                `I cared too much about not burning people. There were moments I needed to make a hard call and I softened it. That is the honest answer.`,
            ]);
        } else {
            text = mk([
                `My biggest weakness was locking in my reads too early. I made decisions based on what I thought I knew and stopped checking. I paid for that more than once.`,
                `I got too comfortable in the middle of the season. There was a stretch where I thought I had it under control. That is when I was most exposed.`,
            ]);
        }

    } else if (questionKey === 'n5') {
        // "This jury is split on you -- what do you say to both groups?"
        if (isWeak) {
            text = mk([
                `I just want everyone to vote for what they think is right. I played the game I knew how to play.`,
                `I am not going to tell anyone how to feel about my game. I played it and I will live with the result.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `To the people who respected my game: thank you for seeing it. To the people who do not: I hear you. The moves I made that hurt you were game moves. Not personal ones. I need you to separate those two things before you vote.`,
                `For the people who liked how I played: I hope I gave you something real to root for. For the people who did not: I never made a move outside the game. Every call had a reason. I am asking for a game vote, not a friendship vote.`,
            ]);
        } else if (isStrategic || isCompBeast) {
            text = mk([
                `To the jury members who respect the game: I played it hard and I played it right. To the ones who do not: look at the results. I am sitting here. Every call I made contributed to that. Vote for the game, not the feelings.`,
                `To the people who respect strategy: I gave you a full season of it. To the people who are frustrated with me: every move I made that touched you had a game reason. I am asking you to weigh those separately tonight.`,
            ]);
        } else {
            text = mk([
                `To the people on my side: thank you. I gave everything I had. To the people who are not: I hear you. I made calls that cost people their spot in this game. I am not asking you to be fine with that. I am asking you to vote for the player, not the moves.`,
            ]);
        }

    } else if (questionKey === 'p1') {
        // "Describe your game in one sentence."
        if (isCompBeast) {
            text = mk([
                `I won ${totalCompWins} competitions, kept myself safe when I needed to, and never gave this house the chance to come for me.`,
                `${hhWins} Head Hasbeen wins and ${vetoWins} vetoes -- I ran the front of this game from start to finish.`,
            ]);
        } else if (isFighter) {
            text = mk([
                `I was nominated ${timesNom} times and I am still sitting here because I refused to stop fighting.`,
                `I survived every attempt to send me home and I made it to the end on pure will.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `I built real relationships, used them when the game required it, and never lost sight of why I came here.`,
                `I connected with the right people at the right times and let those connections carry me to this seat.`,
            ]);
        } else if (isStrategic) {
            text = mk([
                `I came in with a plan, ran it all season, and never let the house flip me off my game.`,
                `I made calculated decisions every week and each one moved me one step closer to sitting here.`,
            ]);
        } else {
            text = mk([
                `I stayed in the fight, read the room, and made the right calls when they mattered most.`,
                `I played patient, I picked my spots, and I did not panic when the game got hard.`,
            ]);
        }

    } else if (questionKey === 'p2') {
        // "How much of what we saw was the real you vs strategy?"
        if (isWeak) {
            text = mk([
                `Most of it was real. Some of it was me trying to stay safe. I do not think those two things pull apart cleanly.`,
                `I was myself in there. I also knew I was playing a game. Both things were true at the same time.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, what you saw was real. The strategy was real too. I do not think those two things cancel each other out. I am a competitive person and I played like one. That is just who I am when I am fully in something.`,
                `The connections I built were genuine. Every conversation I had in that villa, I meant. The game gave them a different weight but it did not make them fake.`,
            ]);
        } else if (isStrategic || isCompBeast) {
            text = mk([
                `About eighty percent of what you saw was genuinely me. The other twenty was the version of me that knew every conversation had a game dimension. I do not think that is dishonest. That is what competing looks like.`,
                `The real me plays to win. So what you saw was real. I do not have a separate game mode that is not me. This is who I am when I care about the outcome.`,
            ]);
        } else {
            text = mk([
                `${jfn}, what you saw was real. I did not put on a version of myself for that villa. I competed the way I always compete, which is everything I have.`,
                `There was not a game version and a real version. I came in as one person and that is who played this game.`,
            ]);
        }

    } else if (questionKey === 'p3') {
        // "What do you want me to know before I cast my vote?"
        if (isWeak) {
            text = mk([
                `${jfn}, just that I tried my hardest. That is all I have.`,
                `I want you to know I gave everything in that villa. I hope that is enough.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, I want you to know that every person I worked with in that villa, I meant it. Every alliance, every conversation was real. I also came here to win and I never stopped doing both at the same time. I hope that is worth something tonight.`,
                `${jfn}, I respected your game the whole time I was in that villa. My ask is simple: vote for the person who showed up every day and gave you something real. That is me.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `${jfn}, ${totalCompWins} competition wins. I never coasted. I never relied on anyone else to keep me safe. I earned every week I stayed here and I am asking you to recognize that.`,
                `${jfn}, I want you to know I played this game from a position of strength the whole way through. ${hhWins} Head Hasbeen wins. ${vetoWins} vetoes. That record is why I am here. Vote for that.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I want you to know every move I made was thought through. Nothing I did was sloppy or careless. I gave this game everything and I would run it the same way again.`,
                `${jfn}, I came in here wanting to win and I played like it mattered every single week. Not everyone does that. I hope that counts when you vote.`,
            ]);
        }

    } else if (questionKey === 'h6') {
        // "How many promises did you actually keep?"
        if (isWeak) {
            text = mk([
                `I kept the ones I could. Some of them I could not. That is the honest answer.`,
                `I tried to keep my word. The game made that harder as it went on.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, I kept more of them than people in this room probably believe right now. The ones I broke were broken because the game shifted, not because I never meant them. I do not make promises I know I cannot keep.`,
                `I kept the ones that mattered to the people I was actually with. The deals that fell apart were the ones where the other side stopped holding up their end first.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I kept the promises that were still worth keeping when the time came. When the game changed I changed with it. That is not breaking your word. That is reading the room.`,
                `Every promise I made had a shelf life based on where the game was. I honored them when the conditions held. When the conditions changed I made new calls. That is how this game works.`,
            ]);
        }

    } else if (questionKey === 'h7') {
        // "I heard a lot of things about you in the jury house -- what do you think they were saying?"
        if (isWeak) {
            text = mk([
                `${jfn}, I can guess. I know I was not everyone's favorite person in that villa. I am not going to pretend otherwise.`,
                `I imagine it was not all positive. I made moves that hurt people and those people are sitting in front of me.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, I think some people said I was too close to certain people. That I played favorites. And honestly, they are not wrong. I trusted the people I trusted and I do not regret that.`,
                `I think people said I was calculating behind a friendly face. I will own that. I cared about people and I also had a game plan. Both things were true.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I think they said I played too hard and did not care enough about the people around me. I disagree with the second part. I cared. I just did not let that stop me.`,
                `I think they said I was cold when the game required it. Maybe. What I know is that I made my calls for game reasons and I am still standing here because of them.`,
            ]);
        }

    } else if (questionKey === 'h8') {
        // "You got me out. Did you owe me more than that?"
        if (isWeak) {
            text = mk([
                `${jfn}, I think about that. I am not sure I handled it the right way.`,
                `Maybe I did. I do not have a clean answer to that right now.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, I have thought about that. What I owe you is honesty, and the honest answer is that I thought you were going to come for me before I had the chance to protect myself. That is why it happened. I am sorry it went that way.`,
                `${jfn}, I did not want it to end the way it did between us. But I came here to win and I could not let that change when the moment came. What I owe you is the truth and you are hearing it right now.`,
            ]);
        } else {
            text = mk([
                `${jfn}, what I owed you was a straight game call, not a personal one. That is exactly what you got. I am not going to pretend that makes it easier but it is the truth.`,
                `${jfn}, I played the game the way it asked to be played. What I owe you is honesty. Here it is: I made that call because keeping you would have cost me this seat. I would make it again.`,
            ]);
        }

    } else if (questionKey === 'h9') {
        // "There was a version where you played differently -- why did you choose this way?"
        if (isWeak) {
            text = mk([
                `${jfn}, I am not sure I always had a choice. I reacted to what the game put in front of me.`,
                `I played the game I knew how to play. I do not know that a cleaner version would have gotten me here.`,
            ]);
        } else if (isStrategic) {
            text = mk([
                `${jfn}, I chose this way because the other version gets you eliminated. Playing nice and waiting your turn is a great way to spend three days in the jury house. I came here to win, not to be liked.`,
                `Every version of this game where I played softer ends with me sitting where you are sitting. I ran the numbers, I made the calls, and I am in this seat. That was the plan.`,
            ]);
        } else {
            text = mk([
                `${jfn}, the cleaner version of this game was available to me. I chose not to take it because I did not believe it would get me here. I was right. That is not a choice I regret.`,
                `I could have played a quieter game. I chose not to because I needed to control my path. A passive game means other people control it for you. I did not want that.`,
            ]);
        }

    } else if (questionKey === 'n6') {
        // "Walk me through the week you were closest to going home. What saved you?"
        if (isWeak) {
            text = mk([
                `There was a week I genuinely thought it was over. I got lucky. I am not going to pretend otherwise.`,
                `The closest I came, I did not have a great answer. Things just broke my way.`,
            ]);
        } else if (isFighter) {
            text = mk([
                `${jfn}, with ${timesNom} nominations I have more than one answer to that question. The closest was when I had no veto, no allies, and nothing left but conversations. I worked every person in that house until I changed enough minds to stay. That is what saved me.`,
                `There were multiple weeks I should have gone home. The one that comes to mind, I was on the block with no backup plan. I sat down with every single person who had a vote and made my case one at a time. That is all I had.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `The week I felt closest to going home I won the veto and took myself off. That is not luck. That is what I had been building toward all season.`,
                `There was a week the house wanted me out badly. I won the competition that week. That is the answer. I competed when I had to.`,
            ]);
        } else {
            text = mk([
                `The week I came closest I had no comp protection and I knew the votes were against me. What saved me was a conversation I had with someone I had built real trust with. They went to bat for me. I would not be here without that.`,
                `I came closest the week I was nominated and the veto was not used. I called in every favor I had, repositioned two relationships that were shaky, and changed enough votes to stay. It was the hardest week I had in that villa.`,
            ]);
        }

    } else if (questionKey === 'n7') {
        // "Who did you play the best game against? Who gave you the most trouble?"
        if (isWeak) {
            text = mk([
                `${jfn}, honestly, a lot of people in this room gave me trouble at different points. I do not think I played my best game against any one person.`,
                `I am not sure I played my best game against anyone specific. I was mostly trying to survive week to week.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, the person who gave me the most trouble was someone I was actually close to. When you care about someone in this game it complicates every call you make involving them. That is the hardest kind of game to play against.`,
                `The person I played my best game against is sitting in this jury. They pushed me to make sharper moves than I would have made otherwise and I am honestly grateful for that.`,
            ]);
        } else {
            text = mk([
                `${jfn}, the person who gave me the most trouble was whoever controlled the vote in the weeks I was vulnerable. I had to outthink that more than once and I did not always do it cleanly.`,
                `The person who pushed me hardest is in this room. They read the game well and I had to stay one step ahead of them the whole time. I think that pressure made me better.`,
            ]);
        }

    } else if (questionKey === 'n8') {
        // "If you had to vote for another finalist tonight, who and why?"
        if (isWeak) {
            text = mk([
                `That is a hard question. I would probably go with whoever I thought played the cleanest game, even if it was not as visible as mine.`,
                `I do not have a strong answer to that. I came here to win and I have been focused on making my own case.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, if I am being honest, I would vote for whoever showed this jury the most of themselves. I think authenticity in this game is underrated. The person I respect most for that is on that stage with me and you can probably guess who.`,
                `If I had to vote for someone else it would be the person in this finale who I think played with the most integrity. I can respect that even if I am the one asking you to vote against it tonight.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I would vote for whoever made the most game-defining decisions. Not the flashiest moves, the ones that actually changed the course of the season. One of the other finalists did that in a way I can respect.`,
                `If I had to vote for someone else I would vote for whoever I think played the game most deliberately. I know what my own game was. I have seen enough of theirs to say one of them played a game worth recognizing.`,
            ]);
        }

    } else if (questionKey === 'n9') {
        // "What would you do differently?"
        if (isWeak) {
            text = mk([
                `I would play with more confidence earlier. I held back in moments where I should have moved.`,
                `I would trust my reads more and second-guess myself less. I knew the right call more often than I acted on it.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, I would manage one relationship differently. There was someone I let drift because the game got in the way and I think that cost me a vote I should have had. I would not let that happen again.`,
                `I would be more honest with one or two people earlier instead of waiting until the game forced my hand. The conversations I had late would have landed better if I had started them sooner.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `${jfn}, I would use the comp wins to protect relationships instead of just my own position. I had the power to do things for people and I did not always use it that way. That cost me socially.`,
                `I would play the social game harder in the weeks I had power. When you win a lot of comps you can get lazy about the relationship work because you feel safe. I learned that is a mistake.`,
            ]);
        } else {
            text = mk([
                `${jfn}, I would make one specific move earlier that I waited too long to make. By the time I got there the damage was already done. I knew it needed to happen and I hesitated. I would not hesitate again.`,
                `I would pull the trigger on one or two decisions I dragged out. I was right about what needed to happen. I just did not do it fast enough. That is the one thing I would change.`,
            ]);
        }

    } else if (questionKey === 'n10') {
        // "When did you know you had a real shot at winning?"
        if (isWeak) {
            text = mk([
                `Honestly, not until very recently. I was not sure I was going to make it this far for most of the season.`,
                `I am not sure I fully believed it until I was sitting here. I just kept surviving and at some point the math started to work.`,
            ]);
        } else if (isCompBeast) {
            text = mk([
                `${jfn}, when I won my second Head Hasbeen. At that point I knew I could compete my way through anything this game threw at me. The comp record gave me real belief.`,
                `When the wins started stacking up. There was a moment mid-season where I looked at my competition record and thought: nobody can take this from me if I keep doing this.`,
            ]);
        } else if (isFighter) {
            text = mk([
                `${jfn}, when I survived my third nomination. At that point I thought: if they have not gotten me out by now they are not going to. I stopped playing scared after that.`,
                `Every time I survived a nomination I started believing more. By the time I hit my third one I was not scared anymore. I knew how to get through.`,
            ]);
        } else {
            text = mk([
                `${jfn}, there was a specific week mid-season where I looked at the board, looked at my relationships, and realized I had built the right structure to go deep. That is when I started playing to win instead of playing to survive.`,
                `When the alliance I built held through a week where it had every reason to fall apart. That was the moment I knew the game was moving the way I needed it to move.`,
            ]);
        }

    } else if (questionKey === 'p4') {
        // "What move does the jury not fully know about or give you credit for?"
        if (isWeak) {
            text = mk([
                `There were conversations happening that nobody saw. I was working things behind the scenes that never made it to the surface. I am not sure I got credit for any of it.`,
                `${jfn}, most of my game happened in one-on-one conversations that no one else was in the room for. That is where I actually played.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, the move nobody saw was the week I kept a specific alliance from imploding. Two people were about to turn on each other and it would have cost me both of them. I sat down separately with each of them and held it together for two more weeks. Nobody talked about that move but it changed everything.`,
                `The thing I do not think this jury knows is how many votes I managed from outside the room. I was not just voting. I was shaping who other people voted for, and that happened in conversations no one else was in.`,
            ]);
        } else {
            text = mk([
                `${jfn}, there was a week I identified a threat before anyone else did and spent three days quietly positioning myself to be safe when that threat materialized. When it finally happened it looked like I got lucky. I did not get lucky. I built that.`,
                `The move I do not get credit for is holding back when I had the power to act and choosing to wait one more week until the timing was right. Nobody praises patience in this game but it is what kept me from making an early move that would have blown up my whole game.`,
            ]);
        }

    } else if (questionKey === 'p5') {
        // "Tell me the moment you are most proud of."
        if (isCompBeast) {
            text = mk([
                `${jfn}, the Head Hasbeen win that I knew I needed most. Not the first one, the one where the house had been building against me for two weeks. I won it when I had to and it changed the whole season.`,
                `The veto win that took me off the block. Not because it saved me, because I won it under pressure when everyone expected me to go home. That is the moment I am most proud of.`,
            ]);
        } else if (isFighter) {
            text = mk([
                `${jfn}, surviving my third nomination. I had nothing going for me that week except the conversations I had. I changed enough minds to stay and I did it without any comp protection. That is the moment.`,
                `The week I talked my way off the eviction list without winning anything. I was on the block, no veto, no backup, and I stayed. That is the moment I am most proud of.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, the moment I am most proud of is holding an alliance together through a week where everyone in it had a reason to blow it up. I talked to each person, I addressed each concern, and I kept it intact. That took more work than anything else I did in that villa.`,
                `The moment I navigated a very complicated week where three different people all thought they had a private deal with me and I managed to come out the other side without burning any of them. That took every social skill I have.`,
            ]);
        } else {
            text = mk([
                `${jfn}, the week I turned a vote that was going against me without anyone knowing I had done it. I identified the problem, found the right conversation, and flipped the result. Nobody knew what happened. That is the kind of game I played and I am proud of it.`,
                `The moment I am most proud of is when I made the call everyone else in the house was afraid to make. It cost me something but it was the right move and I knew it at the time. That kind of clarity is hard to come by in this game.`,
            ]);
        }

    } else if (questionKey === 'p6') {
        // "Does the jury know the full picture? What are they missing?"
        if (isWeak) {
            text = mk([
                `${jfn}, I think they probably have a pretty good picture. I am not sure what I kept hidden was all that impressive.`,
                `Honestly, probably not everything. But I am not sure the things they missed would change the vote.`,
            ]);
        } else if (isSocial) {
            text = mk([
                `${jfn}, what they are missing is the amount of work that happened in private. The conversations that never made it into the group. The times I talked someone down from a decision that would have hurt people I cared about. That is the part that is hardest to see from the outside.`,
                `${jfn}, the full picture is how many things I absorbed quietly that could have blown up into bigger conflicts. I kept a lot of drama from happening that no one knew about. That is relationship work and it is real work.`,
            ]);
        } else {
            text = mk([
                `${jfn}, what the jury is missing is the amount of advance planning that went into the moves they saw. Nothing I did was reactive. Every big moment in this game had three or four moves of groundwork behind it that nobody was watching. That is what I want them to know.`,
                `${jfn}, what they do not fully see is how long I was thinking ahead. By the time a move landed I had been working it for weeks. The jury saw the result. They did not see the setup. That setup is the real game.`,
            ]);
        }

    } else {
        text = `I gave this game everything I had and I stand by every call I made.`;
    }

    return { juryImpact, text };

*/