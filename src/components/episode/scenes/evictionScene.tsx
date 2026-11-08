import { GameState, Houseguest, MutableGameState, excludeHouseguests, getHouseguestById, hgPreferredName, nonEvictedHouseguestsSplit } from "../../../model";
import { Scene } from "./scene";
import _, { shuffle } from "lodash";
import { ProfileHouseguest } from "../../memoryWall";
import { castEvictionVote, castVoteToSave, NumberWithLogic, pickNominationTargets, voteTargetScore } from "../../../utils/ai/aiApi";
import { Portraits } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { CenteredBold, Centered } from "../../layout/centered";
import { OverlayBox, HouseEventBox } from "../../layout/box";
import { NomineeVote, NormalVote, HoHVote, SaveVote, VoteType } from "../../../model/logging/voteType";
import { evictHouseguest } from "../utilities/evictHouseguest";
import { listNames, listVotes } from "../../../utils/listStrings";
import { getEventBackgroundImage } from "../utilities/houseLocations";
import { generateEvicteeExit } from "../../../utils/ai/generateExcuse";
import { evictionInformation } from "../utilities/tvRatings";
import { getRelationshipStrength, isNotNull } from "../../../utils";
import { generateEvictionReason, generateSaveReason } from "../utilities/nominationReasons";

interface VoteGroup {
    target: Houseguest;
    voters: Houseguest[];
    reasons: string[];
}

export interface TieBreaker {
    hg: Houseguest;
    text: string;
    voteType: (id: number) => VoteType;
}

export interface EvictionInformation {
    nominees: Houseguest[];
    votes: { voter: Houseguest; target: Houseguest }[];
    evicted: Houseguest[] | null;
    tiebreaker: Houseguest | null;
    tiebreakerTarget: Houseguest[] | null;
    tally: number[];
}

interface EvictionSceneOptions {
    evictionTitle?: string;
    votingTo: "Save" | "Evict";
    doubleEviction?: boolean;
    tieBreaker?: TieBreaker;
    splitIndex?: number;
    nomineesCanVote?: boolean;
}

