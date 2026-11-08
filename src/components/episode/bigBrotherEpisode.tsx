import { GameState, Houseguest, EpisodeType, Episode, nonEvictedHouseguestsSplit, nonEvictedHouseguests } from "../../model";
import { generateCompetitionResultsScene } from "./scenes/competitionResultsScene";
import { generateNomCeremonyScene } from "./scenes/nominationCeremonyScene";
import { generateVetoPickingsScene } from "./scenes/vetoPickingsScene";
import { generateCompetitionScene } from "./scenes/competitionScene";
import { generateVetoCeremonyScene } from "./scenes/vetoCeremonyScene";
import { generateHouseEventsScene } from "./scenes/houseEventsScene";
import { TieBreaker, generateEvictionScene } from "./scenes/evictionScene";
import { NextEpisodeButton } from "../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { Scene } from "./scenes/scene";
import { HasText } from "../layout/text";
import styled from "styled-components";
import { weekStartTab$ } from "../../subjects/subjects";
import { WeekStartWrapper } from "./bigBrotherWeekstartWrapper";
import { GoldenVeto, Veto } from "./veto/veto";
import { generateTwinTwistScene } from "./scenes/twinTwistScene";
import { BottomBar } from "../bottomBar/bottomBar";

export const BigBrotherVanilla: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n > finalists,
    eliminates: 1,
    name: "",
    emoji: "",
    description: "",
    generate: generateBbVanilla,
};

const TabItem = styled.li`
    cursor: pointer;
`;

function Tab(props: { text: string; active: number; id: number; setActive: any }): JSX.Element {
    return (
        <TabItem
            className={props.active === props.id ? "is-active" : ""}
            onClick={() => {
                props.setActive(props.id);
                weekStartTab$.next(props.id);
            }}
        >
            <a>{props.text}</a>
        </TabItem>
    );
}

export function Tabs(): JSX.Element {
    const [active, setActive] = React.useState(weekStartTab$.value);
    return (
        <div className="tabs is-centered is-fullwidth is-medium" style={{ marginBottom: 0 }}>
            <ul style={{ paddingLeft: 0 }}>
                <Tab text={"Memory Wall"} active={active} setActive={setActive} id={0} />
                <Tab text={"Alliances"} active={active} setActive={setActive} id={1} />
            </ul>
        </div>
    );
}

export function defaultContent(initialGameState: GameState) {
    return (
        <HasText>
            <Tabs />
            <WeekStartWrapper gameState={initialGameState} />
            <br />
            <NextEpisodeButton />
            <BottomBar gameState={initialGameState} />
        </HasText>
    );
}

export function generateBbVanilla(initialGamestate: GameState): Episode {
    const episode = generateBBVanillaScenes(initialGamestate, { veto: GoldenVeto });
    return new Episode({
        scenes: episode.scenes,
        gameState: new GameState(episode.gameState),
        initialGamestate,
        type: BigBrotherVanilla,
    });
}

interface BBVanillaOptions {
    doubleEviction?: boolean;
    doubleVeto? : boolean;
    veto: Veto | null;
    splitIndex?: number;
    nomineesCanVote?: boolean;
    thirdNominee?: boolean;
    previousHoHcanCompete?: boolean;
    coHoH?: boolean;
    coHohIsFinal?: boolean;
    votingTo?: "Evict" | "Save";
    hohCompetitionCustomText?: string;
    tieBreaker?: (hg: Houseguest) => TieBreaker | undefined;
}

export function generateBBVanillaScenes(
    initialGameState: GameState,
    options: BBVanillaOptions
): {
    gameState: GameState;
    scenes: Scene[];
} {
    let hohWinners: Houseguest[] = [];
    let nominees: Houseguest[] = [];
    let currentGameState: GameState = initialGameState;
    const scenes: Scene[] = [];
    const doubleEviction = !!options.doubleEviction;
    const splitIndex = options.splitIndex;
    const previousHohCanCompete = options.previousHoHcanCompete;

    if (!doubleEviction) {
        let houseEventsScene;
        [currentGameState, houseEventsScene] = generateHouseEventsScene(
            currentGameState, 
            splitIndex,
            hohWinners,
            nominees,
            {}
        );
        scenes.push(houseEventsScene);
    }

    let hohCompetitionScene: Scene;
    [currentGameState, hohCompetitionScene, hohWinners] = generateCompetitionScene(currentGameState, {
        compType: "HoH",
        doubleEviction,
        splitIndex,
        previousHoHcanCompete: previousHohCanCompete,
        coHoH: options.coHoH,
        coHohIsFinal: options.coHohIsFinal,
        customText: options.hohCompetitionCustomText,
    });
    scenes.push(hohCompetitionScene);

    let hohResultsScene: Scene;
    [currentGameState, hohResultsScene] = generateCompetitionResultsScene(currentGameState,
        hohWinners,
        { compType: "HoH", doubleEviction }
    );
    scenes.push(hohResultsScene);

    let nomCeremonyScene;
    [currentGameState, nomCeremonyScene, nominees] = generateNomCeremonyScene(currentGameState,
        hohWinners,
        { doubleEviction, splitIndex, thirdNominee: options.thirdNominee }
    );
    scenes.push(nomCeremonyScene);

    return generateVetoScenesOnwards(currentGameState, hohWinners, nominees, scenes, [], options);
}

