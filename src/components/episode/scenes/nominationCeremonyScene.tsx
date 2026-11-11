import {
    GameState,
    Houseguest,
    MutableGameState,
    getHouseguestById,
    excludeHouseguests,
    hgPreferredName,
    nonEvictedHouseguestsSplit,
    nonEvictedHouseguests,
} from "../../../model";
import { houseEventBox, Scene } from "./scene";
import { shuffle } from "lodash";
import { Portrait, Portraits } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { Centered, CenteredBold } from "../../layout/centered";
import { HouseEventBox, OverlayBox } from "../../layout/box";
import { pickNominationTargets, voteTargetScore } from "../../../utils/ai/aiApi";
import { listNames } from "../../../utils/listStrings";
import { getOrdinalSuffix, sortAlphaNum } from "../../../utils";
import { HorizontalLine } from "../../layout/line";
import { getEventBackgroundImage } from "../utilities/houseLocations";
import { generateNominationConfessionalEvents } from "../utilities/confessionalEventFactory";
import { generateNominationReason } from "../utilities/nominationReasons";
import { nomCeremonyInformation } from "../utilities/tvRatings";

interface NomCeremonyOptions {
    doubleEviction?: boolean;
    thirdNominee?: boolean;
    splitIndex?: number;
}

export interface NominationInformation {
    hoh: Houseguest,
    nominated: Houseguest[]
}

export function generateNomCeremonyScene(
    initialGameState: GameState,
    hohWinners: Houseguest[],
    options: NomCeremonyOptions
): [GameState, Scene, Houseguest[]] {
    const newGameState = new MutableGameState(initialGameState);
    const splitIndex = options.splitIndex;
    const houseguests = nonEvictedHouseguestsSplit(splitIndex, newGameState);
    const isCoHoH = hohWinners.length > 1;
    const maxNomineesPerHoH = isCoHoH ? 1 : options.thirdNominee ? 3 : 2;

    const weI = isCoHoH ? "We" : "I";
    const myOur = isCoHoH ? "our" : "my";
    const theHoH = isCoHoH ? "Heads of Household" : "Head of Household";

    const nominations: JSX.Element[] = [];
    const nomReasons: JSX.Element[] = [];
    
    hohWinners = hohWinners.map((hoh) => {
        const hg = getHouseguestById(newGameState, hoh.id);
        hg.hoh.isHoH = true;
        return hg;
    });

    let nominees: Houseguest[] = [];
    const excludedIds = new Set<number>([
        ...hohWinners.map(hoh => hoh.id),
        ...houseguests.filter(hg => hg.isHidden).map(hg => hg.id)
    ]);
    const currentInfo: NominationInformation[] = [];
    let i = 0;
    for (const hoh of hohWinners) {
        const scored = pickNominationTargets(splitIndex, newGameState, hoh, excludedIds, maxNomineesPerHoH);
        scored.map(s => s.contestant.id).forEach(id => excludedIds.add(id));
        for (const score of scored) {
            const nominee = getHouseguestById(newGameState, score.contestant.id);
            const reason = generateNominationReason(newGameState, hoh, score.contestant, score.reason);
            nominee.nominatorId = hoh.id;
            nominee.nominatedBy.push(hoh.id);
            hoh.hoh.nominated.push(nominee);
            nominations.push(
                <OverlayBox className="column">
                    <Centered>{isCoHoH ? `${hoh.preferredName()} has nominated...`
            : `The ${getOrdinalSuffix(i + 1)} houseguest I have nominated is...`}</Centered>
                    <Portrait centered={true} houseguest={nominee} />
                </OverlayBox>,
            );
            nomReasons.push(
                <React.Fragment key={`decision-${i}`}>
                    <Portraits centered={true} houseguests={[hoh, nominee]} />,
                    <Centered>{nominee.preferredName()}, {reason.quote}</Centered>
                </React.Fragment>
            );
            i++;
        }
        const chosen = scored.map(s => s.contestant);
        currentInfo.push({ hoh, nominated: chosen });
        nominees.push(...chosen);
    }
    nominees = isCoHoH ? nominees : shuffle(nominees);
    nominees.forEach(nom => {
        nom.isNominated = true;
        nom.nominations++;
    });

    let events = generateNominationConfessionalEvents(newGameState, houseguests.filter(hg => !hg.isHidden), currentInfo);
    let postNomEvents: JSX.Element[] = [];
    for (const event of events) {
        const component = houseEventBox(event);
        if (component) postNomEvents.push(component);
    }
    nomCeremonyInformation.push(...currentInfo);

    newGameState.currentLog.nominationsPreVeto = nominees.map(nom => nom.id);

    const scene = new Scene({
        title: "Nomination Ceremony",
        gameState: newGameState,
        content: (
            <div>
                <Centered>The {theHoH} will now name their nominees for eviction.</Centered>
                <HorizontalLine />
                <HouseEventBox
                    imageURL={getEventBackgroundImage("Living Room")}
                    location="Living Room"
                    houseguests={[...hohWinners]}
                    text={`This is the nomination ceremony. It is ${myOur} responsibility as ${theHoH} to
                        nominate ${options.thirdNominee ? `three` : `two`} houseguests for eviction.`}
                />
                <div className="columns is-marginless is-centered">
                    {nominations}
                </div>
                <CenteredBold>{`${weI} have nominated you, ${listNames(nominees.map((nom) => hgPreferredName(nom)))} for eviction.`}</CenteredBold>
                <Centered>{nomReasons}</Centered>
                <Portraits centered={true} houseguests={[...hohWinners]} />
                <CenteredBold>This Nomination Ceremony is adjourned.</CenteredBold>
                <HorizontalLine />
                {postNomEvents}
                <NextEpisodeButton />
            </div>
        ),
    });

    return [new GameState(newGameState), scene, nominees];
}
