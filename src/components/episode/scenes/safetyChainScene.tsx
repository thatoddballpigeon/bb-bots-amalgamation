import React from "react";
import { GameState, getHouseguestById, Houseguest, nonEvictedHouseguests, hgPreferredName } from "../../../model";
import { GrayVote, PoVvote, SaveVote } from "../../../model/logging/voteType";
import { Centered, CenteredBold } from "../../layout/centered";
import { Portraits } from "../../playerPortrait/portraits";
import { Scene } from "./scene";
import { getWorstTarget } from "../../../utils/ai/aiApi";
import { listNames } from "../../../utils/listStrings";
import { generateCompetitionResultsScene } from "./competitionResultsScene";
import { generateEvictionScene } from "./evictionScene";
import { HorizontalLine } from "../../layout/line";
import { generateCompetitionScene } from "./competitionScene";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import { generateTwinTwist } from "../bigBrotherEpisode";

export function generateSafetyChainScene(initialGameState: GameState): [GameState, Scene[]] {
    const chainOrder: Houseguest[] = [];
    let finishedHoH: Houseguest[] = [];
    let hohArray: Houseguest[] = [];
    let newGameState: GameState;

    const scenes: Scene[] = [];

    let HoHscene1, HoHscene2;
    [newGameState, HoHscene1, finishedHoH] = generateCompetitionScene(initialGameState, {
        customTitle: "1st Safety Competition",
        compType: "HoH",
        doubleEviction: true,
        skipHoHWin: true,
        customText:
            "Houseguests, please return to the living room. It is time for a Safety Chain Special Eviction.",
    });
    [newGameState, HoHscene2, hohArray] = generateCompetitionResultsScene(initialGameState, finishedHoH, {
        customTitle: "1st Safety Results",
        compType: "HoH",
        doubleEviction: true,
        bottomText: " has won the safety competition!",
    });
    scenes.push(HoHscene1, HoHscene2);

    const chainStarter: Houseguest = hohArray[0];
    const options: Houseguest[] = nonEvictedHouseguests(newGameState).filter(
        (hg) => hg.id !== chainStarter.id
    );
    chainOrder.push(chainStarter);
    const safeSpots = newGameState.nonEvictedHouseguests.size - 3;
    let currentChooser: Houseguest = chainStarter;
    const sceneContent: JSX.Element[] = [];
    let first = true;
    while (chainOrder.length < safeSpots) {
        const newSafeIndex = options.indexOf(getWorstTarget(currentChooser, options));
        chainOrder.push(options[newSafeIndex]);
        newGameState.currentLog.votes[currentChooser.id] = first
            ? new PoVvote(options[newSafeIndex].id)
            : new SaveVote(options[newSafeIndex].id);
        first = false;
        options.splice(newSafeIndex, 1);
        sceneContent.push(
            <Centered key={`safetychain-${newGameState.episode}-${chainOrder.length}`}>
                {hgPreferredName(currentChooser)} has chosen {hgPreferredName(chainOrder[chainOrder.length - 1])}!
            </Centered>,
            <Portraits
                houseguests={[currentChooser, chainOrder[chainOrder.length - 1]]}
                key={`safetychain-${newGameState.episode}-${chainOrder.length}-2`}
                centered={true}
            />
        );
        currentChooser = chainOrder[chainOrder.length - 1];
    }

    const leftOut = options.slice(0, 3);
    leftOut.forEach((hg) => (newGameState.currentLog.votes[hg.id] = new GrayVote("Not eligible")));
    newGameState.currentLog.customEvictedText = "not selected for safety";
    newGameState.currentLog.customEvicted = leftOut.map((hg) => hg.id);
    sceneContent.push(
        <>
            <Centered>...</Centered>
            <CenteredBold key={`safetychain-final-${newGameState.episode}-${chainOrder.length}`}>
                {listNames(leftOut.map((h) => hgPreferredName(h)))} will compete in a second safety competition.
            </CenteredBold>
            <Portraits
                houseguests={leftOut}
                centered={true}
                key={`safetychain-final-${newGameState.episode}-${chainOrder.length}-2`}
            />
        </>
    );
    newGameState.currentLog.votes[currentChooser.id] = new SaveVote(-1, "Not eligible");

    const safetyChainScene: Scene = new Scene({
        title: "Chain Ceremony",
        gameState: initialGameState,
        content: (
            <div>
                {sceneContent}
                <NextEpisodeButton />
            </div>
        ),
    });
    scenes.push(safetyChainScene);

    let safetyComp2Scene1;
    let safetyComp2Scene2;
    let safeHg: Houseguest[];
    [newGameState, safetyComp2Scene1, finishedHoH] = generateCompetitionScene(newGameState, {
        customTitle: "2nd Safety Competition",
        compType: "HoH",
        doubleEviction: true,
        skipHoHWin: true,
        competitors: leftOut,
        customText: ""
    });
    [newGameState, safetyComp2Scene2, safeHg] = generateCompetitionResultsScene(newGameState, finishedHoH, {
        customTitle: "2nd Safety Results",
        compType: "HoH",
        doubleEviction: true,
        bottomText: " has won the safety competition!",
    });
    scenes.push(safetyComp2Scene1, safetyComp2Scene2);

    newGameState.incrementLogIndex();
    const noms = leftOut.filter((hg) => hg.id !== safeHg[0].id).map((hg) => getHouseguestById(newGameState, hg.id));

    let evictionScene;
    noms.forEach((nom) => nom.nominations++);
    [newGameState, evictionScene] = generateEvictionScene(newGameState, [], noms, {
        votingTo: "Evict",
        doubleEviction: true,
        tieBreaker: {
            hg: chainStarter,
            text: "Safety Competition winner",
            voteType: (id) => new PoVvote(id),
        },
    });
    scenes.push(evictionScene);

    let twinTwistScene = generateTwinTwist(initialGameState);
    if (twinTwistScene) scenes.push(twinTwistScene);
    return [newGameState, scenes];
}