export function generateVetoScenesOnwards(
    currentGameState: GameState,
    hohWinners: Houseguest[],
    nominees: Houseguest[],
    scenes: Scene[],
    immuneHgs: Houseguest[],
    options: BBVanillaOptions
) {
    const splitIndex: number | undefined = options.splitIndex;
    const veto: Veto | null = options.veto;
    const doubleEviction: boolean = !!options.doubleEviction;
    const doubleVeto: boolean = !!options.doubleVeto;
    const lessThan3Hgs = nonEvictedHouseguestsSplit(splitIndex, currentGameState).length <= 3;
    let povPlayers: Houseguest[] | undefined = [];
    let povWinners: Houseguest[] | undefined = [];
    // force no veto if 3 or less houseguests are participating in the episode
    if (!lessThan3Hgs) {
        if (veto) {
            let vetoPickingsScene;
            [currentGameState, vetoPickingsScene, povPlayers] = generateVetoPickingsScene(
                currentGameState,
                hohWinners,
                nominees,
                { veto, doubleEviction, splitIndex }
            );
            scenes.push(vetoPickingsScene);

            let vetoCompetitionScene;
            [currentGameState, vetoCompetitionScene, povWinners] = generateCompetitionScene(
                currentGameState,
                { competitors: povPlayers, compType: "PoV", veto, doubleEviction, doubleVeto, splitIndex}
            );
            scenes.push(vetoCompetitionScene);

            let vetoResultsScene;
            [currentGameState, vetoResultsScene] = generateCompetitionResultsScene(
                currentGameState,
                povWinners,
                { compType: "PoV", veto, doubleEviction }
            );
            scenes.push(vetoResultsScene);

            if (!doubleEviction) {
                let houseEventsScene;
                [currentGameState, houseEventsScene] = generateHouseEventsScene(
                    currentGameState,
                    splitIndex,
                    hohWinners,
                    nominees,
                    { veto: true, eviction: false }
                );
                scenes.push(houseEventsScene);
            }

            if (povWinners) {
                let vetoCeremonyScene;
                [currentGameState, vetoCeremonyScene, nominees] = generateVetoCeremonyScene(
                    currentGameState,
                    hohWinners,
                    nominees,
                    povWinners,
                    { doubleEviction, veto, immuneHgs, splitIndex }
                );
                scenes.push(vetoCeremonyScene);
            }
        }

        if (!doubleEviction) {
            let houseEventsScene;
            [currentGameState, houseEventsScene] = generateHouseEventsScene(
                currentGameState,
                splitIndex,
                hohWinners,
                nominees,
                { veto: false, eviction: true }
            );
            scenes.push(houseEventsScene);
        }
    }
    
    let evictionScene;
    [currentGameState, evictionScene] = generateEvictionScene(currentGameState, hohWinners, nominees, {
        evictionTitle: doubleEviction && options.thirdNominee ? "Triple Eviction" : undefined,
        doubleEviction,
        votingTo: options.votingTo || "Evict",
        splitIndex,
        nomineesCanVote: options.nomineesCanVote,
        tieBreaker: options.tieBreaker && options.tieBreaker(povWinners[0]),
    });
    scenes.push(evictionScene);

    let twinTwistScene = generateTwinTwist(currentGameState);
    if (twinTwistScene) scenes.push(twinTwistScene);
    return { gameState: currentGameState, scenes }
}

export function generateTwinTwist(gameState: GameState): Scene | null {
    const pendingTwins = nonEvictedHouseguests(gameState).filter(c => {
        const secretTwin = c.secretTwin;
        return secretTwin.isTwin && !secretTwin.isPrimaryTwin && c.isHidden &&
        secretTwin.twinEntryEpisode === gameState.episode;
    });
    let scene: Scene | null = null;
    if (pendingTwins.length > 0) [gameState, scene] = generateTwinTwistScene(gameState, pendingTwins);
    return scene;
}