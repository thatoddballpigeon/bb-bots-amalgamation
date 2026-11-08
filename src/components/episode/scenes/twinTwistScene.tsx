import React from "react";
import { GameState, Houseguest, MutableGameState, nonEvictedHouseguests } from "../../../model";
import { listNames } from "../../../utils/listStrings";
import { Centered, CenteredBold } from "../../layout/centered";
import { HorizontalLine } from "../../layout/line";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import { Portraits } from "../../playerPortrait/portraits";
import { Scene } from "./scene";

export function generateTwinTwistScene(
    initialGameState: GameState,
    twins: Houseguest[],
): [GameState, Scene] {
    const newGameState = new MutableGameState(initialGameState);
    const houseguests = nonEvictedHouseguests(newGameState).filter(c => !c.isHidden);
    const results = twins.map(twin => {
        const secretTwin = twin.secretTwin;
        const primary = houseguests.find(p => p.id === secretTwin.twinPartner);
        if (primary && !primary.isHidden && !primary.isEvicted) {
            twin.isHidden = false;
            twin.relationships[primary.id].friendship = 100;
            primary.relationships[twin.id].friendship = 100;
        }
        return { twin, primary };
    });
    
    // todo: ADD... fucking. reactions. i think. like... betrayal/shock/anger, or fake surprise, complete neutrality
    const scene = new Scene({
        title: "Twin Twist",
        gameState: initialGameState,
        content: (
            <div className="is-multiline is-centered">
                {results.length === 0 ? (
                    undefined
                ) : (
                    <>
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
                    </>
                )}
                <NextEpisodeButton />
            </div>
        ),
    });
    return [new GameState(newGameState), scene];
}