export function generateEvictionScene(
    initialGameState: GameState,
    hohWinners: Houseguest[],
    nominees: Houseguest[],
    options: EvictionSceneOptions
): [GameState, Scene] {
    let newGameState = new MutableGameState(initialGameState);
    const splitIndex = options.splitIndex;
    const doubleEviction = !!options.doubleEviction;
    const isEvict = options.votingTo === "Evict";

    const voters = nonEvictedHouseguestsSplit(splitIndex, newGameState).filter(hg =>
        !hohWinners.some(hoh => hg.id === hoh.id) && (options.nomineesCanVote || !nominees.some(nom => hg.id === nom.id))
    );
    const votesOfNominees: { [id: number]: string } = {};

    newGameState.currentLog.votingTo = options.votingTo;
    
    nominees = nominees.map((nom) => {
        return getHouseguestById(initialGameState, nom.id);
    });
    nominees = shuffle(nominees);
    const votes = voters.map(voter => {
        if (voter.secretTwin.isTwin && voter.secretTwin.twinPartner != null) {
            const twinNom = nominees.find(n => n.id === voter.secretTwin.twinPartner);
            if (twinNom) {
                const saveTarget = nominees.find(n => n.id !== voter.secretTwin.twinPartner && n.id !== voter.id);
                if (saveTarget) return { voter, target: saveTarget, ...(isEvict ? generateEvictionReason(newGameState, voter, saveTarget) : generateSaveReason(newGameState, voter, saveTarget)) };
            }
        }
        const scored = nominees.filter(c => c.id !== voter.id).map(c => {
            const score = voteTargetScore(splitIndex, newGameState, voter, c, 'eviction');
            return { contestant: c, score };
        });
        scored.sort((a, b) => isEvict ? b.score - a.score : a.score - b.score);
        const target = scored[0]?.contestant;
        if (!target) return null;
        newGameState.currentLog.votes[voter.id] = isEvict
            ? new NormalVote(target.id)
            : new SaveVote(target.id);
        options.nomineesCanVote &&
            nominees.some((nom) => nom.id === voter.id) &&
            (votesOfNominees[voter.id] = getHouseguestById(newGameState, target.id).preferredName());
        return { voter, target, ...(isEvict ? generateEvictionReason(newGameState, voter, target) : generateSaveReason(newGameState, voter, target)) };
    }).filter(isNotNull);

    const shuffled = shuffle(votes);

    const tally: number[] = [];
    nominees.forEach(nom => { tally[nom.id] = 0; });
    shuffled.forEach(v => { tally[v.target.id]++; });

    const sorted = nominees.map(c => ({ contestant: c, votes: tally[c.id] || 0 }))
        .sort((a, b) => b.votes - a.votes);

    let chosen = [sorted[0].contestant];
    let tiebreaker: Houseguest | null = null;
    let tiebreakerTarget = null;

    let tieVote = false;
    if (!sorted.length) {
        evictionInformation.push({ nominees, votes: [], tally, evicted: null, tiebreaker: null, tiebreakerTarget: null });
    } else {
        let outOf = 0;
        newGameState.currentLog.votesInMajority = tally[chosen[0].id];
        newGameState.currentLog.soleVoter = getHouseguestById(newGameState, hohWinners[0].id).preferredName();
        newGameState.currentLog.outOf = outOf;
        if (sorted.length >= 2 && sorted.some((item, index) => index > 0 && item.votes === sorted[0].votes)) {
            tieVote = true;
            const tiedNominees = sorted.filter((s, i) => i > 0 && s.votes === sorted[0].votes).map(s => s.contestant);
            const tiedIds = new Set<number>(tiedNominees.map(c => c.id));
            const excludedIds = new Set<number>(newGameState.houseguests.filter(c => !tiedIds.has(c.id)).map(c => c.id))
            tiebreaker = options.tieBreaker?.hg ?? hohWinners[0];
            const result = options.votingTo === "Save"
                ? [...tiedNominees].sort((a, b) => getRelationshipStrength(newGameState, tiebreaker!, b) - getRelationshipStrength(newGameState, tiebreaker!, a))[0]
                : pickNominationTargets(splitIndex, newGameState, tiebreaker, excludedIds, 1)[0].contestant;
            chosen = [result];

            newGameState.currentLog.votesInMajority = tally[result.id] + 1;
            newGameState.currentLog.votes[tiebreaker!.id] = options.tieBreaker
                ? options.tieBreaker.voteType(result.id)
                : new HoHVote(result.id);
            newGameState.currentLog.soleVoter = getHouseguestById(newGameState, tiebreaker.id).preferredName();
            newGameState.currentLog.outOf++;
        }
        tiebreakerTarget = chosen;
        evictionInformation.push({ nominees, votes: shuffled, tally, evicted: chosen, tiebreaker, tiebreakerTarget });
    }

    const chosenIds = new Set(chosen.map(c => c.id));
    const evictees = nominees.filter(nom => chosenIds.has(nom.id) === isEvict);
    const evicteesSet = new Set<number>(evictees.map(c => c.id));

    const HoH = hohWinners.length > 1 ? "Heads of Household" : "Head of Household";
    const nomNames = listNames(nominees.map((hg) => getHouseguestById(newGameState, hg.id).preferredName()));
    const hohNames = listNames(hohWinners.map((hg) => getHouseguestById(newGameState, hg.id).preferredName()));

    const introText = hohWinners.length > 0
        ? `${hohNames}, as current ${HoH}, you are not allowed to vote.`
        : "";
    const nomVoteText = !options.nomineesCanVote
        ? hohWinners.length === 0
            ? `${nomNames}, as nominees, you are not allowed to vote.`
            : `Neither are the ${nominees.length} nominees.`
        : "";

    const isUnanimous = sorted[0].votes > 0 && sorted[1].votes === 0;
    const voteCountText = isUnanimous
        ? "By a unanimous vote..."
        : `By a vote of ${listVotes(sorted.map((sort) => `${sort.votes}`))}...`;

    const compWinner = options.tieBreaker ? options.tieBreaker.text : "current Head of Household";
    const soleVoteText = tiebreaker
        ? `${getHouseguestById(newGameState, tiebreaker.id).preferredName()}, as ${compWinner}, you must cast the sole vote to ${options.votingTo.toLowerCase()}.`
        : "";

    hohWinners.forEach((hoh) => {
        const hg = getHouseguestById(newGameState, hoh.id);
        hg.hoh.isHoH = false;
    });
    nominees.forEach((nom) => {
        const hg = getHouseguestById(newGameState, nom.id);
        newGameState.currentLog.votes[nom.id] = new NomineeVote(
            evicteesSet.has(nom.id),
            options.nomineesCanVote ? votesOfNominees[nom.id] : undefined
        );
        hg.isNominated = false;
        hg.nominatorId = -1;
    });
    evictees.forEach((evictee) => {
        newGameState = evictHouseguest(newGameState, evictee.id);
        evictee.isJury = getHouseguestById(newGameState, evictee.id).isJury;
    });

    const groupedVotes = Object.values(
        votes.reduce<Record<number, VoteGroup>>((acc, current) => {
            const targetId = current.target.id;
            if (!acc[targetId]) {
                acc[targetId] = {
                    target: current.target,
                    voters: [],
                    reasons: []
                };
            }
            acc[targetId].voters.push(current.voter);
            acc[targetId].reasons.push(current.quote)
            return acc;
        }, {})
    );

    const scene = new Scene({
        title: options.evictionTitle || (doubleEviction ? "Double Eviction" : "Live Eviction"),
        gameState: initialGameState,
        content: (
            <div>
                <Centered>{nomNames} each give brief final speeches about why they should stay.</Centered>
                <Portraits houseguests={[...nominees]} centered={true} />
                <CenteredBold>It is now time for the live voting to begin.</CenteredBold>
                <Portraits houseguests={[...hohWinners]} centered={true} />
                <Centered>{introText} {nomVoteText}</Centered>
                <CenteredBold>{voteCountText}</CenteredBold>
                <div className="columns is-centered">
                    {groupedVotes.map((voters, i) => (
                        <OverlayBox className="column" key={`voters-${i}`}>
                            <Portraits houseguests={voters.voters.map((voter, index) => {
                                const hg: ProfileHouseguest = { ...getHouseguestById(initialGameState, voter.id) };
                                hg.tooltip = voters.reasons[index];
                                return hg;
                            })} centered={true} />
                        </OverlayBox>
                    ))}
                </div>
                {(tieVote && tiebreaker && tiebreakerTarget) && (
                    <div>
                        <CenteredBold> We have a tie.</CenteredBold>
                        <Centered>{soleVoteText}</Centered>
                        <Portraits houseguests={[tiebreaker]} centered={true} />
                        <CenteredBold>
                            I vote to {options.votingTo.toLowerCase()}
                            {` ${listNames(
                                tiebreakerTarget.map(hg => getHouseguestById(newGameState, hg.id).preferredName())
                            )}.`}
                        </CenteredBold>
                    </div>
                )}
                {options.votingTo === "Save" && (
                    <CenteredBold>{`${listNames(
                        nominees.filter(nom => !evicteesSet.has(nom.id)).map(hg => getHouseguestById(newGameState, hg.id).preferredName())
                    )}... you are safe.`}</CenteredBold>
                )}
                <HouseEventBox
                    imageURL={getEventBackgroundImage("Living Room")}
                    houseguests={nominees.map((_hg) => {
                        const hg: ProfileHouseguest = { ...getHouseguestById(initialGameState, _hg.id) };
                        if (evicteesSet.has(_hg.id)) hg.isEvicted = true;
                        return hg;
                    })}
                    text={`${options.votingTo === "Save" ? "That means " : ""}${listNames(
                        evictees.map(hg => getHouseguestById(newGameState, hg.id).preferredName())
                    )}... you have been evicted from the Big Brother House.`}
                />
                <Centered>{generateEvicteeExit(evictees)}</Centered>
                <NextEpisodeButton />
            </div>
        ),
    });
    return [newGameState, scene];
}
