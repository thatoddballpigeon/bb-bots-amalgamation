import { GameState } from "../../model";
import { generateBBVanillaScenes } from "./bigBrotherEpisode";
import { EpisodeType, Episode } from "./episodes";
import { DiamondVeto } from "./veto/veto";

let offset = 1;

export const DiamondVetoEpisode: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n >= finalists + 1,
    eliminates: 1,
    emoji: "💎",
    name: "Diamond Power of Veto",
    description: "The veto winner has the right to name a replacement nominee.",
    generate,
};

function generate(initialGamestate: GameState): Episode {
    const episode = generateBBVanillaScenes(initialGamestate, { veto: DiamondVeto });
    return new Episode({
        gameState: new GameState(episode.gameState),
        initialGamestate,
        scenes: episode.scenes,
        type: DiamondVetoEpisode,
    });
}
