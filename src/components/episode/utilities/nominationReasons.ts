import { GameState, Houseguest } from "../../../model";
import { randomArrayIndex } from "../../../utils";
import { getRelationshipStrength } from "../../../utils";

export function generateNominationReason(
    gameState: GameState,
    hoh: Houseguest,
    nominee: Houseguest,
    reason: string
) {
    const hN = hoh.preferredName();
    const eN = nominee.preferredName();
    const rel = getRelationshipStrength(gameState, hoh, nominee);

    let timesInDanger = 0;
    gameState.log[gameState.episode].forEach(log => {
        if (log.nominationsPreVeto && log.nominationsPreVeto.includes(nominee.id)) timesInDanger++;
    });

    const pick = (arr: string[]) => arr[randomArrayIndex(arr)];
    const mk = (types: string | string[], quotes: string[]) => ({ type: pick(Array.isArray(types) ? types : [types]), quote: pick(quotes) });

    // No Other Choice: only offered when the nomination is genuinely forced (final 5/4/3, everyone
    // eligible has to go up). The nominee holds no grudge and it does not count with the jury.
    if (reason === 'NO_CHOICE') return mk(['No Other Choice', 'Just the Numbers', 'Nothing Personal'], [
        `"There is nobody else left for me to put up. ${eN}, this is not personal at all. It is just where the numbers landed."`,
        `"At this stage of the game I do not have a choice. ${eN} goes up because there is genuinely no one else to nominate."`,
        `"I want to be clear. This is not a shot at ${eN}. Everyone left had to go up. That is just the math this week."`,
        `"Do not read anything into this. ${eN} is on the block because the house is this small, not because of anything between us."`,
        `"I have no other move here. ${eN}, you are nominated, but only because there is no one else I am allowed to name."`,
        `"This one is out of my hands. With the numbers this low, ${eN} was always going up no matter what I wanted."`,
        `"${eN}, nothing personal. At this point in the game the chair picks itself."`,
    ]);

    // Pawn: the nominee asked to go up and the HH agreed. Never a shot, so the quote has to read
    // as a favor being repaid rather than a strategic cut -- a hostile line here directly
    // contradicts the deal the player just made.
    if (reason === 'PAWN') return mk('Pawn', [
        `"${eN} came to me and offered to go up. I did not ask for that. But it makes my week a lot easier, so I took it."`,
        `"This one is a pawn, plain and simple. ${eN} volunteered and I trust them to sit there and stay calm."`,
        `"${eN} put their hand up before I had to ask anybody. That is what having someone in your corner looks like."`,
        `"I need a second name and ${eN} offered to be it. Nobody should read this as me coming after them."`,
        `"${eN} is on the block because they agreed to be, not because I want them gone. I want that on the record."`,
        `"We talked, ${eN} said they would take the seat, and I am holding up my end. This is not a shot."`,
        `"Putting up ${eN} as a pawn. They know the plan, I know the plan, and the house can think what it wants."`,
    ]);

    // Reason from scoring logic takes priority - rel is only used as a fallback
    if (reason === 'CONVICTION') return mk(['Committed', 'Stayed On It', "Didn't Forget"], [
        `"I have had this planned since week one and nothing that happened this week changes it. ${eN}, you are nominated."`,
        `"My read on ${eN} has not shifted. I said what I said. I am staying consistent."`,
        `"I keep coming back to the same name. ${eN}. That is not a mistake."`,
        `"I said what I said last week and the week before. ${eN}. This is not personal. This is my game."`,
        `"I have been building toward this moment for a while. ${eN}. Not personal. I just have not changed my mind."`,
        `"I have not stopped thinking about ${eN} since the first week. This is the move I have been waiting to make."`,
        `"Some decisions you sit with for a while. ${eN} has been mine."`,
        `"I told myself if I ever got the power this is exactly what I would do with it. ${eN}."`,
        `"${eN} can call this what they want. I have been clear about this for a while now."`,
        `"I made up my mind weeks ago. Today just happens to be the day I get to act on it. ${eN}."`,
    ]);

    if (reason === 'FEUD' || rel <= -60) return mk(['Bad Blood', 'No Love Lost', 'Done With Them'], [
        `you and I have been clashing since day one. I have the power this week and I am using it.`,
        `let's not dress it up. You and I are not friends. We have never been friends. This is the result.`,
        `I have been waiting for this moment. You are nominated for eviction.`,
        `you have made my time in this house harder than it needs to be. This week I get to do something about that.`,
        `this is not a difficult decision. You and I do not get along and I'm done pretending otherwise.`,
        `you and I have been at each other since week one and frankly I'm tired of pretending we are not. Today I get to do something about it.`,
        `let's call it what it is. You run your mouth and now you get to find out what it costs.`,
        `you love to talk about everyone in this house except yourself. Funny how that works.`,
        `I gave you every chance to be normal with me. You took none of them, so here we are.`,
        `you think you're slick. I'm about to remind you you're not.`,
    ]);

    if (reason === 'DISRUPTIVE') return mk(['This Week', 'Too Much Drama', 'Had Enough'], [
        `you are chaotic and I am tired of cleaning up after it.`,
        `living with you this week has not been easy. This is me doing something about that.`,
        `you create drama wherever you go. I need a stable house and you are not helping with that.`,
        `I've had enough of the energy you bring into this house. This is my chance to address it.`,
        `you've been a lot this week. My nomination stands.`,
        `I have heard enough of your opinions for one season.`,
        `you treat this house like a stage and I am not your audience.`,
        `I am done walking on eggshells around your mood. Today the eggshells are yours.`,
        `you have personally given me a headache every single day this week. I'm taking the painkiller.`,
        `living with you is a full-time job and the pay is terrible.`,
    ]);

    if (reason === 'RECURRING_TARGET' || timesInDanger >= 2) return mk(['Easy Target', 'Back Again', 'Keeps Ending Up Here'], [
        `you've been in this position before. At some point the pattern speaks for itself.`,
        `${Math.random() < 0.5 ? "you keep ending up in this chair" : "this isn't the first time you've been here"} and I think we all know why.`,
        `you've had close calls before. The numbers keep pointing here and I'm going with that.`,
        `I've watched you fight to stay in this villa week after week. I think it might be time.`,
        `you sit in this chair every week and somehow nobody is having a serious conversation about it. I am.`,
        `if you keep ending up here it's not just bad luck. It is information.`,
        `we've all been pretending you keep surviving by accident. You don't.`,
        `you keep slipping away from this every week. Not this time.`,
        `I respect your ability to keep dodging this, but it ends today.`,
    ]);

    if (reason === 'TENSION') return mk(["Don't Trust Them", 'Bad Energy', 'Something There'], [
        `something between you and I has never quite worked. When you have power, that matters.`,
        `I don't have a feud with you. I just don't trust you and that's enough for me.`,
        `you and I have never been on the same page in this house. At some point you act on that.`,
        `I can't read you and in this game that is reason enough.`,
        `there's something there with you that I can't shake. I'm not willing to let it sit.`,
        `you have been the small itch in this house I can't reach. This week I'm scratching it.`,
        `whatever is between you and I has not gotten better. I don't think it ever will.`,
        `I have tried with you. I have. We are not going to be friends and I'm not going to keep faking it.`,
        `you and I have not had a real conversation since we got here. That tells me everything I need to know.`,
        `there is no version of this villa where you and I end up close. So I might as well act on that.`,
    ]);

    if (reason === 'THREAT') {
        const wasRecentHOH = !!gameState.previousHOH.some(hg => hg.id === hoh.id);
        const quotes = [
            `you're one of the strongest players in this house. If I don't act now I won't get another shot."`,
            `you're dangerous. You know why you're here."`,
            `I respect your game, and I respect it enough to take a shot at it while I still can.`,
            `if I let you reach the finale I have no one to blame but myself. This is the move.`,
            ...(wasRecentHOH ? [] : [`you have been flying under the radar and doing it brilliantly. That stops today.`]),
            `you're good. Too good.`,
            `big targets do not stay this comfortable for long. Today is your turn.`,
            `I do not get a clean shot at you every week. Not going to waste this one.`,
            `you've been the scariest player in this house from day one. I am not letting them survive another week.`,
            ...(nominee.hohWins + nominee.povWins > 5 ? [`you have been winning everything in sight. This house needs a course correction.`] : []),
        ];
        return mk(['Taking a Shot', 'Big Player', 'Threat'], quotes);
    }

    if (reason === 'GUT') return mk(['Just a Feeling', 'Gut Call', 'Hard to Explain'], [
        `I don't have a good reason. Something about you doesn't sit right with me, so I'm going with that.`,
        `you're someone I have been watching. I can't fully explain it. My gut is telling me this week.`,
        `I don't know you well enough to feel comfortable keeping you around.`,
        `this is instinct. I hope you can respect that.`,
        `I can't for the life of me say why. I just know.`,
        `sometimes the gut is louder than the strategy. This week the gut said you.`,
        `I went back and forth on this one for days, and your name kept coming back.`,
        `if you asked me to defend this in detail I couldn't. But it's what I'm trusting in.`,
        `there is something about you I just can't place. I have learned to listen to that feeling.`,
    ]);

    const isStrategic = ["Strategist", "Analyst"].includes(hoh.archetype);
    return mk(['Game Move', 'Strategic', 'Numbers Game'], [
        `this is a game and my name has to stay out of nominations. This is your week.`,
        `I thought long and hard, and your name kept popping up.`,
        `I don't have a problem with you. This is only about where I stand in this house right now.`,
        `I'm making this decision for my own game. I hope you understand.`,
        ...(isStrategic ? `this is just where the math lands, no hard feelings.` : []),
        `the numbers don't lie. You're the play this week.`,
        `I had three names in my head. Two of them keep me safer if I cut. The third was you.`,
        `if I want to make it past next week I need to make a move now. This is mine.`,
        `I don't know what to tell you. You're in the wrong seat at the wrong time.`,
    ]);
}

