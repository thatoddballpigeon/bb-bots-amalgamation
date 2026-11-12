import { GameState, Houseguest, getHouseguestById, excludeHouseguests, nonEvictedHouseguestsSplit, hgPreferredName } from "../../../model";
import { houseEventBox, Scene } from "./scene";
import { backdoorNPlayers } from "../../../utils/ai/aiApi";
import { Portrait, Portraits } from "../../playerPortrait/portraits";
import { NextEpisodeButton } from "../../nextEpisodeButton/nextEpisodeButton";
import React from "react";
import { Centered, CenteredBold } from "../../layout/centered";
import { HouseEventBox } from "../../layout/box";
import { listNames } from "../../../utils/listStrings";
import { BoomerangVeto, DiamondVeto, Veto } from "../veto/veto";
import { HorizontalLine } from "../../layout/line";
import { getEventBackgroundImage } from "../utilities/houseLocations";
import { generateVetoConfessionalEvents } from "../utilities/confessionalEventFactory";
import { vetoCeremonyInformation } from "../utilities/tvRatings";
import { applyEventPopularity, applyRelationship } from "../utilities/houseEventFactory";
import { generateVetoReason } from "../utilities/nominationReasons";

interface VetoCeremonySceneOptions {
    doubleEviction?: boolean;
    veto: Veto;
    immuneHgs?: Houseguest[];
    splitIndex?: number;
}

export interface VetoCeremonyInformation {
    hoh: Houseguest;
    pov: Houseguest;
    saved: Houseguest | null;
    replacements: Houseguest[] | null;
    finalNominees: Houseguest[];
}

