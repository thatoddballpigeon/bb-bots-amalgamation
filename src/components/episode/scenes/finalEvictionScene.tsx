import { GameState, Houseguest, MutableGameState, nonEvictedHouseguests, hgPreferredName } from "../../../model";
import { Scene } from "./scene";
import { ProfileHouseguest } from "../../memoryWall";
import { Portrait, Portraits } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { CenteredBold, Centered } from "../../layout/centered";
import { HoHVote, NomineeVote } from "../../../model/logging/voteType";
import { evictHouseguest } from "../utilities/evictHouseguest";

export function finalEvictionScene(initialGameState: GameState, HoH: Houseguest): [GameState, Scene] {
    const newGameState = new MutableGameState(initialGameState);
    const nominees = nonEvictedHouseguests(newGameState).filter((hg) => hg.id !== HoH.id);
    const { decision: vote, reason } = { decision: 0, reason: ""};
    const evictee = nominees[vote];
    const survivor = nominees[vote === 1 ? 0 : 1];
    newGameState.currentLog.soleVoter = HoH.preferredName(true);
    newGameState.currentLog.votes[survivor.id] = new NomineeVote(false);
    newGameState.currentLog.votes[HoH.id] = new HoHVote(evictee.id);
    newGameState.currentLog.votesInMajority = 1;
    newGameState.currentLog.outOf = 1;
    const hoh: ProfileHouseguest = { ...HoH };
    hoh.tooltip = reason;
    evictHouseguest(newGameState, evictee.id);
    const scene: Scene = new Scene({
        title: "Final Eviction",
        gameState: newGameState,
        content: (
            <div>
                <Centered>
                    {`As the final HoH of the season, ${HoH.preferredName()}, you may now cast the sole vote to evict.`}
                </Centered>
                <Portrait houseguest={hoh} centered={true} />
                <CenteredBold>...</CenteredBold>
                <Portraits houseguests={nominees} centered={true} />
                <CenteredBold>...</CenteredBold>
                <Portrait houseguest={hoh} centered={true} />
                <CenteredBold>{`I vote to evict ${evictee.preferredName()}.`}</CenteredBold>
                <Portrait houseguest={evictee} centered={true} />
                <Centered>
                    It's official... {evictee.preferredName()}, you will be the final person leaving the Big Brother
                    House.
                </Centered>
                <NextEpisodeButton />
            </div>
        ),
    });
    return [new GameState(newGameState), scene];
}