export function generateVetoReason(gameState: GameState, winner: Houseguest, savedNominee: Houseguest, hoh: Houseguest, decision: string) {
    const wn = winner.preferredName();
    const mk = (quotes: string[]) => quotes[Math.floor(Math.random() * quotes.length)];

    if (decision === 'use') {
        const sn = savedNominee.preferredName();
        const selfVeto = savedNominee && savedNominee.id === winner.id;
        if (selfVeto) return mk([
            `"I won this and I am using it on myself. I did not fight this hard to stay on the block."`,
            `"There is no version of this where I sit here nominated when I have the power to change it. I use the veto on myself."`,
            `"I competed for this veto for one reason. I am taking myself off the block."`,
            `"I am not leaving my fate in anyone else's hands. I use the veto on myself."`,
        ]);
        const rel = savedNominee ? getRelationshipStrength(gameState, winner, savedNominee) : 0;
        if (rel >= 60) return mk([
            `"I did not compete my way to this veto just to sit on it while someone who has my back is on the block. ${sn}, I've got you."`,
            `"${sn} and I are solid. Using this was never a question. Come off the block."`,
            `"There was no world where I was keeping this. ${sn}, you're safe."`,
        ]);
        if (rel >= 30) return mk([
            `"${sn} does not deserve to be sitting in that chair and I have the power to do something about it. So I am doing it."`,
            `"I competed for this. ${sn} should not be up there. Simple as that."`,
            `"I won this challenge and I won it for a reason. ${sn}, you're coming off."`,
        ]);
        return mk([
            `"I have the veto and I am using it. ${sn}, come off the block."`,
            `"This was not an easy call but I am using it. ${sn}, you're safe."`,
            `"The veto gets used. ${sn}, you are no longer nominated."`,
        ]);
    } else {
        return mk([
            `"I thought about it. The nominations this week are fair and this is not my fight to pick. Nominations stand."`,
            `"Using this blows up my game. The veto stays in my pocket."`,
            `"I won this for myself, not to shake up someone else's week. Nominations stand."`,
            `"I am not getting involved. The veto is discarded."`,
            `"I have no reason to change anything this week. Nominations stay exactly as they are."`,
            `"Both nominees put me in a complicated position. Getting involved only makes things worse for me."`,
        ]);
    }
}