export function generateVetoCeremonyScene(
    initialGameState: GameState,
    hohWinners: Houseguest[],
    initialNominees: Houseguest[],
    povWinners: Houseguest[],
    options: VetoCeremonySceneOptions,
): [GameState, Scene, Houseguest[]] {
    if (povWinners === undefined) throw new Error ("PoV winner/s are undefined.");
    let povTarget: Houseguest | null = null;
    const veto = options.veto;
    const immunePlayers = options.immuneHgs || [];
    const splitIndex = options.splitIndex;
    const houseguests = nonEvictedHouseguestsSplit(splitIndex, initialGameState);

    const HoH = hohWinners[0];
    const isCoHoH = hohWinners.length > 1;

    initialNominees = initialNominees.map((nominee) => {
        return getHouseguestById(initialGameState, nominee.id);
    });
    povWinners = povWinners.map((pov) => {
        return getHouseguestById(initialGameState, pov.id);
    });
    hohWinners.forEach((hoh) => !povWinners.some(pov => pov.id === hoh.id) && immunePlayers.push(hoh));

    let finalNominees: Houseguest[] = [...initialNominees];
    
    const sceneContent: JSX.Element[] = [];
    const currentInfo: VetoCeremonyInformation[] = [];
    povWinners.forEach((pov, index) => {
        let decisionText = "";
        let replacementSpeech = "";
        let replacementReason = "";
        let nameAReplacement = "";

        let currentNominees: Houseguest[] = [...finalNominees];
        let replacementNominees: Houseguest[] = [];

        const vetoChoice = veto.use(pov, finalNominees, initialGameState, HoH.id, {
            immunePlayers,
            splitIndex,
        });
        povTarget = vetoChoice.decision;
        const povIsNom = currentNominees.some(nom => nom.id === pov.id);
        const nomNames = finalNominees.map((nom) => getHouseguestById(initialGameState, nom.id).preferredName());
        const nonPovNomNames = finalNominees.filter(nom => nom.id !== pov.id).map((nom) => getHouseguestById(initialGameState, nom.id).preferredName());
        const HoHnamer = povTarget ? getHouseguestById(initialGameState, povTarget.nominatorId) : HoH;
        const replacementNomineeNamer = veto === DiamondVeto ? pov : HoHnamer;

        const tousethepov = "to use the Power of Veto";
        if (!povTarget) {
            decisionText += `...not ${tousethepov}.`;
            applyEventPopularity(pov, 1);
            currentInfo.push({ hoh: HoHnamer, pov, saved: null, replacements: null, finalNominees })
        } else if (veto === BoomerangVeto) {
            decisionText += `...${tousethepov}.`;
        } else if (pov.id === povTarget.id) {
            decisionText += `...${tousethepov} on myself.`;
        } else {
            decisionText += `...${tousethepov} on ${povTarget.preferredName()}.`;
        }
        if (povTarget) {
            const target = getHouseguestById(initialGameState, povTarget.id);
            target.isNominated = false;
            target.nominatorId = -1;

            if (pov.id !== target.id) {
                applyRelationship(initialGameState, pov, target, 30);
                applyRelationship(initialGameState, target, pov, 30);
            }
            applyEventPopularity(pov, 2);

            const HoHwonPoV = HoH.id === pov.id && !isCoHoH;
            const aReplacementNominee = veto === BoomerangVeto ? "replacement nominees" : "a replacement nominee";
            const oneOf = veto !== BoomerangVeto ? "one of " : "";
            const you = veto === DiamondVeto ? "I" : "you";
            nameAReplacement += HoHwonPoV
                ? `Since I have just vetoed one of my nominations, I must name ${aReplacementNominee}.`
                : `${HoHnamer.preferredName()}, since I have just vetoed ${oneOf}your nominations, ${you} must name ${aReplacementNominee}.`;
            // if the exclusion yielded no options, you may be forced to name the veto winner as a replacement
            let exclusion = excludeHouseguests(houseguests, [...currentNominees, ...povWinners, ...immunePlayers]);
            if (exclusion.length === 0) {
                exclusion = excludeHouseguests(houseguests, [HoH, ...currentNominees, ...immunePlayers]);
            }
            const replacementCount = veto === BoomerangVeto ? 2 : 1;
            const replacementNoms = backdoorNPlayers(
                replacementNomineeNamer,
                exclusion,
                initialGameState,
                replacementCount
            ).map((v) => {
                const hg = getHouseguestById(initialGameState, v.decision)
                applyEventPopularity(hg, -2);
                return hg;
            });

            const names = replacementNoms.map((n) => getHouseguestById(initialGameState, n.id).preferredName());
            const isAre = replacementNoms.length === 1 ? " is" : "s are"
            currentNominees = replacementNoms.length === 1
                ? currentNominees.map(hg => {
                    if (hg.id === povTarget?.id) {
                        replacementNoms[0].nominations += 1;
                        return replacementNoms[0];
                    }
                    return hg;
                })
                : replacementNoms.map((nom) => {
                    nom.nominations += 1;
                    return nom;
                });
            replacementNominees = replacementNoms;
            replacementSpeech = `My replacement nominee${isAre} ${listNames(names)}.`;
            replacementReason = `I'm really sorry, ${listNames(names)}, but it's time to make a big move and put you on the block. I hope you leave.`

            currentInfo.push({ hoh: HoHnamer, pov, saved: povTarget, replacements: replacementNoms, finalNominees: currentNominees });
        }

        sceneContent.push(
            <React.Fragment key={`veto-ceremony-stage-${index}`}>
                {index === 0 && (
                    <>
                        <Centered>{listNames(nomNames)} each state why they should be saved.</Centered>
                        <Portraits centered={true} houseguests={[...finalNominees]} />
                        <Centered>This is the Veto Ceremony.</Centered>
                    </>
                )}
                <Centered>
                    {pov.preferredName()}, as the winner of the Power of Veto... please stand at the head of the room, face the nominees, and make your decision.
                </Centered>
                <HorizontalLine />
                <HouseEventBox
                    imageURL={getEventBackgroundImage("Living Room")}
                    houseguests={[pov, "➡️", ...finalNominees]}
                    text={`${povIsNom ? `${nonPovNomNames.join(", ")} and I` : listNames(nomNames)} have been nominated for eviction, 
                    but I have the power to veto one of these nominations.`}
                />
                <CenteredBold>...<br /></CenteredBold>
                <CenteredBold>I have decided...<br /></CenteredBold>
                <Portrait centered={true} houseguest={{ ...pov, tooltip: vetoChoice.reason }} />
                <CenteredBold>...<br /></CenteredBold>
                <CenteredBold noMargin={true}>{decisionText}</CenteredBold>
                <Centered>{nameAReplacement}</Centered>
                {replacementSpeech && <Portrait centered={true} houseguest={replacementNomineeNamer} />}
                <CenteredBold>{replacementSpeech}</CenteredBold>
                <Centered>{replacementReason}</Centered>
                <HouseEventBox
                    imageURL={getEventBackgroundImage("Living Room")}
                    houseguests={[...currentNominees]}
                    text={replacementNominees.length && `${replacementNominees[0].preferredName()} gives a sigh and sits down in the replacement chair.`}
                />
            </React.Fragment> 
        );
        finalNominees = currentNominees;
    });

    let events = generateVetoConfessionalEvents(initialGameState, houseguests, currentInfo);
    let postVetoEvents: JSX.Element[] = [];
    for (const event of events) {
        const component = houseEventBox(event);
        if (component) postVetoEvents.push(component);
    }
    vetoCeremonyInformation.push(...currentInfo);
    
    povWinners.forEach(pov => getHouseguestById(initialGameState, pov.id).pov.hasVeto = false);

    const scene = new Scene({
        title: "Veto Ceremony",
        gameState: initialGameState,
        content: (
            <div>
                {sceneContent}
                <HorizontalLine />
                {postVetoEvents}
                <NextEpisodeButton />
            </div>
        ),
    });

    return [initialGameState, scene, finalNominees];
}
