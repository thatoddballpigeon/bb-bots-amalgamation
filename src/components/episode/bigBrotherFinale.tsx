import React from "react";
import { EpisodeType, Episode } from "./episodes";
import { excludeHouseguests, GameState, nonEvictedHouseguests } from "../../model";
import { MemoryWall } from "../memoryWall";
import { NextEpisodeButton } from "../nextEpisodeButton/nextEpisodeButton";
import { finalEvictionScene } from "./scenes/finalEvictionScene";
import { juryVoteScene } from "./scenes/juryVoteScene";
import { HasText } from "../layout/text";
import { generateCompetitionScene } from "./scenes/competitionScene";
import { listNames } from "../../utils/listStrings";
import { generateCompetitionResultsScene } from "./scenes/competitionResultsScene";

export const BigBrotherFinale: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n === finalists,
    eliminates: 2,
    generate: generateBbFinale,
};

export function generateBbFinale(initialGameState: GameState): Episode {
    const title = "Finale";
    const competitors = nonEvictedHouseguests(initialGameState);
    const scenes = [];
    const content = (
        <HasText>
            <MemoryWall splits={[{ houseguests: initialGameState.houseguests }]} /> <br />
            <NextEpisodeButton />
        </HasText>
    );

    let currentGameState;
    let finalePart1Scene, finalePart2Scene, finalePart3Scene;
    let winner1, winner2, finalHoH;

    [currentGameState, finalePart1Scene, winner1] = generateCompetitionScene(initialGameState, {
        customTitle: "Final HoH Comp 1",
        customText: `The final ${competitors.length} houseguests compete in the endurance competition.`,
        compType: "HoH",
        skipHoHWin: true,
        previousHoHcanCompete: true,
        isFinale: true
    });
    scenes.push(finalePart1Scene);
    let resultsPart1Scene;
    [currentGameState, resultsPart1Scene] = generateCompetitionResultsScene(
        currentGameState,
        winner1,
        {
            compType: "HoH",
            bottomText: ` has won the endurance competition!`,
        }
    );
    scenes.push(resultsPart1Scene);

    [currentGameState, finalePart2Scene, winner2] = generateCompetitionScene(currentGameState, {
        customTitle: "Final HoH Comp 2",
        customText: `The other ${competitors.length - 1} houseguests compete in the skill competition.`,
        compType: "HoH",
        skipHoHWin: true,
        previousHoHcanCompete: true,
        competitors: excludeHouseguests(competitors, winner1),
        isFinale: true
    });
    scenes.push(finalePart2Scene);
    let resultsPart2Scene;
    [currentGameState, resultsPart2Scene] = generateCompetitionResultsScene(
        currentGameState,
        winner2,
        {
            compType: "HoH",
            bottomText: ` has won the skill competition!`,
        }
    );
    scenes.push(resultsPart2Scene);

    const winners = listNames([...winner1, ...winner2].map((win) => win.preferredName()));
    [currentGameState, finalePart3Scene, finalHoH] = generateCompetitionScene(currentGameState, {
        customTitle: "Final HoH Comp 3",
        customText: `${winners} compete in the quiz competition.`,
        compType: "HoH",
        previousHoHcanCompete: true,
        competitors: [...winner1, ...winner2],
        isFinale: true
    });
    scenes.push(finalePart3Scene);
    let resultsPart3Scene;
    [currentGameState, resultsPart3Scene] = generateCompetitionResultsScene(
        currentGameState,
        finalHoH,
        {
            compType: "HoH",
            bottomText: `, congratulations! You are the final Head of Household!`
        }
    );
    scenes.push(resultsPart3Scene);

    let finalEviction;
    [currentGameState, finalEviction] = finalEvictionScene(currentGameState, finalHoH[0]);
    scenes.push(finalEviction);
    const [gameState, juryScene] = juryVoteScene(currentGameState);
    scenes.push(juryScene);
    return new Episode({ gameState, content, title, scenes, type: BigBrotherFinale });
}
