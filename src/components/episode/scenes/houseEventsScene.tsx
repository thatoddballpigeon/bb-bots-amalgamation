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
import { generateHouseConfessionalEvents, generateHouseEvents } from "../utilities/houseEventFactory";
import { checkAllianceFormation, checkShowmanceFormation } from "../../../utils/alliances";
import { generateAllianceEvents } from "../utilities/allianceEventFactory";

export interface HouseEventsSceneOptions {
    veto?: boolean;
    eviction?: boolean;
}

const TIMES_OF_DAY = ["sunrise", "morning", "afternoon", "evening", "night"] as const;

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

    let confessionalEvents: JSX.Element[] = [];
    const events = generateHouseConfessionalEvents(newGameState, splitIndex, options);
    confessionalEvents.push(
        (events.length === 0
            ? <Centered>No confessionals today.</Centered>
            : <CenteredBold style={{fontSize: "20px"}}>CONFESSIONALS</CenteredBold>
        )
    );
    for (const event of events) {
        const component = houseEventBox(event);
        if (component) confessionalEvents.push(component);
    }

    let allianceEvents = generateAllianceEvents(splitIndex, newGameState);

    const scene = new Scene({
        title: "House Events",
        gameState: initialGameState,
        content: (
            <div className="is-multiline is-centered">
                <Centered>Let's check up on our houseguests.</Centered>
                <HorizontalLine />
                {houseEvents}
                {confessionalEvents}
                {allianceEvents}
                <NextEpisodeButton />
            </div>
        ),
    });
    return [new GameState(newGameState), scene];
}