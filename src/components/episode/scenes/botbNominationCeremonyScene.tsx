import { GameState, Houseguest, MutableGameState, getHouseguestById, excludeHouseguests, hgPreferredName } from "../../../model";
import { Scene } from "./scene";
import { Portrait } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { Centered, CenteredBold } from "../../layout/centered";
import { OverlayBox } from "../../layout/box";
import { backdoorNPlayers } from "../../../utils/ai/aiApi";
import { listNames } from "../../../utils/listStrings";
import { ProfileHouseguest } from "../../memoryWall";

export function generateBotbNominationCeremonyScene(
    initialGameState: GameState,
    HoHs: Houseguest[],
): [GameState, Scene, Houseguest[][]] {
    const newGameState = new MutableGameState(initialGameState);

    const exclusions = HoHs;
    const noms1: Houseguest[] = [];
    const noms2: Houseguest[] = [];
    for (let i = 0; i < 4; i++) {
        const hoh = i % 2 === 0 ? HoHs[0] : HoHs[1];
        const nextNom: Houseguest = getHouseguestById(
            newGameState,
            backdoorNPlayers(hoh, excludeHouseguests(newGameState.houseguests, exclusions), newGameState, 1)[0].decision
        );
        exclusions.push(nextNom);
        i % 2 === 0 ? noms1.push(nextNom) : noms2.push(nextNom);
    }
    [noms1, noms2].forEach((arr) => arr.forEach((nom) => nom.nominations++));

    const finalStatement = (noms: Houseguest[]) =>
        `I have nominated you, ${listNames(noms.map((n) => hgPreferredName(n)))} for eviction. `;
    const firstText = "My first nominee is...";
    const secondText = "My second nominee is...";

    const block = (noms: Houseguest[], hoh: ProfileHouseguest) => {
        return (
            <div className="column">
                <div className="column">
                    <div className="columns is-centered">
                        <div className="column">
                            <Portrait centered={true} houseguest={hoh} />
                        </div>
                    </div>
                    <div className="columns is-centered">
                        <OverlayBox className="column is-5">
                            <Centered> {firstText}</Centered>
                            <Portrait centered={true} houseguest={noms[0]} />
                        </OverlayBox>
                        <OverlayBox className="column is-5">
                            <Centered> {secondText}</Centered>
                            <Portrait centered={true} houseguest={noms[1]} />
                        </OverlayBox>
                    </div>
                </div>
                <div className="column">
                    <CenteredBold>{finalStatement(noms)}</CenteredBold>
                </div>
            </div>
        );
    };

    const scene = new Scene({
        title: "Nomination Ceremony",
        gameState: newGameState,
        content: (
            <div>
                <Centered>
                    This is the nomination ceremony. It is our responsibility as Heads of Household to each
                    nominate two houseguests for eviction.
                </Centered>
                <div className="columns is-marginless is-centered">
                    {block(noms1, HoHs[0])}
                    {block(noms2, HoHs[1])}
                </div>
                <br />
                <NextEpisodeButton />
            </div>
        ),
    });
    return [new GameState(newGameState), scene, [noms1, noms2]];
}
