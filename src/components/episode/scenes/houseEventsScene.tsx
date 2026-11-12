import {
    GameState,
    Houseguest,
    MutableGameState,
    nonEvictedHouseguestsSplit,
} from "../../../model";
import { houseEventBox, Scene } from "./scene";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { CenteredBold, Centered } from "../../layout/centered";
import { HorizontalLine } from "../../layout/line";
import { generateHouseEvents } from "../utilities/houseEventFactory";
import { generateAllianceEvents } from "../utilities/allianceEventFactory";

export interface HouseEventsSceneOptions {
    veto?: boolean;
    eviction?: boolean;
}


export function generateHouseEventsScene(
    initialGameState: GameState,
    splitIndex: number | null | undefined,
    povWinners: Houseguest[],
    hohWinners: Houseguest[],
    nominees: Houseguest[],
    options: HouseEventsSceneOptions
): [GameState, Scene] {
    const newGameState = new MutableGameState(initialGameState);
    const timeOfDay = [
        "sunrise",
        "morning",
        "afternoon",
        "evening",
        "night"
    ];

    let houseEvents: JSX.Element[] = [];
    for (const time of timeOfDay) {
        houseEvents.push(
            <CenteredBold style={{fontSize: "20px"}}>{time.toLocaleUpperCase()}</CenteredBold>
        );
        newGameState.timeOfDay = time;
        const events = generateHouseEvents(splitIndex, newGameState, povWinners, hohWinners, nominees, options);
        for (const event of events) {
            const component = houseEventBox(event);
            if (component) houseEvents.push(component);
        }
        houseEvents.push(<HorizontalLine />);
    }
    houseEvents.pop();

    let allianceEvents = generateAllianceEvents(splitIndex, newGameState);

    const scene = new Scene({
        title: "House Events",
        gameState: initialGameState,
        content: (
            <div className="is-multiline is-centered">
                <Centered>Let's check up on our houseguests.</Centered>
                <HorizontalLine />
                {houseEvents}
                {allianceEvents}
                <NextEpisodeButton />
            </div>
        ),
    });
    return [new GameState(newGameState), scene];
}