import React from "react";
import { GameState, getHouseguestById, Houseguest, MutableGameState, nonEvictedHouseguests } from "../../../model";
import { listNames } from "../../../utils/listStrings";
import { Centered, CenteredBold } from "../../layout/centered";
import { HorizontalLine } from "../../layout/line";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import { Portraits } from "../../playerPortrait/portraits";
import { Scene } from "./scene";
import { isNotNull } from "../../../utils";

export function generateTwinTwistScene(
    initialGameState: GameState,
    twins: Houseguest[],
): [GameState, Scene | null] {
    const newGameState = new MutableGameState(initialGameState);
    const houseguests = nonEvictedHouseguests(newGameState).filter(c => !c.isHidden);
    const results = twins.map(twin => {
        const player = getHouseguestById(initialGameState, twin.id);
        const secretTwin = player.secretTwin;
        const primary = houseguests.find(p => p.id === secretTwin.twinPartner);
        if (primary && !primary.isHidden && !primary.isEvicted) {
            twin.isHidden = false;
            if (!initialGameState.relationships[twin.id]) initialGameState.relationships[twin.id] = {};
            if (!initialGameState.relationships[primary.id]) initialGameState.relationships[primary.id] = {};
            initialGameState.relationships[twin.id][primary.id] = { strength: 10, momentum: 0, locked: true, compatVec: Array(8).fill(1), baseAffinity: 1 };
            initialGameState.relationships[primary.id][twin.id] = { strength: 10, momentum: 0, locked: true, compatVec: Array(8).fill(1), baseAffinity: 1 };
            return { twin, primary, entered: true };
        } else {
            secretTwin.twinEntryCancelled = true;
            return null;
        }
    }).filter(isNotNull);
    
    // todo: ADD... fucking. reactions. i think. like... betrayal/shock/anger, or fake surprise, complete neutrality
    const scene = results.length === 0 ? null : new Scene({
        title: "Twin Twist",
        gameState: initialGameState,
        content: (
            <div className="is-multiline is-centered">
                <Centered>Houseguests, please return to the living room.</Centered>
                <Portraits centered={true} houseguests={houseguests} />
                <Centered>
                    {results.length > 1 ? "Some" : "One"} of your fellow houseguests have not
                    been playing alone. In fact, they have been swapping places with an identical
                    twin this entire time.
                </Centered>
                <CenteredBold>
                    {listNames(results.map(r => r.twin.preferredName()))}, please
                    step out into the Big Brother household.
                </CenteredBold>
                {results.map(r => {
                    // dangerous but idc
                    return <Portraits centered={true} houseguests={[r.twin, "➡️", r.primary!]}/>
                })}
                <NextEpisodeButton />
            </div>
        ),
    });
    return [new GameState(newGameState), scene];
}