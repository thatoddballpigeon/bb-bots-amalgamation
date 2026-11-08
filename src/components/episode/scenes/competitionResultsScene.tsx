import {
    GameState,
    Houseguest,
    MutableGameState,
    hgPreferredName,
    getHouseguestById,
} from "../../../model";
import { Scene } from "./scene";
import { Portraits } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { CenteredBold } from "../../layout/centered";
import { listNames } from "../../../utils/listStrings";
import { HorizontalLine } from "../../layout/line";
import { Veto } from "../veto/veto";

interface CompetitionResultsSceneOptions {
    compType: string;
    veto?: Veto;
    customTitle?: string;
    doubleEviction?: boolean;
    bottomText?: string;
}

export function generateCompetitionResultsScene(
    initialGameState: GameState,
    compWinners: Houseguest[],
    options: CompetitionResultsSceneOptions
): [GameState, Scene, Houseguest[]] {
    const newGameState = new MutableGameState(initialGameState);

    const isHohComp = options.compType === "HoH";
    const names = listNames(compWinners.map((win) => hgPreferredName(win)));

    const veto = options.veto;
    let vetoEmoji: string = "";
    let wonText: string = "";
    const haveHas = compWinners.length > 1 ? "have" : "has";
    if (options.compType === "PoV" && veto) {
        vetoEmoji = veto.emoji ? `${veto.emoji} ` : "";
        wonText = `${names} ${haveHas} won the ${vetoEmoji}${veto.name}!`;
    } else if (isHohComp) {
        wonText = `${names} ${haveHas} won Head of Household!`
    }
    if (options.bottomText) wonText = `${names}${options.bottomText}`

    const scene = new Scene({
        title: options.customTitle || (isHohComp ? "HoH Results" : "Veto Results"),
        gameState: initialGameState,
        content: (
            <div>
                <Portraits centered={true} houseguests={[...compWinners]} />
                <CenteredBold>{wonText}</CenteredBold>
                <NextEpisodeButton />
            </div>
        ),
    });

    return [new GameState(newGameState), scene, compWinners];
}
