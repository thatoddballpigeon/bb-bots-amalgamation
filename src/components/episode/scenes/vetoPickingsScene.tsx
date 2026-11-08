import {
    GameState,
    Houseguest,
    MutableGameState,
    randomPlayer,
    excludeHouseguests,
    nonEvictedHouseguestsSplit,
    hgPreferredName,
} from "../../../model";
import { Scene } from "./scene";
import { Portraits } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { Centered } from "../../layout/centered";
import { HouseEventBox } from "../../layout/box";
import { Veto } from "../veto/veto";
import { HorizontalLine } from "../../layout/line";
import { getEventBackgroundImage } from '../utilities/houseLocations';
import { pJurorVotesForHero } from "../../../utils/ai/aiApi";
import { isAllied } from "../../../utils/alliances";
import { applyRelationship } from "../utilities/houseEventFactory";
import { updateRelationship } from "../../../utils";

interface VetoPickingsSceneOptions {
    veto: Veto;
    doubleEviction?: boolean;
    splitIndex?: number;
}

export function generateVetoPickingsScene(
    initialGameState: GameState,
    HoHs: Houseguest[],
    nominees: Houseguest[],
    options: VetoPickingsSceneOptions
): [GameState, Scene, Houseguest[]] {
    const newGameState = new MutableGameState(initialGameState);
    const splitIndex = options.splitIndex;
    const nonEvictedHgs = nonEvictedHouseguestsSplit(splitIndex, newGameState).filter(hg => !hg.isHidden);

    const hohPlaysVeto = newGameState.hohPlaysVeto || nonEvictedHgs.length <= 5 || HoHs.length > 1;
    const maxVetoPlayers = hohPlaysVeto ? 6 : 5;

    // pick players
    let povPlayers: any[] = [];
    const choices = excludeHouseguests(nonEvictedHgs, HoHs);
    const everyoneWillPlay = nonEvictedHgs.length <= maxVetoPlayers;
    const pickings: any[] = [];

    const firstRow = hohPlaysVeto ? HoHs : [];
    const secondRow = [...firstRow, ...nominees];

    // Compress initial player population
    if (hohPlaysVeto || everyoneWillPlay) HoHs.forEach(hoh => povPlayers.push({ ...hoh }));
    nominees.forEach(nom => povPlayers.push({ ...nom }));

    let introText = "Everyone left in the house will compete in this challenge.";
    if (everyoneWillPlay) {
        while (excludeHouseguests(choices, povPlayers).length > 0) {
            povPlayers.push({ ...randomPlayer(choices, povPlayers) });
        }
    } else {
        const isMultiHoH = HoHs.length > 1;
        const hohLabel = isMultiHoH ? "Heads of Household" : "Head of Household";
        const hohText = hohPlaysVeto ? `${hohLabel}, the ` : "";
        const randomCount = maxVetoPlayers - (hohPlaysVeto ? HoHs.length : 0) - nominees.length;
        
        introText = `Only ${maxVetoPlayers} people will participate in the Veto competition; the ${hohText}${nominees.length} nominees, and ${randomCount} other players selected by random draw. Will the nominees please join ${isMultiHoH ? "us" : "me"} up here?`;

        for (let i = 0; povPlayers.length < maxVetoPlayers; i++) {
            const chooser = secondRow[i];
            let picked: Houseguest;
            let chooseText: string;

            if (Math.random() < 0.33) {
                const score = (a: any) => chooser.relationshipWith(newGameState, a) + (isAllied(newGameState, chooser, a) ? 5 : 0);
                picked = excludeHouseguests(choices, povPlayers).slice().sort((a, b) => score(b) - score(a))[0];
                
                updateRelationship(newGameState, chooser.id, picked.id, 20);
                updateRelationship(newGameState, picked.id, chooser.id, 20);
                chooseText = `Houseguest's Choice. I pick ${picked.preferredName()}.`;
            } else {
                picked = randomPlayer(choices, povPlayers);
                chooseText = `${picked.preferredName()}.`;
            }

            pickings.push(
                <>
                    <Portraits centered houseguests={[chooser]} />
                    {i < HoHs.length && <Centered>{`As HoH, I will pick ${i === 0 ? "first" : "next"}.`}</Centered>}
                    <Centered>...</Centered>
                    <HouseEventBox imageURL={getEventBackgroundImage("Living Room")} houseguests={[chooser, picked]} text={chooseText} />
                </>
            );
            povPlayers.push({ ...picked });
        }
    }

    const thirdRow: Houseguest[] = povPlayers.slice(firstRow.length);
    thirdRow.push(...firstRow);

    const scene = new Scene({
        title: "Veto Pickings",
        gameState: initialGameState,
        content: (
            <div>
                <Centered>It's time to pick players for the Power of Veto competition.</Centered>
                <HorizontalLine />
                <HouseEventBox
                    imageURL={getEventBackgroundImage("Living Room")}
                    location="Living Room"
                    houseguests={firstRow}
                    text={introText}
                />
                <Portraits
                    centered={true}
                    houseguests={secondRow}
                />
                {pickings}
                <NextEpisodeButton />
            </div>
        ),
    });
    return [new GameState(newGameState), scene, povPlayers];
}