export function generateEvictionReason(
    gameState: GameState,
    voter: Houseguest,
    target: Houseguest
) {
    const en = target.preferredName();
    const dirRel = voter.relationshipWith(gameState, target);
    const rel = getRelationshipStrength(gameState, voter, target);
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const mk = (types: string | string[], pool: string[]) => ({ type: pick(Array.isArray(types) ? types : [types]), quote: pick(pool) });

    const gameMemory = gameState.memory;
    const episodeDelta = gameMemory.episodeRelDelta[voter.id][target.id];
    const timesNominated = target.nominations;

    const voterConviction = gameState.convictions[voter.id]?.[target.id];
    if (voterConviction && voterConviction.episodesHeld >= 1) {
        return mk(['Stayed On It', 'Committed', 'Week After Week'], [
            `"I have had ${en} in my head for weeks and nothing has changed that. My vote is ${en}."`,
            `"This is not a decision I made today. ${en} has been my vote for a while."`,
            `"I don't flip-flop. ${en} is my vote and I am confident in that."`,
            `"Every week I come to the same conclusion. ${en}."`,
        ]);
    }

    if (dirRel <= -60) return mk(['Personal Feud', 'No Love Lost', 'Old Beef'], [
        `"No buildup needed. ${en} and I have never been on the same page and that is not changing. My vote is ${en}."`,
        `"I am voting to evict ${en} and I have been waiting for this."`,
        `"${en} has made this villa harder for me every week. My vote is clear."`,
        `"No hesitation. ${en}. Done."`,
    ]);

    // Episode drama takes priority over standing relationship
    if (episodeDelta <= -20) return mk(['This Week', 'Recent Events', 'What Happened'], [
        `"After what happened this week? Easy call. ${en}."`,
        `"What happened between ${en} and me this week made this decision straightforward. ${en}."`,
        `"After everything this week I cannot vote any other way. ${en}."`,
        `"Something shifted this week and I am acting on it. ${en} is my vote."`,
    ]);

    const relEntry = gameState.relationships[voter.id]?.[target.id];
    if ((relEntry?.baseAffinity ?? 0) < -0.4 && dirRel > -60) {
        return mk(["Just Don't Click", 'Wrong Energy', 'Oil and Water'], [
            `"${en} and I have never been on the same wavelength in here. This vote is honest."`,
            `"I cannot explain it perfectly but something about ${en} does not sit right with me. ${en}."`,
            `"We are just different people. I think we both feel it. ${en}."`,
        ]);
    }

    if (dirRel <= -30) return mk(['Bad Vibes', 'Off Energy', 'Not Clicking'], [
        `"Something has been off with ${en} for days. My vote is ${en}."`,
        `"${en} and I have had our issues and I am not going to pretend otherwise. ${en}."`,
        `"I have had friction with ${en} this week. My vote reflects that."`,
        `"${en}. We both knew it was coming."`,
    ]);

    if (timesNominated >= 2) return mk(['Pattern', 'Seen This Before', 'Recurring'], [
        `"${en} keeps ending up here. At some point the house has spoken enough times."`,
        `"I am voting for ${en}. This is not the first time and the house has said it before."`,
        `"The numbers keep pointing to ${en}. I am not going to fight that."`,
    ]);

    if (rel >= 30) return mk(['Reluctant', 'Tough Call', 'Hard Vote'], [
        `"I like ${en}. This is the hardest I have had to think about a vote."`,
        `"${en} is someone I genuinely care about in this villa. I'm sorry. I have to vote this way."`,
        `"This is not what I want. The numbers are what they are."`,
        `"${en} deserves to be here. I just need this move more than they do right now."`,
    ]);

    return mk(['Strategic', 'Game Move', 'Numbers Game'], [
        `"My vote to evict goes to ${en}. It is the best call for my game right now."`,
        `"${en}, I hope you understand. This is a game and I am playing it."`,
        `"I am voting to evict ${en}. No drama, no hard feelings."`,
        `"This is strategy. ${en} is my vote this week."`,
        `"I have thought about it and ${en} is the right call for where I am in this game."`,
    ]);
}

