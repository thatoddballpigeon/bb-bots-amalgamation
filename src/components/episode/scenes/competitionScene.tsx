import {
    excludeHouseguests,
    GameState,
    getHouseguestById,
    getMembersFromSplitIndex,
    hgPreferredName,
    Houseguest,
    MutableGameState,
} from "../../../model";
import { Scene } from "./scene";
import { Portraits } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { Centered, CenteredBold } from "../../layout/centered";
import { CompetitionBox } from "../../layout/box";
import { HorizontalLine } from "../../layout/line";
import { listNames } from "../../../utils/listStrings";
import { Veto } from "../veto/veto";
import { generateCompetitionResults, generateCompetitorGroups } from "../utilities/competitionEventFactory";
import { COMPETITIONS, getHighestStat } from "../utilities/competitions";
import { is2DArray, isNotWellDefined, randomArrayIndex, randomInt } from "../../../utils";
import { HoHVote } from "../../../model/logging/voteType";
import { shuffle } from "lodash";

export interface CompetitionSceneOptions {
    veto?: Veto;
    compType: string;
    coHoH?: boolean;
    coHohIsFinal?: boolean; // to distinguish if winning HoH counts as a win (it doesn't in BotB, but does for co-hoh)
    skipHoHWin?: boolean; // for temporary HoHs, like BotB
    isFinale?: boolean;
    customTitle?: string;
    customText?: string;
    competitors?: Houseguest[] | Houseguest[][];
    previousHoHcanCompete?: boolean;
    doubleEviction?: boolean;
    doubleVeto?: boolean;
    splitIndex?: number;
}

export function generateCompetitionScene(
    initialGameState: GameState,
    options: CompetitionSceneOptions
): [GameState, Scene, Houseguest[]] {
    const newGameState = new MutableGameState(initialGameState);
    const houseguests = isNotWellDefined(options.splitIndex)
        ? newGameState.houseguests
        : getMembersFromSplitIndex(options.splitIndex, newGameState);
    const doubleEviction: boolean = options.doubleEviction || false;

    const coHoH = options.coHoH || false;
    const coHohIsFinal = options.coHohIsFinal || false;
    const previousHoH = options.previousHoHcanCompete ? [] : initialGameState.previousHOH;

    const competitors = options.competitors || excludeHouseguests(houseguests, previousHoH).filter(hg => !hg.isHidden);
    const competitorCount = competitors.flat().length;

    const veto = options.veto;
    const isHoHComp = options.compType === "HoH";
    const isVetoComp = options.compType === "PoV" && veto;

    const shouldGroup = !is2DArray(competitors) && options.compType === "HoH" && Math.random() < 0.4;

    let size = 2;
    const grouped = shouldGroup ? generateCompetitorGroups(shuffle(competitors), size) : null;
    const groupSize = grouped && competitors.length % size === 0 && !options.isFinale ? size : 1;
    const finalCompetitors = grouped ?? competitors;

    const players = competitorCount === 1 ? "player" : "players";
    const competitions = COMPETITIONS.filter((comp) => 
        comp.groupSize === groupSize &&
        comp.compPool.includes(options.compType) &&
        competitors.length % comp.groupSize === 0 &&
        (!comp.weekAvailable || comp.weekAvailable.includes(newGameState.episode))
    );
    const selectedComp = competitions[randomArrayIndex(competitions)];
    const competitionInfo = <>
        <CompetitionBox
            title={selectedComp.title}
            stat={getHighestStat(selectedComp).stat}
            text={selectedComp.text}
        />
    </>;

    const [gameplayEvents, compWinners] = generateCompetitionResults(selectedComp, finalCompetitors, newGameState, options);

    if (isHoHComp) newGameState.previousHOH = [];
    else if (isVetoComp) newGameState.currentLog.vetoWinner = [];
    compWinners.forEach((win, i) => {
        const winner = getHouseguestById(newGameState, win.id);
        if (isHoHComp) {
            if (options.skipHoHWin) return;
            winner.hohWins++;
            if ((i === 0 && !coHoH) || coHohIsFinal) {
                newGameState.previousHOH.push(winner);
                newGameState.currentLog.votes[winner.id] = new HoHVote();
            }
        } else if (isVetoComp) {
            winner.povWins++;
            winner.pov.hasVeto = true;
            newGameState.currentLog.vetoWinner.push(winner.preferredName(true));
            newGameState.currentLog.vetoEmoji = veto.emoji;
        }
    });

    const HoHs = previousHoH.length > 1 ? "Heads of Household" : "Head of Household";
    const prevHohText = options.previousHoHcanCompete
        ? ""
        : ` As outgoing ${HoHs}, ${listNames(previousHoH.map((hoh) => hgPreferredName(hoh, true)))} will not compete.`;

    const introText = (isHoHComp && previousHoH.length > 0)
        ? doubleEviction
            ? `Houseguests, please return to the living room. Tonight will be
                ${initialGameState.week > 1 ? "another double" : "a double"} eviction.`
            : `Houseguests, it's time to find a new Head of Household.${prevHohText}`
        : undefined;
    const portraitLine = is2DArray(competitors)
        ? undefined
        : <Portraits centered={true} houseguests={competitors} />

    const scene = new Scene({
        title: options.customTitle || (isHoHComp ? "HoH Competition" : "Veto Competition"),
        gameState: initialGameState,
        content: (
            <div>
                <CenteredBold>{options.customText ?? introText}</CenteredBold>
                {competitionInfo}
                <HorizontalLine />
                <Centered>Competing: {competitorCount} {players}</Centered>
                {portraitLine}
                <Centered>You all may begin.</Centered>
                <HorizontalLine />
                {gameplayEvents}
                <NextEpisodeButton />
            </div>
        ),
    });

    return [new GameState(newGameState), scene, compWinners];
}
