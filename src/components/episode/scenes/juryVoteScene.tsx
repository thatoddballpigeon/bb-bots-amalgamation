import { GameState, getJurors, nonEvictedHouseguests, MutableGameState, Houseguest, hgPreferredName } from "../../../model";
import { Scene } from "./scene";
import { castJuryVote } from "../../../utils/ai/aiApi";
import { Portrait, Portraits } from "../../playerPortrait/portraits";
import React from "react";
import { ProfileHouseguest } from "../../memoryWall";
import { CenteredBold } from "../../layout/centered";
import { OverlayBox } from "../../layout/box";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import { NormalVote } from "../../../model/logging/voteType";

export function juryVoteScene(initialGameState: GameState): [GameState, Scene] {
    const newGameState = new MutableGameState(initialGameState);
    const jurors: Houseguest[] = getJurors(newGameState);
    const finalists = nonEvictedHouseguests(newGameState);
    const votes: Array<ProfileHouseguest[]> = [[], []];
    jurors.forEach((juror) => {
        const decision = castJuryVote(newGameState, juror, finalists);
        const result: ProfileHouseguest = { ...juror };
        votes[decision].push(result);
        newGameState.currentLog.votes[juror.id] = new NormalVote(finalists[decision].id);
    });
    const votesFor0 = votes[0].length;
    const votesFor1 = votes[1].length;
    const isUnanimous = votesFor0 === 0 || votesFor1 === 0;
    const voteCountText = isUnanimous
        ? "By a unanimous vote..."
        : `By a vote of ${votesFor0} to ${votesFor1}...`;

    const winner = votesFor0 > votesFor1 ? finalists[0] : finalists[1];
    const runnerUp = votesFor0 < votesFor1 ? finalists[0] : finalists[1];
    newGameState.currentLog.winner = winner.id;
    newGameState.currentLog.runnerUp = runnerUp.id;
    const scene = new Scene({
        title: "Jury Votes",
        gameState: newGameState,
        content: (
            <div>
                <Portraits houseguests={finalists} centered={true} />
                <CenteredBold>{voteCountText}</CenteredBold>
                <div className="columns is-centered">
                    <OverlayBox className="column">
                        <Portraits houseguests={votes[0]} centered={true} />
                    </OverlayBox>
                    <OverlayBox className="column">
                        <Portraits houseguests={votes[1]} centered={true} />
                    </OverlayBox>
                </div>
                <Portrait houseguest={winner} centered={true} />
                <CenteredBold>{`Congratulations, ${winner.preferredName()}... you are the winner of Big Brother!`}</CenteredBold>
                <NextEpisodeButton />
            </div>
        ),
    });
    return [newGameState, scene];
}