export function generateSaveReason(
    gameState: GameState,
    voter: Houseguest,
    target: Houseguest
) {
    const en = target.preferredName();
    const dirRel = voter.relationshipWith(gameState, target);
    const rel = getRelationshipStrength(gameState, voter, target);
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const mk = (types: string | string[], pool: string[]) => ({ type: pick(Array.isArray(types) ? types : [types]), quote: pick(pool) });

    const gameMemory = gameState.memory;
    const episodeDelta = gameMemory.episodeRelDelta[voter.id][target.id];
    const timesNominated = target.nominations;

    const voterConviction = gameState.convictions[voter.id]?.[target.id];
    if (voterConviction && voterConviction.episodesHeld >= 1) {
        return mk(['Stayed On It', 'Committed', 'Week After Week'], [
            `"I have had ${en}'s back for weeks and that is not changing tonight. My vote is to save ${en}."`,
            `"This is not a decision I made today. I have been protecting ${en} for a while now."`,
            `"I don't flip-flop. ${en} is who I am saving and I am confident in that."`,
        ]);
    }

    if (dirRel >= 60) return mk(['Easy Save', 'No Question', 'My Person'], [
        `"No buildup needed. ${en} is one of my closest people in here. Easy save."`,
        `"I am saving ${en} and I have zero hesitation about it."`,
        `"${en} is safe with my vote every single time. Not a hard choice."`,
        `"No question. ${en}. Done."`,
    ]);

    if (episodeDelta >= 20) return mk(['This Week', 'Recent Events', 'What Happened'], [
        `"After what happened this week? Easy call. I'm saving ${en}."`,
        `"What happened between ${en} and me this week made this decision straightforward. ${en} stays."`,
        `"After everything this week I cannot vote any other way. ${en} is safe."`,
        `"Something shifted this week and I am acting on it. ${en} is who I'm keeping."`,
    ]);

    const relEntry = gameState.relationships[voter.id]?.[target.id];
    if ((relEntry?.baseAffinity ?? 0) > 0.4 && dirRel < 60) {
        return mk(['Just Click', 'Right Energy', 'Natural Pick'], [
            `"${en} and I have been on the same wavelength in here since day one. This vote is honest."`,
            `"I cannot explain it perfectly but something about ${en} just feels right to me. I'm saving ${en}."`,
            `"We get each other. That is worth something in this game. ${en}."`,
        ]);
    }

    if (dirRel >= 30) return mk(['Solid', 'Comfortable', 'Trust'], [
        `"Things have been good with ${en} lately. My vote is to save ${en}."`,
        `"${en} and I are in a good place and I am not going to pretend otherwise. ${en} stays."`,
        `"I trust ${en} in this house. My vote reflects that."`,
        `"${en}. Wasn't even close for me."`,
    ]);

    if (timesNominated >= 2) return mk(['Pattern', 'Seen This Before', 'Not This Way'], [
        `"${en} keeps ending up here and I don't think that is fair. Not on my vote."`,
        `"I am saving ${en}. This is not the first time they have been put up and I am not piling on."`,
        `"The house keeps sending ${en} to the block. I'm not going to be part of finishing that job tonight."`,
    ]);

    if (rel <= -30) return mk(['Least Bad Option', 'Not My First Choice', 'Hard Call'], [
        `"This is not the vote I wanted to be making. Out of these three, ${en} is who I am keeping."`,
        `"${en} is not someone I am close with, but between these options, this is the right call for my game."`,
        `"Nobody up here is an easy save for me. I am going with ${en}."`,
        `"This is the hardest kind of vote. I landed on ${en}."`,
    ]);

    return mk(['Strategic', 'Game Move', 'Numbers Game'], [
        `"My vote to save goes to ${en}. It is the best call for my game right now."`,
        `"${en}, I hope you understand why. This is a game and I am playing it."`,
        `"I am voting to save ${en}. No drama, no hard feelings toward anyone else up here."`,
        `"This is strategy. ${en} is who I am keeping this week."`,
        `"I have thought about it and saving ${en} is the right call for where I am in this game."`,
    ]);
}