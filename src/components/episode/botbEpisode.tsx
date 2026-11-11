import { GameState, hgPreferredName, Houseguest, MutableGameState } from "../../model";
import { Episode, EpisodeType } from "./episodes";
import { Scene } from "./scenes/scene";
import { generateCompetitionResultsScene } from "./scenes/competitionResultsScene";
import { generateBotbNominationCeremonyScene } from "./scenes/botbNominationCeremonyScene";
import { generateVetoScenesOnwards } from "./bigBrotherEpisode";
import { GoldenVeto } from "./veto/veto";
import { generateCompetitionScene } from "./scenes/competitionScene";
import { listNames } from "../../utils/listStrings";
import { generateHouseEventsScene } from "./scenes/houseEventsScene";

export const BattleOfTheBlock: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n >= finalists + 3,
    eliminates: 1,
    emoji: "⚔️",
    name: "Battle of the Block",
    description:
        "Two HoHs name a total of four nominees. The nominees compete in a competition, and the winners are safe for the week and dethrone the HoH who nominated them.",
    generate: generateBotB,
};

function generateBotB(initialGamestate: GameState): Episode {
    // generate (co)-hoh scene
    let hohWinners: Houseguest[] = [];
    let nominees: Houseguest[][];
    let currentGameState = new MutableGameState(initialGamestate);
    const scenes: Scene[] = [];

    let houseEventsScene;
    [currentGameState, houseEventsScene] = generateHouseEventsScene(
        currentGameState,
        null,
        [],
        hohWinners,
        [],
        { veto: false, eviction: false }
    );
    scenes.push(houseEventsScene);

    let hohCompetitionScene: Scene;
    [currentGameState, hohCompetitionScene, hohWinners] = generateCompetitionScene(currentGameState, {
        compType: "HoH",
        coHoH: true,
        coHohIsFinal: false,
    });
    scenes.push(hohCompetitionScene);

    let hohResultsScene: Scene;
    [currentGameState, hohResultsScene] = generateCompetitionResultsScene(currentGameState, hohWinners, {
        compType: "HoH",
    });
    scenes.push(hohResultsScene);

    // nominations, but with TWO sets of nominees
    let nomCeremonyScene;
    [currentGameState, nomCeremonyScene, nominees] = generateBotbNominationCeremonyScene(
        currentGameState,
        hohWinners,
    );
    scenes.push(nomCeremonyScene);

    // then battle of the block where one of the HoHs is dethroned
    let botbScene;
    let botbWinners: Houseguest[];
    [currentGameState, botbScene, botbWinners] = generateCompetitionScene(currentGameState, {
        customTitle: "BotB Competition",
        customText: `This is the Battle of the Block competition. ${hgPreferredName(hohWinners[0])}'s nominees will battle ${hgPreferredName(hohWinners[1])}'s nominees to save themselves from the block. The winning pair will win safety for the week, and dethrone the HoH that nominated them.`,
        compType: "BotB",
        competitors: [nominees[0], nominees[1]],
    });
    scenes.push(botbScene);

    let finalHoH, finalNoms;
    const firstNomGroup = nominees[0].flatMap(hg => hg.id);
    const winIds = new Set(botbWinners.map(win => win.id));

    if (firstNomGroup.every(nom => winIds.has(nom))) {
        finalHoH = hohWinners[1];
        finalNoms = nominees[1];
    } else {
        finalHoH = hohWinners[0];
        finalNoms = nominees[0];
    }
    let botbResultsScene;
    [currentGameState, botbResultsScene] = generateCompetitionResultsScene(currentGameState, botbWinners, {
        customTitle: "BotB Results",
        bottomText: ` have won the Battle of the Block! ${listNames([hgPreferredName(finalHoH)])} will remain as HoH, with
            ${listNames(
                finalNoms.map((n) => hgPreferredName(n))
            )} as nominees.`,
        compType: "BotB",
    });
    scenes.push(botbResultsScene);

    // then veto onwards plays normally except
    // the winning pair is somehow immune for the week: they can't be backdoored.
    const vetoScenes = generateVetoScenesOnwards(
        currentGameState,
        [finalHoH],
        finalNoms,
        scenes,
        botbWinners,
        { veto: GoldenVeto }
    );
    currentGameState = vetoScenes.gameState;

    return new Episode({
        gameState: new GameState(currentGameState),
        initialGamestate,
        scenes: vetoScenes.scenes,
        type: BattleOfTheBlock,
    });
}
